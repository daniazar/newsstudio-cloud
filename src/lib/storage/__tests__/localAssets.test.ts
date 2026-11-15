// @vitest-environment node
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import {
  normalizeAssetRelPath,
  resolveLocalActionLoopVideo,
  resolveLocalPublicFile,
} from "../localAssets";
import { rewritePropsToLocalMedia, stopLocalMediaServer } from "../../video/localMediaServer";

describe("localAssets & localMediaServer", () => {
  let tmpRoot: string;
  const origEnv: Record<string, string | undefined> = {};

  const ENV_KEYS = [
    "LOCAL_PUBLIC_ROOT",
    "LOCAL_ACTION_LOOPS_ROOT",
    "LOCAL_AVATARS_ROOT",
    "NEXT_PUBLIC_S3_PUBLIC_URL",
    "S3_KEY_PREFIX",
  ];

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      origEnv[k] = process.env[k];
    }
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "newsstudio-local-assets-"));
    const publicDir = path.join(tmpRoot, "public");
    const veoDir = path.join(publicDir, "assets", "action_loops", "veo");
    const avatarsDir = path.join(publicDir, "avatars");

    fs.mkdirSync(path.join(veoDir, "connor_white_oxford_dress_shirt"), { recursive: true });
    fs.mkdirSync(path.join(veoDir, "Old", "connor_white_oxford_dress_shirt"), { recursive: true });
    fs.mkdirSync(path.join(veoDir, "ruby_burgundy"), { recursive: true });
    fs.mkdirSync(avatarsDir, { recursive: true });

    fs.writeFileSync(
      path.join(veoDir, "connor_white_oxford_dress_shirt", "connor_white_oxford_dress_shirt_M1_dynamic_v1.mp4"),
      Buffer.from("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
    );
    fs.writeFileSync(
      path.join(veoDir, "connor_white_oxford_dress_shirt", "connor_white_oxford_dress_shirt_M5_loop_v1__take_999.mp4"),
      Buffer.from("RAW_TAKE_SHOULD_NOT_WIN")
    );
    fs.writeFileSync(
      path.join(veoDir, "connor_white_oxford_dress_shirt", "connor_white_oxford_dress_shirt_M5_loop_v1.mp4"),
      Buffer.from("CANONICAL_M5_CLIP")
    );
    fs.writeFileSync(
      path.join(veoDir, "Old", "connor_white_oxford_dress_shirt", "connor_white_oxford_dress_shirt_M1_loop_v1.mp4"),
      Buffer.from("OLD_BACKUP_IGNORED")
    );
    fs.writeFileSync(path.join(avatarsDir, "ruby.png"), Buffer.from("PNG_AVATAR_BYTES"));

    process.env.LOCAL_PUBLIC_ROOT = publicDir;
    process.env.LOCAL_ACTION_LOOPS_ROOT = path.join(publicDir, "assets", "action_loops");
    process.env.LOCAL_AVATARS_ROOT = avatarsDir;
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL = "https://pub-74684c2ace744cbc92c4179fc608117b.r2.dev";
    process.env.S3_KEY_PREFIX = "";
  });

  afterEach(async () => {
    await stopLocalMediaServer();
    for (const k of ENV_KEYS) {
      if (origEnv[k] === undefined) delete process.env[k];
      else process.env[k] = origEnv[k];
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await stopLocalMediaServer();
  });

  it("normalizes relative paths, /r2/ proxies, and R2 URLs while blocking traversal", () => {
    expect(
      normalizeAssetRelPath("/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4?v=1")
    ).toBe("assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4");

    expect(normalizeAssetRelPath("/r2/avatars/ruby.png#hash")).toBe("avatars/ruby.png");

    expect(
      normalizeAssetRelPath(
        "https://pub-74684c2ace744cbc92c4179fc608117b.r2.dev/assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4"
      )
    ).toBe("assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4");

    process.env.NEXT_PUBLIC_S3_PUBLIC_URL = "https://cdn.example.com";
    process.env.S3_KEY_PREFIX = "newsstudio";
    expect(normalizeAssetRelPath("https://cdn.example.com/newsstudio/avatars/ruby.png")).toBe(
      "avatars/ruby.png"
    );

    expect(normalizeAssetRelPath("../etc/passwd")).toBeNull();
    expect(normalizeAssetRelPath("/assets/../../secret.txt")).toBeNull();
    expect(normalizeAssetRelPath("C:\\Windows\\System32\\cmd.exe")).toBeNull();
    expect(normalizeAssetRelPath("https://images.pexels.com/photos/123.jpeg")).toBeNull();
  });

  it("resolves canonical local action loops ahead of raw __take_ files and excludes Old/ folders", () => {
    const connorR2 =
      "https://pub-74684c2ace744cbc92c4179fc608117b.r2.dev/assets/action_loops/veo/connor_white_oxford_dress_shirt/connor_white_oxford_dress_shirt_M1_dynamic_v1.mp4";
    const resolvedFromR2 = resolveLocalPublicFile(connorR2);
    expect(resolvedFromR2).toContain("connor_white_oxford_dress_shirt_M1_dynamic_v1.mp4");

    const connorDefault = resolveLocalActionLoopVideo("connor");
    expect(connorDefault).toContain("connor_white_oxford_dress_shirt_M1_dynamic_v1.mp4");
    expect(connorDefault).not.toContain("Old");

    const connorM5 = resolveLocalActionLoopVideo("connor", "M5");
    expect(connorM5).toContain("connor_white_oxford_dress_shirt_M5_loop_v1.mp4");
    expect(connorM5).not.toContain("__take_");
  });

  it("serves local files with 200 and 206 byte ranges and rewrites only locally existing props", async () => {
    const input = {
      segments: [
        {
          presenterVideoSrc:
            "https://pub-74684c2ace744cbc92c4179fc608117b.r2.dev/assets/action_loops/veo/connor_white_oxford_dress_shirt/connor_white_oxford_dress_shirt_M1_dynamic_v1.mp4",
          personaAvatarUrl: "/avatars/ruby.png",
          audioSrc: "https://pub-74684c2ace744cbc92c4179fc608117b.r2.dev/tenants/org1/audio/missing_remote.wav",
          bRollSrc: "https://images.pexels.com/photos/999/pexels-photo-999.jpeg",
        },
      ],
    };

    const { props, rewrittenCount, baseUrl } = await rewritePropsToLocalMedia(input);
    expect(rewrittenCount).toBe(2);
    expect(props.segments[0].presenterVideoSrc.startsWith(`${baseUrl}/local-media/`)).toBe(true);
    expect(props.segments[0].personaAvatarUrl.startsWith(`${baseUrl}/local-media/`)).toBe(true);
    expect(props.segments[0].audioSrc).toBe(input.segments[0].audioSrc);
    expect(props.segments[0].bRollSrc).toBe(input.segments[0].bRollSrc);

    const fullResp = await fetch(props.segments[0].presenterVideoSrc);
    expect(fullResp.status).toBe(200);
    expect(fullResp.headers.get("accept-ranges")).toBe("bytes");
    expect(fullResp.headers.get("content-type")).toBe("video/mp4");
    expect(await fullResp.text()).toBe(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    );

    const rangeResp = await fetch(props.segments[0].presenterVideoSrc, {
      headers: { Range: "bytes=10-15" },
    });
    expect(rangeResp.status).toBe(206);
    expect(rangeResp.headers.get("content-range")).toBe("bytes 10-15/62");
    expect(await rangeResp.text()).toBe("ABCDEF");

    const notFoundResp = await fetch(`${baseUrl}/local-media/assets/does_not_exist.mp4`);
    expect(notFoundResp.status).toBe(404);

    // Send raw path option directly over HTTP to bypass client-side URL normalization
    const targetUrl = new URL(baseUrl);
    const rawTraversalStatus = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          hostname: targetUrl.hostname,
          port: Number(targetUrl.port),
          path: "/local-media/%2e%2e/secret.txt",
          method: "GET",
        },
        (res) => {
          res.resume();
          resolve(res.statusCode || 0);
        }
      );
      req.on("error", reject);
      req.end();
    });
    expect(rawTraversalStatus).toBe(403);
  });
});
