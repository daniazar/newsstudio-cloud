/**
 * src/lib/ai/comfy/image/workflowMutator.ts
 *
 * ComfyUI JSON workflow graph mutations for image generation, handling node injection,
 * loader wiring, dynamic LoRA chaining, and graph cleanup.
 */

import { comfyLog } from "../api";
import { ModelArchitectureInfo } from "./modelClassifier";
import { LoraConfig } from "./loraManager";
import { ComfyWorkflowNode, ComfyWorkflow } from "../types";

export interface WorkflowMutationState {
  currentModelSource: [string, number];
  currentClipSource: [string, number];
  baseClipSource: [string, number];
}

/**
 * Handles dynamic LoRA node injections and wires model/clip streams.
 */
export function injectDynamicLoras(
  workflow: ComfyWorkflow,
  activeLoras: LoraConfig[],
  arch: ModelArchitectureInfo,
  isMulti: boolean = false
): WorkflowMutationState {
  let currentModelSource: [string, number] = ["2", 0];
  const baseClipSource: [string, number] = (workflow["3"]?.class_type?.includes("CLIPLoader")) ? ["3", 0] : ["2", 1];
  let currentClipSource: [string, number] = baseClipSource;

  if (activeLoras.length > 0) {
    comfyLog(`🔌 [ComfyClient] Injecting ${activeLoras.length} active LoRA adapter(s):`);
    activeLoras.forEach(lora => {
      comfyLog(`   └─ 📦 ${lora.name} (Strength: ${lora.strength})`);
    });

    activeLoras.forEach((lora, index) => {
      const loraNodeId = `dynamic_lora_${index + 1}`;
      const isUnetOnly = lora.name.toLowerCase().includes("add-detail-xl") || lora.name.toLowerCase().includes("detailer");
      const clipStrength = isUnetOnly ? 0.0 : lora.strength;

      workflow[loraNodeId] = {
        inputs: {
          lora_name: lora.name,
          strength_model: lora.strength,
          strength_clip: clipStrength,
          model: currentModelSource,
          clip: currentClipSource
        },
        class_type: "LoraLoader",
        _meta: { title: `Dynamic LoRA - ${lora.name}` }
      };

      currentModelSource = [loraNodeId, 0];
      if (!isUnetOnly) {
        currentClipSource = [loraNodeId, 1];
      }
    });
  }

  // Inject ModelSamplingAuraFlow ONLY for Lumina-2 / Z-Image Turbo models (not Moody / Catalyst / FLUX)
  if (arch.isKlein && arch.unetName.toLowerCase().includes("z_image")) {
    workflow["99"] = {
      inputs: {
        shift: 3.0,
        model: currentModelSource
      },
      class_type: "ModelSamplingAuraFlow",
      _meta: { title: "Model Sampling AuraFlow" }
    };
    currentModelSource = ["99", 0];
  }

  // Purge PuLID nodes for SDXL
  if (arch.isSdxl && !isMulti) {
    delete workflow["12"];
    delete workflow["13"];
    delete workflow["14"];
    delete workflow["15"];
    delete workflow["16"];
    delete workflow["101"];
    if (workflow["8"]) {
      workflow["8"].inputs.model = currentModelSource;
    }
  } else if (arch.isSdxl && isMulti) {
    // Multi-persona SDXL: delete Flux PuLID nodes (12-16) but PRESERVE node 101 (partner reference image)
    delete workflow["12"];
    delete workflow["13"];
    delete workflow["14"];
    delete workflow["15"];
    delete workflow["16"];
    // NOTE: workflow["101"] is intentionally preserved here — it holds the partner reference image
    if (workflow["8"]) {
      workflow["8"].inputs.model = currentModelSource;
    }
  } else if (workflow["15"]) {
    workflow["15"].inputs.model = currentModelSource;
    workflow["15"].inputs.image = ["1", 0]; // Primary avatar headshot
    if (workflow["8"]) {
      workflow["8"].inputs.model = ["15", 0];
    }
  } else if (workflow["8"]) {
    workflow["8"].inputs.model = currentModelSource;
  }

  const finalClipSource = currentClipSource;
  if (workflow["3"]?.class_type === "CLIPTextEncode") {
    workflow["3"].inputs.clip = finalClipSource;
  }
  if (workflow["4"]?.class_type === "CLIPTextEncode") {
    workflow["4"].inputs.clip = finalClipSource;
  }
  if (workflow["5"]?.class_type === "CLIPTextEncode") {
    workflow["5"].inputs.clip = finalClipSource;
    if (workflow["8"]) {
      workflow["8"].inputs.positive = ["5", 0];
    }
  }

  // Pony XL architecture models require clip_skip = -2 (penultimate CLIP layer)
  const isPony = arch.isPony || arch.unetName.toLowerCase().includes("pony");

  if (isPony && arch.isSdxl) {
    comfyLog("[ConfigureLoaders] Pony XL model detected — injecting CLIPSetLastLayer (clip_skip=-2)");
    const existingClipSource = Array.isArray(workflow["3"]?.inputs?.clip)
      ? workflow["3"].inputs.clip
      : ["2", 1];

    workflow["pony_clip_skip"] = {
      class_type: "CLIPSetLastLayer",
      inputs: {
        stop_at_clip_layer: -2,
        clip: existingClipSource
      },
      _meta: { title: "Pony V6 XL — Clip Skip 2" }
    };
    // Rewire all CLIPTextEncode nodes to use the clip-skipped CLIP
    for (const nodeId of Object.keys(workflow)) {
      const node = workflow[nodeId];
      if (node?.class_type === "CLIPTextEncode" && Array.isArray(node.inputs?.clip)) {
        node.inputs.clip = ["pony_clip_skip", 0];
      }
    }
  }

  return {
    currentModelSource,
    currentClipSource: isPony && arch.isSdxl ? ["pony_clip_skip", 0] : currentClipSource,
    baseClipSource
  };
}

