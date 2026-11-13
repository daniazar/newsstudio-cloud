import { prisma } from '../../src/lib/prisma';
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:loopVideoProcessor");

export interface LoopJobPayload {
  jobId: string;
  personaId: string;
  storyId: string;
}

/**
 * Standalone Worker process polling loop video jobs from DB.
 */
export async function processLoopJob(payload: LoopJobPayload): Promise<boolean> {
  const { jobId } = payload;
  log.info(`⚙️ [PipelineWorker] Processing loop video job: ${jobId}...`);

  // Update status to processing
  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });
  } catch {
    // Ignore if not present
  }

  return true;
}
