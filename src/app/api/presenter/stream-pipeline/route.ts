import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { storage } from "@/lib/storage";

const StreamBeatSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  audioUrl: z.string().optional(),
  avatarId: z.string().default("ruby_intro_welcome"),
  durationSec: z.number().optional(),
});

const StreamPipelineRequestSchema = z.object({
  personaId: z.string().default("ruby"),
  beats: z.array(StreamBeatSchema).min(1),
  chunkMode: z.enum(["progressive_2s", "full_beat"]).default("progressive_2s"),
  fps: z.number().default(25),
});

const GESTURE_AUDIO_MAP: Record<string, string> = {
  ruby_intro_welcome: "/app/storage/cache/ruby_1min_audio/scene_00_ruby_intro_welcome.wav",
  ruby_breaking_alert: "/app/storage/cache/ruby_1min_audio/scene_01_ruby_breaking_alert.wav",
  ruby_gesture_right: "/app/storage/cache/ruby_1min_audio/scene_02_ruby_gesture_right.wav",
  ruby_emphasis_nod: "/app/storage/cache/ruby_1min_audio/scene_03_ruby_emphasis_nod.wav",
  ruby_look_down_notes: "/app/storage/cache/ruby_1min_audio/scene_04_ruby_look_down_notes.wav",
  ruby_gesture_left: "/app/storage/cache/ruby_1min_audio/scene_05_ruby_gesture_left.wav",
  ruby_deep_thought_analyst: "/app/storage/cache/ruby_1min_audio/scene_06_ruby_deep_thought_analyst.wav",
  ruby_listen_tilt: "/app/storage/cache/ruby_1min_audio/scene_07_ruby_listen_tilt.wav",
  ruby_idle: "/app/storage/cache/ruby_1min_audio/scene_08_ruby_idle.wav",
  ruby_signoff_outro: "/app/storage/cache/ruby_1min_audio/scene_09_ruby_signoff_outro.wav",
};

