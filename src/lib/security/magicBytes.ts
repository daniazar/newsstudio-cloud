/**
 * src/lib/security/magicBytes.ts
 *
 * Validates binary media signatures (magic bytes) to prevent arbitrary file upload,
 * executable injection, and MIME spoofing attacks ([SEC-24]).
 */

import { logSecurityEvent } from "@/lib/security/auditLogger";

export interface ValidationResult {
  valid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Checks whether a buffer begins with a given sequence of bytes.
 */
function matchesBytes(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Checks whether a buffer starts with an ASCII string.
 */
function matchesAscii(buffer: Buffer, str: string, offset = 0): boolean {
  if (buffer.length < offset + str.length) return false;
  return buffer.toString("ascii", offset, offset + str.length) === str;
}

/**
 * Detects the media format based on signature magic bytes.
 */
export function detectMediaType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // Explicitly detect dangerous signatures first
  // Windows PE (.exe, .dll)
  if (matchesBytes(buffer, [0x4d, 0x5a])) {
    return "application/x-dosexec";
  }
  // Linux ELF binary
  if (matchesBytes(buffer, [0x7f, 0x45, 0x4c, 0x46])) {
    return "application/x-executable";
  }
  // Scripts: PHP, Shell, JavaScript, HTML
  const startAscii = buffer.toString("utf8", 0, Math.min(buffer.length, 64)).toLowerCase();
  if (
    startAscii.startsWith("<?php") ||
    startAscii.startsWith("#!/") ||
    startAscii.includes("<script") ||
    startAscii.includes("<?xml")
  ) {
    return "application/x-script";
  }

  // Images
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchesBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (matchesBytes(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // GIF: GIF87a or GIF89a
  if (matchesAscii(buffer, "GIF87a") || matchesAscii(buffer, "GIF89a")) {
    return "image/gif";
  }
  // WEBP: RIFF....WEBP
  if (matchesAscii(buffer, "RIFF", 0) && matchesAscii(buffer, "WEBP", 8)) {
    return "image/webp";
  }

  // Audio
  // WAV: RIFF....WAVE
  if (matchesAscii(buffer, "RIFF", 0) && matchesAscii(buffer, "WAVE", 8)) {
    return "audio/wav";
  }
  // MP3: ID3 tag or MPEG sync word (FF FB / FF F3 / FF F2)
  if (matchesAscii(buffer, "ID3")) {
    return "audio/mpeg";
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }
  // OGG: OggS
  if (matchesAscii(buffer, "OggS")) {
    return "audio/ogg";
  }

  // Video
  // MP4 / MOV / M4V: ftyp box at offset 4
  if (buffer.length >= 8 && matchesAscii(buffer, "ftyp", 4)) {
    return "video/mp4";
  }
  // WEBM / MKV: 1A 45 DF A3
  if (matchesBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return "video/webm";
  }

  return null;
}

const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/**
 * Validates whether the buffer is a legitimate media file and not an executable or malicious script.
 */
export function validateMediaBuffer(buffer: Buffer, declaredType?: string): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file buffer" };
  }

  const detected = detectMediaType(buffer);

  if (detected === "application/x-dosexec" || detected === "application/x-executable") {
    logSecurityEvent({
      eventType: "SUSPICIOUS_PAYLOAD",
      severity: "CRITICAL",
      action: "upload_magic_bytes_inspection",
      details: { detectedType: detected, declaredType },
    });
    return {
      valid: false,
      detectedType: detected,
      error: "Malicious file upload detected: executable binaries are strictly forbidden.",
    };
  }

  if (detected === "application/x-script") {
    logSecurityEvent({
      eventType: "SUSPICIOUS_PAYLOAD",
      severity: "CRITICAL",
      action: "upload_magic_bytes_inspection",
      details: { detectedType: detected, declaredType },
    });
    return {
      valid: false,
      detectedType: detected,
      error: "Malicious file upload detected: script payloads are strictly forbidden.",
    };
  }

  if (!detected || !ALLOWED_MEDIA_TYPES.has(detected)) {
    return {
      valid: false,
      detectedType: detected || "unknown",
      error: `Unsupported file format. Only images (PNG, JPEG, WEBP, GIF), audio (WAV, MP3, OGG), and video (MP4, WEBM) are permitted.`,
    };
  }

  // If declaredType was provided, check for critical mismatch (e.g. executable claimed to be image)
  if (declaredType) {
    const normDeclared = declaredType.toLowerCase().trim();
    const declaredGroup = normDeclared.split("/")[0]; // "image", "video", "audio"
    const detectedGroup = detected.split("/")[0];

    // Mismatched major type (e.g. declared video but uploaded image, or declared image but uploaded audio)
    if (declaredGroup && detectedGroup && declaredGroup !== detectedGroup) {
      return {
        valid: false,
        detectedType: detected,
        error: `File signature mismatch: declared "${normDeclared}" but content signature is "${detected}".`,
      };
    }
  }

  return {
    valid: true,
    detectedType: detected,
  };
}
