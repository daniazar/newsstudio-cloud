import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireWorkerKey } from "@/lib/workerAuth";
import { commitQuota, rollbackQuota } from "@/lib/quota/quotaEngine";
import { sendOperationalAlert } from "@/lib/alerting/notifier";
import { broadcastWorkerWake } from "@/lib/worker-broker";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * POST /api/pipeline/jobs/:jobId/progress
 * Worker reports step completion. Worker-facing — uses WORKER_API_KEY auth.
 *
 * On DONE: creates a success Notification for the tenant.
 * On FAILED: creates a failure Notification for the tenant.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const err = requireWorkerKey(request);
  if (err) return err;
  const { jobId } = await params;

  try {
    const body = await request.json();
    const { step, status, doneSteps, errorLog, result, durationMs, creditsUsed } = body as {
      step: string;
      status: string;
      doneSteps?: number;
      errorLog?: string;
      result?: string;
      durationMs?: number;
      creditsUsed?: number;
    };

    if (!step || !status) {
      return Response.json(
        { error: "step and status are required" },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "FAILED" || job.status === "CANCELLED") {
      return Response.json({ error: "Job was cancelled or failed" }, { status: 409 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      currentStep: step,
      status,
    };

    if (doneSteps !== undefined) {
      updateData.doneSteps = doneSteps;
    }

    if (errorLog) {
      updateData.errorLog = errorLog;
    }

    if (creditsUsed && creditsUsed > 0) {
      updateData.creditsUsed = { increment: creditsUsed };
    }

    if (status === "DONE") {
      updateData.completedAt = new Date();
      updateData.currentStep = null;
      if (job.startedAt) {
        updateData.durationMs = new Date().getTime() - new Date(job.startedAt).getTime();
      }
      const persistResultJobTypes = new Set([
        "render",
        "ecommerce_photo",
        "ecommerce_scene",
        "ecommerce_veo",
        "ecommerce_lipsync",
        "ecommerce_render",
        "persona_studio_image",
      ]);
      if (persistResultJobTypes.has(job.type) && result && typeof result === "object") {
        let parsedConfig: Record<string, unknown> = {};
        if (job.config) {
          try {
            parsedConfig = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
          } catch {}
        }
        updateData.config = JSON.stringify({ ...parsedConfig, result });
      }
      
      // Cascade to the next stage
      if (job.type === "audio") {
        // Evaluate what video jobs are needed based on segment strategies
        const story = await prisma.story.findUnique({
          where: { id: job.storyId },
          include: { script: { include: { segments: { orderBy: { index: "asc" } } } } }
        });
        
        if (story && story.script) {
          const { assignSceneStrategies } = await import("@/lib/pipeline/sceneStrategyAssigner");
          const config = job.config ? JSON.parse(job.config) : null;
          const assignments = assignSceneStrategies(story.script.segments, config, story);
          
          let needsFull = false;
          let needsBubble = false;
          
          const updatePromises: ReturnType<typeof prisma.segment.update>[] = [];
          for (const segment of story.script.segments) {
            const assignment = assignments[segment.id];
            if (assignment) {
              updatePromises.push(
                prisma.segment.update({
                  where: { id: segment.id },
                  data: { 
                    sceneStrategy: assignment.strategy,
                    echoImagePairId: assignment.echoImagePairId 
                  }
                })
              );
              segment.sceneStrategy = assignment.strategy;
              if (assignment.strategy === "full") needsFull = true;
              if (assignment.strategy === "bubble") needsBubble = true;
            }
          }
          if (updatePromises.length > 0) {
            await prisma.$transaction(updatePromises); // ⚡ Bolt Optimization: Batch heterogeneous updates in single transaction to fix N+1
          }
          
          // Enqueue required video jobs
          const fullSegments = story.script.segments.filter(s => s.sceneStrategy === "full").length;
          const bubbleSegments = story.script.segments.filter(s => s.sceneStrategy === "bubble").length;
          
          if (needsFull) {
            await prisma.generationJob.create({
              data: {
                companyId: job.companyId,
                storyId: job.storyId,
                type: "video_full",
                status: "QUEUED",
                totalSteps: fullSegments,
                config: job.config,
              }
            });
            void broadcastWorkerWake("job_queued");
          }
          
          if (needsBubble) {
            await prisma.generationJob.create({
              data: {
                companyId: job.companyId,
                storyId: job.storyId,
                type: "video_bubble",
                status: "QUEUED",
                totalSteps: bubbleSegments,
                config: job.config,
              }
            });
            void broadcastWorkerWake("job_queued");
          }

          // If neither is needed (e.g., stock only), we skip straight to render
          if (!needsFull && !needsBubble) {
             await prisma.generationJob.create({
              data: {
                companyId: job.companyId,
                storyId: job.storyId,
                type: "render",
                status: "QUEUED",
                totalSteps: 4,
                config: job.config,
              }
            });
            void broadcastWorkerWake("job_queued");
          }
        }
      } else if (
        job.type === "video_full" ||
        job.type === "video_bubble" ||
        job.type === "video" ||
        job.type === "veo" ||
        job.type === "minimax" ||
        job.type === "taomate" ||
        job.type === "ltx"
      ) {
        // Check if all video jobs for this story are done
        const remainingVideoJobs = await prisma.generationJob.count({
          where: {
            storyId: job.storyId,
            type: { in: ["video_full", "video_bubble", "video", "veo", "minimax", "taomate", "ltx"] },
            status: { notIn: ["DONE", "FAILED"] },
            id: { not: jobId } // exclude the one we just finished
          }
        });
        
        if (remainingVideoJobs === 0) {
          // No more video jobs pending, cascade to render
          await prisma.generationJob.create({
            data: {
              companyId: job.companyId,
              storyId: job.storyId,
              type: "render",
              status: "QUEUED",
              totalSteps: 4,
              config: job.config,
            }
          });
          void broadcastWorkerWake("job_queued");
        }
      }
    }

    if (status === "FAILED") {
      updateData.completedAt = new Date();
      updateData.attempts = job.attempts + 1;
    }

    const txOps: Prisma.PrismaPromise<unknown>[] = [
      prisma.generationJob.update({
        where: { id: jobId },
        data: updateData,
      })
    ];

    const message = errorLog ?? (status === "DONE" ? "Completed successfully" : null);

    // Prevent JobLog spam for frequent progress updates
    const lastLog = await prisma.jobLog.findFirst({
      where: { jobId },
      orderBy: { createdAt: "desc" }
    });

    if (lastLog && lastLog.step === step && lastLog.status === status && lastLog.message === message) {
      // If duration is provided on the final step update, update the existing log
      if (durationMs) {
        txOps.push(
          prisma.jobLog.update({
            where: { id: lastLog.id },
            data: { duration: durationMs }
          })
        );
      }
    } else {
      txOps.push(
        prisma.jobLog.create({
          data: {
            jobId,
            step,
            status,
            message,
            duration: durationMs,
          },
        })
      );
    }

    if (creditsUsed && creditsUsed > 0) {
      txOps.push(
        prisma.usageLog.create({
          data: {
            companyId: job.companyId,
            type: `${job.type}_credits`,
            amount: creditsUsed,
          }
        })
      );
    }

    await prisma.$transaction(txOps);

    // 3D Product Turntable jobs are campaign-scoped (storyId carries the ProductCampaign id).
    if (job.type === "turntable_3d" && (status === "DONE" || status === "FAILED")) {
      const campaign = await prisma.productCampaign.findFirst({
        where: { id: job.storyId },
        select: { id: true, title: true },
      });
      const campaignTitle = campaign?.title ?? "product";

      if (status === "FAILED") {
        // Worker normally marks the asset FAILED itself; this covers crashed/unreachable workers.
        await prisma.product3DAsset.updateMany({
          where: { generationJobId: jobId, status: { notIn: ["READY", "FAILED"] } },
          data: { status: "FAILED", errorLog: errorLog ?? "3D turntable job failed" },
        });
      }

      await prisma.notification.create({
        data:
          status === "DONE"
            ? {
                companyId: job.companyId,
                type: "turntable_3d_ready",
                title: "3D Turntable Ready",
                message: `The 360° turntable for "${campaignTitle}" is ready to preview.`,
                data: JSON.stringify({ jobId, campaignId: job.storyId, result }),
              }
            : {
                companyId: job.companyId,
                type: "job_failed",
                title: "3D Turntable Failed",
                message: `3D turntable generation failed for "${campaignTitle}" at step "${step}": ${errorLog ?? "Unknown error"}`,
                data: JSON.stringify({ jobId, campaignId: job.storyId, step, errorLog }),
              },
      });

      return Response.json({ success: true });
    }

    // Create notification on terminal states
    if (status === "DONE" || status === "FAILED") {
      // Handle quota reservation commitment or rollback
      let jobConfigForQuota: { quotaReservationId?: string; [key: string]: unknown } = {};
      if (job.config) {
        try {
          jobConfigForQuota = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
        } catch {}
      }

      if (jobConfigForQuota.quotaReservationId) {
        try {
          if (status === "DONE" && (job.type === "render" || job.type === "full")) {
            await commitQuota(jobConfigForQuota.quotaReservationId);
          } else if (status === "FAILED") {
            await rollbackQuota(jobConfigForQuota.quotaReservationId);
          }
        } catch (quotaErr) {
          console.warn("[Pipeline Progress] Quota reservation update notice:", quotaErr);
        }
      }

      // Fetch story title for the notification message
      const story = await prisma.story.findFirst({
        where: { id: job.storyId },
        select: { title: true },
      });
      const storyTitle = story?.title ?? "Unknown story";

      if (status === "DONE") {
        if (job.type === "render" || job.type === "full") {
          
          if (job.type === "render" && result && typeof result === "object") {
            const videoData = result as {
              outputPath?: string;
              duration?: number;
              thumbnailStorageKey?: string;
              thumbnailPath?: string;
              [key: string]: unknown;
            };
            let jobConfig: {
              videoId?: string;
              campaignId?: string;
              aspectRatio?: string;
              totalFrames?: number;
              script?: {
                archetype?: string;
                targetChannel?: string;
                [key: string]: unknown;
              };
              [key: string]: unknown;
            } = {};
            if (job.config) {
              try {
                jobConfig = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
              } catch {}
            }
            const targetVideoId = jobConfig.videoId;
            const video = targetVideoId
              ? await prisma.video.findUnique({ where: { id: targetVideoId } })
              : (job.storyId ? await prisma.video.findFirst({ where: { storyId: job.storyId } }) : null);

            if (video) {
              await prisma.video.update({
                where: { id: video.id },
                data: {
                  status: "COMPLETED",
                  outputPath: videoData.outputPath,
                  duration: videoData.duration,
                  thumbnailStorageKey: videoData.thumbnailStorageKey,
                  thumbnailPath: videoData.thumbnailPath,
                }
              });
            }

            if (job.storyId) {
              await prisma.story.updateMany({
                where: { id: job.storyId },
                data: { status: "COMPLETED" },
              });
            }

            // Persist AdVariation if campaignId is present in jobConfig
            if (jobConfig.campaignId) {
              try {
                await prisma.adVariation.create({
                  data: {
                    campaignId: jobConfig.campaignId,
                    archetype: jobConfig.script?.archetype || "pdp_showcase",
                    targetChannel: jobConfig.script?.targetChannel || "tiktok_shop",
                    aspectRatio: jobConfig.aspectRatio || "9:16",
                    status: "COMPLETED",
                    scriptJson: JSON.stringify(jobConfig.script || {}),
                    renderedVideoKey: videoData.outputPath,
                    durationSeconds: videoData.duration || Number(((jobConfig.totalFrames || 600) / 30).toFixed(1)),
                  },
                });
              } catch (e) {
                console.warn("[Pipeline Progress] Could not persist AdVariation:", e);
              }
            }
          }

          await prisma.notification.create({
            data: {
              companyId: job.companyId,
              type: "video_ready",
              title: "Video Ready!",
              message: `Generation complete for "${storyTitle}". Your video is ready to preview.`,
              data: JSON.stringify({ jobId, storyId: job.storyId, result }),
            },
          });
        }
      } else {
        await prisma.notification.create({
          data: {
            companyId: job.companyId,
            type: "job_failed",
            title: "Generation Failed",
            message: `Generation failed for "${storyTitle}" at stage "${job.type}", step "${step}": ${errorLog ?? "Unknown error"}`,
            data: JSON.stringify({ jobId, storyId: job.storyId, step, errorLog }),
          },
        });

        // Outbound Operational Alert for infrastructure monitoring
        sendOperationalAlert({
          title: `Generation Job Failed: ${job.type}`,
          message: `Job ${jobId} for story "${storyTitle}" failed at step "${step}": ${errorLog ?? "Unknown error"}`,
          severity: "error",
          eventType: "pipeline_job_failed",
          companyId: job.companyId,
          metadata: {
            jobId,
            storyId: job.storyId,
            jobType: job.type,
            step,
            attempts: job.attempts + 1,
            error: errorLog ?? "Unknown error",
          },
        }).catch(() => {});
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Pipeline Progress] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