const SAMPLE_DEFAULT_TEXTS = new Set([
  "Welcome to Ruby NewsStudio. Today we explore real-time neural streaming architectures.",
  "Breaking news: subvideo transmission achieves sub-second first-frame delivery.",
  "Leading technology firms reported exceptional quarterly gains today, driven by accelerated neural deployment.",
  "Analysts confirm that real-time video inference is reshaping digital media workflows permanently.",
  "Looking at the latest market indicators, semiconductor equities surged over four percent.",
  "On the international stage, central banks signaled coordinated computational expansion.",
  "Taking a deeper look at the fundamentals, enterprise infrastructure demand shows no signs of slowing down.",
  "Our technical panel notes that hardware-accelerated pipelines are setting brand-new broadcast benchmarks.",
  "We will continue monitoring these developments live from our studio newsroom throughout the evening.",
  "Thank you for watching Ruby NewsStudio. Stay tuned, and have a wonderful evening.",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = StreamPipelineRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid stream request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { personaId, beats, chunkMode, fps } = parsed.data;

    // Create ReadableStream for NDJSON streaming
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        let isAborted = false;
        // Keep-alive ping interval to prevent cloud proxy session timeouts (15s)
        const pingInterval = setInterval(() => {
          if (isAborted) return;
          try {
            sendEvent({ type: "ping", ts: Date.now() });
          } catch {
            isAborted = true;
          }
        }, 15000);

        const abortHandler = () => {
          isAborted = true;
          clearInterval(pingInterval);
          try {
            controller.close();
          } catch {}
        };
        req.signal.addEventListener("abort", abortHandler, { once: true });

        try {
          sendEvent({
            type: "stream_init",
            personaId,
            totalBeats: beats.length,
            chunkMode,
            timestamp: Date.now(),
          });

          const tmpCacheDir = path.join(os.tmpdir(), "stream_cache");
          fs.mkdirSync(tmpCacheDir, { recursive: true });

          for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
            if (isAborted) break;
            const beat = beats[beatIdx];
            const beatAvatarId = beat.avatarId || "ruby_idle";
            const beatId = beat.id || `beat_${beatIdx}_${Date.now()}`;

            sendEvent({
              type: "beat_start",
              beatIndex: beatIdx,
              beatId,
              avatarId: beatAvatarId,
              text: beat.text || "",
            });

            // 1. Resolve Audio Path for Avatar
            let audioDockerPath = GESTURE_AUDIO_MAP[beatAvatarId] || GESTURE_AUDIO_MAP["ruby_idle"];

            // If custom text is provided that is not empty and beat has no pre-mapped audio or differs from sample:
            if (beat.text && (!GESTURE_AUDIO_MAP[beatAvatarId] || beat.text.length > 5 && !SAMPLE_DEFAULT_TEXTS.has(beat.text.trim()))) {
              try {
                const { generateAudioWithModernTtsResult } = await import("@/lib/tts/modernTtsClient");
                const ttsRes = await generateAudioWithModernTtsResult(beat.text, "", {
                  personaId: personaId,
                  language: personaId === "blaze" ? "en" : "es",
                  engine: "piper",
                });
                const tempAudioName = `tts_${beatId}_${Date.now()}.wav`;
                const tempAudioLocalPath = path.join(tmpCacheDir, tempAudioName);
                fs.writeFileSync(tempAudioLocalPath, Buffer.from(ttsRes.audioBuffer));
                audioDockerPath = tempAudioLocalPath;
              } catch (ttsErr: unknown) {
                console.warn(`[Stream-Pipeline] Modern-TTS fallback to default audio: ${ttsErr instanceof Error ? ttsErr.message : String(ttsErr)}`);
              }
            }

            // 2. Call MuseTalk Docker Server
            const t0 = performance.now();
            const payload = {
              avatar_id: beatAvatarId,
              audio_path: audioDockerPath,
              fps: fps,
              batch_size: 32,
              use_cache: true,
              use_silence_bypass: false,
            };

            const musetalkUrl = process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010";
            let resp = await fetch(`${musetalkUrl}/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(30000),
            }).catch(() => null);

            if (!resp || !resp.ok) {
              const legacyUrl = process.env.MUSETALK_LEGACY_URL;
              if (legacyUrl) {
                resp = await fetch(`${legacyUrl}/generate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                  signal: AbortSignal.timeout(30000),
                }).catch(() => null);
              }
            }

            if (!resp || !resp.ok) {
              const errText = resp ? await resp.text() : "Connection failed";
              sendEvent({
                type: "beat_error",
                beatIndex: beatIdx,
                error: `MuseTalk failed: ${errText}`,
              });
              continue;
            }

            const videoBuffer = Buffer.from(await resp.arrayBuffer());
            const genDurationMs = Math.round(performance.now() - t0);
            const fpsHeader = resp.headers.get("x-inference-fps");
            const serverFps = fpsHeader ? parseFloat(fpsHeader) : Math.round(1000 / (genDurationMs / 100));

            // Upload video chunk to storage abstraction layer
            const videoFileName = `stream_${beatId}_${Date.now()}.mp4`;
            const storageKey = `stream_cache/${videoFileName}`;
            let videoPublicPath = "";
            try {
              videoPublicPath = await storage.upload(storageKey, videoBuffer, "video/mp4");
            } catch {
              // Fallback to local temporary serving if storage is offline
              const fallbackPath = path.join(tmpCacheDir, videoFileName);
              fs.writeFileSync(fallbackPath, videoBuffer);
              videoPublicPath = storage.getUrl(storageKey);
            }

            const durationSec = beat.durationSec || (beatAvatarId.includes("gesture") || beatAvatarId.includes("analyst") || beatAvatarId.includes("listen") ? 8.56 : 4.28);

            // Emit chunk_ready event
            sendEvent({
              type: "chunk_ready",
              beatIndex: beatIdx,
              beatId,
              avatarId: beatAvatarId,
              videoUrl: videoPublicPath,
              durationSec,
              genDurationMs,
              serverFps,
              sizeBytes: videoBuffer.length,
              isLastBeat: beatIdx === beats.length - 1,
            });
          }

          sendEvent({
            type: "stream_complete",
            timestamp: Date.now(),
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          sendEvent({
            type: "stream_error",
            error: message,
          });
        } finally {
          req.signal.removeEventListener("abort", abortHandler);
          clearInterval(pingInterval);
          try {
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal streaming pipeline error", details: message },
      { status: 500 }
    );
  }
}
