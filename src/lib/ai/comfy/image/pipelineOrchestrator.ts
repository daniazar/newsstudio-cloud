/**
 * src/lib/ai/comfy/image/pipelineOrchestrator.ts
 *
 * Orchestrator engine for Multi-Pass Progressive Composition Pipeline (Part 10 — IMAGE_ROADMAP.md).
 * Uses StageFactory and Observer Pattern for event-driven progress tracking, decoupled UI output,
 * and per-stage interactive checkpoint hooks (Task MP-11).
 */

import fs from "fs";
import path from "path";
import { MultiPassPipelineConfig, StageResult } from "../types";
import { PipelineContext, PipelineStage } from "./stages/baseStage";
import { StageFactory } from "./stages/stageFactory";
import { generatePostRunQualityScorecard } from "./scorecard";
import { computeTechnicalQualityMetrics } from "./technicalQuality";
import { determineReRollEntryStage } from "./rerollSelector";

export type PipelineEventType = "STAGE_START" | "STAGE_COMPLETE" | "CACHE_HIT" | "STAGE_ERROR";

export interface PipelineProgressEvent {
  type: PipelineEventType;
  stageIndex: number;
  stageName: string;
  elapsedMs?: number;
  imagePath?: string;
  error?: string;
  denoise?: number;
  cfg?: number;
  seed?: number;
}

export type PipelineProgressListener = (event: PipelineProgressEvent) => void;

export { type CheckpointEvent, type CheckpointResponse } from "../types";
import { CheckpointEvent, CheckpointResponse } from "../types";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:pipelineOrchestrator");

export type PipelineCheckpointCallback = (event: CheckpointEvent) => Promise<CheckpointResponse>;

export class MultiPassPipelineOrchestrator {
  private listeners: PipelineProgressListener[] = [];
  private checkpointCallback: PipelineCheckpointCallback | null = null;

  /**
   * Registers an Observer listener callback for pipeline progress events.
   */
  onProgress(listener: PipelineProgressListener): this {
    this.listeners.push(listener);
    return this;
  }

  /**
   * Sets optional per-stage interactive checkpoint callback hook (Task MP-11).
   */
  setCheckpointCallback(callback: PipelineCheckpointCallback): this {
    this.checkpointCallback = callback;
    return this;
  }

