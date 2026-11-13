/**
 * ACE-Step (1.5) AI Music Provider — Generates broadcast news beds, stingers,
 * and podcast intros using the Modern-TTS-Server on port 8005.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import type {
  MusicProvider,
  MusicTrack,
  MusicSearchOptions,
  MusicGenerationOptions,
  MusicGenerationResult,
} from "./types";
import { createLogger } from "@/lib/logger";

const log = createLogger("music:aceStep");

export function getModernTtsUrl(): string {
  return (
    process.env.MODERN_TTS_SERVER_URL ||
    process.env.NEXT_PUBLIC_MODERN_TTS_SERVER_URL ||
    "http://localhost:8005"
  );
}

export const MODERN_TTS_URL = {
  toString() {
    return getModernTtsUrl();
  },
};

export class ACEStepMusicProvider implements MusicProvider {
  readonly name = "acestep-music";

  /**
   * Whether the Modern-TTS-Server URL is configured.
   */
  isAvailable(): boolean {
    return Boolean(MODERN_TTS_URL);
  }

  /**
   * Probes Modern-TTS-Server health endpoint with a quick timeout.
   */
  async checkHealth(timeoutMs = 2500): Promise<boolean> {
    try {
      const res = await fetch(`${MODERN_TTS_URL}/health`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Synthesizes audio using ACE-Step via Modern-TTS-Server.
   *
   * @param options Music generation parameters
   * @returns Binary WAV Buffer and duration
   */
  async synthesizeAudio(options: MusicGenerationOptions): Promise<{
    audioBuffer: Buffer;
    duration: number;
    engine: string;
  }> {
    const durationSeconds = Math.max(3, Math.min(options.duration || 15, 180));
    const payload = {
      prompt: options.prompt,
      lyrics: options.lyrics || "",
      duration_seconds: durationSeconds,
      mood: options.mood || "serious",
    };

    log.info(
      `[ACE-Step Music] Sending generation request to ${MODERN_TTS_URL}/api/music/generate for "${options.prompt}" (${durationSeconds}s)`
    );

    const res = await fetch(`${MODERN_TTS_URL}/api/music/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(
        `Modern-TTS-Server ACE-Step generation failed with status ${res.status}: ${errText}`
      );
    }

    const arrayBuf = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);
    const engine = res.headers.get("X-Music-Engine") || "ace_step";

    return {
      audioBuffer,
      duration: durationSeconds,
      engine,
    };
  }

  /**
   * Generate an AI music track and persist it to Object Storage & Prisma DB.
   *
   * @param options Music generation parameters
   * @param companyId Owning tenant identifier
   * @returns MusicGenerationResult
   */
  async generateAndSave(
    options: MusicGenerationOptions,
    companyId: string
  ): Promise<MusicGenerationResult> {
    const { audioBuffer, duration, engine } = await this.synthesizeAudio(options);

    // Create a deterministic hash based on prompt + duration + mood for asset deduplication
    const hash = crypto
      .createHash("sha256")
      .update(`${options.prompt}:${options.mood || "serious"}:${duration}:${options.lyrics || ""}`)
      .digest("hex")
      .slice(0, 16);

    const trackName = `ACE-Step: ${options.prompt.slice(0, 40)}${
      options.prompt.length > 40 ? "..." : ""
    }`;
    const filename = `music/acestep/${hash}.wav`;
    const storageKey = withTenant(companyId, filename);

    // Upload to storage if not already present
    const exists = await storage.exists(storageKey);
    if (!exists) {
      log.info(`[ACE-Step Music] Uploading generated track to storage: ${storageKey}`);
      await storage.upload(storageKey, audioBuffer, "audio/wav");
    }

    const moodStr = typeof options.mood === "string" ? options.mood : "serious";

    // Save record in Database
    let record = await prisma.backgroundMusic.findFirst({
      where: {
        storageKey,
      },
    });

    if (!record) {
      record = await prisma.backgroundMusic.create({
        data: {
          name: trackName,
          mood: moodStr,
          url: `/api/assets/${storageKey}`,
          storageKey,
          duration,
          bpm: options.bpm || null,
          isDefault: false,
        },
      });
    }

    const trackMeta: MusicTrack = {
      externalId: `acestep-${hash}`,
      provider: this.name,
      name: trackName,
      artist: `ACE-Step 1.5 (${engine})`,
      mood: moodStr,
      url: `/api/assets/${storageKey}`,
      previewUrl: `/api/assets/${storageKey}`,
      downloadUrl: `/api/assets/${storageKey}`,
      duration,
      bpm: options.bpm,
      license: "AI Generated (NewsStudio / Modern-TTS)",
      tags: ["ai-generated", "acestep", moodStr],
    };

    return {
      id: record.id,
      storageKey,
      name: trackName,
      mood: moodStr,
      duration,
      provider: this.name,
      isAiGenerated: true,
      isFallback: false,
      track: trackMeta,
    };
  }

  /**
   * Search interface compliance for MusicProvider.
   */
  async search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]> {
    // If search is explicitly invoked on the ACE-Step provider, return matching existing DB tracks
    const existing = await prisma.backgroundMusic.findMany({
      where: {
        storageKey: { contains: "acestep" },
        ...(options?.mood ? { mood: options.mood } : {}),
        ...(query ? { name: { contains: query } } : {}),
      },
      take: options?.perPage || 5,
    });

    return existing.map((r) => ({
      externalId: r.id,
      provider: this.name,
      name: r.name,
      artist: "ACE-Step 1.5",
      mood: r.mood,
      url: r.url,
      previewUrl: r.url,
      downloadUrl: r.url,
      duration: r.duration,
      bpm: r.bpm ?? undefined,
      license: "AI Generated",
      tags: ["ai-generated", "acestep", r.mood],
    }));
  }
}
