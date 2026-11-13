import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface PiperSpeakerMap {
  [speakerId: string]: string;
}

interface PiperModelConfig {
  audio?: {
    sample_rate?: number;
    quality?: string;
  };
  espeak?: {
    voice?: string;
  };
  inference?: {
    noise_scale?: number;
    length_scale?: number;
    noise_w?: number;
    phoneme_silence?: number;
  };
  num_speakers?: number;
  speaker_id_map?: PiperSpeakerMap;
  language?: {
    code?: string;
    family?: string;
    region?: string;
    name_native?: string;
    name_english?: string;
    country_english?: string;
  };
  dataset?: string;
  model_type?: string;
}

interface InspectedModel {
  filename: string;
  configPath: string;
  sampleRate: number | null;
  language: string | null;
  languageCode: string | null;
  numSpeakers: number;
  speakerIds: string[];
  speakerMap: PiperSpeakerMap;
  quality: string | null;
  dataset: string | null;
  espeakVoice: string | null;
  modelType: string | null;
  inferenceParams: {
    noiseScale?: number;
    lengthScale?: number;
    noiseW?: number;
  } | null;
}

/**
 * GET /api/piper/inspect
 *
 * Scans checkpoints/piper/ (and public/presets/voices/) for .onnx.json config files
 * and returns parsed metadata: speaker ID maps, sample rates, phoneme configs.
 *
 * Used by Voice Studio to populate model selection and speaker dropdowns.
 */
export async function GET() {
  const scanDirs = [
    // Primary: vendor Modern-TTS-Server checkpoints
    path.join(process.cwd(), "vendor", "Modern-TTS-Server", "checkpoints", "piper"),
    // Secondary: public presets voices
    path.join(process.cwd(), "public", "presets", "voices"),
  ];

  const models: InspectedModel[] = [];
  const errors: string[] = [];

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;

    const scan = (currentDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath); // recurse into subdirectories
          continue;
        }

        if (!entry.name.endsWith(".onnx.json")) continue;

        // Resolve the .onnx base name
        const onnxFilename = entry.name.replace(/\.json$/, "");

        try {
          const raw = fs.readFileSync(fullPath, "utf8");
          const config: PiperModelConfig = JSON.parse(raw);

          const speakerMap: PiperSpeakerMap = config.speaker_id_map || {};
          const speakerIds = Object.keys(speakerMap);
          const numSpeakers = config.num_speakers ?? (speakerIds.length || 1);

          models.push({
            filename: onnxFilename,
            configPath: fullPath.replace(process.cwd(), "").replace(/\\/g, "/"),
            sampleRate: config.audio?.sample_rate ?? null,
            language: config.language?.name_english ?? null,
            languageCode: config.language?.code ?? null,
            numSpeakers,
            speakerIds,
            speakerMap,
            quality: config.audio?.quality ?? null,
            dataset: config.dataset ?? null,
            espeakVoice: config.espeak?.voice ?? null,
            modelType: config.model_type ?? null,
            inferenceParams: config.inference
              ? {
                  noiseScale: config.inference.noise_scale,
                  lengthScale: config.inference.length_scale,
                  noiseW: config.inference.noise_w,
                }
              : null,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse ${fullPath}: ${msg}`);
        }
      }
    };

    scan(dir);
  }

  // Sort: multi-speaker models first, then alphabetically
  models.sort((a, b) => {
    if (b.numSpeakers !== a.numSpeakers) return b.numSpeakers - a.numSpeakers;
    return a.filename.localeCompare(b.filename);
  });

  return NextResponse.json(
    {
      count: models.length,
      models,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
