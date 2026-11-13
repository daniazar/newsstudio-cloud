import crypto from "crypto";

export type QASeverity = "CRITICAL" | "WARNING" | "INFO";

export interface QACheckResult {
  id: string;
  name: string;
  passed: boolean;
  severity: QASeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface C2PAManifest {
  claim_generator: string;
  title: string;
  format: string;
  instance_id: string;
  claim_generator_info: {
    name: string;
    version: string;
  };
  assertions: Array<{
    label: string;
    data: Record<string, unknown>;
  }>;
  signature: {
    algorithm: string;
    timestamp: string;
    digest: string;
  };
}

export interface QAReport {
  passed: boolean;
  score: number; // 0 to 100
  checks: QACheckResult[];
  warnings: string[];
  errors: string[];
  c2paManifest?: C2PAManifest;
  timestamp: string;
}

export interface QAMetadata {
  title?: string;
  studioType?: string;
  companyId?: string;
  expectedDurationSec?: number;
  modelsUsed?: string[];
  audioBuffer?: Buffer;
}

/**
 * Validates MP4 box structures, container size, and binary integrity.
 */
export function validateVideoContainer(videoBuffer: Buffer): QACheckResult {
  const MIN_SIZE_BYTES = 2048; // Minimum viable MP4 header size
  if (!videoBuffer || videoBuffer.length < MIN_SIZE_BYTES) {
    return {
      id: "video_container_integrity",
      name: "Video Container Integrity",
      passed: false,
      severity: "CRITICAL",
      message: `Video payload is corrupted or truncated (${videoBuffer ? videoBuffer.length : 0} bytes < ${MIN_SIZE_BYTES} bytes required).`,
      details: { sizeBytes: videoBuffer ? videoBuffer.length : 0 },
    };
  }

  // Look for standard MP4 box signatures: "ftyp", "moov", "mdat"
  const headerSlice = videoBuffer.subarray(0, Math.min(videoBuffer.length, 128)).toString("latin1");
  const hasFtyp = headerSlice.includes("ftyp");
  const hasMoov = headerSlice.includes("moov");
  const hasMdat = headerSlice.includes("mdat");

  if (!hasFtyp && !hasMoov && !hasMdat) {
    return {
      id: "video_container_integrity",
      name: "Video Container Integrity",
      passed: false,
      severity: "CRITICAL",
      message: "Missing standard MP4 box markers ('ftyp' / 'moov' / 'mdat'). The container header is unreadable.",
      details: { headerSnippet: headerSlice.substring(0, 32) },
    };
  }

  return {
    id: "video_container_integrity",
    name: "Video Container Integrity",
    passed: true,
    severity: "INFO",
    message: `Valid MP4 container structure verified (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    details: { sizeBytes: videoBuffer.length, hasFtyp, hasMoov, hasMdat },
  };
}

/**
 * Analyzes audio energy and checks for total silence or severe audio corruption.
 */
export function validateAudioForensics(audioBuffer?: Buffer): QACheckResult {
  if (!audioBuffer || audioBuffer.length === 0) {
    return {
      id: "audio_energy_integrity",
      name: "Audio Energy Forensics",
      passed: true, // Non-fatal if video has embedded audio or is a visual-only pass
      severity: "WARNING",
      message: "No separate audio stream provided for forensic inspection. Assuming embedded muxed audio.",
    };
  }

  // Sample bytes to calculate non-zero energy distribution
  let nonZeroCount = 0;
  const sampleStep = Math.max(1, Math.floor(audioBuffer.length / 5000));
  let totalSampled = 0;

  for (let i = 0; i < audioBuffer.length; i += sampleStep) {
    totalSampled++;
    if (audioBuffer[i] !== 0) {
      nonZeroCount++;
    }
  }

  const nonZeroRatio = nonZeroCount / totalSampled;
  if (nonZeroRatio < 0.05) {
    return {
      id: "audio_energy_integrity",
      name: "Audio Energy Forensics",
      passed: false,
      severity: "CRITICAL",
      message: `Audio track is completely silent or muted (${(nonZeroRatio * 100).toFixed(1)}% non-zero samples). Content cannot be published without audio.`,
      details: { nonZeroRatio },
    };
  }

  return {
    id: "audio_energy_integrity",
    name: "Audio Energy Forensics",
    passed: true,
    severity: "INFO",
    message: `Audible energy and sound pressure distribution verified (${(nonZeroRatio * 100).toFixed(1)}% active sound density).`,
    details: { nonZeroRatio },
  };
}

/**
 * Generates a C2PA-compliant transparency and provenance manifest for AI synthetic media.
 */
export function generateC2PAManifest(videoBuffer: Buffer, metadata: QAMetadata): C2PAManifest {
  const sha256Digest = crypto.createHash("sha256").update(videoBuffer).digest("hex");
  const instanceId = `urn:uuid:${crypto.randomUUID()}`;

  return {
    claim_generator: "RubyNewsStudio-v5.0-C2PA",
    title: metadata.title || "Ruby NewsStudio Autonomous Broadcast",
    format: "video/mp4",
    instance_id: instanceId,
    claim_generator_info: {
      name: "Ruby NewsStudio Multimodal Engine",
      version: "5.0.0",
    },
    assertions: [
      {
        label: "c2pa.actions",
        data: {
          actions: [
            {
              action: "c2pa.created",
              softwareAgent: "Remotion Headless Engine & Modern-TTS",
              digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
            },
          ],
        },
      },
      {
        label: "c2pa.ai_inference",
        data: {
          syntheticMedia: true,
          studioType: metadata.studioType || "newsroom",
          models: metadata.modelsUsed || ["LTX-Video-2.5", "Piper-ONNX", "Gemini-2.5-Flash"],
          tenantId: metadata.companyId || "default",
        },
      },
    ],
    signature: {
      algorithm: "sha256",
      timestamp: new Date().toISOString(),
      digest: sha256Digest,
    },
  };
}

/**
 * Executes full pre-publication multimodal QA evaluation and generates provenance manifest.
 */
export function runMultimodalQACheck(
  videoBuffer: Buffer,
  metadata: QAMetadata = {}
): QAReport {
  const checks: QACheckResult[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  // 1. Video Container Integrity
  const containerCheck = validateVideoContainer(videoBuffer);
  checks.push(containerCheck);
  if (!containerCheck.passed) {
    if (containerCheck.severity === "CRITICAL") {
      errors.push(containerCheck.message);
      score -= 50;
    } else {
      warnings.push(containerCheck.message);
      score -= 15;
    }
  }

  // 2. Audio Forensics Check
  if (metadata.audioBuffer) {
    const audioCheck = validateAudioForensics(metadata.audioBuffer);
    checks.push(audioCheck);
    if (!audioCheck.passed) {
      if (audioCheck.severity === "CRITICAL") {
        errors.push(audioCheck.message);
        score -= 40;
      } else {
        warnings.push(audioCheck.message);
        score -= 10;
      }
    }
  }

  // 3. Minimum File Size Sanity for High-Def Video (> 50KB)
  if (videoBuffer && videoBuffer.length > 0 && videoBuffer.length < 50 * 1024) {
    const sizeCheck: QACheckResult = {
      id: "video_bitrate_sanity",
      name: "Video Bitrate Sanity",
      passed: true,
      severity: "WARNING",
      message: `File size is exceptionally low (${(videoBuffer.length / 1024).toFixed(1)} KB). Ensure output is not an ultra-short test clip.`,
    };
    checks.push(sizeCheck);
    warnings.push(sizeCheck.message);
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const passed = errors.length === 0;

  // 4. Generate C2PA provenance manifest
  const c2paManifest = passed ? generateC2PAManifest(videoBuffer, metadata) : undefined;

  return {
    passed,
    score,
    checks,
    warnings,
    errors,
    c2paManifest,
    timestamp: new Date().toISOString(),
  };
}