/**
 * Updates model, clip, and VAE loaders across the workflow based on target architecture.
 * For Pony XL models, injects CLIPSetLastLayer (clip skip 2) as required by the model.
 */
export function configureLoaderNodes(
  workflow: ComfyWorkflow,
  arch: ModelArchitectureInfo,
  denoise: number
): void {
  const _isPony = arch.isPony || arch.unetName.toLowerCase().includes("pony");

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.inputs) continue;

    if (node.class_type === "UNETLoader") {
      node.inputs.unet_name = arch.unetName;
    }
    if (node.class_type === "CheckpointLoaderSimple") {
      node.inputs.ckpt_name = arch.unetName;
    }

    if (arch.isMoody) {
      if (node.class_type === "CLIPLoader") {
        node.inputs.clip_name = process.env.ZIT_TEXT_ENCODER_OVERRIDE || "qwen_3_8b_fp8mixed.safetensors";
        node.inputs.type = "lumina2";
      }
      if (node.class_type === "VAELoader") {
        node.inputs.vae_name = "flux2-vae.safetensors";
      }
    } else if (arch.isKlein) {
      if (node.class_type === "CLIPLoader") {
        node.inputs.clip_name = process.env.ZIT_TEXT_ENCODER_OVERRIDE || "qwen_3_4b.safetensors";
        node.inputs.type = "lumina2";
      }
      if (node.class_type === "VAELoader") {
        node.inputs.vae_name = "ae.safetensors";
      }
    } else {
      // FLUX.2 / Catalyst / FLUX.1 models use Mistral / FLUX text encoder and FLUX VAE
      if (node.class_type === "CLIPLoader") {
        node.inputs.clip_name = "mistral_3_small_flux2_fp8.safetensors";
        node.inputs.type = "flux2";
      }
      if (node.class_type === "VAELoader") {
        node.inputs.vae_name = "flux2-vae.safetensors";
      }
    }

    if (node.class_type === "KSampler") {
      const isHyperSdxl = Object.keys(workflow).some(key => {
        const inputLora = workflow[key]?.inputs?.lora_name;
        return typeof inputLora === "string" && inputLora.toLowerCase().includes("hyper-sdxl");
      });

      if (isHyperSdxl) {
        node.inputs.steps = 8;
        node.inputs.cfg = 2.0;
        node.inputs.sampler_name = "euler_ancestral";
        node.inputs.scheduler = "sgm_uniform";
        node.inputs.denoise = denoise;
        comfyLog("⚡ [Hyper-SDXL] Auto-setting KSampler to 8 steps, CFG 2.0, euler_ancestral, sgm_uniform");
      } else {
        node.inputs.steps = arch.steps;
        node.inputs.denoise = denoise;
        if (arch.isPony || arch.isSdxl) {
          node.inputs.cfg = 6.0;
        }
      }
    }
  }
}

/**
 * Ensures KSampler receives EmptyLatentImage if useEmptyLatent is true.
 */
export function applyEmptyLatentCanvas(
  workflow: ComfyWorkflow,
  width: number,
  height: number,
  useEmptyLatent: boolean
): void {
  if (!useEmptyLatent) return;

  workflow["empty_latent_canvas"] = {
    inputs: {
      width,
      height,
      batch_size: 1
    },
    class_type: "EmptyLatentImage",
    _meta: { title: "Empty Latent Canvas" }
  };

  if (workflow["8"] && workflow["8"].class_type === "KSampler") {
    workflow["8"].inputs.latent_image = ["empty_latent_canvas", 0];
    workflow["8"].inputs.denoise = 1.0;
  }
}

/**
 * Injects ComfyUI native Regional Prompting (ConditioningSetArea + ConditioningCombine)
 * for multi-persona SDXL scenes.
 * Splitting the 1024x1024 canvas into Left (0..512px) for Primary Persona and Right (512..1024px)
 * for Partner Persona while maintaining a single, cohesive 1024x1024 background environment.
 */
