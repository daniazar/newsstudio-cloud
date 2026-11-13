/**
 * scripts/veo-cli/generators/fsmSequenceBuilder.ts
 *
 * Probabilistic Finite State Machine (Markov Chain) Sequence Orchestrator.
 * Sequences 2-second action beats, pose transitions, and camera cuts for a news script.
 */

import { ActionPoseState, FSMSequenceStep, FSMState, FSMTransitionProbabilities, VeoEngineType, VeoGenerationResult } from "../types";
import { ACTION_POSE_STATES } from "../actionStateCatalog";
import { runSubtleBeatGenerator } from "./subtleBeatGenerator";
import { runPoseTransitionGenerator } from "./poseTransitionGenerator";
import path from "path";

export interface FSMOrchestratorOptions {
  totalDurationSeconds: number; // e.g. 20s, 30s, 60s
  stepBeatSeconds?: number;     // default 2.0s
  personaSlug?: string;
  initialPoseId?: string;
  initialCamera?: "cam1" | "cam2" | "cam3";
  scriptCues?: Array<{ timeSec: number; tag: string }>;
  probabilities?: FSMTransitionProbabilities;
  engine: VeoEngineType;
  dryRun?: boolean;
}

export const DEFAULT_FSM_PROBABILITIES: FSMTransitionProbabilities = {
  selfLoopProb: 0.75,   // 75% stay in current state (subtle 4s idle loop)
  poseShiftProb: 0.18,  // 18% transition to another gesture pose
  cameraCutProb: 0.07,  // 7% cut to another camera angle
};

export function simulateFSMSequence(opts: {
  totalDurationSeconds: number;
  stepBeatSeconds?: number;
  initialPoseId?: string;
  initialCamera?: "cam1" | "cam2" | "cam3";
  probabilities?: FSMTransitionProbabilities;
  scriptCues?: Array<{ timeSec: number; tag: string }>;
}): FSMSequenceStep[] {
  const stepDuration = opts.stepBeatSeconds || 4.0;
  const numSteps = Math.ceil(opts.totalDurationSeconds / stepDuration);
  const probs = opts.probabilities || DEFAULT_FSM_PROBABILITIES;

  const poseKeys = Object.keys(ACTION_POSE_STATES);
  let currentPoseKey = opts.initialPoseId || "P01_NEUTRAL_CLASPED";
  let currentCam = opts.initialCamera || "cam1";

  const sequence: FSMSequenceStep[] = [];

  for (let i = 0; i < numSteps; i++) {
    const timeStart = i * stepDuration;
    const timeEnd = timeStart + stepDuration;

    const fromState: FSMState = {
      id: `${currentPoseKey}_${currentCam}`,
      poseId: currentPoseKey,
      cameraId: currentCam,
      imagePath: ACTION_POSE_STATES[currentPoseKey]?.sampleImagePath || "",
    };

    // Check for explicit script cues at this timestamp
    const activeCue = opts.scriptCues?.find((c) => Math.abs(c.timeSec - timeStart) < stepDuration);

    let transitionType: "idle_self_loop" | "pose_shift" | "camera_cut" = "idle_self_loop";
    let nextPoseKey = currentPoseKey;
    let nextCam = currentCam;

    if (activeCue) {
      if (activeCue.tag === "[BREAKING]" || activeCue.tag === "[CLOSEUP]") {
        transitionType = "camera_cut";
        nextCam = "cam3";
        nextPoseKey = "P06_BREAKING_CLOSEUP";
      } else if (activeCue.tag === "[DATA]" || activeCue.tag === "[EXPLAIN]") {
        transitionType = "pose_shift";
        nextPoseKey = "P02_RAISED_EXPLANATORY";
      } else if (activeCue.tag === "[CONCLUSION]" || activeCue.tag === "[GREETING]") {
        transitionType = "pose_shift";
        nextPoseKey = "P03_OPEN_TWO_HANDS";
      }
    } else {
      // Probabilistic Markov Transition
      const rand = Math.random();
      if (rand < probs.selfLoopProb) {
        transitionType = "idle_self_loop";
      } else if (rand < probs.selfLoopProb + probs.poseShiftProb) {
        transitionType = "pose_shift";
        // Pick a different pose
        const otherPoses = poseKeys.filter((k) => k !== currentPoseKey && k !== "P06_BREAKING_CLOSEUP");
        nextPoseKey = otherPoses[Math.floor(Math.random() * otherPoses.length)] || currentPoseKey;
      } else {
        transitionType = "camera_cut";
        const otherCams: Array<"cam1" | "cam2" | "cam3"> = (["cam1", "cam2", "cam3"] as const).filter((c) => c !== currentCam);
        nextCam = otherCams[Math.floor(Math.random() * otherCams.length)] || currentCam;
        if (nextCam === "cam3") {
          nextPoseKey = "P06_BREAKING_CLOSEUP";
        }
      }
    }

    const toState: FSMState = {
      id: `${nextPoseKey}_${nextCam}`,
      poseId: nextPoseKey,
      cameraId: nextCam,
      imagePath: ACTION_POSE_STATES[nextPoseKey]?.sampleImagePath || "",
    };

    const clipName = transitionType === "idle_self_loop"
      ? `idle_${currentPoseKey.toLowerCase()}_${stepDuration}s.mp4`
      : transitionType === "pose_shift"
      ? `trans_${currentPoseKey.toLowerCase()}_to_${nextPoseKey.toLowerCase()}.mp4`
      : `cut_${currentCam}_to_${nextCam}.mp4`;

    sequence.push({
      stepIndex: i + 1,
      timeStartSec: timeStart,
      timeEndSec: timeEnd,
      fromState,
      toState,
      transitionType,
      videoPath: `public/assets/action_loops/veo/${clipName}`,
      nlpTagTrigger: activeCue?.tag,
    });

    currentPoseKey = nextPoseKey;
    currentCam = nextCam;
  }

  return sequence;
}

