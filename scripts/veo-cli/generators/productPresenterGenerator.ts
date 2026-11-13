/**
 * scripts/veo-cli/generators/productPresenterGenerator.ts
 *
 * E-Commerce UGC Video Ad & Product Showcase Generator.
 * Coordinates an anchor persona (@Ruby) holding, displaying, unboxing, or demonstrating a product
 * conditioned on a reference product photo (--product-image) and optional environment set (--env-image).
 * Supports paired Modern-TTS audio synthesis, background music (BGM) tagging, and sound effects (SFX).
 *
 * FULL TRI-BEAT FUSION:
 * Automatically fuses the 3 typology modes (e.g. Swatch ➔ Torture Test ➔ Room Reveal for Flooring;
 * Swatch ➔ Roller Application ➔ Room Reveal for Paint; Problem ➔ Dashboard ➔ Holographic HUD for SaaS)
 * into a single unified 24-second commercial with optical flow stitching.
 */

import fs from "fs";
import path from "path";
import { ProductPresenterOptions, ProductActionType } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { compileProductInteractionPrompt } from "../promptCompiler";
import { dispatchVeoGeneration } from "../engines/veoDispatcher";
import { stitchVideoClips } from "../processors/videoChainer";
import { printClickablePath } from "../artifactManager";
import {
  recordGeneration,
  calculateVideoCost,
  captureHardwareSnapshot,
  formatGenerationHud,
} from "../telemetry/generationLedger";

export interface ProductAdManifest {
  productName: string;
  productImagePath?: string;
  personaSlug: string;
  action: string;
  isFused?: boolean;
  beats?: { action: string; title: string; clipPath?: string }[];
  videoClipPath?: string;
  audioVoiceoverPath?: string;
  bgmGenre?: string;
  sfxCues: { tag: string; timestampSec: number }[];
  durationSeconds: number;
  aspectRatio: string;
  cost?: {
    flowCredits: number;
    usdEstimate: number;
    costPerSec: number;
    modelTier: string;
  };
  telemetry?: {
    totalLatencyMs: number;
    promptMs?: number;
    ttsMs?: number;
    videoInferenceMs?: number;
    stitchMs?: number;
    realtimeFactor: number;
    gpuPeakVramMb?: number;
    gpuTempC?: number;
  };
  createdAt: string;
}

interface FusedBeatPlan {
  action: ProductActionType;
  title: string;
  scriptSnippet: string;
  sfxTag: string;
}

/**
 * Resolves the 3-beat commercial storyboard for a given product typology
 */