export function injectRegionalPrompting(
  workflow: ComfyWorkflow,
  clipSource: [string, number],
  globalEnvText: string,
  primaryPersonaText: string,
  partnerPersonaText: string,
  width: number = 1024,
  height: number = 1024
): void {
  const halfWidth = Math.floor(width / 2);

  workflow["regional_global_env"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: globalEnvText, clip: clipSource },
    _meta: { title: "Regional — Global Environment Prompt" }
  };

  workflow["regional_p1"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: primaryPersonaText, clip: clipSource },
    _meta: { title: "Regional — Primary Persona Prompt (Left)" }
  };

  workflow["regional_p2"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: partnerPersonaText, clip: clipSource },
    _meta: { title: "Regional — Secondary Persona Prompt (Right)" }
  };

  const regionWidth = Math.floor(width * 0.70);
  const partnerX = Math.floor(width * 0.30);

  workflow["regional_area_p1"] = {
    class_type: "ConditioningSetArea",
    inputs: {
      conditioning: ["regional_p1", 0],
      width: regionWidth,
      height: height,
      x: 0,
      y: 0,
      strength: 0.95
    },
    _meta: { title: "Regional — Primary Persona Area (0% -> 70% Width)" }
  };

  workflow["regional_area_p2"] = {
    class_type: "ConditioningSetArea",
    inputs: {
      conditioning: ["regional_p2", 0],
      width: regionWidth,
      height: height,
      x: partnerX,
      y: 0,
      strength: 0.95
    },
    _meta: { title: "Regional — Secondary Persona Area (30% -> 100% Width)" }
  };

  workflow["regional_combine_1"] = {
    class_type: "ConditioningCombine",
    inputs: {
      conditioning_1: ["regional_global_env", 0],
      conditioning_2: ["regional_area_p1", 0]
    },
    _meta: { title: "Regional Combine — (Global + Left)" }
  };

  workflow["regional_combine_final"] = {
    class_type: "ConditioningCombine",
    inputs: {
      conditioning_1: ["regional_combine_1", 0],
      conditioning_2: ["regional_area_p2", 0]
    },
    _meta: { title: "Regional Combine — Final Multi-Persona Conditioning" }
  };

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (node?.class_type === "KSampler") {
      node.inputs.positive = ["regional_combine_final", 0];
    }
  }

  comfyLog(`[RegionalPrompting] ✅ Injected Native ComfyUI Regional Prompting (Left: ${halfWidth}px, Right: ${halfWidth}px)`);
}

/**
 * Injects ComfyUI-Impact-Pack FaceDetailer + hand detailer nodes after the primary KSampler for
 * SDXL/Pony/Moody models.  Two sequential passes run automatically:
 *   1. Face pass  — UltralyticsDetectorProvider(bbox/face_yolov8m.pt)   → FaceDetailer
 *   2. Hand pass  — UltralyticsDetectorProvider(bbox/hand_yolov8n.pt)   → FaceDetailer
 *
 * The final SaveImage node is rewired to receive the hand-detailer output instead of the
 * raw VAEDecode output, so every standard workflow gets automatic anatomy correction.
 *
 * NOTE: Only activated when arch.isSdxl === true (CheckpointLoaderSimple workflows).
 * Lumina-2 / FLUX models skip this pass because their UNet architecture is not CFG-compatible
 * with Impact Pack's internal KSampler call.
 */
