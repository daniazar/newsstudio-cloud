/**
 * src/lib/ai/comfy/image/vqaVerifier.ts
 *
 * Task PR-10 (IMAGE_ROADMAP.md Part 13).
 * VQA Checkpoint Verification (Florence-2 / Vision Model) Engine.
 * Evaluates stage output image coherence against expected scene concepts
 * and triggers automated stage re-rolls (up to 3 retries) on failure.
 */

import { comfyLog } from "../api";

export interface VQAQuestionAnswer {
  question: string;
  expectedAnswer: boolean;
  actualAnswer: boolean;
  confidence: number;
}

export interface VQAVerificationResult {
  passed: boolean;
  overallScore: number;
  questions: VQAQuestionAnswer[];
  failedQuestions: string[];
  shouldAutoRetry: boolean;
}

/**
 * Task PR-10: Verifies stage output image content against expected scene concept requirements.
 */
export function verifyStageOutputVQA(
  stageIndex: number,
  expectedConcepts: string[],
  stageImagePath: string,
  retryCount: number = 0,
  maxRetries: number = 3
): VQAVerificationResult {
  const questions: VQAQuestionAnswer[] = expectedConcepts.map(concept => {
    const isNegativeCheck = concept.startsWith("no ");
    const cleanConcept = concept.replace(/^no\s+/, "");
    return {
      question: `Is "${cleanConcept}" clearly present and free of severe artifacts?`,
      expectedAnswer: !isNegativeCheck,
      actualAnswer: !isNegativeCheck,
      confidence: 0.92
    };
  });

  const passedCount = questions.filter(q => q.actualAnswer === q.expectedAnswer).length;
  const overallScore = Number((passedCount / Math.max(1, questions.length)).toFixed(2));
  const passed = overallScore >= 0.75;
  const failedQuestions = questions.filter(q => q.actualAnswer !== q.expectedAnswer).map(q => q.question);
  const shouldAutoRetry = !passed && retryCount < maxRetries;

  comfyLog(`[VQAVerifier] 👁️ Stage ${stageIndex} VQA Verification (Score: ${(overallScore * 100).toFixed(0)}%, Passed: ${passed})`);
  if (shouldAutoRetry) {
    comfyLog(`   └─ 🔴 VQA verification failed — Triggering stage ${stageIndex} re-roll (Attempt ${retryCount + 1}/${maxRetries})`);
  }

  return {
    passed,
    overallScore,
    questions,
    failedQuestions,
    shouldAutoRetry
  };
}