export async function runFSMOrchestrator(opts: FSMOrchestratorOptions): Promise<{
  steps: FSMSequenceStep[];
  generatedClips: VeoGenerationResult[];
}> {
  console.log("\n==================================================================");
  console.log(`🤖 PROBABILISTIC MARKOV STATE MACHINE SEQUENCE ORCHESTRATOR`);
  console.log("==================================================================");
  console.log(`Total Duration: ${opts.totalDurationSeconds} seconds (${opts.stepBeatSeconds || 2}s beats)`);
  console.log(`P(Self-Loop):   ${((opts.probabilities?.selfLoopProb || 0.75) * 100).toFixed(0)}%`);
  console.log(`P(Pose Shift):  ${((opts.probabilities?.poseShiftProb || 0.18) * 100).toFixed(0)}%`);
  console.log(`P(Camera Cut):  ${((opts.probabilities?.cameraCutProb || 0.07) * 100).toFixed(0)}%`);

  const steps = simulateFSMSequence(opts);
  const generatedClips: VeoGenerationResult[] = [];

  console.log("\n📋 Planned Markov Sequence Execution Table:\n");
  console.log("| Step | Time Window | Transition Type | From State | To State | Trigger |");
  console.log("|---|---|---|---|---|---|");
  for (const step of steps) {
    console.log(
      `| ${step.stepIndex.toString().padStart(2, "0")} | ${step.timeStartSec.toFixed(1)}s - ${step.timeEndSec.toFixed(1)}s | ${step.transitionType.padEnd(14)} | ${step.fromState.id.padEnd(20)} | ${step.toState.id.padEnd(20)} | ${step.nlpTagTrigger || "-"} |`
    );
  }

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Simulation complete. No video generation dispatched.");
    return { steps, generatedClips };
  }

  console.log("\n🚀 Dispatching video generation runs for unique clips in sequence...");
  const uniqueActionKeys = new Set<string>();

  for (const step of steps) {
    const key = `${step.transitionType}_${step.fromState.poseId}_${step.toState.poseId}`;
    if (uniqueActionKeys.has(key)) continue;
    uniqueActionKeys.add(key);

    const fromPose = ACTION_POSE_STATES[step.fromState.poseId] || ACTION_POSE_STATES.P01_NEUTRAL_CLASPED;
    const toPose = ACTION_POSE_STATES[step.toState.poseId] || ACTION_POSE_STATES.P01_NEUTRAL_CLASPED;

    if (step.transitionType === "idle_self_loop") {
      const res = await runSubtleBeatGenerator({
        pose: fromPose,
        personaSlug: opts.personaSlug,
        engine: opts.engine,
        durationSeconds: (opts.stepBeatSeconds as any) || 2,
        saveToDb: true,
      });
      generatedClips.push(res);
    } else if (step.transitionType === "pose_shift") {
      const res = await runPoseTransitionGenerator({
        fromPose,
        toPose,
        personaSlug: opts.personaSlug,
        engine: opts.engine,
        durationSeconds: (opts.stepBeatSeconds as any) || 2,
        saveToDb: true,
      });
      generatedClips.push(res);
    }
  }

  return { steps, generatedClips };
}