export function injectFaceDetailer(
  workflow: ComfyWorkflow,
  arch: ModelArchitectureInfo,
  detailerSeed: number = Math.floor(Math.random() * 1_000_000_000),
  detailerInpaintCkpt?: string
): void {
  // FaceDetailer only runs on SDXL/Pony architectures (CheckpointLoaderSimple with model/clip/vae triple)
  if (!arch.isSdxl) {
    comfyLog("[Detailer] Skipping FaceDetailer — architecture is not SDXL/Pony (only supported for CheckpointLoaderSimple workflows)");
    return;
  }

  // ── Locate key nodes in the current graph ──────────────────────────────────
  let kSamplerNodeId: string | null = null;
  let vaeDecodeNodeId: string | null = null;
  let saveImageNodeId: string | null = null;
  let positiveSource: [string, number] | null = null;
  let negativeSource: [string, number] | null = null;
  let modelSource: [string, number] | null = null;

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.class_type) continue;
    if (node.class_type === "KSampler") {
      kSamplerNodeId = nodeId;
      positiveSource = Array.isArray(node.inputs.positive) ? node.inputs.positive as [string, number] : null;
      negativeSource = Array.isArray(node.inputs.negative) ? node.inputs.negative as [string, number] : null;
      modelSource = Array.isArray(node.inputs.model) ? node.inputs.model as [string, number] : null;
    }
    if (node.class_type === "VAEDecode") vaeDecodeNodeId = nodeId;
    if (node.class_type === "SaveImage") saveImageNodeId = nodeId;
  }

  if (!kSamplerNodeId || !vaeDecodeNodeId || !saveImageNodeId || !positiveSource || !negativeSource || !modelSource) {
    comfyLog("[Detailer] ⚠️  Could not locate all required nodes (KSampler, VAEDecode, SaveImage) — skipping FaceDetailer injection.");
    return;
  }

  // Extract prompt text from positive CLIPTextEncode node "3" to determine scene context
  const promptText = typeof workflow["3"]?.inputs?.text === "string" ? workflow["3"].inputs.text : "";

  // SDXL CheckpointLoaderSimple node "2" provides model[0], clip[1], vae[2]
  const clipSource: [string, number] = workflow["pony_clip_skip"] ? ["pony_clip_skip", 0] : ["2", 1];
  const vaeSource: [string, number] = ["2", 2];

  // Optional: Inject a photorealistic inpaint checkpoint to replace Pony's UNet
  // for the face crop pass (prevents anime-style face re-rendering)
  let detailerModelSource = modelSource;
  let detailerClipSource: [string, number] = clipSource;
  let detailerVaeSource: [string, number] = vaeSource;

  if (detailerInpaintCkpt) {
    workflow["detailer_ckpt"] = {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: detailerInpaintCkpt },
      _meta: { title: "FaceDetailer — Inpaint Checkpoint" }
    };
    detailerModelSource = ["detailer_ckpt", 0];
    detailerClipSource  = ["detailer_ckpt", 1];
    detailerVaeSource   = ["detailer_ckpt", 2];
  }

  // ── Dedicated Detailer Prompt Encoders ───────────────────────────────────────
  const isPonyArch = arch.unetName.toLowerCase().includes("pony") ||
                     arch.unetName.toLowerCase().includes("moody") ||
                     arch.unetName.toLowerCase().includes("iniverse");

  const facePosText = isPonyArch
    ? "score_9, score_8_up, score_7_up, photorealistic portrait, highly detailed face, detailed eyes, detailed iris, visible skin pores, natural skin texture, soft studio lighting"
    : "photorealistic portrait, highly detailed face, detailed eyes, detailed iris, visible skin pores, natural skin texture, soft studio lighting, RAW photo, 8k";

  const handPosText = isPonyArch
    ? "score_9, score_8_up, score_7_up, detailed hands, 5 fingers, realistic palms, clean fingernails, detailed knuckles, anatomical correct hands"
    : "detailed hands, 5 fingers, realistic palms, clean fingernails, detailed knuckles, anatomical correct hands, RAW photo, 8k";

  const personPosText = isPonyArch
    ? "score_9, score_8_up, score_7_up, detailed body, realistic legs, detailed feet and toes, natural skin texture, highly detailed anatomy"
    : "detailed body, realistic legs, detailed feet and toes, natural skin texture, highly detailed anatomy, RAW photo, 8k";

  const detailerNegText = "anime, cartoon, 3d render, illustration, drawing, smooth skin, plastic skin, airbrushed, deformed eyes, crossed eyes, extra fingers, missing fingers, fused fingers, malformed hands, deformed feet, extra toes, blurry, low quality, watermark";

  workflow["detailer_face_pos"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: facePosText, clip: detailerClipSource },
    _meta: { title: "FaceDetailer — Face Positive Prompt" }
  };

  workflow["detailer_face_neg"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: detailerNegText, clip: detailerClipSource },
    _meta: { title: "FaceDetailer — Face Negative Prompt" }
  };

  workflow["detailer_hand_pos"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: handPosText, clip: detailerClipSource },
    _meta: { title: "HandDetailer — Hand Positive Prompt" }
  };

  workflow["detailer_hand_neg"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: detailerNegText, clip: detailerClipSource },
    _meta: { title: "HandDetailer — Hand Negative Prompt" }
  };

  workflow["detailer_person_pos"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: personPosText, clip: detailerClipSource },
    _meta: { title: "PersonDetailer — Feet/Body Positive Prompt" }
  };

  workflow["detailer_person_neg"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: detailerNegText, clip: detailerClipSource },
    _meta: { title: "PersonDetailer — Feet/Body Negative Prompt" }
  };

  // ── Shared FaceDetailer parameters ──────────────────────────────────────────
  const detailerBase = {
    guide_size: 1024,
    guide_size_for: true,
    max_size: 1024,
    seed: detailerSeed,
    steps: 20,
    cfg: 6.0,
    sampler_name: "dpmpp_2m",
    scheduler: "karras",
    feather: 5,
    denoise: 0.30,
    noise_mask: true,
    force_inpaint: false,
    bbox_threshold: 0.15,
    bbox_dilation: 32,
    bbox_crop_factor: 3.0,
    sam_detection_hint: "center-1",
    sam_dilation: 0,
    sam_threshold: 0.93,
    sam_bbox_expansion: 0,
    sam_mask_hint_threshold: 0.7,
    sam_mask_hint_use_negative: "False",
    drop_size: 1,
    cycle: 1,
    inpaint_model: false,
    noise_mask_feather: 20,
    wildcard: ""
  };

  // Locate main prompt conditioning nodes
  const posNodeId = workflow["6"] ? "6" : (workflow["3"] ? "3" : "6");
  const negNodeId = workflow["5"] ? "5" : (workflow["4"] ? "4" : "5");

  // ── 1. Detector provider nodes ───────────────────────────────────────────────
  workflow["det_face"] = {
    class_type: "UltralyticsDetectorProvider",
    inputs: { model_name: "bbox/face_yolov8m.pt" },
    _meta: { title: "Face YOLO Detector (ADetailer)" }
  };

  workflow["det_hand"] = {
    class_type: "UltralyticsDetectorProvider",
    inputs: { model_name: "bbox/hand_yolov8n.pt" },
    _meta: { title: "Hand YOLO Detector (ADetailer)" }
  };

  workflow["det_person"] = {
    class_type: "UltralyticsDetectorProvider",
    inputs: { model_name: "bbox/person_yolov8m.pt" },
    _meta: { title: "Person YOLO Detector (Full-Body BBox)" }
  };

  // ── 2. Face detailer pass ────────────────────────────────────────────────────
  workflow["detail_face"] = {
    class_type: "FaceDetailer",
    inputs: {
      ...detailerBase,
      image: [vaeDecodeNodeId, 0],
      model: detailerModelSource,
      clip: detailerClipSource,
      vae: detailerVaeSource,
      positive: [posNodeId, 0],
      negative: [negNodeId, 0],
      bbox_detector: ["det_face", 0],
      denoise: 0.30
    },
    _meta: { title: "Face Detailer — Fix Face (ADetailer)" }
  };

  // ── 3. Hand detailer pass (chained from face-fixed image) ───────────────────
  workflow["detail_hand"] = {
    class_type: "FaceDetailer",
    inputs: {
      ...detailerBase,
      image: ["detail_face", 0],
      model: detailerModelSource,
      clip: detailerClipSource,
      vae: detailerVaeSource,
      positive: [posNodeId, 0],
      negative: [negNodeId, 0],
      bbox_detector: ["det_hand", 0],
      guide_size: 384,
      bbox_crop_factor: 2.5,
      denoise: 0.25,
      seed: detailerSeed + 1
    },
    _meta: { title: "Hand Detailer — Fix Hands & Fingers (ADetailer)" }
  };

  // ── 4. Intimate Anatomy & Groin Detailer pass (for NSFW/Intimate scenes) ─────────
  const isNsfwScene = /nude|naked|uncensored|nsfw|sex|doggystyle|blowjob|fellatio|creampie|cowgirl|missionary|penetration|breasts|vulva|genitals|intimate|anal|topless|bottomless|bare_skin|unclothed|phallus|nipples|areola|clitoral/i.test(promptText);

  if (isNsfwScene) {
    const baseIntimate = isPonyArch
      ? "score_9, score_8_up, score_7_up, highly detailed intimate anatomy, realistic skin texture, detailed breasts, erect nipples, detailed groin, crisp skin micro-details, photorealistic, RAW photo"
      : "highly detailed intimate anatomy, realistic skin texture, detailed breasts, erect nipples, detailed groin, crisp skin micro-details, photorealistic, RAW photo, 8k";

    const intimatePosText = promptText ? `${promptText}, ${baseIntimate}` : baseIntimate;

    workflow["detailer_intimate_pos"] = {
      class_type: "CLIPTextEncode",
      inputs: { text: intimatePosText, clip: detailerClipSource },
      _meta: { title: "IntimateDetailer — Positive Prompt" }
    };

    workflow["detail_intimate"] = {
      class_type: "FaceDetailer",
      inputs: {
        ...detailerBase,
        image: ["detail_hand", 0],
        model: detailerModelSource,
        clip: detailerClipSource,
        vae: detailerVaeSource,
        positive: ["detailer_intimate_pos", 0],
        negative: ["detailer_person_neg", 0],
        bbox_detector: ["det_person", 0],
        guide_size: 768,
        bbox_crop_factor: 2.0,
        denoise: 0.22,
        seed: detailerSeed + 2
      },
      _meta: { title: "Intimate Detailer — Fix Breasts & Groin Micro-Anatomy (ADetailer)" }
    };

    // Redirect SaveImage output to final intimate detailer node
    if (saveImageNodeId && workflow[saveImageNodeId]) {
      workflow[saveImageNodeId].inputs.images = ["detail_intimate", 0];
    }
    comfyLog("[Detailer] 🔞 Injected Intimate Detailer pass for breasts & groin micro-anatomy refinement.");
  } else if (saveImageNodeId && workflow[saveImageNodeId]) {
    // Redirect SaveImage output to final hand detailer node
    workflow[saveImageNodeId].inputs.images = ["detail_hand", 0];
  }

  comfyLog(`[Detailer] ✅ Injected FaceDetailer (ADetailer) nodes for SDXL model: ${arch.unetName}`);
  comfyLog(`[Detailer]    Face pass: VAEDecode[${vaeDecodeNodeId}] → FaceDetailer[detail_face] (denoise: 0.30, bbox_dilation: 32)`);
  comfyLog(`[Detailer]    Hand pass: detail_face → FaceDetailer[detail_hand] (denoise: 0.25)`);
  if (isNsfwScene) {
    comfyLog(`[Detailer]    Intimate pass: detail_hand → FaceDetailer[detail_intimate] (denoise: 0.22)`);
  }
  comfyLog(`[Detailer]    SaveImage[${saveImageNodeId}] now receives detailer output`);
}