function resolveFusedTypologyBeats(
  typology: string,
  productName: string,
  scriptContext?: string
): FusedBeatPlan[] {
  const lower = productName.toLowerCase();
  if (typology === "surface_material") {
    if (lower.includes("paint") || lower.includes("wall") || lower.includes("coat")) {
      return [
        {
          action: "swatch_reveal",
          title: "The Palette & Undertones",
          scriptSnippet: `Finding the perfect color shouldn't be a gamble. The new ${productName} brings rich designer pigments to your walls.`,
          sfxTag: "[sfx:whoosh]",
        },
        {
          action: "paint_application",
          title: "Flawless One-Coat Application",
          scriptSnippet: `One coat is all it takes. Ultra-matte, zero splatter, and completely streak-free coverage that hides imperfections effortlessly.`,
          sfxTag: "[sfx:pop]",
        },
        {
          action: "before_after_reveal",
          title: "Dramatic Room Transformation",
          scriptSnippet: `Transform your entire room in a single weekend. Claim your custom color kit today and elevate your home.`,
          sfxTag: "[sfx:shimmer]",
        },
      ];
    } else {
      // Flooring / Tiles / Countertops / Marble with technical specs extraction
      const context = `${productName} ${scriptContext || ""}`;
      const dimMatch = context.match(/(\d+\s*x\s*\d+\s*(?:cm|mm)?)/i);
      const thickMatch = context.match(/(\d+(?:[.,]\d+)?\s*mm)/i);
      const dimensions = dimMatch ? dimMatch[1] : "gran formato";
      const thickness = thickMatch ? thickMatch[1] : "10 mm";

      return [
        {
          action: "swatch_presentation",
          title: "Material & Craftsmanship",
          scriptSnippet: `¿Buscás renovar tu espacio con máxima distinción? El nuevo ${productName} en formato ${dimensions} y ${thickness} de espesor combina elegancia y resistencia inigualable.`,
          sfxTag: "[sfx:whoosh]",
        },
        {
          action: "torture_test",
          title: "Waterproof & Scratch Proof Durability",
          scriptSnippet: `Apto para alto tránsito residencial y 100% impermeable. Acabado rectificado de máxima precisión que resiste rayones, derrames y el uso cotidiano más exigente.`,
          sfxTag: "[sfx:pop]",
        },
        {
          action: "room_walkthrough",
          title: "Room Walkthrough & Luxury Reveal",
          scriptSnippet: `Transformá tu living o cocina con el mejor rendimiento por caja y garantía de origen. Consultá por metro cuadrado hoy mismo.`,
          sfxTag: "[sfx:shimmer]",
        },
      ];
    }
  }

  if (typology === "digital_saas" || typology === "digital_software" || typology === "saas") {
    return [
      {
        action: "saas_pitch_explainer",
        title: "The Problem & Value Hook",
        scriptSnippet: `Still losing hours to manual spreadsheets and fragmented tools? ${productName} completely revolutionizes how your team works.`,
        sfxTag: "[sfx:whoosh]",
      },
      {
        action: "tablet_demo",
        title: "Interactive Live Dashboard",
        scriptSnippet: `Operate your entire company from a single, lightning-fast dashboard that automates workflows and tracks metrics in real time.`,
        sfxTag: "[sfx:pop]",
      },
      {
        action: "holographic_data",
        title: "Future Scale & Call to Action",
        scriptSnippet: `Save twenty hours every week and scale effortlessly. Start your 14-day free trial right now and see the results.`,
        sfxTag: "[sfx:shimmer]",
      },
    ];
  }

  if (typology === "sensory_consumable" || typology === "beauty_skincare") {
    return [
      {
        action: "unbox",
        title: "Sensory First Impression",
        scriptSnippet: `Experience clinical results meets daily indulgence. The new ${productName} delivers transformative nourishment from the very first drop.`,
        sfxTag: "[sfx:whoosh]",
      },
      {
        action: "apply",
        title: "Active Application & Texture",
        scriptSnippet: `Silky lightweight absorption infused with active antioxidants that deeply hydrate and restore your natural barrier.`,
        sfxTag: "[sfx:pop]",
      },
      {
        action: "hold_and_present",
        title: "Radiant Result & Exclusive Offer",
        scriptSnippet: `Wake up to glowing, rejuvenated skin every single morning. Claim your limited launch bundle today.`,
        sfxTag: "[sfx:shimmer]",
      },
    ];
  }

  if (typology === "apparel_wearable" || typology === "fashion_apparel") {
    return [
      {
        action: "hold_and_present",
        title: "Premium Fabric & Cut",
        scriptSnippet: `Elevate your everyday wardrobe. The ${productName} combines tailored elegance with all-day comfort.`,
        sfxTag: "[sfx:whoosh]",
      },
      {
        action: "wear",
        title: "Fit, Motion & Drape",
        scriptSnippet: `Breathable, wrinkle-resistant luxury fabric engineered to move with you seamlessly from morning meetings to evening dinners.`,
        sfxTag: "[sfx:pop]",
      },
      {
        action: "room_walkthrough",
        title: "Runway Style & Call to Action",
        scriptSnippet: `Upgrade your style statement. Shop the new seasonal collection now with complimentary expedited shipping.`,
        sfxTag: "[sfx:shimmer]",
      },
    ];
  }

  if (typology === "bulky_furniture") {
    return [
      {
        action: "side_by_side",
        title: "Design & Craftsmanship",
        scriptSnippet: `Meet the centerpiece of your modern living room. The new ${productName} redefines luxury interior design.`,
        sfxTag: "[sfx:whoosh]",
      },
      {
        action: "furniture_interaction",
        title: "Ergonomics & Comfort Experience",
        scriptSnippet: `Tailored high-resilience support and breathable, stain-resistant upholstery built for all-day comfort.`,
        sfxTag: "[sfx:pop]",
      },
      {
        action: "room_walkthrough",
        title: "Room Integration & Offer",
        scriptSnippet: `Elevate your home with white-glove delivery and a 100-night in-home trial. Order yours today.`,
        sfxTag: "[sfx:shimmer]",
      },
    ];
  }

  if (typology === "local_service") {
    return [
      {
        action: "saas_pitch_explainer",
        title: "The Urgent Problem",
        scriptSnippet: `When disaster strikes your property, waiting days for a contractor is not an option. You need immediate results.`,
        sfxTag: "[sfx:stinger]",
      },
      {
        action: "service_expert",
        title: "Certified Expert Solution",
        scriptSnippet: `With ${productName}, our licensed and insured master technicians arrive with same-day dispatch and guaranteed craftsmanship.`,
        sfxTag: "[sfx:pop]",
      },
      {
        action: "before_after_reveal",
        title: "Guaranteed Resolution & Offer",
        scriptSnippet: `Get your free, no-obligation estimate in minutes. Call our emergency hotline or book online now.`,
        sfxTag: "[sfx:shimmer]",
      },
    ];
  }

  // Discrete Product / Gadgets / Tech / General
  return [
    {
      action: "unbox",
      title: "Unboxing & First Impression",
      scriptSnippet: `Unboxing the future. The moment you open the new ${productName}, you immediately feel the precision engineering and premium materials.`,
      sfxTag: "[sfx:whoosh]",
    },
    {
      action: "demo",
      title: "Feature Demonstration",
      scriptSnippet: `Engineered with aerospace-grade durability and intuitive controls that seamlessly fit into your daily routine.`,
      sfxTag: "[sfx:pop]",
    },
    {
      action: "hold_and_present",
      title: "Hero Showcase & Call to Action",
      scriptSnippet: `Don't settle for ordinary. Upgrade your life with ${productName} today and enjoy twenty percent off your first order.`,
      sfxTag: "[sfx:shimmer]",
    },
  ];
}

