import { describe, it, expect } from "vitest";
import { detectMediaType, validateMediaBuffer } from "@/lib/security/magicBytes";

describe("Phase 4: Magic Bytes Inspection & File Upload Hardening ([SEC-24])", () => {
  describe("1. detectMediaType", () => {
    it("detects PNG signatures", () => {
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      expect(detectMediaType(pngBuf)).toBe("image/png");
    });

    it("detects JPEG signatures", () => {
      const jpgBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMediaType(jpgBuf)).toBe("image/jpeg");
    });

    it("detects GIF signatures (GIF87a & GIF89a)", () => {
      const gif87 = Buffer.from("GIF87a\x00\x01\x00\x01");
      const gif89 = Buffer.from("GIF89a\x00\x01\x00\x01");
      expect(detectMediaType(gif87)).toBe("image/gif");
      expect(detectMediaType(gif89)).toBe("image/gif");
    });

    it("detects WEBP signatures", () => {
      // RIFF + 4 bytes size + WEBP
      const webpBuf = Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ");
      expect(detectMediaType(webpBuf)).toBe("image/webp");
    });

    it("detects MP4 signatures (ftyp box)", () => {
      // 4 bytes length + ftyp + brand
      const mp4Buf = Buffer.from("\x00\x00\x00\x18ftypisom\x00\x00\x02\x00");
      expect(detectMediaType(mp4Buf)).toBe("video/mp4");
    });

    it("detects WEBM signatures (EBML header)", () => {
      const webmBuf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00]);
      expect(detectMediaType(webmBuf)).toBe("video/webm");
    });

    it("detects WAV signatures", () => {
      const wavBuf = Buffer.from("RIFF\x00\x00\x00\x00WAVEfmt ");
      expect(detectMediaType(wavBuf)).toBe("audio/wav");
    });

    it("detects MP3 signatures (ID3 or sync word)", () => {
      const id3Buf = Buffer.from("ID3\x04\x00\x00\x00");
      expect(detectMediaType(id3Buf)).toBe("audio/mpeg");

      const syncBuf = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
      expect(detectMediaType(syncBuf)).toBe("audio/mpeg");
    });

    it("detects OGG signatures", () => {
      const oggBuf = Buffer.from("OggS\x00\x02\x00\x00");
      expect(detectMediaType(oggBuf)).toBe("audio/ogg");
    });

    it("detects and flags Windows PE executables (MZ)", () => {
      const exeBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // "MZ"
      expect(detectMediaType(exeBuf)).toBe("application/x-dosexec");
    });

    it("detects and flags Linux ELF executables", () => {
      const elfBuf = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // "\x7fELF"
      expect(detectMediaType(elfBuf)).toBe("application/x-executable");
    });

    it("detects and flags embedded scripts (PHP, shell, script tag)", () => {
      expect(detectMediaType(Buffer.from("<?php echo 'hello'; ?>"))).toBe("application/x-script");
      expect(detectMediaType(Buffer.from("#!/bin/bash\nrm -rf /"))).toBe("application/x-script");
      expect(detectMediaType(Buffer.from("<html><script>alert(1)</script></html>"))).toBe("application/x-script");
    });
  });

  describe("2. validateMediaBuffer", () => {
    it("validates legitimate media files", () => {
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = validateMediaBuffer(pngBuf, "image/png");
      expect(res.valid).toBe(true);
      expect(res.detectedType).toBe("image/png");
    });

    it("rejects executable binaries even if claimed to be images", () => {
      const fakeImage = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ executable
      const res = validateMediaBuffer(fakeImage, "image/png");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/executable binaries are strictly forbidden/);
    });

    it("rejects malicious script payloads disguised as images", () => {
      const fakeImage = Buffer.from("<?php system($_GET['cmd']); ?>");
      const res = validateMediaBuffer(fakeImage, "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/script payloads are strictly forbidden/);
    });

    it("rejects declared vs detected major type mismatches", () => {
      const mp4Buf = Buffer.from("\x00\x00\x00\x18ftypisom\x00\x00\x02\x00");
      const res = validateMediaBuffer(mp4Buf, "image/png"); // Declared image, but actually video
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/File signature mismatch/);
    });

    it("rejects empty buffers", () => {
      const res = validateMediaBuffer(Buffer.alloc(0));
      expect(res.valid).toBe(false);
      expect(res.error).toBe("Empty file buffer");
    });
  });
});