/**
 * Injects IP-Adapter-Plus with time-step scheduling (start_at: 0.0, end_at: 0.35).
 * Locks face and body likeness for initial 35% of steps, leaving remaining 65% for prompt-driven attire.
 */
export function applyIpAdapterPlus(
  workflow: ComfyWorkflow,
  currentModelSource: [string, number],
  imageNodeId: string = "1",
  weight: number = 0.75,
  endAt: number = 0.35,
  partnerImageNodeId?: string
): [string, number] {
  if (!workflow[imageNodeId]) return currentModelSource;

  workflow["ipadapter_model_loader"] = {
    class_type: "IPAdapterModelLoader",
    inputs: { ipadapter_file: "ip-adapter-plus_sdxl_vit-h.bin" },
    _meta: { title: "IP-Adapter Model Loader" }
  };

  workflow["clip_vision_loader"] = {
    class_type: "CLIPVisionLoader",
    inputs: { clip_name: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" },
    _meta: { title: "CLIP Vision Loader" }
  };

  workflow["ipadapter_apply"] = {
    class_type: "IPAdapterAdvanced",
    inputs: {
      model: currentModelSource,
      ipadapter: ["ipadapter_model_loader", 0],
      image: [imageNodeId, 0],
      clip_vision: ["clip_vision_loader", 0],
      weight: weight,
      weight_type: "ease in",
      combine_embeds: "concat",
      start_at: 0.0,
      end_at: endAt,
      embeds_scaling: "V only"
    },
    _meta: { title: "IP-Adapter Apply Primary (Time-Step Scheduled 0.0 -> 0.35 — Head-Only Attn)" }
  };

  let nextModelSource: [string, number] = ["ipadapter_apply", 0];

  if (partnerImageNodeId && workflow[partnerImageNodeId]) {
    workflow["ipadapter_apply_partner"] = {
      class_type: "IPAdapterAdvanced",
      inputs: {
        model: nextModelSource,
        ipadapter: ["ipadapter_model_loader", 0],
        image: [partnerImageNodeId, 0],
        clip_vision: ["clip_vision_loader", 0],
        weight: weight,
        noise: 0.35,
        weight_type: "standard",
        start_at: 0.0,
        end_at: endAt
      },
      _meta: { title: "IP-Adapter Apply Partner (Time-Step Scheduled 0.0 -> 0.35 — Head-Only Attn)" }
    };
    nextModelSource = ["ipadapter_apply_partner", 0];
    comfyLog(`[IP-Adapter] ✅ Injected Partner IP-Adapter-Plus node [101]`);
  }

  comfyLog(`[IP-Adapter] ✅ Injected IP-Adapter-Plus (weight: ${weight}, end_at: ${endAt})`);
  return nextModelSource;
}

/**
 * Injects ControlNet OpenPose XL for tandem skeleton conditioning (Task CC-6).
 */
export function injectControlNetOpenPose(
  workflow: ComfyWorkflow,
  openPoseImageNodeId: string = "openpose_image",
  controlNetName: string = "controlnet_openpose_xl.safetensors",
  strength: number = 0.85
): void {
  if (!workflow[openPoseImageNodeId]) return;

  workflow["controlnet_openpose_loader"] = {
    class_type: "ControlNetLoader",
    inputs: { control_net_name: controlNetName },
    _meta: { title: "ControlNet OpenPose Loader" }
  };

  workflow["controlnet_openpose_apply"] = {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      positive: workflow["6"]?.inputs?.positive || ["6", 0],
      negative: workflow["7"]?.inputs?.negative || ["7", 0],
      control_net: ["controlnet_openpose_loader", 0],
      image: [openPoseImageNodeId, 0],
      strength: strength,
      start_percent: 0.0,
      end_percent: 0.75
    },
    _meta: { title: "ControlNet OpenPose Apply (Tandem Skeleton Conditioning)" }
  };

  comfyLog(`[ControlNet] ✅ Injected ControlNet OpenPose XL (strength: ${strength}, model: ${controlNetName})`);
}

