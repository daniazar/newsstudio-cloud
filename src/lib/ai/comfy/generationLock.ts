/**
 * src/lib/ai/comfy/generationLock.ts
 *
 * Atomic Global Generation Lock & Concurrency Shield.
 * Enforces strict single-job serialization for all ComfyUI generation tasks
 * to prevent concurrent model collisions and eliminate RAM/VRAM paging.
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:generationLock");

class GenerationLock {
  private isLocked: boolean = false;
  private currentJobId: string | null = null;
  private queue: Array<{
    id: string;
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

  /**
   * Acquire exclusive lock for generation.
   * If another job is running, waits in queue until released.
   */
  public async acquire(jobId: string = `job-${Date.now()}`): Promise<void> {
    if (!this.isLocked) {
      this.isLocked = true;
      this.currentJobId = jobId;
      log.info(`[GenerationLock] 🔒 Lock acquired by: ${jobId}`);
      return;
    }

    log.info(`[GenerationLock] ⏳ Concurrency Shield: Job ${jobId} queued (Active job: ${this.currentJobId})...`);
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ id: jobId, resolve, reject });
    });
  }

  /**
   * Release the lock and pass to the next queued generation task.
   */
  public release(): void {
    const finishedJob = this.currentJobId;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.currentJobId = next.id;
      log.info(`[GenerationLock] 🔓 Lock transferred from ${finishedJob} -> ${next.id}`);
      next.resolve();
    } else {
      this.isLocked = false;
      this.currentJobId = null;
      log.info(`[GenerationLock] 🔓 Lock released (GPU idle).`);
    }
  }

  /**
   * Execute an async generation action wrapped in the global mutex.
   */
  public async withLock<T>(jobId: string, action: () => Promise<T>): Promise<T> {
    await this.acquire(jobId);
    try {
      return await action();
    } finally {
      this.release();
    }
  }

  public getStatus(): { isLocked: boolean; currentJobId: string | null; queueLength: number } {
    return {
      isLocked: this.isLocked,
      currentJobId: this.currentJobId,
      queueLength: this.queue.length,
    };
  }
}

export const comfyGenerationLock = new GenerationLock();