export async function runProductPresenterGenerator(opts: ProductPresenterOptions): Promise<{
  success: boolean;
  videoPath?: string;
  audioPath?: string;
  manifestPath?: string;
  prompt: string;
  clipPaths?: string[];
}> {
  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const charCfg = getFlowCharacterConfig(personaSlug);

  // 1. Resolve Product Name and Image
  let productName = opts.productName || "";
  let productImage = opts.productImage;
  if (productImage) {
    productImage = path.resolve(process.cwd(), productImage);
    if (!productName) {
      const base = path.basename(productImage, path.extname(productImage));
      productName = base.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  if (!productName) productName = "Signature Product";

  // Typology classification for abstract, surfaces (flooring/paint), SaaS & services
  const { classifyProductTypology } = await import("../../../src/lib/ecommerce/typologyClassifier");
  const classification = classifyProductTypology(productName);
  const typology = opts.productCategory || classification.typology;

  const isFused = !!opts.fuseBeats;
  const engine = opts.engine || "flow_web";
  const modelTier = opts.model || "veo-3.1-lite";
  const durationPerBeat = 8;
  const aspectRatio = opts.aspectRatio || "9:16"; // Default vertical format for UGC product ads
  const isDryRun = !!opts.dryRun;
  const talkingMode = opts.talkingMode || (opts.withAudio ? "natural_speech" : "silent_lipsync");

  console.log("\n==================================================================");
  console.log(`🛍️ E-COMMERCE PRODUCT SHOWCASE & UGC VIDEO AD DIRECTOR`);
  console.log("==================================================================");
  console.log(`Featured Persona:   ${persona.name} [${personaSlug}] (${charCfg.characterTag})`);
  console.log(`Product Name:       ${productName}`);
  console.log(`Product Image:      ${productImage ? productImage : "None (Prompt synthesized)"}`);
  console.log(`Detected Typology:  ${typology.toUpperCase()} (Confidence: ${(classification.confidence * 100).toFixed(0)}%)`);
  console.log(`Commercial Mode:    ${isFused ? "🔥 FUSED 3-BEAT SEQUENCE (24s Complete Story)" : "Single 8s Showcase Beat"}`);
  console.log(`Talking Mode:       ${talkingMode.toUpperCase()}`);
  console.log(`Audio & SFX:        ${opts.withAudio ? "Enabled (TTS + BGM + SFX)" : "Silent Lip-Sync Ready"}`);
  if (opts.envImage) {
    console.log(`Environment Plate:  ${opts.envImage}`);
  }
  console.log(`Aspect Ratio:       ${aspectRatio}`);
  console.log("------------------------------------------------------------------");

  const outputDir = path.resolve(process.cwd(), "public", "assets", "action_loops");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // High-Resolution Observability & Hardware Telemetry
  const tOverallStart = performance.now();
  let ttsMs = 0;
  let videoInferenceMs = 0;
  let stitchMs = 0;
  const hwStart = await captureHardwareSnapshot();

  // ==========================================================================
  // BRANCH A: FUSED 3-BEAT COMMERCIAL SEQUENCE (FUSE MODE)
  // ==========================================================================
  if (isFused) {
    const fusedPlan = resolveFusedTypologyBeats(typology, productName, opts.scriptText);
    const totalDurationSeconds = fusedPlan.length * durationPerBeat; // 24 seconds

    console.log(`\n🎬 FUSING ${fusedPlan.length} COMMERCIAL BEATS FOR [${typology.toUpperCase()}]:`);
    fusedPlan.forEach((b, idx) => {
      console.log(`  Beat ${idx + 1}: [${b.action.toUpperCase().padEnd(20)}] ${b.title}`);
    });

    // 1. Synthesize Unified Multi-Beat Audio
    let audioPath: string | undefined;
    const sfxCues: { tag: string; timestampSec: number }[] = [];

    if (opts.withAudio) {
      let combinedScript = opts.scriptText || "";
      if (!combinedScript && opts.scriptFilePath && fs.existsSync(opts.scriptFilePath)) {
        combinedScript = fs.readFileSync(opts.scriptFilePath, "utf8");
      }
      if (!combinedScript) {
        combinedScript = fusedPlan.map((b) => b.scriptSnippet).join(" ");
      }

      fusedPlan.forEach((b, idx) => {
        sfxCues.push({ tag: b.sfxTag, timestampSec: idx * durationPerBeat + 0.8 });
      });

      console.log(`\n🎙️ Unified Fused Script (24s):`);
      console.log(`"${combinedScript}"\n`);
      sfxCues.forEach((cue) => {
        console.log(`  ✨ Synchronized SFX Cue: ${cue.tag.padEnd(14)} at ${cue.timestampSec.toFixed(1)}s`);
      });

      if (!isDryRun) {
        try {
          const { generateAudioWithModernTtsResult } = await import("../../../src/lib/tts/modernTtsClient");
          console.log(`\n🔊 Synthesizing 24s commercial voiceover via Modern-TTS...`);
          const tTts0 = performance.now();
          const ttsRes = await generateAudioWithModernTtsResult({
            text: combinedScript.replace(/\[sfx:[^\]]+\]/g, ""),
            personaId: personaSlug,
            language: "en",
            cadencePreset: "broadcast_anchor",
          });
          ttsMs = Math.round(performance.now() - tTts0);

          if (ttsRes && ttsRes.audioBuffer) {
            audioPath = path.join(outputDir, `fused_voice_${personaSlug}_${Date.now().toString().slice(-4)}.wav`);
            fs.writeFileSync(audioPath, Buffer.from(ttsRes.audioBuffer));
            console.log(`✔ Commercial voiceover synthesized in ${(ttsMs / 1000).toFixed(2)}s:`);
            printClickablePath(audioPath);
          }
        } catch (err: unknown) {
          console.warn("⚠️ Modern-TTS voiceover synthesis notice:", (err as Error).message);
        }
      } else {
        audioPath = path.join(outputDir, `dry_run_fused_audio_${personaSlug}.wav`);
      }
    }

    // 2. Generate Each of the 3 Sequential Video Beats
    const clipPaths: string[] = [];
    const beatPrompts: string[] = [];
    const manifestBeats: { action: string; title: string; clipPath?: string }[] = [];
    const fusedBeats = fusedPlan;

    const initImage = productImage || opts.envImage || charCfg.chromaMasterPath || charCfg.headshotPath;

    for (let i = 0; i < fusedBeats.length; i++) {
      const beat = fusedBeats[i];
      const beatIndex = i + 1;
      console.log(`\n▶️ [Beat ${beatIndex}/${fusedBeats.length}] ${beat.title} (${beat.action.toUpperCase()}):`);

      const beatPrompt = compileProductInteractionPrompt({
        persona: {
          slug: personaSlug,
          name: persona.name,
          characterTag: charCfg.characterTag,
          attire: charCfg.defaultAttire,
          hairStyle: charCfg.hairStyle,
        },
        productName,
        productImage,
        productCategory: typology,
        action: beat.action,
        talkingMode,
        hasAudio: !!opts.withAudio,
        bgmGenre: opts.bgmGenre || "luxury_commercial",
        sfxCue: beat.sfxTag,
        envImage: opts.envImage,
        durationSeconds: durationPerBeat,
        aspectRatio,
        chromaMode: opts.chromaMode || "studio",
      });

      beatPrompts.push(beatPrompt);
      console.log(`Prompt: "${beatPrompt.slice(0, 160)}..."`);

      if (isDryRun) {
        console.log(`  [DRY RUN] Would submit beat ${beatIndex} to ${engine}`);
        const mockClip = path.join(outputDir, `dry_run_fused_${personaSlug}_b${beatIndex}.mp4`);
        clipPaths.push(mockClip);
        manifestBeats.push({ action: beat.action, title: beat.title, clipPath: mockClip });
        continue;
      }

      const tVid0 = performance.now();
      const res = await dispatchVeoGeneration({
        prompt: beatPrompt,
        aspectRatio,
        durationSeconds: (durationPerBeat === 2 || durationPerBeat === 4 || durationPerBeat === 8) ? durationPerBeat : 8,
        baseName: `fused_${personaSlug}_b${beatIndex}_${Date.now().toString().slice(-4)}`,
        model: modelTier,
        engine,
        imagePath: initImage,
        skipLedger: true,
      });
      videoInferenceMs += Math.round(performance.now() - tVid0);

      if (!res.success || !res.videoPath) {
        console.error(`❌ Failed to generate beat ${beatIndex}: ${res.error}`);
        return { success: false, prompt: beatPrompt, clipPaths };
      }

      clipPaths.push(res.videoPath);
      manifestBeats.push({ action: beat.action, title: beat.title, clipPath: res.videoPath });
      console.log(`  ✔ Beat ${beatIndex} rendered:`);
      printClickablePath(res.videoPath);
    }

    // 3. Optical Flow Video Cross-Stitching
    let masterVideoPath: string | undefined;
    if (clipPaths.length > 1 && opts.stitch !== false && !isDryRun) {
      console.log(`\n🧵 Stitching ${clipPaths.length} beats into unified commercial video with optical flow blending...`);
      const masterOut = path.join(outputDir, `product_fused_master_${personaSlug}_${Date.now().toString().slice(-4)}.mp4`);
      const tStitch0 = performance.now();
      const stitchRes = await stitchVideoClips(clipPaths, masterOut, {
        crossfadeDurationSec: 0.35,
        fps: 30,
      });
      stitchMs = Math.round(performance.now() - tStitch0);

      if (stitchRes.success && stitchRes.outputPath) {
        masterVideoPath = stitchRes.outputPath;
        console.log(`✔ Master 24-Second Fused Commercial Video Ready in ${(stitchMs / 1000).toFixed(2)}s:`);
        printClickablePath(masterVideoPath);
      }
    } else if (clipPaths.length > 0) {
      masterVideoPath = clipPaths[0];
    }

    // 4. Observability Metrics & Cost Attribution
    const totalLatencyMs = Math.round(performance.now() - tOverallStart);
    const hwEnd = await captureHardwareSnapshot();
    const costInfo = calculateVideoCost(modelTier, totalDurationSeconds, fusedBeats.length, true);
    const realtimeFactor = totalDurationSeconds > 0
      ? parseFloat((totalLatencyMs / (totalDurationSeconds * 1000)).toFixed(2))
      : 1;

    // 5. Generate Remotion Fused Commercial Manifest
    const manifest: ProductAdManifest = {
      productName,
      productImagePath: productImage,
      personaSlug,
      action: "fused_commercial_sequence",
      isFused: true,
      beats: manifestBeats,
      videoClipPath: masterVideoPath,
      audioVoiceoverPath: audioPath,
      bgmGenre: opts.bgmGenre || "luxury_commercial",
      sfxCues,
      durationSeconds: totalDurationSeconds,
      aspectRatio,
      cost: {
        flowCredits: costInfo.credits,
        usdEstimate: costInfo.usd,
        costPerSec: costInfo.costPerSec,
        modelTier,
      },
      telemetry: {
        totalLatencyMs,
        ttsMs: ttsMs > 0 ? ttsMs : undefined,
        videoInferenceMs: videoInferenceMs > 0 ? videoInferenceMs : undefined,
        stitchMs: stitchMs > 0 ? stitchMs : undefined,
        realtimeFactor,
        gpuPeakVramMb: Math.max(hwStart.vramPeakMb || 0, hwEnd.vramPeakMb || 0) || undefined,
        gpuTempC: hwEnd.gpuTempC || hwStart.gpuTempC,
      },
      createdAt: new Date().toISOString(),
    };

    const manifestPath = path.join(outputDir, `fused_commercial_manifest_${Date.now().toString().slice(-4)}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✔ Remotion Fused Commercial Manifest ready:`);
    printClickablePath(manifestPath);

    // Record into persistent ledger
    const ledgerRecord = await recordGeneration({
      pipeline: "fused_commercial",
      personaSlug,
      productName,
      productTypology: typology,
      videoPath: masterVideoPath || (clipPaths.length > 0 ? clipPaths[0] : ""),
      durationSec: totalDurationSeconds,
      model: modelTier,
      engine,
      resolution: "1080p",
      aspectRatio,
      creditsCost: costInfo.credits,
      usdCost: costInfo.usd,
      timing: {
        totalLatencyMs,
        scriptTtsMs: ttsMs,
        videoInferenceMs,
        stitchMs,
        realtimeFactor,
      },
      hardware: {
        gpuName: hwEnd.gpuName || hwStart.gpuName,
        vramPeakMb: Math.max(hwStart.vramPeakMb || 0, hwEnd.vramPeakMb || 0) || undefined,
        vramTotalMb: hwEnd.vramTotalMb || hwStart.vramTotalMb,
        gpuTempC: hwEnd.gpuTempC || hwStart.gpuTempC,
        hostRamMb: hwEnd.hostRamMb || hwStart.hostRamMb,
      },
    });
    console.log(formatGenerationHud(ledgerRecord));

    console.log("\n==================================================================");
    console.log("🎉 FUSED 3-BEAT COMMERCIAL SEQUENCE COMPLETED!");
    console.log("==================================================================\n");

    return {
      success: true,
      videoPath: masterVideoPath,
      audioPath,
      manifestPath,
      prompt: beatPrompts[0] || "",
      clipPaths,
    };
  }

  // ==========================================================================
  // BRANCH B: SINGLE-BEAT SHOWCASE MODE
  // ==========================================================================
  let action = opts.productAction;
  if (!action) {
    if (typology === "surface_material") {
      const lower = productName.toLowerCase();
      if (lower.includes("paint") || lower.includes("wall") || lower.includes("coat")) {
        action = "paint_application";
      } else {
        action = "room_walkthrough";
      }
    } else if (typology === "digital_saas") {
      action = "tablet_demo";
    } else if (typology === "bulky_furniture") {
      action = "furniture_interaction";
    } else if (typology === "local_service") {
      action = "service_expert";
    } else if (typology === "apparel_wearable") {
      action = "wear";
    } else {
      action = "hold_and_present";
    }
  }

  const duration = opts.durationSeconds || 8;

  // Audio & SFX Synthesis for single beat
  let audioPath: string | undefined;
  const sfxCues: { tag: string; timestampSec: number }[] = [];

  if (opts.withAudio) {
    let scriptText = opts.scriptText || "";
    if (!scriptText && opts.scriptFilePath && fs.existsSync(opts.scriptFilePath)) {
      scriptText = fs.readFileSync(opts.scriptFilePath, "utf8");
    }
    if (!scriptText) {
      if (typology === "surface_material") {
        const lower = productName.toLowerCase();
        if (lower.includes("paint") || lower.includes("wall")) {
          scriptText = `Transforming your room has never been easier. The new ${productName} delivers flawless one-coat coverage and rich designer depth. Look at that velvety finish.`;
        } else {
          scriptText = `Are you ready to transform your living space? Stepping onto the new ${productName} brings warmth, luxury, and 100% waterproof peace of mind to your home.`;
        }
      } else if (typology === "digital_saas") {
        scriptText = `Stop losing hours to manual workflows. With ${productName}, your entire team operates from a lightning-fast dashboard that tracks everything in real time.`;
      } else if (typology === "local_service") {
        scriptText = `When you need certified expertise you can count on, ${productName} provides emergency dispatch, licensed technicians, and guaranteed peace of mind.`;
      } else if (typology === "bulky_furniture") {
        scriptText = `Experience uncompromised comfort. The all-new ${productName} combines tailored ergonomics with timeless design to elevate your home.`;
      } else {
        scriptText = `I have to share this with you. The new ${productName} completely transforms your daily routine. Look at that pristine craftsmanship. You won't want to miss this.`;
      }
    }

    console.log(`\n🎙️ Commercial Ad Script: "${scriptText}"`);
    const sfxMatch = opts.sfxCue || "[sfx:shimmer]";
    sfxCues.push({ tag: sfxMatch, timestampSec: 1.2 });
    console.log(`✨ Injected Sound Effect: ${sfxMatch} at 1.2s`);

    if (!isDryRun) {
      try {
        const tTtsStart = performance.now();
        const { generateAudioWithModernTtsResult } = await import("../../../src/lib/tts/modernTtsClient");
        console.log(`🔊 Synthesizing commercial voiceover via Modern-TTS...`);
        const ttsRes = await generateAudioWithModernTtsResult({
          text: scriptText.replace(/\[sfx:[^\]]+\]/g, ""),
          personaId: personaSlug,
          language: "en",
          cadencePreset: "broadcast_anchor",
        });
        ttsMs = Math.round(performance.now() - tTtsStart);

        if (ttsRes && ttsRes.audioBuffer) {
          audioPath = path.join(outputDir, `product_voice_${personaSlug}_${Date.now().toString().slice(-4)}.wav`);
          fs.writeFileSync(audioPath, Buffer.from(ttsRes.audioBuffer));
          console.log(`✔ Commercial voiceover synthesized in ${(ttsMs / 1000).toFixed(2)}s:`);
          printClickablePath(audioPath);
        }
      } catch (err: unknown) {
        console.warn("⚠️ Modern-TTS voiceover synthesis notice:", (err as Error).message);
      }
    } else {
      audioPath = path.join(outputDir, `dry_run_audio_${personaSlug}.wav`);
    }
  }

  // Compile Product Demonstration Video Prompt
  const prompt = compileProductInteractionPrompt({
    persona: {
      slug: personaSlug,
      name: persona.name,
      characterTag: charCfg.characterTag,
      attire: charCfg.defaultAttire,
      hairStyle: charCfg.hairStyle,
    },
    productName,
    productImage,
    productCategory: typology,
    action,
    talkingMode,
    hasAudio: !!opts.withAudio,
    bgmGenre: opts.bgmGenre || "luxury_commercial",
    sfxCue: opts.sfxCue,
    envImage: opts.envImage,
    durationSeconds: duration,
    aspectRatio,
    chromaMode: opts.chromaMode || "studio",
  });

  console.log(`\n▶️ COMPILED PRODUCT SHOWCASE PROMPT:`);
  console.log(`"${prompt}"\n`);

  let videoClipPath: string | undefined;

  if (isDryRun) {
    console.log(`[DRY RUN] Would submit product video prompt to ${engine}`);
    videoClipPath = path.join(outputDir, `dry_run_product_${personaSlug}.mp4`);
  } else {
    // Dispatch Video Generation
    const initImage = productImage || opts.envImage || charCfg.chromaMasterPath || charCfg.headshotPath;

    const tVid0 = performance.now();
    const res = await dispatchVeoGeneration({
      prompt,
      aspectRatio,
      durationSeconds: (duration === 2 || duration === 4 || duration === 8) ? duration : 8,
      baseName: `product_${personaSlug}_${action}_${Date.now().toString().slice(-4)}`,
      model: modelTier,
      engine,
      imagePath: initImage,
      skipLedger: true,
    });
    videoInferenceMs = Math.round(performance.now() - tVid0);

    if (!res.success || !res.videoPath) {
      console.error(`❌ Failed to generate product showcase video: ${res.error}`);
      return { success: false, prompt };
    }

    videoClipPath = res.videoPath;
    console.log(`✔ Product showcase video rendered:`);
    printClickablePath(res.videoPath);
  }

  // Observability Metrics & Cost Attribution
  const totalLatencyMs = Math.round(performance.now() - tOverallStart);
  const hwEnd = await captureHardwareSnapshot();
  const costInfo = calculateVideoCost(modelTier, duration, 1, true);
  const realtimeFactor = duration > 0
    ? parseFloat((totalLatencyMs / (duration * 1000)).toFixed(2))
    : 1;

  // Generate Remotion Ad Manifest
  const manifest: ProductAdManifest = {
    productName,
    productImagePath: productImage,
    personaSlug,
    action,
    videoClipPath,
    audioVoiceoverPath: audioPath,
    bgmGenre: opts.bgmGenre || "upbeat_commercial",
    sfxCues,
    durationSeconds: duration,
    aspectRatio,
    cost: {
      flowCredits: costInfo.credits,
      usdEstimate: costInfo.usd,
      costPerSec: costInfo.costPerSec,
      modelTier,
    },
    telemetry: {
      totalLatencyMs,
      ttsMs: ttsMs > 0 ? ttsMs : undefined,
      videoInferenceMs: videoInferenceMs > 0 ? videoInferenceMs : undefined,
      realtimeFactor,
      gpuPeakVramMb: Math.max(hwStart.vramPeakMb || 0, hwEnd.vramPeakMb || 0) || undefined,
      gpuTempC: hwEnd.gpuTempC || hwStart.gpuTempC,
    },
    createdAt: new Date().toISOString(),
  };

  const manifestPath = path.join(outputDir, `product_ad_manifest_${Date.now().toString().slice(-4)}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✔ Remotion Product Ad Manifest ready for composition:`);
  printClickablePath(manifestPath);

  // Record into persistent ledger
  const ledgerRecord = await recordGeneration({
    pipeline: "product_showcase",
    personaSlug,
    productName,
    productTypology: typology,
    videoPath: videoClipPath || "",
    durationSec: duration,
    model: modelTier,
    engine,
    resolution: "1080p",
    aspectRatio,
    creditsCost: costInfo.credits,
    usdCost: costInfo.usd,
    timing: {
      totalLatencyMs,
      scriptTtsMs: ttsMs,
      videoInferenceMs,
      realtimeFactor,
    },
    hardware: {
      gpuName: hwEnd.gpuName || hwStart.gpuName,
      vramPeakMb: Math.max(hwStart.vramPeakMb || 0, hwEnd.vramPeakMb || 0) || undefined,
      vramTotalMb: hwEnd.vramTotalMb || hwStart.vramTotalMb,
      gpuTempC: hwEnd.gpuTempC || hwStart.gpuTempC,
      hostRamMb: hwEnd.hostRamMb || hwStart.hostRamMb,
    },
    metadata: {
      isDryRun,
      action,
    },
  });
  console.log(formatGenerationHud(ledgerRecord));

  console.log("\n==================================================================");
  console.log("🎉 PRODUCT SHOWCASE GENERATION COMPLETED!");
  console.log("==================================================================\n");

  return {
    success: true,
    videoPath: videoClipPath,
    audioPath,
    manifestPath,
    prompt,
  };
}