import { ContactZoneBounds } from "./contactZoneManager";

/**
 * Injects ContactZone spatial lock zones in ComfyUI graph using SolidMask and ConditioningSetMask (Task CC-8).
 */
export function injectContactZoneMask(
  workflow: ComfyWorkflow,
  bounds: ContactZoneBounds,
  canvasWidth: number = 1024,
  canvasHeight: number = 1024
): void {
  if (!bounds || bounds.contactType === "NONE") return;

  workflow["contact_zone_mask"] = {
    class_type: "SolidMask",
    inputs: {
      value: 1.0,
      width: canvasWidth,
      height: canvasHeight,
      x: bounds.pixelXMin,
      y: bounds.pixelYMin,
      mask_width: bounds.pixelWidth,
      mask_height: bounds.pixelHeight
    },
    _meta: { title: `Contact Zone Mask (${bounds.contactType})` }
  };

  if (workflow["6"]) {
    workflow["contact_zone_conditioning"] = {
      class_type: "ConditioningSetMask",
      inputs: {
        conditioning: workflow["6"].inputs?.positive || ["6", 0],
        mask: ["contact_zone_mask", 0],
        strength: 1.0,
        set_cond_area: "default"
      },
      _meta: { title: "Contact Zone Conditioning Set Mask" }
    };

    if (workflow["8"] && workflow["8"].inputs) {
      workflow["8"].inputs.positive = ["contact_zone_conditioning", 0];
    }
  }

  comfyLog(`[ContactZone] ✅ Injected spatial lock mask bounds for ${bounds.contactType}: X[${bounds.pixelXMin}-${bounds.pixelXMin + bounds.pixelWidth}], Y[${bounds.pixelYMin}-${bounds.pixelYMin + bounds.pixelHeight}]`);
}

