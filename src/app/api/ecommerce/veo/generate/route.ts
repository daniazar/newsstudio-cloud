/**
 * src/app/api/ecommerce/veo/generate/route.ts
 *
 * E-Commerce Google Veo Video Generation API.
 * Triggers or dry-runs custom product video ads via scripts/veo-video-cli.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { assertSafePublicUrl } from "@/lib/security/ssrf";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

function isRemoteWorkerMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_REMOTE_WORKER === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.ALLOW_API_SPAWN !== "true")
  );
}

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const orgId = t.tenant.orgId;

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.generationJob.findFirst({
    where: { id: jobId, companyId: orgId },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = job.config ? (JSON.parse(job.config) as Record<string, unknown>) : {};
  } catch {}
  const resultObj =
    parsedConfig.result && typeof parsedConfig.result === "object"
      ? (parsedConfig.result as Record<string, unknown>)
      : {};
  const mappedStatus =
    job.status === "DONE"
      ? "completed"
      : job.status === "FAILED" || job.status === "CANCELLED"
      ? "failed"
      : "processing";

  return NextResponse.json({
    success: true,
    jobId: job.id,
    status: mappedStatus,
    jobStatus: job.status,
    progress: job.currentStep || (job.status === "QUEUED" ? "Queued for local worker..." : "Generating Veo video..."),
    videoUrl: typeof resultObj.videoUrl === "string" ? resultObj.videoUrl : undefined,
    manifestPath: typeof resultObj.manifestPath === "string" ? resultObj.manifestPath : null,
    manifest: resultObj.manifest ?? null,
    error: mappedStatus === "failed" ? job.errorLog || "Veo generation failed" : undefined,
  });
}

export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;

    const body = await req.json();
    const {
      productName,
      productImage,
      productCategory = "surface_material",
      productAction = "swatch_presentation",
      personaSlug = "ruby",
      fuseBeats = true,
      withAudio = true,
      bgmGenre = "luxury_commercial",
      sfxCue = "[sfx:whoosh]",
      dryRun = true,
    } = body;

    if (!productName || typeof productName !== "string" || productName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Valid product name is required." },
        { status: 400 }
      );
    }

    if (productName.length > 200 || productName.includes("\0")) {
      return NextResponse.json(
        { success: false, error: "Invalid product name." },
        { status: 400 }
      );
    }

    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    if (!slugRegex.test(personaSlug)) {
      return NextResponse.json({ success: false, error: "Invalid persona slug." }, { status: 400 });
    }
    if (!slugRegex.test(productCategory)) {
      return NextResponse.json({ success: false, error: "Invalid product category." }, { status: 400 });
    }
    if (!slugRegex.test(productAction)) {
      return NextResponse.json({ success: false, error: "Invalid product action." }, { status: 400 });
    }
    if (bgmGenre && !slugRegex.test(bgmGenre)) {
      return NextResponse.json({ success: false, error: "Invalid bgm genre." }, { status: 400 });
    }
    if (sfxCue && !/^[a-zA-Z0-9_:[\] -]+$/.test(sfxCue)) {
      return NextResponse.json({ success: false, error: "Invalid sfx cue." }, { status: 400 });
    }

    if (productImage && typeof productImage === "string") {
      if (productImage.startsWith("http://") || productImage.startsWith("https://")) {
        await assertSafePublicUrl(productImage);
      }
    }

    if (isRemoteWorkerMode()) {
      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          queued: false,
          message: "Dry-run validated in remote worker mode.",
        });
      }

      const job = await prisma.generationJob.create({
        data: {
          companyId: t.tenant.orgId,
          storyId: `ecommerce_veo_${Date.now()}`,
          type: "ecommerce_veo",
          status: "QUEUED",
          totalSteps: 2,
          doneSteps: 0,
          currentStep: "Queued for local worker",
          config: JSON.stringify({
            productName: productName.trim(),
            productImage: productImage || null,
            productCategory,
            productAction,
            personaSlug,
            fuseBeats: Boolean(fuseBeats),
            withAudio: Boolean(withAudio),
            bgmGenre,
            sfxCue,
          }),
        },
      });
      void broadcastWorkerWake("job_queued");

      return NextResponse.json({
        ok: true,
        queued: true,
        success: true,
        jobId: job.id,
        status: "QUEUED",
        message: "Veo product showcase job queued for local worker.",
      });
    }

    // Build CLI arguments for spawn (safe array, no shell execution)
    const args: string[] = [
      "tsx",
      "scripts/veo-video-cli.ts",
      "--mode=product_showcase",
      `--persona=${personaSlug}`,
      `--product-name=${productName.trim()}`,
      `--product-category=${productCategory}`,
      `--product-action=${productAction}`,
    ];

    if (fuseBeats) args.push("--fuse");
    if (withAudio) args.push("--with-audio");
    if (bgmGenre) args.push(`--bgm=${bgmGenre}`);
    if (sfxCue) args.push(`--sfx=${sfxCue}`);
    if (productImage) args.push(`--product-image=${productImage}`);
    if (dryRun) args.push("--dry-run");
    args.push("--non-interactive");

    const executable = process.platform === "win32" ? "npx.cmd" : "npx";
    const cwd = process.cwd();
    const { spawn } = await import("child_process");

    const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
      (resolve, reject) => {
        const child = spawn(executable, args, {
          cwd,
          shell: false,
          timeout: 60000,
        });

        let out = "";
        let err = "";

        child.stdout?.on("data", (chunk) => {
          out += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
          err += chunk.toString();
        });

        child.on("error", (spawnError) => {
          reject(spawnError);
        });

        child.on("close", (exitCode) => {
          resolve({ stdout: out, stderr: err, code: exitCode });
        });
      }
    );

    if (code !== 0 && !stdout) {
      return NextResponse.json(
        { success: false, error: `CLI process exited with code ${code}`, stderr },
        { status: 500 }
      );
    }

    // Extract manifest file path from output if generated
    const manifestMatch = stdout.match(/(?:file:\/\/\/|\s)([^\s]+\/fused_commercial_manifest_[^\s]+\.json)/i);
    let manifestData = null;
    let resolvedManifestPath = "";

    if (manifestMatch) {
      resolvedManifestPath = manifestMatch[1].replace(/^file:\/\/\/?/, "");
      if (process.platform === "win32" && !resolvedManifestPath.includes(":")) {
        resolvedManifestPath = `C:/${resolvedManifestPath}`;
      }
      try {
        if (fs.existsSync(resolvedManifestPath)) {
          manifestData = JSON.parse(fs.readFileSync(resolvedManifestPath, "utf8"));
        }
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      command: [executable, ...args].join(" "),
      stdout,
      stderr,
      manifestPath: resolvedManifestPath || null,
      manifest: manifestData,
      dryRun,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/veo/generate] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
