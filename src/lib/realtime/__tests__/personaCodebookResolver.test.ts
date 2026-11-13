import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Persona & Attire Viseme Codebook Suite", () => {
  const visemeDir = path.resolve(process.cwd(), "public/assets/avatars/visemes");

  it("validates Mateo avatar codebook exists and has 256 canonical visemes", () => {
    const mateoPath = path.join(visemeDir, "mateo_ditto_fullface_codebook.json");
    expect(fs.existsSync(mateoPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(mateoPath, "utf-8"));
    expect(data.formatVersion).toMatch(/^ditto-v[12]$/);
    expect(data.avatarId).toBe("mateo");
    expect(data.visemeCount).toBe(256);
    expect(data.resolution).toEqual([256, 256]);
    expect(data.canonicalAnchor.cx0).toBe(128.0);
    expect(data.canonicalAnchor.cy0).toBe(110.0);
    expect(data.visemes.length).toBe(256);

    const uniqueDataUrls = new Set(data.visemes.map((v: any) => v.dataUrl));
    expect(uniqueDataUrls.size).toBe(256);

    for (let i = 0; i < 256; i++) {
      const v = data.visemes[i];
      expect(v.clusterId).toBe(i);
      expect(v.dataUrl).toMatch(/^data:image\/webp;base64,/);
      expect(typeof v.aperture).toBe("number");
      expect(typeof v.width).toBe("number");
      expect(typeof v.jawDescent).toBe("number");
      expect(typeof v.simHash).toBe("string");
      expect(["rounded", "neutral_narrow", "neutral", "spread"]).toContain(v.articulationTrack);
    }
  });

  it("validates Mateo default trait attire codebook exists and has 256 canonical visemes", () => {
    const attirePath = path.join(visemeDir, "mateo_default_trait_ditto_fullface_codebook.json");
    expect(fs.existsSync(attirePath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(attirePath, "utf-8"));
    expect(data.formatVersion).toMatch(/^ditto-v[12]$/);
    expect(data.avatarId).toBe("mateo_default_trait");
    expect(data.visemeCount).toBe(256);
    expect(data.visemes.length).toBe(256);
    expect(data.visemes[0].clusterId).toBe(0);
    expect(data.visemes[255].clusterId).toBe(255);
  });

  it("verifies hierarchical resolution cascade rules", () => {
    function resolveCandidates(personaId: string, mediaSrc: string): string[] {
      const pId = (personaId || "ruby").toLowerCase();
      const src = (mediaSrc || "").toLowerCase();

      let attireId = "";
      if (src.includes("/veo/")) {
        const parts = src.split("/veo/")[1]?.split("/");
        if (parts && parts[0]) attireId = parts[0];
      }
      let avatarId = "";
      if (src.includes("/avatars/")) {
        const file = src.split("/avatars/")[1]?.split("?")[0]?.replace(".png", "")?.replace(".jpg", "");
        if (file) avatarId = file;
      }

      const candidateUrls: string[] = [];
      if (attireId) candidateUrls.push(`/assets/avatars/visemes/${attireId}_ditto_fullface_codebook.json`);
      if (avatarId && avatarId !== attireId) candidateUrls.push(`/assets/avatars/visemes/${avatarId}_ditto_fullface_codebook.json`);
      if (pId && pId !== avatarId && pId !== attireId) candidateUrls.push(`/assets/avatars/visemes/${pId}_ditto_fullface_codebook.json`);
      if (pId === "ruby" || avatarId.includes("ruby") || attireId.includes("ruby")) {
        candidateUrls.push("/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json");
      }

      return candidateUrls;
    }

    // 1. Action loop video for Mateo
    const candidatesVideo = resolveCandidates(
      "mateo",
      "/assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4"
    );
    expect(candidatesVideo[0]).toBe("/assets/avatars/visemes/mateo_default_trait_ditto_fullface_codebook.json");
    expect(candidatesVideo[1]).toBe("/assets/avatars/visemes/mateo_ditto_fullface_codebook.json");
    expect(candidatesVideo.length).toBe(2);

    // 2. Static avatar image for Ruby
    const candidatesRuby = resolveCandidates("ruby", "/avatars/ruby.png");
    expect(candidatesRuby[0]).toBe("/assets/avatars/visemes/ruby_ditto_fullface_codebook.json");
    expect(candidatesRuby[1]).toBe("/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json");

    // 4. Standalone action loop video
    function resolveCandidatesWithLoops(personaId: string, mediaSrc: string): string[] {
      const pId = (personaId || "ruby").toLowerCase();
      const src = (mediaSrc || "").toLowerCase();

      let attireId = "";
      if (src.includes("/veo/")) {
        const parts = src.split("/veo/")[1]?.split("/");
        if (parts && parts[0]) attireId = parts[0];
      } else if (src.includes("/action_loops/")) {
        const filename = src.split("/action_loops/")[1]?.split("?")[0]?.replace(".mp4", "")?.replace(".webm", "");
        if (filename) attireId = filename;
      }
      let avatarId = "";
      if (src.includes("/avatars/")) {
        const file = src.split("/avatars/")[1]?.split("?")[0]?.replace(".png", "")?.replace(".jpg", "");
        if (file) avatarId = file;
      }

      const candidateUrls: string[] = [];
      if (attireId) candidateUrls.push(`/assets/avatars/visemes/${attireId}_ditto_fullface_codebook.json`);
      if (avatarId && avatarId !== attireId) candidateUrls.push(`/assets/avatars/visemes/${avatarId}_ditto_fullface_codebook.json`);
      if (pId && pId !== avatarId && pId !== attireId) candidateUrls.push(`/assets/avatars/visemes/${pId}_ditto_fullface_codebook.json`);
      if (pId === "ruby" || avatarId.includes("ruby") || attireId.includes("ruby")) {
        candidateUrls.push("/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json");
      }

      return candidateUrls;
    }

    const candidatesStandalone = resolveCandidatesWithLoops("ruby", "/assets/action_loops/ruby_emerald_blazer_loop_v1.mp4");
    expect(candidatesStandalone[0]).toBe("/assets/avatars/visemes/ruby_emerald_blazer_loop_v1_ditto_fullface_codebook.json");
  });

  it("verifies all 50 primary persona avatars have dedicated fullface codebooks", () => {
    const avatarFiles = fs.readdirSync(path.resolve(process.cwd(), "public/avatars"))
      .filter(f => f.endsWith(".png") && !f.includes("_ref") && !f.includes("_body") && !f.includes("_uncensored") && !f.includes("seated") && !f.includes("salesman"));

    for (const af of avatarFiles) {
      const aid = path.basename(af, ".png").toLowerCase();
      const cbPath = path.join(visemeDir, `${aid}_ditto_fullface_codebook.json`);
      expect(fs.existsSync(cbPath), `Missing codebook for avatar: ${aid}`).toBe(true);
      const stats = fs.statSync(cbPath);
      expect(stats.size).toBeGreaterThan(100_000);
    }
  });

  it("verifies all 36 attire action loop sets have dedicated fullface codebooks", () => {
    const veoDir = path.resolve(process.cwd(), "public/assets/action_loops/veo");
    const attireDirs = fs.readdirSync(veoDir)
      .filter(d => fs.statSync(path.join(veoDir, d)).isDirectory() && !d.includes("backup") && !d.includes("analysis") && !d.includes("archive") && !d.startsWith("_") && !d.toLowerCase().startsWith("old"));

    for (const ad of attireDirs) {
      const cbPath = path.join(visemeDir, `${ad}_ditto_fullface_codebook.json`);
      expect(fs.existsSync(cbPath), `Missing codebook for attire: ${ad}`).toBe(true);
      const stats = fs.statSync(cbPath);
      expect(stats.size).toBeGreaterThan(100_000);
    }
  });

  it("verifies all standalone action loops have dedicated fullface codebooks", () => {
    const loopFiles = fs.readdirSync(path.resolve(process.cwd(), "public/assets/action_loops"))
      .filter(f => f.endsWith(".mp4"));

    for (const lf of loopFiles) {
      const lid = path.basename(lf, ".mp4").toLowerCase();
      const cbPath = path.join(visemeDir, `${lid}_ditto_fullface_codebook.json`);
      expect(fs.existsSync(cbPath), `Missing codebook for standalone loop: ${lid}`).toBe(true);
      const stats = fs.statSync(cbPath);
      expect(stats.size).toBeGreaterThan(100_000);
    }
  });

  it("verifies all 3 viseme codebook modes (ditto_fullface, ditto, m1) exist and have valid canonicalAnchor", () => {
    const expectedFiles = [
      "ruby_ditto_fullface_codebook.json",
      "ruby_ditto_codebook.json",
      "ruby_burgundy_ditto_fullface_codebook.json",
      "ruby_burgundy_ditto_codebook.json",
      "ruby_burgundy_m1_codebook.json",
      "ruby_emerald_blazer_loop_v1_ditto_fullface_codebook.json",
      "ruby_emerald_blazer_loop_v1_ditto_codebook.json",
    ];

    for (const file of expectedFiles) {
      const cbPath = path.join(visemeDir, file);
      expect(fs.existsSync(cbPath), `Missing codebook: ${file}`).toBe(true);
      const data = JSON.parse(fs.readFileSync(cbPath, "utf-8"));
      expect(Array.isArray(data.visemes)).toBe(true);
      expect(data.visemes.length).toBeGreaterThanOrEqual(40);
      const w0 = data.canonicalAnchor?.w0 ?? data.canonicalAnchor?.w ?? 0;
      expect(w0).toBeGreaterThan(50);
    }

    const m1Data = JSON.parse(
      fs.readFileSync(path.join(visemeDir, "ruby_burgundy_m1_codebook.json"), "utf-8")
    );
    expect(m1Data.visemes.length).toBe(256);
    expect(m1Data.maskTopology).toBe("mouth-only-vermilion-v2");
    expect(m1Data.psnrDb).toBeGreaterThanOrEqual(48.0);
  });

  it("verifies resolvePresetPersonaId maps all VisemeCompositorStudio presets to existing 256-viseme codebooks", async () => {
    const { PLATE_PRESETS, resolvePresetPersonaId } = await import(
      "@/components/realtime/viseme-compositor/VisemeCompositorStudio"
    );
    expect(resolvePresetPersonaId({ id: "yuki_anime", src: "/avatars/yuki_anime.png" })).toBe("yuki_anime");
    expect(resolvePresetPersonaId({ id: "ruby_25deg", src: "/avatars/ruby/rotation/ruby_25deg.jpg" })).toBe("ruby_25deg");
    expect(
      resolvePresetPersonaId({
        id: "ruby_m1_video",
        src: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4",
      })
    ).toBe("ruby_burgundy");

    for (const preset of PLATE_PRESETS) {
      const pid = resolvePresetPersonaId(preset);
      for (const suffix of ["_ditto_fullface_codebook.json", "_ditto_codebook.json"]) {
        const cbPath = path.join(visemeDir, `${pid}${suffix}`);
        expect(fs.existsSync(cbPath), `Missing ${pid}${suffix} for preset ${preset.id}`).toBe(true);
        const data = JSON.parse(fs.readFileSync(cbPath, "utf-8"));
        expect(data.visemes.length).toBe(256);
        expect(data.psnrDb).toBeGreaterThanOrEqual(48.0);
      }
    }
  });

  it("verifies getVisemeCodebookCluster maps optical webcam jawOpen/lipPucker even when token is sil", async () => {
    const { getVisemeCodebookCluster } = await import("../liveAnchorStageEngine");
    expect(getVisemeCodebookCluster("sil", 0.0, 0.0, 0.0)).toBe(0);
    expect(getVisemeCodebookCluster("sil", 0.50, 0.0, 0.0)).toBeGreaterThan(15);
    expect(getVisemeCodebookCluster("sil", 0.25, 0.35, 0.0)).toBeGreaterThanOrEqual(22);
    expect(getVisemeCodebookCluster("sil", 0.25, 0.35, 0.0)).toBeLessThanOrEqual(29);
  });

  it("verifies getCanonicalMediaPipeFeatures guards against standing/attire/loop/angle sources and uses 1:1 0.50 mouth radiusX", async () => {
    const { getCanonicalMediaPipeFeatures } = await import("../personaCanonicalFaceHelper");
    const rubyMp = getCanonicalMediaPipeFeatures("/avatars/ruby.png", "ruby");
    expect(rubyMp).not.toBeNull();
    expect(rubyMp!.radiusX).toBeCloseTo(0.093038, 4);
    expect(rubyMp!.leftEyebrow[1]).toBeLessThan(rubyMp!.leftEyeCenter[1]);

    expect(getCanonicalMediaPipeFeatures("/avatars/master_image_ruby_standing_dark_green_blazer.png", "ruby")).toBeNull();
    expect(getCanonicalMediaPipeFeatures("/assets/avatars/ruby/veo/ruby_burgundy/ruby_burgundy_m1_loop_v1.mp4", "ruby")).toBeNull();
    expect(getCanonicalMediaPipeFeatures("/avatars/ruby_45deg.png", "ruby")).toBeNull();
  });
});