/**
 * Injects CLIPTextEncodeSDXL node for dual CLIP text encoding (clip_l + clip_g 154 token capacity) (Task QA-2).
 */
export function injectDualClipEncoderSDXL(
  workflow: ComfyWorkflow,
  textL: string,
  textG: string,
  clipSource: [string, number] = ["2", 1]
): void {
  if (!workflow["6"]) return;

  workflow["sdxl_dual_clip_positive"] = {
    class_type: "CLIPTextEncodeSDXL",
    inputs: {
      text_l: textL,
      text_g: textG,
      crop_w: 0,
      crop_h: 0,
      target_width: 1024,
      target_height: 1024,
      width: 1024,
      height: 1024,
      clip: clipSource
    },
    _meta: { title: "CLIPTextEncodeSDXL (Dual 154-Token Encoder)" }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.positive = ["sdxl_dual_clip_positive", 0];
  }

  comfyLog(`[DualCLIP] ✅ Injected CLIPTextEncodeSDXL (text_l: ${textL.length} chars, text_g: ${textG.length} chars)`);
}

/**
 * Applies per-stage CFG scheduling in ComfyUI workflow graph (Task QA-4).
 * Decreases CFG dynamically as the image converges across stages to prevent over-saturation.
 */
export function applyPerStageCFGScheduling(
  workflow: ComfyWorkflow,
  stageIndex: number,
  baseCfg: number = 4.0
): number {
  let stageCfg = baseCfg;

  switch (stageIndex) {
    case 1:
    case 2:
    case 3:
      stageCfg = baseCfg;
      break;
    case 3.2:
      stageCfg = Math.max(2.5, Number((baseCfg * 0.75).toFixed(1)));
      break;
    case 3.5:
      stageCfg = Math.max(2.5, Number((baseCfg * 0.70).toFixed(1)));
      break;
    case 4:
      stageCfg = Math.max(2.5, Number((baseCfg * 0.65).toFixed(1)));
      break;
    case 5:
      stageCfg = Math.max(2.5, Number((baseCfg * 0.60).toFixed(1)));
      break;
    default:
      stageCfg = baseCfg;
  }

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.cfg = stageCfg;
  } else {
    for (const key of Object.keys(workflow)) {
      if (workflow[key]?.class_type === "KSampler" && workflow[key]?.inputs) {
        workflow[key].inputs.cfg = stageCfg;
      }
    }
  }

  comfyLog(`[CFGScheduler] ✅ Applied Stage ${stageIndex} CFG scheduling: ${baseCfg} → ${stageCfg}`);
  return stageCfg;
}

/**
 * Chains latent output directly between KSampler nodes across stages (Task QA-5).
 * Bypasses lossy VAE decode/encode round-trips to eliminate color shift and quality degradation.
 */
export function chainLatentBetweenStages(
  workflow: ComfyWorkflow,
  sourceKSamplerId: string = "8",
  targetLatentInputNodeId: string = "8"
): boolean {
  if (!workflow[sourceKSamplerId]) return false;

  const latentOutputLink: [string, number] = [sourceKSamplerId, 0];

  if (workflow[targetLatentInputNodeId] && workflow[targetLatentInputNodeId].inputs) {
    workflow[targetLatentInputNodeId].inputs.latent_image = latentOutputLink;
    comfyLog(`[LatentChain] ✅ Chained latent output [${sourceKSamplerId}, 0] directly into KSampler Node "${targetLatentInputNodeId}" latent_image`);
    return true;
  }

  return false;
}

