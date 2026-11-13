import { describe, it, expect } from "vitest";
import path from "path";
import { isPathInside, resolveSafeMediaFilePath } from "../pathSanitizer";

describe("Path Traversal & Safe Basename Validations", () => {
  const allowedDirs = [
    path.resolve(process.cwd(), "public/presets/voices"),
    path.resolve(process.cwd(), "public/voices"),
  ];

  function resolveSafePath(filename: string): string | null {
    if (!filename || typeof filename !== "string") return null;
    const safeFilename = path.basename(filename);
    if (!/^[a-zA-Z0-9_.-]+\.(wav|mp3|ogg)$/i.test(safeFilename)) {
      return null;
    }

    for (const dir of allowedDirs) {
      const candidate = path.resolve(dir, safeFilename);
      if (candidate.startsWith(dir + path.sep)) {
        return candidate;
      }
    }
    return null;
  }

  it("rejects path traversal sequences", () => {
    expect(resolveSafePath("../../../etc/passwd")).toBeNull();
    expect(resolveSafePath("..\\..\\Windows\\win.ini")).toBeNull();
    expect(resolveSafePath("/etc/shadow.wav")).not.toBeNull(); // basename becomes shadow.wav, confined to dir
    const resolved = resolveSafePath("/etc/shadow.wav");
    expect(resolved?.startsWith(allowedDirs[0]) || resolved?.startsWith(allowedDirs[1])).toBe(true);
  });

  it("rejects invalid extensions", () => {
    expect(resolveSafePath("exploit.exe")).toBeNull();
    expect(resolveSafePath("script.sh")).toBeNull();
    expect(resolveSafePath("data.json")).toBeNull();
  });

  it("accepts valid filenames with supported audio extensions", () => {
    const valid = resolveSafePath("ruby_anchor.wav");
    expect(valid).toBe(path.resolve(allowedDirs[0], "ruby_anchor.wav"));
  });

  describe("pathSanitizer utility", () => {
    it("correctly identifies paths inside parent directories", () => {
      const parent = path.resolve(process.cwd(), "public");
      expect(isPathInside(parent, path.resolve(parent, "avatars/ruby.png"))).toBe(true);
      expect(isPathInside(parent, path.resolve(parent, "../../../Windows/win.ini"))).toBe(false);
      expect(isPathInside(parent, path.resolve(parent, "../.env"))).toBe(false);
    });

    it("guards resolveSafeMediaFilePath against null bytes and escaping paths", () => {
      expect(resolveSafeMediaFilePath("file\0.png")).toBeNull();
      expect(resolveSafeMediaFilePath("../../../etc/passwd")).toBeNull();
      expect(resolveSafeMediaFilePath("C:\\Windows\\System32\\cmd.exe")).toBeNull();
    });
  });
});