  private emit(event: PipelineProgressEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Suppress listener errors to avoid interrupting pipeline execution
      }
    }
  }

  async runPipeline(context: PipelineContext, mpConfig: MultiPassPipelineConfig): Promise<StageResult[]> {
    const results: StageResult[] = [];
    const totalStages = mpConfig.stages.length;

    // Create per-run subfolder: scratch/stage_cache/{personaKey}_{masterSeed}/
    const runSubfolder = path.join(context.cacheDir, `${context.personaKey.toLowerCase()}_${context.masterSeed}`);
    fs.mkdirSync(runSubfolder, { recursive: true });
    context.cacheDir = runSubfolder;

    log.info("\n=======================================================");
    log.info(`🚀 MULTI-PASS PROGRESSIVE COMPOSITION PIPELINE — ${context.personaKey.toUpperCase()}`);
    log.info(`   Pipeline Mode: ${mpConfig.pipelineMode} | Content Mode: ${mpConfig.contentMode}`);
    log.info(`   Master Seed: ${context.masterSeed} | Total Stages: ${totalStages}`);
    log.info("=======================================================\n");

    let partnerIndex = 0;
    let fastForward = false;

    for (let i = 0; i < mpConfig.stages.length; i++) {
      const stageConfig = mpConfig.stages[i];

      const stageStrategy: PipelineStage = StageFactory.createStage(
        stageConfig.stageIndex,
        stageConfig.stageName,
        partnerIndex,
        context.partnerPersonaKey ? 2 : 1
      );

      if (stageConfig.stageIndex === 3 && context.partnerPersonaKey) {
        partnerIndex++;
      }

      this.emit({
        type: "STAGE_START",
        stageIndex: stageConfig.stageIndex,
        stageName: stageConfig.stageName,
        denoise: stageConfig.denoise,
        cfg: stageConfig.cfg,
        seed: stageConfig.seed
      });

      const previousStageInput = i > 0 ? results[i - 1]?.imagePath : undefined;
      context.currentInputImagePath = previousStageInput;

      try {
        const result = await stageStrategy.execute(context, stageConfig);
        results.push(result);

        this.emit({
          type: result.cached ? "CACHE_HIT" : "STAGE_COMPLETE",
          stageIndex: result.stageIndex,
          stageName: result.stageName,
          elapsedMs: result.executionTimeMs,
          imagePath: result.imagePath,
          seed: result.seed
        });

        // Task MP-11 Checkpoint Hook
        if (this.checkpointCallback && !fastForward) {
          const checkpointResp = await this.checkpointCallback({
            stageIndex: i + 1,
            stageName: stageConfig.stageName,
            imagePath: result.imagePath,
            currentPrompt: stageConfig.stagePrompt || context.promptText,
            currentSeed: stageConfig.seed,
            currentDenoise: stageConfig.denoise,
            totalStages,
            elapsedMs: result.executionTimeMs
          });

          if (checkpointResp.action === "CANCEL") {
            log.info("\n❌ Pipeline execution cancelled at checkpoint.");
            break;
          } else if (checkpointResp.action === "FAST_FORWARD") {
            fastForward = true;
          } else if (checkpointResp.action === "JUMP_BACK" && checkpointResp.jumpStageIndex !== undefined) {
            const targetStageIdx = checkpointResp.jumpStageIndex;
            log.info(`\n⏮️ Jumping back to Stage ${targetStageIdx}...`);
            
            // Truncate results array to targetStageIdx - 1
            results.splice(targetStageIdx - 1);
            
            // Set input path to output of previous stage
            const prevRes = results[results.length - 1];
            context.currentInputImagePath = prevRes ? prevRes.imagePath : undefined;
            
            // Set loop index so next iteration runs targetStageIdx
            i = targetStageIdx - 2;
            continue;
          } else if (checkpointResp.action === "REROLL_SEED" || checkpointResp.action === "EDIT_PROMPT" || checkpointResp.action === "CHANGE_VARIANT" || checkpointResp.action === "TWEAK_DENOISE") {
            if (checkpointResp.newSeed !== undefined) {
              stageConfig.seed = checkpointResp.newSeed;
            }
            if (checkpointResp.newPrompt !== undefined) {
              stageConfig.stagePrompt = checkpointResp.newPrompt;
            }
            if (checkpointResp.newDenoise !== undefined) {
              stageConfig.denoise = checkpointResp.newDenoise;
            }
            if (checkpointResp.newVariantKey !== undefined) {
              context.isNsfw = checkpointResp.newVariantKey === "BODY_UNCENSORED" || checkpointResp.newVariantKey === "GRID_UNCENSORED";
            }
            // Remove cached output for re-rolled seed
            const rerollCachePath = path.join(
              context.cacheDir,
              `${context.personaKey.toLowerCase()}_stage_${stageConfig.stageIndex}_seed_${stageConfig.seed}.png`
            );
            if (fs.existsSync(rerollCachePath)) {
              try { fs.unlinkSync(rerollCachePath); } catch {}
            }
            // Re-run current stage index with previous stage input
            i--;
            results.pop();
            continue;
          } else if (checkpointResp.action === "REROLL_VARIATIONS") {
            const count = checkpointResp.sampleCount || 3;
            const baseSeed = checkpointResp.newSeed || Math.floor(Math.random() * 1000000000);
            const varPaths: string[] = [];
            const varSeeds: number[] = [];

            log.info(`\n🎲 Sampling ${count} variations for stage [${stageConfig.stageName}]...`);
            for (let v = 0; v < count; v++) {
              const varSeed = baseSeed + v * 100;
              varSeeds.push(varSeed);
              const varConfig = { ...stageConfig, seed: varSeed };
              context.currentInputImagePath = previousStageInput;
              const varResult = await stageStrategy.execute(context, varConfig);
              varPaths.push(varResult.imagePath);
            }
            if (varPaths.length > 0) {
              // Headless pipeline mode: select the first generated candidate automatically
              const winningPath = varPaths[0];
              results[results.length - 1].imagePath = winningPath;
              context.currentInputImagePath = winningPath;
              log.info(`🏆 Locked winning candidate for stage [${stageConfig.stageName}] (seed ${varSeeds[0] ?? baseSeed}): ${path.basename(winningPath)}`);
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.emit({
          type: "STAGE_ERROR",
          stageIndex: stageConfig.stageIndex,
          stageName: stageConfig.stageName,
          error: message
        });

        console.error(`❌ [Pipeline Orchestrator] Execution failed at Stage ${stageConfig.stageIndex} (${stageConfig.stageName}):`, message);
        break;
      }
    }

    if (context.currentInputImagePath && fs.existsSync(context.currentInputImagePath)) {
      const finalOutPath = path.join(context.outputDir, `${context.personaKey.toLowerCase()}_multipass_final_${context.masterSeed}.png`);
      fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });
      fs.copyFileSync(context.currentInputImagePath, finalOutPath);

      // Task QA-11 & Task QA-12: Automatic Quality Grading Scorecard & Auto-Redo Engine
      const scorecard = generatePostRunQualityScorecard(finalOutPath, {
        environment: context.promptText,
        persona: context.personaKey
      });
      const techReport = computeTechnicalQualityMetrics(finalOutPath);

      log.info(scorecard.scorecardText);

      // Auto-Redo if overallIndex < 80.0% or plastic skin / artifact risk detected
      if (scorecard.overallIndex < 80.0 || techReport.plasticSkinRisk || techReport.aiArtifactRisk) {
        log.info(`\n⚠️  Quality Scorecard (${scorecard.overallIndex.toFixed(1)}%) below target threshold (80.0%)!`);
        log.info(`   Recommendation: ${techReport.recommendation}`);
        log.info(`🔄 Automatically triggering Smart Stage Jump Re-Roll with new seed...`);

        const targetAspect = techReport.plasticSkinRisk ? "face_detail" : "lighting";
        const entryInfo = determineReRollEntryStage(targetAspect);

        const newSeed = context.masterSeed + 777;
        const reRollStageIdx = Math.min(entryInfo.entryStageIndex, mpConfig.stages.length);
        const stageConfigToReroll = mpConfig.stages.find(s => Math.floor(s.stageIndex) === Math.floor(reRollStageIdx));

        if (stageConfigToReroll) {
          stageConfigToReroll.seed = newSeed;
          log.info(`⚡ [Auto-Redo Engine] Re-executing Stage ${stageConfigToReroll.stageIndex} (${stageConfigToReroll.stageName}) with Seed ${newSeed}...`);
          const rerollStrategy = StageFactory.createStage(stageConfigToReroll.stageIndex, stageConfigToReroll.stageName);
          const rerollResult = await rerollStrategy.execute(context, stageConfigToReroll);
          results.push(rerollResult);

          if (context.currentInputImagePath && fs.existsSync(context.currentInputImagePath)) {
            fs.copyFileSync(context.currentInputImagePath, finalOutPath);
            log.info(`✅ [Auto-Redo Engine] Re-roll complete! Refined output saved to: ${path.basename(finalOutPath)}`);
          }
        }
      }
    }

    return results;
  }
}