/**
 * Injects TAESD (Tiny AutoEncoder) preview decoder node into workflow graph for ultra-fast ~15ms preview decodes (Task QA-6).
 */
export function injectTAESDPreviewDecoder(
  workflow: ComfyWorkflow,
  taesdName: string = "taesd_sdxl.safetensors",
  latentSourceId: string = "8"
): boolean {
  if (!workflow[latentSourceId]) return false;

  workflow["taesd_loader"] = {
    class_type: "TAESDLoader",
    inputs: { taesd_name: taesdName },
    _meta: { title: "TAESD Preview Loader" }
  };

  workflow["taesd_preview_vae_decode"] = {
    class_type: "VAEDecode",
    inputs: {
      samples: [latentSourceId, 0],
      vae: ["taesd_loader", 0]
    },
    _meta: { title: "TAESD Fast Preview Decode (<15ms)" }
  };

  comfyLog(`[TAESD] ✅ Injected TAESD preview decoder (${taesdName}) wired to latent source Node "${latentSourceId}"`);
  return true;
}

export interface SpatialRegionConfig {
  regionId: string;
  xMin: number;
  yMin: number;
  width: number;
  height: number;
  promptText: string;
}

/**
 * Assigns specific CLIP prompts to spatial bounding box regions on canvas (Task QA-8).
 * Uses SolidMask + ConditioningSetMask + ConditioningCombine to eliminate prompt cross-contamination.
 */
export function injectSpatialTokenAssignment(
  workflow: ComfyWorkflow,
  regions: SpatialRegionConfig[],
  clipSource: [string, number] = ["2", 1]
): boolean {
  if (!regions || regions.length === 0 || !workflow["8"]) return false;

  let previousCond: [string, number] = workflow["6"] ? ["6", 0] : ((workflow["8"]?.inputs?.positive as [string, number]) || ["6", 0]);

  regions.forEach((reg, index) => {
    const maskNodeId = `spatial_mask_${reg.regionId}_${index}`;
    const clipNodeId = `spatial_clip_${reg.regionId}_${index}`;
    const condMaskNodeId = `spatial_cond_mask_${reg.regionId}_${index}`;
    const condCombineNodeId = `spatial_cond_combine_${reg.regionId}_${index}`;

    workflow[maskNodeId] = {
      class_type: "SolidMask",
      inputs: {
        value: 1.0,
        width: 1024,
        height: 1024,
        x: reg.xMin,
        y: reg.yMin,
        solid_width: reg.width,
        solid_height: reg.height
      },
      _meta: { title: `Spatial Mask (${reg.regionId})` }
    };

    workflow[clipNodeId] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: reg.promptText,
        clip: clipSource
      },
      _meta: { title: `Spatial CLIP (${reg.regionId})` }
    };

    workflow[condMaskNodeId] = {
      class_type: "ConditioningSetMask",
      inputs: {
        conditioning: [clipNodeId, 0],
        mask: [maskNodeId, 0],
        strength: 1.0,
        set_cond_area: "default"
      },
      _meta: { title: `Spatial Conditioning Set Mask (${reg.regionId})` }
    };

    workflow[condCombineNodeId] = {
      class_type: "ConditioningCombine",
      inputs: {
        conditioning_1: previousCond,
        conditioning_2: [condMaskNodeId, 0]
      },
      _meta: { title: `Spatial Conditioning Combine (${reg.regionId})` }
    };

    previousCond = [condCombineNodeId, 0];
  });

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.positive = previousCond;
  }

  comfyLog(`[SpatialTokens] ✅ Injected ${regions.length} regional conditioning mask(s) into workflow graph`);
  return true;
}

/**
 * Injects native ComfyUI background removal node (RembgNode / ImageRemoveBackground)
 * directly into the workflow graph for native 32-bit RGBA transparent image generation.
 */
export function injectRembgBackgroundRemoval(workflow: ComfyWorkflow): boolean {
  let saveNodeKey: string | null = null;
  let saveNode: ComfyWorkflowNode | null = null;

  for (const [key, node] of Object.entries(workflow)) {
    if (node?.class_type === "SaveImage") {
      saveNodeKey = key;
      saveNode = node;
      break;
    }
  }

  if (!saveNodeKey || !saveNode) return false;

  const currentImageSource = saveNode.inputs?.images || ["9", 0];

  const rembgNodeId = "native_rembg_background_removal";
  workflow[rembgNodeId] = {
    class_type: "ImageRemoveBackgroundRembg",
    inputs: {
      image: currentImageSource,
      model: "u2net"
    },
    _meta: { title: "Native ComfyUI Background Removal (Rembg)" }
  };

  // Wire SaveImage to the Rembg transparent RGBA image output
  saveNode.inputs.images = [rembgNodeId, 0];
  comfyLog(`✂️ [WorkflowMutator] ✅ Injected native ComfyUI RembgNode [${rembgNodeId}] for transparent RGBA generation`);
  return true;
}
