/**
 * src/lib/ai/comfy/workflowBuilder.ts
 *
 * Workflow loaders and dynamic prompt graph generators/configurators for ComfyUI.
 */

import fs from "fs";
import path from "path";
import { ComfyWorkflow, ComfyWorkflowNode, ComfyWorkflowInputs, LtxFeatureFlags } from "./types";
import { getWavDuration, getPngDimensions } from "./utils";
import { autoDetectLoras } from "../../prompt/promptCompiler";
import { getComfyModelsDir } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:workflowBuilder");

/**
 * Load a workflow JSON from the vendor directory or root directory.
 */
export function loadWorkflow(template: ComfyWorkflowInputs["model"]): ComfyWorkflow {
  const workflowDir = path.join(process.cwd(), "vendor", "ComfyUI", "custom", "comfy_workflows", "video");
  
  const version = process.env.COMFY_WORKFLOW_VERSION || "v1";

  let filename = "infinitetalk_1.3b_i2v.json";
  if (template === "14b") filename = "infinitetalk_14b_i2v.json";
  if (template === "echomimic") filename = "echomimic_v3_flash_api.json";
  if (
    template === "ltx" ||
    template === "ltx_2.5" ||
    template === "ltx_2.5_distilled" ||
    template === "ltx_distilled" ||
    template === "distilled" ||
    template === "ltx_audio" ||
    template === "ltx_flfv_tts" ||
    template === "ltx_flfv_generated" ||
    template === "ltx_silent" ||
    template === "ltx_multi_persona" ||
    template === "ltx_sfx" ||
    template === "ltx_music_video" ||
    template === "eros" ||
    template === "sulphur"
  ) {
    filename = "ltx_video_unified.json";
  }
  if (template === "rtx_sr_upscale") filename = "rtx_sr_upscale.json";
  if (template === "wan_alpha") filename = "wan_video_alpha_unified.json";
  if (template === "wan_transition") filename = "wan_video_transition_start_end.json";
  if (template === "minimax_h3" || template === "minimax") filename = "minimax_h3_video.json";
  if (template === "minimax_taomate" || template === "taomate") filename = "minimax_h3_taomate_api_prompt.json";
  if (
    template === "hunyuan_1.5" ||
    template === "hunyuan" ||
    template === "hunyuanvideo_1.5" ||
    template === "hunyuanvideo"
  ) {
    filename = "hunyuanvideo_1.5_i2v.json";
  }
  
  let fullPath = "";
  const isLtxUnified = filename === "ltx_video_unified.json";

  if (version === "v2" && !isLtxUnified) {
    // Try to load from v2-advanced directory
    let v2Path = path.join(workflowDir, "v2-advanced", filename);
    if (!fs.existsSync(v2Path)) {
      v2Path = path.join(process.cwd(), "comfy_workflows", "video", "v2-advanced", filename);
    }
    if (fs.existsSync(v2Path)) {
      fullPath = v2Path;
    }
  }

  if (!fullPath) {
    const rootPath = path.join(process.cwd(), "comfy_workflows", "video", filename);
    if (fs.existsSync(rootPath)) {
      fullPath = rootPath;
    } else {
      fullPath = path.join(workflowDir, filename);
    }
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Workflow file not found: ${fullPath}\n` +
      `Ensure the workflow JSON is placed in the vendor/ComfyUI/custom/comfy_workflows/video/ or root comfy_workflows/video/ directory.`
    );
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

export function deriveLtxFeatureFlags(
  inputs?: ComfyWorkflowInputs,
  supportedNodes?: Record<string, boolean>
): LtxFeatureFlags {
  const model = inputs?.model || "ltx";
  const version = process.env.COMFY_WORKFLOW_VERSION || "v1";

  let audioMode: LtxFeatureFlags["audioMode"] = "tts";
  let modelVariant: LtxFeatureFlags["modelVariant"] = "distilled";

  if (model === "ltx_flfv_generated" || model === "ltx_silent") {
    audioMode = "generated";
  } else if (model === "ltx_multi_persona") {
    audioMode = "multi_persona";
  } else if (model === "ltx_sfx") {
    audioMode = "sfx_only";
  } else if (model === "ltx_music_video") {
    audioMode = "music_video";
  }

  if (
    model === "ltx" ||
    model === "ltx_2.5" ||
    model === "ltx_audio" ||
    model === "ltx_flfv_tts"
  ) {
    modelVariant = "distilled";
  } else if (
    model === "ltx_2.5_distilled" ||
    model === "ltx_distilled" ||
    model === "distilled"
  ) {
    modelVariant = "distilled";
  } else if (model === "eros") {
    modelVariant = "eros";
    audioMode = "tts";
  } else if (model === "sulphur") {
    modelVariant = "sulphur";
    audioMode = "tts";
  }

  const isV2 = version === "v2";

  const flags: LtxFeatureFlags = {
    audioMode,
    noiseReduction: isV2 && audioMode !== "music_video" && audioMode !== "generated",
    spatialUpscale: isV2,
    faceDetailer: false,
    frameInterpolation: true,
    superResolution: isV2,
    modelVariant,
  };

  if (inputs?.features) {
    Object.assign(flags, inputs.features);
  }

  // Gracefully fallback if the host ComfyUI instance does not have the custom nodes installed
  if (supportedNodes) {
    if (flags.noiseReduction && !supportedNodes["DeepFilterNet"]) {
      log.info("[ComfyClient] DeepFilterNet is not installed. Disabling noise reduction.");
      flags.noiseReduction = false;
    }
    if (flags.spatialUpscale && !supportedNodes["LatentUpscaleWithModel"]) {
      log.info("[ComfyClient] LatentUpscaleWithModel is not supported. Disabling spatial upscale.");
      flags.spatialUpscale = false;
    }
    if (flags.faceDetailer && !supportedNodes["FaceDetailer"]) {
      log.info("[ComfyClient] FaceDetailer is not installed. Disabling face detailer.");
      flags.faceDetailer = false;
    }
    if (flags.superResolution && !supportedNodes["RTXVideoSuperResolution"]) {
      log.info("[ComfyClient] RTXVideoSuperResolution is not installed. Disabling super resolution.");
      flags.superResolution = false;
    }
    if (flags.frameInterpolation && !supportedNodes["RIFE VFI"]) {
      log.info("[ComfyClient] RIFE VFI is not installed. Disabling frame interpolation.");
      flags.frameInterpolation = false;
    }
    if ((flags.modelVariant === "distilled" || flags.modelVariant === "sulphur") && !supportedNodes["DiffusionModelLoaderKJ"]) {
      log.info("[ComfyClient] DiffusionModelLoaderKJ is not installed. Falling back to dev model variant.");
      flags.modelVariant = "dev";
    }
  }

  return flags;
}

function injectDistilledModelChain(workflow: ComfyWorkflow, variant: "distilled" | "sulphur") {
  const modelName = variant === "sulphur"
    ? "sulphur_ltx_video_2.5_fp8.safetensors"
    : "ltx-2.5-22b-distilled-transformer-fp8_e4m3fn.safetensors";

  workflow["1"] = {
    "inputs": {
      "model_name": modelName,
      "weight_dtype": "default",
      "compute_dtype": "default",
      "patch_cublaslinear": false,
      "sage_attention": "disabled",
      "enable_fp16_accumulation": false
    },
    "class_type": "DiffusionModelLoaderKJ",
    "_meta": { "title": "Load Distilled Model" }
  };

  workflow["22"] = {
    "inputs": {
      "clip_name": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "ltxv",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": { "title": "Load LTXV Text Encoder" }
  };

  if (workflow["4"]) {
    workflow["4"].inputs.clip = ["22", 0];
  }
  if (workflow["5"]) {
    workflow["5"].inputs.clip = ["22", 0];
  }

  workflow["23"] = {
    "inputs": {
      "vae_name": "ltx-2.5-video-vae-conv-bf16.safetensors",
      "device": "main_device",
      "weight_dtype": "bf16"
    },
    "class_type": "VAELoaderKJ",
    "_meta": { "title": "Load Video VAE" }
  };

  if (workflow["10"]) {
    workflow["10"].inputs.vae = ["23", 0];
  }
  if (workflow["19"]) {
    workflow["19"].inputs.vae = ["23", 0];
  }
  if (workflow["13"]) {
    workflow["13"].inputs.model = ["1", 0];
  }
}

function injectEmptyAudioLatent(workflow: ComfyWorkflow) {
  delete workflow["3"]; // Delete LoadAudio
  workflow["7"] = {
    "inputs": {
      "audio_vae": ["6", 0],
      "frames_number": 97,
      "frame_rate": 25,
      "batch_size": 1
    },
    "class_type": "LTXVEmptyLatentAudio",
    "_meta": { "title": "Empty Audio Latent" }
  };
}

function injectDeepFilterNet(workflow: ComfyWorkflow) {
  workflow["23_audio_dfn"] = {
    "inputs": {
      "audio": ["3", 0]
    },
    "class_type": "DeepFilterNet",
    "_meta": { "title": "DeepFilterNet Noise Suppression" }
  };

  if (workflow["7"]) {
    workflow["7"].inputs.audio = ["23_audio_dfn", 0];
  }
}

function injectSpatialUpscaler(workflow: ComfyWorkflow) {
  workflow["24"] = {
    "inputs": {
      "model_name": "ltx-2.5-spatial-upscaler-x2.safetensors"
    },
    "class_type": "ModelLoader",
    "_meta": { "title": "Load Spatial Upscaler" }
  };

  workflow["26"] = {
    "inputs": {
      "samples": ["18", 0],
      "upscale_model": ["24", 0]
    },
    "class_type": "LatentUpscaleWithModel",
    "_meta": { "title": "Spatial Upscaler X2" }
  };

  if (workflow["19"]) {
    workflow["19"].inputs.samples = ["26", 0];
  }
}

function injectAdvancedPostProcessingChain(workflow: ComfyWorkflow, options: { faceDetailer: boolean; livePortrait?: boolean; frameInterpolation: boolean; superResolution: boolean }) {
  let lastVideoNodeId = "19"; // VAEDecodeTiled output

  if (options.faceDetailer) {
    workflow["27"] = {
      "inputs": {
        "image": [lastVideoNodeId, 0],
        "guide_size": 1024,
        "guide_size_for": "bbox",
        "max_size": 1024,
        "seed": 0,
        "steps": 20,
        "cfg": 6.5,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 0.25,
        "feather": 16,
        "noise_mask": true,
        "force_inpaint": true,
        "bbox_threshold": 0.5,
        "bbox_dilation": 48,
        "bbox_crop_factor": 3,
        "sam_detection_margin": 8,
        "sam_threshold": 0.93,
        "sam_erosion": 0,
        "drop_size": 10
      },
      "class_type": "FaceDetailer",
      "_meta": { "title": "Video FaceDetailer (Anti-Flicker 0.25 Denoise)" }
    };
    lastVideoNodeId = "27";
  }

  if (options.livePortrait) {
    workflow["28"] = {
      "inputs": {
        "source_image": [lastVideoNodeId, 0],
        "lip_zero": true,
        "eye_retargeting": true,
        "eye_retargeting_multiplier": 1.0,
        "lip_retargeting": false
      },
      "class_type": "LivePortraitProcess",
      "_meta": { "title": "LivePortrait Refiner (120+ FPS Pupil & Lip Keypoints)" }
    };
    lastVideoNodeId = "28";
  }

  if (options.frameInterpolation) {
    workflow["29"] = {
      "inputs": {
        "ckpt_name": "rife49.pth",
        "frames": [lastVideoNodeId, 0],
        "clear_cache_after_n_frames": 10,
        "multiplier": 2,
        "fast_mode": true,
        "ensemble": true,
        "scale_factor": 1.0,
        "dtype": "float32",
        "torch_compile": false,
        "batch_size": 1
      },
      "class_type": "RIFE VFI",
      "_meta": { "title": "RIFE Frame Interpolation (50 FPS)" }
    };
    lastVideoNodeId = "29";
  }

  if (options.superResolution) {
    workflow["32"] = {
      "inputs": {
        "images": [lastVideoNodeId, 0],
        "resize_type": "target dimensions",
        "resize_type.width": 2160,
        "resize_type.height": 3840,
        "quality": "ULTRA"
      },
      "class_type": "RTXVideoSuperResolution",
      "_meta": { "title": "NVIDIA RTX VSR 4K" }
    };
    lastVideoNodeId = "32";
  }

  if (workflow["21"]) {
    workflow["21"].inputs.images = [lastVideoNodeId, 0];
    if (options.frameInterpolation) {
      workflow["21"].inputs.fps = 50.0;
    }
  }
}

/**
 * Load a workflow JSON and swap the input node values for our image & audio.
 */
export function buildWorkflowPrompt(
  workflowJson: ComfyWorkflow,
  uploadedImageName: string,
  uploadedAudioName: string,
  inputs?: ComfyWorkflowInputs,
  uploadedLastImageName?: string,
  supportedNodes?: Record<string, boolean>
): ComfyWorkflow {
  const workflow: ComfyWorkflow = JSON.parse(JSON.stringify(workflowJson)); // deep clone

  const isSilentMode = inputs?.isSilent || inputs?.positivePrompt?.toLowerCase().includes("silent") || (!inputs?.spokenText && !inputs?.transcript && !inputs?.audioPath);
  let audioDuration = isSilentMode ? 1.5 : 10;
  if (inputs?.audioPath) {
    try {
      const probed = getWavDuration(inputs.audioPath);
      if (probed > 0) audioDuration = probed;
    } catch {}
  }

  const model = inputs?.model || "ltx";
  const isLtxModel =
    model.startsWith("ltx") ||
    model === "eros" ||
    model === "sulphur";

  const flags = deriveLtxFeatureFlags(inputs, supportedNodes);

  if (flags.audioMode === "music_video" && inputs?.positivePrompt && !inputs.positivePrompt.includes("music video")) {
    inputs.positivePrompt = `music video, beat-synchronized movement, ${inputs.positivePrompt}`;
  }

  if (isLtxModel) {
    if (flags.modelVariant === "distilled" || flags.modelVariant === "sulphur") {
      injectDistilledModelChain(workflow, flags.modelVariant);
    }
    if (flags.audioMode === "generated") {
      injectEmptyAudioLatent(workflow);
    } else if (flags.noiseReduction && workflow["3"]) {
      injectDeepFilterNet(workflow);
    }
    if (flags.spatialUpscale && workflow["19"]) {
      injectSpatialUpscaler(workflow);
    }
    if (flags.faceDetailer || flags.superResolution) {
      injectAdvancedPostProcessingChain(workflow, {
        faceDetailer: flags.faceDetailer,
        frameInterpolation: flags.frameInterpolation,
        superResolution: flags.superResolution
      });
    }
  }

  let totalFrames = 37;
  let calculatedChunks = 1;
  let paddedVideoDuration = audioDuration;

  if (model === "ltx_transition") {
    const targetDuration = Math.max(3.88, audioDuration);
    const rawFrames = Math.max(97, Math.round(targetDuration * 25.0));
    totalFrames = Math.ceil((rawFrames - 1) / 8) * 8 + 1;
    paddedVideoDuration = totalFrames / 25.0;
    calculatedChunks = 1;
  } else if (isLtxModel) {
    // Extend duration by 0.6 seconds to push guide transitions & temporal boundary effects past the active speaking range
    const extendedAudioDuration = audioDuration + (isSilentMode ? 0.0 : 0.6);
    const calculatedFrames = Math.max(16, Math.round(extendedAudioDuration * 25.0));
    const paddedLatentLength = Math.ceil((calculatedFrames - 1) / 8) * 8 + 1;
    paddedVideoDuration = ((paddedLatentLength * 2) - 1) / 50.0;
    totalFrames = paddedLatentLength;
    calculatedChunks = Math.max(1, Math.ceil(totalFrames / 97));
  }

  log.info(`[ComfyClient] Calculated totalFrames=${totalFrames}, calculatedChunks=${calculatedChunks}, paddedVideoDuration=${paddedVideoDuration.toFixed(2)}s for audioDuration=${audioDuration.toFixed(2)}s (${model})`);

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.inputs) continue;

    // Image loader node — start frame / default
    if (node.class_type === "LoadImage" || node.class_type === "WanVideoImageClipEncode") {
      if ("image" in node.inputs) {
        // For transition workflows: end-frame node has title containing "End Keyframe" or "State B"
        const metaTitle: string = String(node._meta?.title || "");
        const isEndFrameNode = metaTitle.toLowerCase().includes("end keyframe") ||
          metaTitle.toLowerCase().includes("state b") ||
          node.inputs.image === "avatar_end.png";
        if (isEndFrameNode && uploadedLastImageName) {
          node.inputs.image = uploadedLastImageName;
        } else {
          node.inputs.image = uploadedImageName;
        }
      }
    }

    // Audio loader node
    if (node.class_type === "LoadAudio" || node.class_type === "VHS_LoadAudio") {
      const activeAudioName = (uploadedAudioName && uploadedAudioName.trim() !== "") ? uploadedAudioName : "silent_2s.wav";
      if ("audio_file" in node.inputs) {
        node.inputs.audio_file = activeAudioName;
      }
      if ("audio" in node.inputs && typeof node.inputs.audio === "string") {
        node.inputs.audio = activeAudioName;
      }
    }

    // Video loader node (for upscaler)
    if (node.class_type === "VHS_LoadVideo") {
      if ("video" in node.inputs) {
        node.inputs.video = uploadedAudioName; // uploadAudioPath is the video in upscaler
      }
    }

    // LTXVChunkFeedForward temporal chunking
    if (node.class_type === "LTXVChunkFeedForward") {
      node.inputs.chunks = calculatedChunks;
    }

    // VAEDecodeTiled spatial tile size optimization for low VRAM to prevent pagination
    if (node.class_type === "VAEDecodeTiled") {
      node.inputs.tile_size = 512; // Use 512 to balance boundary seamlessness and memory usage
      node.inputs.overlap = 64;
      node.inputs.temporal_size = 64; // Reduce temporal chunk size to 64 to keep peak VRAM low
      node.inputs.temporal_overlap = 16;
      log.info(`[ComfyClient] Optimizing VAEDecodeTiled for low VRAM: tile_size=512, temporal_size=64.`);
    }

    // Relax single-image conditioning strength to unlock natural mouth movement for speech, or allow natural head gestures for silent loops
    if (node.class_type === "LTXVImgToVideoConditionOnly" || node._meta?.title === "Image Conditioning") {
      const isSilent = inputs?.isSilent || (!inputs?.spokenText && !inputs?.audioPath);
      node.inputs.strength = isSilent ? 0.68 : 0.40;
    }
    if (node.class_type === "LTXVImgToVideoInplaceKJ") {
      if (inputs?.model === "ltx_transition") {
        node.inputs["num_images"] = "4";
        // 1. Initial desk anchor lock
        node.inputs["num_images.image_1"] = ["9", 0];
        node.inputs["num_images.index_1"] = 0;
        node.inputs["num_images.strength_1"] = 0.90;

        // 2. Soft attractor (~1.3s before end, 33 frames back) to guide torso and posture
        node.inputs["num_images.image_2"] = ["9b", 0];
        node.inputs["num_images.index_2"] = -33;
        node.inputs["num_images.strength_2"] = 0.35;

        // 3. Medium attractor (~0.6s before end, 17 frames back) to align hands and blazer
        node.inputs["num_images.image_3"] = ["9b", 0];
        node.inputs["num_images.index_3"] = -17;
        node.inputs["num_images.strength_3"] = 0.60;

        // 4. Terminal landing lock
        node.inputs["num_images.image_4"] = ["9b", 0];
        node.inputs["num_images.index_4"] = -1;
        node.inputs["num_images.strength_4"] = 0.85;
        log.info(`[ComfyClient] Configured LTXVImgToVideoInplaceKJ progressive 4-point landing ramp (0:0.90 -> -33:0.35 -> -17:0.60 -> -1:0.85).`);
      } else {
        const hasEndImage = Boolean(inputs?.lastImagePath);
        if (hasEndImage) {
          // Explicit dual-keyframe conditioning: Start Image (Frame 0) + End Image (Frame -1)
          // When start == end, this creates a NATIVE SEAMLESS FORWARD-TIME LOOP without ping-pong!
          // When start != end, this creates a directed pose-to-pose transition!
          const _isGesture = inputs?.positivePrompt?.toLowerCase().includes("turns head") ||
            inputs?.positivePrompt?.toLowerCase().includes("turning head") ||
            inputs?.positivePrompt?.toLowerCase().includes("turn") ||
            inputs?.positivePrompt?.toLowerCase().includes("gesture") ||
            inputs?.positivePrompt?.toLowerCase().includes("nod") ||
            inputs?.positivePrompt?.toLowerCase().includes("nodding") ||
            inputs?.positivePrompt?.toLowerCase().includes("tilts") ||
            inputs?.positivePrompt?.toLowerCase().includes("glances") ||
            inputs?.positivePrompt?.toLowerCase().includes("unclasp") ||
            inputs?.positivePrompt?.toLowerCase().includes("hands") ||
            inputs?.positivePrompt?.toLowerCase().includes("arms") ||
            inputs?.positivePrompt?.toLowerCase().includes("torso") ||
            inputs?.positivePrompt?.toLowerCase().includes("body") ||
            inputs?.positivePrompt?.toLowerCase().includes("alert") ||
            inputs?.positivePrompt?.toLowerCase().includes("welcome") ||
            inputs?.positivePrompt?.toLowerCase().includes("signoff") ||
            inputs?.positivePrompt?.toLowerCase().includes("analyst");
          
          const isSameImage = !inputs?.lastImagePath || inputs.lastImagePath === inputs.imagePath;
          // Start anchor maintains high identity (0.75), while relaxed end anchor (0.45) eliminates latent tension, vibration, and buzzing
          const startStrength = isSameImage ? 0.75 : 0.70;
          const endStrength = isSameImage ? 0.45 : 0.40;

          // Inject node 2b/9b if end image is different
          if (!isSameImage && !workflow["2b"]) {
            workflow["2b"] = {
              inputs: {
                image: uploadedLastImageName || uploadedImageName,
                upload: "image"
              },
              class_type: "LoadImage",
              _meta: { title: "Load End Image Keyframe" }
            };
            workflow["9b"] = {
              inputs: {
                image: ["2b", 0],
                img_compression: 10
              },
              class_type: "LTXVPreprocess",
              _meta: { title: "Preprocess End Image" }
            };
          }

          node.inputs["num_images"] = "2";
          node.inputs["num_images.image_1"] = ["9", 0];
          node.inputs["num_images.index_1"] = 0;
          node.inputs["num_images.strength_1"] = startStrength;

          node.inputs["num_images.image_2"] = isSameImage ? ["9", 0] : ["9b", 0];
          node.inputs["num_images.index_2"] = -1;
          node.inputs["num_images.strength_2"] = endStrength;
          log.info(`[ComfyClient] Set LTXVImgToVideoInplaceKJ dual anchors (Start 0:${startStrength} -> End -1:${endStrength}). Mode: ${isSameImage ? "Native Forward-Time Seamless Loop (Zero Ping-Pong Needed)" : "Directed Transition"}.`);
        } else {
          // Standard single keyframe
          const isGesture = inputs?.positivePrompt?.toLowerCase().includes("turns head") ||
            inputs?.positivePrompt?.toLowerCase().includes("turning head") ||
            inputs?.positivePrompt?.toLowerCase().includes("turn") ||
            inputs?.positivePrompt?.toLowerCase().includes("gesture") ||
            inputs?.positivePrompt?.toLowerCase().includes("nod") ||
            inputs?.positivePrompt?.toLowerCase().includes("nodding") ||
            inputs?.positivePrompt?.toLowerCase().includes("tilts") ||
            inputs?.positivePrompt?.toLowerCase().includes("glances") ||
            inputs?.positivePrompt?.toLowerCase().includes("unclasp") ||
            inputs?.positivePrompt?.toLowerCase().includes("hands") ||
            inputs?.positivePrompt?.toLowerCase().includes("arms") ||
            inputs?.positivePrompt?.toLowerCase().includes("torso") ||
            inputs?.positivePrompt?.toLowerCase().includes("body") ||
            inputs?.positivePrompt?.toLowerCase().includes("alert") ||
            inputs?.positivePrompt?.toLowerCase().includes("welcome") ||
            inputs?.positivePrompt?.toLowerCase().includes("signoff") ||
            inputs?.positivePrompt?.toLowerCase().includes("analyst");
          const strength = isGesture ? 0.60 : (inputs?.isSilent ? 0.75 : 0.40);
          node.inputs["num_images"] = "1";
          node.inputs["num_images.image_1"] = ["9", 0];
          node.inputs["num_images.index_1"] = 0;
          node.inputs["num_images.strength_1"] = strength;
          log.info(`[ComfyClient] Set LTXVImgToVideoInplaceKJ INITIAL IMAGE ONLY (index 0, strength ${strength}) for ${isGesture ? "Dynamic Gesture Motion (Preserving Texture & Colors)" : "Motion Loop"}.`);
        }
      }
    }
    if (node.class_type === "CFGGuider" && (isLtxModel || inputs?.model?.startsWith("ltx"))) {
      node.inputs.cfg = inputs?.isSilent ? 2.2 : 5.0;
      log.info(`[ComfyClient] Set CFGGuider scale to ${node.inputs.cfg} (${inputs?.isSilent ? "Natural Motion / Smooth Skin CFG 2.2" : "Strong Speech Sync"}).`);
    }

    // EmptyLatentVideo frame length and dimensions adjustment
    if (node.class_type === "EmptyLTXVLatentVideo") {
      node.inputs.length = totalFrames;
      if (inputs?.imagePath && fs.existsSync(inputs.imagePath)) {
        const dims = getPngDimensions(inputs.imagePath);
        const aspectRatio = dims.width / dims.height;

        let targetW = 544;
        let targetH = 960;

        if (Math.abs(aspectRatio - 1.0) < 0.18) {
          // Square aspect ratio (~1:1)
          targetW = 768;
          targetH = 768;
        } else if (dims.width > dims.height) {
          // Horizontal aspect ratio (16:9)
          targetW = 960;
          targetH = 544;
        } else {
          // Vertical aspect ratio (9:16)
          targetW = 544;
          targetH = 960;
        }
        node.inputs.width = targetW;
        node.inputs.height = targetH;
        log.info(`[ComfyClient] Detected input keyframe (${dims.width}x${dims.height}, ratio ${aspectRatio.toFixed(2)}). Setting video latent size to ${targetW}x${targetH}.`);
      }
    }

    // LTXVAddGuideAdvanced last frame index correction & strength override
    if (node.class_type === "LTXVAddGuideAdvanced" && (node.inputs.frame_idx === -1 || node._meta?.title === "Add Guide (Last Frame)")) {
      node.inputs.frame_idx = totalFrames - 1;
      node.inputs.strength = 0.75; // Use balanced template strength to avoid premature speaker freezing
      log.info(`[ComfyClient] Overriding last frame guide index to ${totalFrames - 1} and strength to 0.75.`);
    }

    // EmptyLatentAudio frame length adjustment
    if (node.class_type === "LTXVEmptyLatentAudio") {
      node.inputs.frames_number = totalFrames;
    }

    // LTXVAudioVAELoader requires the specific Audio VAE checkpoint
    if (node.class_type === "LTXVAudioVAELoader") {
      node.inputs.ckpt_name = "ltx-2.5-audio-vae-bf16.safetensors";
    }

    // LTXVPreprocess compression adjustment (lower = maximum spatial detail, pores, hair texture & color richness)
    if (node.class_type === "LTXVPreprocess") {
      node.inputs.img_compression = 10;
      log.info(`[ComfyClient] Set LTXVPreprocess img_compression to 10 for maximum texture & color preservation.`);
    }

    // MiniMax H3 ImageToVideo Node
    if (node.class_type === "MiniMaxH3ImageToVideo") {
      if (inputs?.positivePrompt) {
        node.inputs.prompt = inputs.positivePrompt;
      }
      if (inputs?.imagePath && fs.existsSync(inputs.imagePath)) {
        const dims = getPngDimensions(inputs.imagePath);
        const aspectRatio = dims.width / dims.height;
        if (Math.abs(aspectRatio - 1.0) < 0.18) {
          node.inputs.width = 768;
          node.inputs.height = 768;
        } else if (dims.width > dims.height) {
          node.inputs.width = 1344;
          node.inputs.height = 768;
        } else {
          node.inputs.width = 768;
          node.inputs.height = 1344;
        }
        log.info(`[ComfyClient] MiniMax H3 Canvas set to ${node.inputs.width}x${node.inputs.height} based on aspect ratio ${aspectRatio.toFixed(2)}.`);
      }

      let targetFrames = 124;
      if (audioDuration > 0 && !isSilentMode) {
        let raw = Math.max(124, Math.round(audioDuration * 24.0));
        while (raw % 17 !== 5) {
          raw++;
        }
        targetFrames = raw;
      }
      node.inputs.length = targetFrames;
      log.info(`[ComfyClient] MiniMax H3 Frame length set to ${targetFrames} frames (~${(targetFrames / 24).toFixed(2)}s @ 24fps).`);

      if (uploadedLastImageName && !node.inputs.last_frame) {
        if (!workflow["6b"]) {
          workflow["6b"] = {
            inputs: {
              image: uploadedLastImageName,
              upload: "image"
            },
            class_type: "LoadImage",
            _meta: { title: "Load End Frame Image" }
          };
        }
        node.inputs.last_frame = ["6b", 0];
      }
    }

    // HunyuanVideo 1.5 ImageToVideo Node
    if (node.class_type === "HunyuanVideo15ImageToVideo") {
      if (inputs?.imagePath && fs.existsSync(inputs.imagePath)) {
        const dims = getPngDimensions(inputs.imagePath);
        const aspectRatio = dims.width / dims.height;
        let targetW = 1280;
        let targetH = 720;
        if (Math.abs(aspectRatio - 1.0) < 0.18) {
          targetW = 848;
          targetH = 848;
        } else if (dims.width < dims.height) {
          targetW = 720;
          targetH = 1280;
        } else {
          targetW = 1280;
          targetH = 720;
        }
        node.inputs.width = targetW;
        node.inputs.height = targetH;
        log.info(`[ComfyClient] HunyuanVideo 1.5 Canvas set to ${targetW}x${targetH} based on aspect ratio ${aspectRatio.toFixed(2)}.`);
      }

      let targetFrames = 121;
      if (audioDuration > 0 && !isSilentMode) {
        let raw = Math.max(33, Math.round(audioDuration * 24.0));
        while ((raw - 1) % 4 !== 0) {
          raw++;
        }
        targetFrames = raw;
      }
      node.inputs.length = targetFrames;
      log.info(`[ComfyClient] HunyuanVideo 1.5 Frame length set to ${targetFrames} frames (~${(targetFrames / 24).toFixed(2)}s @ 24fps).`);
    }

    if (node.class_type === "ModelSamplingSD3" && (model === "hunyuan_1.5" || model === "hunyuan" || model === "hunyuanvideo_1.5" || model === "hunyuanvideo")) {
      node.inputs.shift = 7.0;
    }

    if (node.class_type === "MiniMaxH3SigmaShift") {
      node.inputs.shift_video = 12.0;
      node.inputs.shift_audio = 3.0;
    }

    if (node.class_type === "UNETLoader" && (model === "minimax_h3" || model === "minimax")) {
      node.inputs.unet_name = "minimax_h3_fl2va_pruned_int8_convrot.safetensors";
      if ("model_name" in node.inputs) {
        node.inputs.model_name = "minimax_h3_fl2va_pruned_int8_convrot.safetensors";
      }
    } if (node.class_type === "UNETLoader" && (model === "hunyuan_1.5" || model === "hunyuan" || model === "hunyuanvideo_1.5" || model === "hunyuanvideo")) {
      node.inputs.unet_name = "hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors";
      node.inputs.weight_dtype = "default";
    }

    // Fix missing inputs and update model file names for local host RTX compatibility
    if (node.class_type === "LTXVideoModelLoader" || node.class_type === "DiffusionModelLoaderKJ" || node.class_type === "CheckpointLoaderSimple") {
      let targetModelName = "ltx-video-2.5.safetensors";

      if (model === "ltx_2.5_distilled" || model === "ltx_distilled" || model === "distilled" || flags.modelVariant === "distilled") {
        targetModelName = "ltx-2.5-22b-distilled-transformer-fp8_e4m3fn.safetensors";
      } else if (model === "eros" || flags.modelVariant === "eros") {
        targetModelName = "eros_ltx_video_2.5_fp8.safetensors";
      } else if (model === "sulphur" || flags.modelVariant === "sulphur") {
        targetModelName = "sulphur_ltx_video_2.5_fp8.safetensors";
      } else if (model === "ltx" || model === "ltx_2.5" || flags.modelVariant === "dev") {
        targetModelName = "ltx-video-2.5.safetensors";
      }

      if (model === "1.3b" || model === "14b") {
        targetModelName = node.class_type === "DiffusionModelLoaderKJ"
          ? "Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors"
          : "WanVideo_2_1_Multitalk_14B_fp8_e4m3fn.safetensors";
      }

      if (node.class_type === "LTXVideoModelLoader" || node.class_type === "DiffusionModelLoaderKJ") {
        node.inputs.model_name = targetModelName;
        log.info(`[ComfyClient] Set ${node.class_type} model to "${targetModelName}".`);
      } else if (node.class_type === "CheckpointLoaderSimple" && (isLtxModel || inputs?.model?.startsWith("ltx"))) {
        node.inputs.ckpt_name = "ltx-video-2.5.safetensors";
        log.info(`[ComfyClient] Set ${node.class_type} ckpt to "${node.inputs.ckpt_name}".`);
      }
    }
  }

  // Inject LTX Detail & Motion Stabilization LoRAs into the model stream
  if ((isLtxModel || inputs?.model?.startsWith("ltx")) && workflow["1"] && workflow["13"]) {
    const loraDir = path.join(getComfyModelsDir(), "loras");
    const motionLoraName = "ltx-better-motion.safetensors";
    const detailLoraName = "ltx-soft-enhance.safetensors";

    let currentModelOutput: [string, number] = ["1", 0];

    if (fs.existsSync(path.join(loraDir, motionLoraName))) {
      workflow["lora_motion_preserve"] = {
        "class_type": "LoraLoaderModelOnly",
        "inputs": {
          "model": currentModelOutput,
          "lora_name": motionLoraName,
          "strength_model": 0.35
        },
        "_meta": { "title": "LTX Motion Stabilization LoRA" }
      };
      currentModelOutput = ["lora_motion_preserve", 0];
      log.info(`[ComfyClient] Injected LTX Motion LoRA (${motionLoraName}, strength 0.35) for stability.`);
    }

    if (fs.existsSync(path.join(loraDir, detailLoraName))) {
      workflow["lora_detail_enhance"] = {
        "class_type": "LoraLoaderModelOnly",
        "inputs": {
          "model": currentModelOutput,
          "lora_name": detailLoraName,
          "strength_model": 0.20
        },
        "_meta": { "title": "LTX Soft Detail & Contrast Enhancement LoRA" }
      };
      currentModelOutput = ["lora_detail_enhance", 0];
      log.info(`[ComfyClient] Injected LTX Detail LoRA (${detailLoraName}, strength 0.20) for subtle contrast & texture.`);
    }

    // Connect the enhanced model output to CFGGuider
    workflow["13"].inputs.model = currentModelOutput;
  }

  // Inject ModelMemoryRelease for WAN 2.1/2.2 workflows to unload 14B transformer before VAEDecode & NVENC export
  if ((model === "1.3b" || model === "14b") && workflow["12"] && workflow["13"]) {
    workflow["98"] = {
      "class_type": "ModelMemoryRelease",
      "inputs": { "any_input": ["12", 0] },
      "_meta": { "title": "Model Memory Release (VRAM GC)" }
    };
    workflow["13"].inputs.samples = ["98", 0];
    log.info(`[ComfyClient] Injected ModelMemoryRelease before VAEDecode for WAN 2.1 to free GPU memory for NVENC.`);
  }

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.inputs) continue;
    
    if (node.class_type === "LTXVideoModelLoader") {
      node.inputs.precision = "fp8";
    }

    if (node.class_type === "DiffusionModelLoaderKJ") {
      node.inputs.sage_attention = "disabled";
      node.inputs.weight_dtype = "fp8_e4m3fn";
      node.inputs.compute_dtype = "bf16";
      node.inputs.patch_cublaslinear = false;
      node.inputs.enable_fp16_accumulation = false;
    }

    if (node.class_type === "WanInfiniteTalkToVideo") {
      node.inputs.length = 81;
      node.inputs.width = 832;
      node.inputs.height = 480;
      log.info(`[ComfyClient] Set WanInfiniteTalkToVideo length=81, size=832x480.`);
    }
    if (node.class_type === "WanVideoModelLoader") {
      if (inputs?.model === "wan_alpha" || inputs?.model === "wan_transition") {
        node.inputs.model = "Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors";
        node.inputs.base_precision = "bf16";
        node.inputs.quantization = "fp8_e4m3fn_scaled";
        delete node.inputs.multitalk_model;
      } else if (inputs?.model === "1.3b") {
        node.inputs.model = "Wan2_1-T2V-1.3B_fp8_e4m3fn.safetensors";
        node.inputs.base_precision = "bf16";
        node.inputs.quantization = "fp8_e4m3fn";
        delete node.inputs.multitalk_model;
      } else {
        node.inputs.model = "Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors";
        node.inputs.base_precision = "bf16";
        node.inputs.multitalk_model = ["99", 0];
      }
    }
    if (node.class_type === "WanVideoTextEncode" && inputs?.model === "wan_alpha") {
      if (inputs?.positivePrompt) node.inputs.positive_prompt = inputs.positivePrompt;
      if (inputs?.negativePrompt) node.inputs.negative_prompt = inputs.negativePrompt;
    }
    if (node.class_type === "WanVideoImageToVideoEncode" && (inputs?.model === "wan_alpha" || inputs?.model === "wan_transition")) {
      let width = 480;
      let height = 832;
      if (inputs?.imagePath && fs.existsSync(inputs.imagePath)) {
        try {
          const fd = fs.openSync(inputs.imagePath, "r");
          const buffer = Buffer.alloc(24);
          fs.readSync(fd, buffer, 0, 24, 0);
          fs.closeSync(fd);
          if (buffer.toString("ascii", 1, 4) === "PNG") {
            const inW = buffer.readUInt32BE(16);
            const inH = buffer.readUInt32BE(20);
            if (inW > 0 && inH > 0) {
              const targetArea = 400000;
              const ratio = inW / inH;
              const rawW = Math.sqrt(targetArea * ratio);
              const rawH = rawW / ratio;
              width = Math.max(384, Math.min(832, Math.round(rawW / 16) * 16));
              height = Math.max(384, Math.min(832, Math.round(rawH / 16) * 16));
              log.info(`[ComfyClient] Wan 2.1 Dynamic Aspect Ratio matched: input ${inW}x${inH} -> target ${width}x${height} (ratio ${ratio.toFixed(3)})`);
            }
          }
        } catch {}
      }
      node.inputs.width = width;
      node.inputs.height = height;
      node.inputs.num_frames = inputs?.model === "wan_transition" ? 49 : 25;
      node.inputs.noise_aug_strength = 0.0;
      node.inputs.start_latent_strength = 1.0;
      node.inputs.end_latent_strength = 1.0;
      node.inputs.fun_or_fl2v_model = false;
      // For wan_transition: inject end_image reference pointing to the uploaded end keyframe
      if (inputs?.model === "wan_transition" && uploadedLastImageName) {
        node.inputs.end_image = node.inputs.end_image ?? ["5b", 0];
      }
    }
    if (node.class_type === "WanVideoSampler" && (inputs?.model === "wan_alpha" || inputs?.model === "wan_transition")) {
      node.inputs.steps = inputs?.model === "wan_transition" ? 25 : 20;
      node.inputs.cfg = inputs?.model === "wan_transition" ? 4.0 : 3.5;
      node.inputs.rope_function = "comfy";
      node.inputs.shift = 5.0;
      node.inputs.scheduler = "unipc";
      node.inputs.force_offload = true;
    }
    if (node.class_type === "WanVideoVAELoader") {
      node.inputs.model_name = "wan2.1_vae.safetensors";
      node.inputs.precision = "bf16";
    }
    if (node.class_type === "CLIPVisionLoader") {
      const isHunyuan = model === "hunyuan_1.5" || model === "hunyuan" || model === "hunyuanvideo_1.5" || model === "hunyuanvideo";
      node.inputs.clip_name = isHunyuan
        ? "sigclip_vision_patch14_384.safetensors"
        : "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors";
    }
    if (node.class_type === "DualCLIPLoader" && (model === "hunyuan_1.5" || model === "hunyuan" || model === "hunyuanvideo_1.5" || model === "hunyuanvideo")) {
      node.inputs.clip_name1 = "qwen_2.5_vl_7b_fp8_scaled.safetensors";
      node.inputs.clip_name2 = "byt5_small_glyphxl_fp16.safetensors";
      node.inputs.type = "hunyuan_video_15";
    }
    if (node.class_type === "CLIPLoader" && (model === "1.3b" || model === "14b" || model === "wan_alpha")) {
      node.inputs.clip_name = "umt5_xxl_fp8_e4m3fn_scaled.safetensors";
      node.inputs.type = "wan";
    }
    if (node.class_type === "CLIPLoader" && (model === "minimax_h3" || model === "minimax")) {
      node.inputs.clip_name = "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors";
      node.inputs.type = "minimax";
    }
    if (node.class_type === "VAELoader" && (model === "hunyuan_1.5" || model === "hunyuan" || model === "hunyuanvideo_1.5" || model === "hunyuanvideo")) {
      node.inputs.vae_name = "hunyuanvideo15_vae_fp16.safetensors";
    }
    if (node.class_type === "VAELoader" && (model === "1.3b" || model === "14b")) {
      node.inputs.vae_name = "Wan2_1_VAE_bf16.safetensors";
    }
    if (node.class_type === "DownloadAndLoadWanVideoT5TextEncoder" || node.class_type === "LoadWanVideoT5TextEncoder") {
      node.inputs.model_name = "umt5_xxl_fp8_e4m3fn_scaled.safetensors";
      node.inputs.precision = "bf16";
    }
    if (node.class_type === "WanVideoCLIPVisionLoader" || node.class_type === "LoadWanVideoClipTextEncoder") {
      node.inputs.model_name = "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors";
      if (!("precision" in node.inputs)) {
        node.inputs.precision = "fp16";
      }
    }
    if (node.class_type === "VAEDecode") {
      node.class_type = "VAEDecodeTiled";
      node.inputs.tile_size = 512;
      node.inputs.overlap = 64;
      node.inputs.temporal_size = 32;
      node.inputs.temporal_overlap = 8;
      log.info(`[ComfyClient] Upgraded node ${nodeId} to VAEDecodeTiled (512x512, temporal=32) for zero PCIe RAM paging.`);
    }
    if (node.class_type === "VAEDecodeTiled") {
      node.inputs.tile_size = Math.min(Number(node.inputs.tile_size || 512), 512);
      node.inputs.temporal_size = Math.min(Number(node.inputs.temporal_size || 64), 32);
      node.inputs.temporal_overlap = 8;
    }
    if (node.class_type === "CLIPVisionEncode") {
      node.inputs.crop = "none";
    }
    if (node.class_type === "WanVideoImageToVideoMultiTalk") {
      node.inputs.tiled_vae = true;
      node.inputs.colormatch = "reinhard_torch";
    }
    if (node.class_type === "WanVideoDecode") {
      node.inputs.enable_vae_tiling = true; // Enable VAE tiling for low VRAM
      node.inputs.tile_x = node.inputs.tile_x ?? 272;
      node.inputs.tile_y = node.inputs.tile_y ?? 272;
      node.inputs.tile_stride_x = node.inputs.tile_stride_x ?? 144;
      node.inputs.tile_stride_y = node.inputs.tile_stride_y ?? 128;
    }
    if (node.class_type === "VHS_VideoCombine") {
      node.inputs.loop_count = node.inputs.loop_count ?? 0;
      node.inputs.pingpong = node.inputs.pingpong ?? false;
      node.inputs.save_output = node.inputs.save_output ?? true;
      node.inputs.trim_to_audio = false; // Retain padded video frames
      
      const isHunyuan = inputs?.model === "hunyuan_1.5" || inputs?.model === "hunyuan" || inputs?.model === "hunyuanvideo_1.5" || inputs?.model === "hunyuanvideo";
      const isMinimax = inputs?.model === "minimax_h3" || inputs?.model === "minimax";
      const modelName = isHunyuan ? "hunyuan" : isMinimax ? "minimax" : (inputs?.model?.startsWith("wan") || inputs?.model === "14b" || inputs?.model === "1.3b") ? "wan" : "ltx";
      const modeTag = (inputs?.isSilent || (!inputs?.audioPath && !inputs?.spokenText)) ? "idle_loop" : "speech";
      node.inputs.filename_prefix = inputs?.filenamePrefix || `${modelName}_ruby_${modeTag}`;

      if (isHunyuan || isMinimax) {
        node.inputs.frame_rate = 24.0;
        node.inputs.fps = 24.0;
        log.info(`[ComfyClient] Overriding VideoCombine frame_rate & fps to 24.0 FPS for ${isHunyuan ? "HunyuanVideo 1.5" : "MiniMax H3"}.`);
      } else if (inputs?.model === "ltx" || inputs?.model === "ltx_audio" || inputs?.model === "ltx_flfv_tts" || inputs?.model === "ltx_flfv_generated") {
        node.inputs.frame_rate = 25.0;
        node.inputs.fps = 25.0;
        log.info("[ComfyClient] Overriding VideoCombine frame_rate & fps to 25.0 FPS.");
      } else {
        node.inputs.frame_rate = 30.0;
        node.inputs.fps = 30.0;
      }
    }
    // Override frame rates in generator nodes to 30.0 FPS for 60.0 FPS output sync
    // Only for InfiniteTalk/WanVideo — LTX uses 25fps natively
    if (node.class_type === "LTXVConditioning") {
      node.inputs.frame_rate = 25.0;
    }
    // Scheduler steps override (LTX-Video and others)
    if (node.class_type === "BasicScheduler" || node.class_type === "LTXVScheduler" || node.class_type === "KSampler") {
      if (inputs?.steps) {
        node.inputs.steps = inputs.steps;
      } else {
        const isLtxBased = inputs?.model?.startsWith("ltx") || inputs?.model === "eros" || inputs?.model === "sulphur";
        if (isLtxBased) {
          const quality = inputs?.quality || "studio"; // Default to studio quality
          if (flags.modelVariant === "distilled" || flags.modelVariant === "sulphur") {
            // Distilled models: draft=6 steps (ultra-fast preview), studio=16 steps (high quality)
            node.inputs.steps = quality === "draft" ? 6 : 16;
            log.info(`[ComfyClient] Overriding scheduler steps to ${node.inputs.steps} (distilled model, quality: ${quality}).`);
          } else {
            // Dev models: draft=8 steps (fast preview), studio=30 steps (maximum quality)
            node.inputs.steps = quality === "draft" ? 8 : 30;
            log.info(`[ComfyClient] Overriding scheduler steps to ${node.inputs.steps} (dev model, quality: ${quality}).`);
          }
        }
      }
    }
    if (node.class_type === "MultiTalkWav2VecEmbeds") {
      node.inputs.fps = 30.0;
    }
    if (node.class_type === "EmptyLTXVLatentVideo" || node.class_type === "LTXVEmptyLatentVideo") {
      node.inputs.length = totalFrames;
      const isExplicitHalfRes = (inputs?.model as string) === "ltx_half_res";
      if (isExplicitHalfRes) {
        node.inputs.width = 384;
        node.inputs.height = 512;
        log.info(`[ComfyClient] Overriding video latent resolution to 384x512 (half-res mode, length ${totalFrames} frames).`);
      } else {
        log.info(`[ComfyClient] Retaining crisp high-definition video latent resolution for maximum skin texture & facial detail.`);
      }
    }
    // Override CFG, steps, scheduler, and shift to optimal settings
    if (node.class_type === "WanVideoSampler") {
      if (inputs?.model === "wan_transition") {
        node.inputs.cfg = 4.0;
        node.inputs.steps = 25;
        node.inputs.scheduler = "unipc";
        node.inputs.rope_function = "comfy";
        log.info(`[ComfyClient] WanVideoSampler configured for transition: 25 UniPC steps, CFG 4.0.`);
      } else if (inputs?.model === "wan_alpha") {
        node.inputs.cfg = 3.5;
        node.inputs.steps = 20;
        node.inputs.scheduler = "unipc";
        node.inputs.rope_function = "comfy";
      } else {
        node.inputs.cfg = 2.0;
        node.inputs.steps = 6;
        node.inputs.scheduler = "dpm++_sde";
      }
      node.inputs.shift = 5.0;
      node.inputs.force_offload = true;
    }
    if (node.class_type === "DownloadAndLoadWanVideoT5TextEncoder" || node.class_type === "LoadWanVideoT5TextEncoder") {
      node.inputs.load_device = "offload_device"; // Force T5 text encoder offloading to CPU
    }
    if (node.class_type === "WanVideoImageToVideoMultiTalk") {
      node.inputs.force_offload = true; // Force MultiTalk image encoder offloading to CPU
    }
    // Override positive and negative prompt for WanVideoTextEncode
    if (node.class_type === "WanVideoTextEncode") {
      if (inputs?.positivePrompt) {
        node.inputs.positive_prompt = inputs.positivePrompt;
      }
      const userNeg = inputs?.negativePrompt || node.inputs.negative_prompt || "blurry, low quality, distorted face, unnatural movement";
      node.inputs.negative_prompt = `${userNeg}, smiling, smile, grinning, laughing, happy expression, open mouth, mouth open, showing teeth, teeth, speaking, talking, face morph, facial distortion, changing facial expression, facial hair, beard, mustache`;
    }
    if (node.class_type === "CLIPTextEncode" && inputs?.positivePrompt && (nodeId === "4" || nodeId === "8" || String(node._meta?.title || "").toLowerCase().includes("positive"))) {
      const isTransition = inputs?.model === "ltx_transition" || inputs?.model === "wan_transition";
      if (isTransition) {
        node.inputs.text = inputs.positivePrompt;
        log.info(`[ComfyClient] Set Transition prompt: "${String(node.inputs.text).substring(0, 120)}..."`);
      } else {
        const isSilent = inputs?.isSilent || inputs?.positivePrompt?.toLowerCase().includes("silent") || (!inputs?.spokenText && !inputs?.transcript && !inputs?.audioPath);
        const isGesture = inputs?.positivePrompt?.toLowerCase().includes("turns head") || inputs?.positivePrompt?.toLowerCase().includes("gesture") || inputs?.positivePrompt?.toLowerCase().includes("nod");
        if (isSilent && !isGesture) {
          node.inputs.text = inputs.positivePrompt + ", silent posture, closed lips, relaxed facial expression, gentle posture sway, natural breathing, listening attentively, ultra-sharp facial details";
          log.info(`[ComfyClient] Set Pure Silent Idle Loop prompt: "${String(node.inputs.text).substring(0, 120)}..."`);
        } else if (isGesture) {
          node.inputs.text = inputs.positivePrompt + ", closed lips, dynamic natural head movement, expressive gaze, natural breathing, ultra-sharp facial details";
          log.info(`[ComfyClient] Set Dynamic Gesture prompt: "${String(node.inputs.text).substring(0, 120)}..."`);
        } else {
          const speechFrames = Math.max(16, Math.round(audioDuration * 25.0));
          let textPrompt = inputs.positivePrompt.replace(/\[0-\d+\]/g, `[0-${speechFrames}]`);
          const spoken = inputs.spokenText || inputs.transcript || inputs.prompt;
          if (spoken) {
            textPrompt += `, speaking the following text: "${spoken}"`;
          } else {
            textPrompt += `, speaking`;
          }
          node.inputs.text = textPrompt + ", talking, moving mouth, active speech animation, lips moving, speaking clearly";
          log.info(`[ComfyClient] Enhanced Speech prompt: "${String(node.inputs.text).substring(0, 120)}..."`);
        }
      }
    }
    if (node.class_type === "CLIPTextEncode" && (nodeId === "5" || String(node._meta?.title || "").toLowerCase().includes("negative"))) {
      let neg = String(inputs?.negativePrompt || node.inputs.text || "");
      const isTransition = inputs?.model === "ltx_transition" || inputs?.model === "wan_transition";
      if (isTransition) {
        neg += ", jump cut, abrupt jump, teleporting, teleportation, cross-dissolve, cross fade, flashing, flickering, low quality, warped face, distorted hands";
      } else {
        const isSilent = inputs?.isSilent || inputs?.positivePrompt?.toLowerCase().includes("silent") || (!inputs?.spokenText && !inputs?.transcript && !inputs?.audioPath);
        if (isSilent) {
          neg += ", speaking, talking, open mouth, moving lips, speech animation, dialogue, camera zoom, zoom in, camera movement, panning, static image, frozen frame, still image";
        } else {
          neg += ", camera zoom, zoom in, camera movement, panning, static mouth, closed lips, frozen face, still image";
        }
      }
      if (inputs?.positivePrompt && isAllFemalePrompt(inputs.positivePrompt) && !neg.toLowerCase().includes("facial hair")) {
        neg += ", facial hair, beard, mustache";
      }
      node.inputs.text = neg;
    }
  }

  const activeLoras = inputs?.loras || (inputs?.positivePrompt ? autoDetectLoras(inputs.positivePrompt) : []);
  const videoLoras = activeLoras.filter(lora => {
    const lowerName = lora.name.toLowerCase();
    if (inputs?.model?.startsWith("ltx")) {
      return lowerName.startsWith("ltx-");
    } else {
      return lowerName.startsWith("wan-");
    }
  });

  // Auto-inject LightX2V 4-step distillation LoRA for Wan 2.1 14B InfiniteTalk models
  const isWan14B = inputs?.model === "14b";
  if (isWan14B && !videoLoras.some(l => l.name.toLowerCase().includes("lightx2v"))) {
    log.info(`🔌 [ComfyClient] Auto-injecting LightX2V 4-step distillation rank64 LoRA for Wan 2.1 14B...`);
    videoLoras.push({ name: "lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors", strength: 1.0 });
  }

  if (videoLoras.length > 0) {
    log.info(`🔌 [ComfyClient] Injecting ${videoLoras.length} active video LoRA adapter(s):`);
    videoLoras.forEach(lora => {
      log.info(`   └─ 📦 ${lora.name} (Strength: ${lora.strength})`);
    });

    let modelLoaderId: string | null = null;
    let textEncoderId: string | null = null;
    let originalModelSource: [string, number] | null = null;
    let originalClipSource: [string, number] | null = null;

    for (const nodeId of Object.keys(workflow)) {
      const node = workflow[nodeId];
      if (!node) continue;
      
      if (node.class_type === "LTXVideoModelLoader" || node.class_type === "CheckpointLoaderSimple" || node.class_type === "WanVideoModelLoader") {
        modelLoaderId = nodeId;
        originalModelSource = [nodeId, 0];
      }
      if (node.class_type === "LTXAVTextEncoderLoader" || node.class_type === "DownloadAndLoadWanVideoT5TextEncoder" || node.class_type === "LoadWanVideoT5TextEncoder") {
        textEncoderId = nodeId;
        originalClipSource = [nodeId, 0];
      }
    }

    if (modelLoaderId && !textEncoderId) {
      const node = workflow[modelLoaderId];
      if (node.class_type === "CheckpointLoaderSimple") {
        textEncoderId = modelLoaderId;
        originalClipSource = [modelLoaderId, 1];
      }
    }

    if (modelLoaderId) {
      let currentModelSource = originalModelSource;
      let currentClipSource = originalClipSource;
      const isLtx = inputs?.model?.startsWith("ltx") || ["eros", "sulphur"].includes(inputs?.model || "");

      videoLoras.forEach((lora, index) => {
        const loraNodeId = `dynamic_video_lora_${index + 1}`;
        if (isLtx) {
          workflow[loraNodeId] = {
            inputs: {
              lora_name: lora.name,
              strength_model: lora.strength,
              model: currentModelSource
            },
            class_type: "LoraLoaderModelOnly",
            _meta: { title: `Dynamic Video LoRA - ${lora.name}` }
          };
          currentModelSource = [loraNodeId, 0];
        } else {
          workflow[loraNodeId] = {
            inputs: {
              lora_name: lora.name,
              strength_model: lora.strength,
              strength_clip: lora.strength,
              model: currentModelSource,
              clip: currentClipSource
            },
            class_type: "LoraLoader",
            _meta: { title: `Dynamic Video LoRA - ${lora.name}` }
          };
          currentModelSource = [loraNodeId, 0];
          currentClipSource = [loraNodeId, 1];
        }
      });

      // Re-route downstream nodes
      for (const nodeId of Object.keys(workflow)) {
        if (nodeId.startsWith("dynamic_video_lora_")) continue;

        const node = workflow[nodeId];
        if (!node?.inputs) continue;

        for (const inputKey of Object.keys(node.inputs)) {
          const inputValue = node.inputs[inputKey];
          if (Array.isArray(inputValue) && inputValue.length === 2) {
            if (inputValue[0] === modelLoaderId && inputValue[1] === 0) {
              node.inputs[inputKey] = currentModelSource;
            }
            if (textEncoderId && originalClipSource && inputValue[0] === textEncoderId && inputValue[1] === originalClipSource[1]) {
              node.inputs[inputKey] = currentClipSource;
            }
          }
        }
      }
      log.info(`[ComfyClient] Dynamic video LoRAs successfully chained and injected.`);
    }
  }

  // Dynamically inject upscale and frame interpolation nodes to resolve blurriness and frame jitter
  let videoCombineId: string | null = null;
  let videoDecodeId: string | null = null;
  let isLtx = false;
  let originalFrameRate = 25.0;

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.inputs) continue;
    if (node.class_type === "VHS_VideoCombine") {
      videoCombineId = nodeId;
      originalFrameRate = typeof node.inputs.frame_rate === "number" ? node.inputs.frame_rate : 25.0;
    }
    if (node.class_type === "WanVideoDecode" || node.class_type === "LTXVideoDecode" || node.class_type === "VAEDecodeTiled") {
      videoDecodeId = nodeId;
      isLtx = node.class_type === "LTXVideoDecode" || node.class_type === "VAEDecodeTiled";
      if (node.class_type === "WanVideoDecode") {
        node.inputs.enable_vae_tiling = false; // Disable tiling to prevent Wan VAE spatial tiling hangs
      }
    }
  }

  if (videoCombineId && videoDecodeId) {
    // Skip dynamic post-processing injection if the workflow template already includes
    // advanced nodes (RTX VSR, FaceDetailer, LatentUpscaleWithModel, DeepFilterNet).
    // Injecting on top of those would create a broken double post-processing chain.
    const hasAdvancedPostProcessing = Object.values(workflow).some((n: ComfyWorkflowNode) =>
      n?.class_type === "RTXVideoSuperResolution" ||
      n?.class_type === "FaceDetailer" ||
      n?.class_type === "LatentUpscaleWithModel" ||
      n?.class_type === "DeepFilterNet" ||
      n?.class_type === "MiniMaxH3ImageToVideo" ||
      n?.class_type === "MiniMaxH3ReferenceToVideo" ||
      n?.class_type === "HunyuanVideo15ImageToVideo"
    );

    if (hasAdvancedPostProcessing) {
      log.info("[ComfyClient] Detected pre-built advanced post-processing in workflow template — skipping dynamic RIFE/upscale injection.");
    } else {

    // Intercept connection to inject ModelMemoryRelease node to clear VRAM cache
    const decodeNode = workflow[videoDecodeId];
    if (decodeNode.inputs.samples) {
      const originalConnection = decodeNode.inputs.samples;
      const memReleaseId = "98";
      decodeNode.inputs.samples = [memReleaseId, 0];
      workflow[memReleaseId] = {
        class_type: "ModelMemoryRelease",
        inputs: {
          any_input: originalConnection
        },
        _meta: { title: "Model Memory Release (VRAM GC)" }
      };
    }

    const scaleImageId = "102";
    const rifeId = "103";

    // Determine target dimensions based on input aspect ratio and active upscalers
    let isVertical = true;
    let targetWidth = 480;
    let targetHeight = 832;
    if (inputs?.imagePath && fs.existsSync(inputs.imagePath)) {
      const dims = getPngDimensions(inputs.imagePath);
      targetWidth = dims.width;
      targetHeight = dims.height;
      if (dims.width >= dims.height) {
        isVertical = false;
      }
    } else {
      targetWidth = isLtx ? (isVertical ? 544 : 960) : 480;
      targetHeight = isLtx ? (isVertical ? 960 : 544) : 832;
    }

    const needUpscale = isLtx ? (flags.superResolution || flags.spatialUpscale) : true;
    if (isLtx && needUpscale) {
      if (flags.superResolution) {
        // NVIDIA RTX VSR upscales to 4K
        targetWidth = isVertical ? 2160 : 3840;
        targetHeight = isVertical ? 3840 : 2160;
      } else {
        // Spatial Upscaler upscales to 1080p
        targetWidth = isVertical ? 1080 : 1920;
        targetHeight = isVertical ? 1920 : 1080;
      }
    }

    if (isLtx) {
      // 1. RIFE Frame Interpolation (Smooth motion on native low-res frames)
      workflow[rifeId] = {
        class_type: "RIFE VFI",
        inputs: {
          ckpt_name: "rife49.pth",
          frames: [videoDecodeId, 0],
          clear_cache_after_n_frames: 10,
          multiplier: 2,
          fast_mode: true,
          ensemble: true,
          scale_factor: 1.0,
          dtype: "float32",
          torch_compile: false,
          batch_size: 1
        },
        _meta: { title: "Frame Interpolation (RIFE)" }
      };

      if (needUpscale) {
        // 2. Fast GPU-Accelerated Image Scale
        workflow[scaleImageId] = {
          class_type: "ImageScale",
          inputs: {
            image: [rifeId, 0],
            width: targetWidth,
            height: targetHeight,
            upscale_method: "bicubic",
            crop: "disabled"
          },
          _meta: { title: `Resize Video Frames to ${targetWidth}x${targetHeight}` }
        };
      }

        // Connect VHS_VideoCombine to upscale output, double frame rate, NVENC format
      // 3. Inject ImageColorMatch Node if installed in ComfyUI
      let loadImageId: string | null = null;
      for (const nodeId of Object.keys(workflow)) {
        if (workflow[nodeId]?.class_type === "LoadImage") {
          loadImageId = nodeId;
          break;
        }
      }

      const colorMatchId = "105";
      const activeVideoSource = needUpscale ? [scaleImageId, 0] : [rifeId, 0];
      const hasColorMatch = supportedNodes?.ColorMatchV2 || supportedNodes?.ImageColorMatch || supportedNodes?.ColorMatch;

      if (hasColorMatch && loadImageId) {
        const isV2 = Boolean(supportedNodes?.ColorMatchV2);
        workflow[colorMatchId] = {
          class_type: isV2 ? "ColorMatchV2" : "ImageColorMatch",
          inputs: isV2
            ? {
                image_target: activeVideoSource,
                image_ref: [loadImageId, 0],
                method: "reinhard_lab_gpu",
                strength: 1.0,
                multithread: true
              }
            : {
                image: activeVideoSource,
                image_ref: [loadImageId, 0],
                method: "reinhard"
              },
          _meta: { title: "Lock Video Color Balance to Frame 0 Reference Image" }
        };
        workflow[videoCombineId].inputs.images = [colorMatchId, 0];
      } else {
        workflow[videoCombineId].inputs.images = activeVideoSource;
      }

      workflow[videoCombineId].inputs.frame_rate = originalFrameRate * 2; // 50.0 FPS
      workflow[videoCombineId].inputs.format = "video/nvenc_h264-mp4";
      workflow[videoCombineId].inputs.save_metadata = false;
    } else {
      // For WanVideo, scale VAE output directly to target (960x960)
      workflow[scaleImageId] = {
        class_type: "ImageScale",
        inputs: {
          image: [videoDecodeId, 0],
          width: targetWidth,
          height: targetHeight,
          upscale_method: "bicubic",
          crop: "disabled"
        },
        _meta: { title: "Resize Video Frames (Bicubic)" }
      };

      // RIFE Frame Interpolation (Smooth motion, multiplier=2)
      workflow[rifeId] = {
        class_type: "RIFE VFI",
        inputs: {
          ckpt_name: "rife49.pth",
          frames: [scaleImageId, 0],
          clear_cache_after_n_frames: 10,
          multiplier: 2,
          fast_mode: false,
          ensemble: true,
          scale_factor: 0.5,
          dtype: "float32",
          torch_compile: false,
          batch_size: 1
        },
        _meta: { title: "Frame Interpolation (RIFE)" }
      };

      let loadImageId: string | null = null;
      for (const nodeId of Object.keys(workflow)) {
        if (workflow[nodeId]?.class_type === "LoadImage") {
          loadImageId = nodeId;
          break;
        }
      }

      const colorMatchId = "105";
      const hasColorMatch = supportedNodes?.ColorMatchV2 || supportedNodes?.ImageColorMatch || supportedNodes?.ColorMatch;

      if (hasColorMatch && loadImageId) {
        const isV2 = Boolean(supportedNodes?.ColorMatchV2);
        workflow[colorMatchId] = {
          class_type: isV2 ? "ColorMatchV2" : "ImageColorMatch",
          inputs: isV2
            ? {
                image_target: [rifeId, 0],
                image_ref: [loadImageId, 0],
                method: "reinhard_lab_gpu",
                strength: 1.0,
                multithread: true
              }
            : {
                image: [rifeId, 0],
                image_ref: [loadImageId, 0],
                method: "reinhard"
              },
          _meta: { title: "Lock Video Color Balance to Frame 0 Reference Image" }
        };
        workflow[videoCombineId].inputs.images = [colorMatchId, 0];
      } else {
        workflow[videoCombineId].inputs.images = [rifeId, 0];
      }

      workflow[videoCombineId].inputs.frame_rate = originalFrameRate * 2;
      workflow[videoCombineId].inputs.format = "video/nvenc_h264-mp4";
      workflow[videoCombineId].inputs.save_metadata = false;
    }
    }
  }

  return workflow;
}

export function buildWanAlphaVideoWorkflow(
  workflowTemplate: ComfyWorkflow,
  inputs: {
    imagePath?: string;
    prompt?: string;
    isSilent?: boolean;
    durationFrames?: number;
    width?: number;
    height?: number;
    seed?: number;
  }
): ComfyWorkflow {
  const workflow: ComfyWorkflow = JSON.parse(JSON.stringify(workflowTemplate));

  if (inputs.imagePath) {
    const filename = path.basename(inputs.imagePath);
    for (const id of Object.keys(workflow)) {
      if (workflow[id]?.class_type === "LoadImage") {
        workflow[id].inputs.image = filename;
      }
    }
  }

  if (inputs.prompt) {
    for (const id of Object.keys(workflow)) {
      if (workflow[id]?.class_type === "LoadWanVideoT5TextEncoder" && String(workflow[id]?._meta?.title || "").includes("Prompt Encoder")) {
        workflow[id].inputs.text = inputs.prompt;
      }
    }
  }

  if (inputs.seed !== undefined) {
    for (const id of Object.keys(workflow)) {
      if (workflow[id]?.class_type === "WanVideoSampler") {
        workflow[id].inputs.seed = inputs.seed;
      }
    }
  }

  if (inputs.width && inputs.height) {
    for (const id of Object.keys(workflow)) {
      if (workflow[id]?.class_type === "WanVideoSampler") {
        workflow[id].inputs.width = inputs.width;
        workflow[id].inputs.height = inputs.height;
      }
    }
  }

  if (inputs.durationFrames) {
    for (const id of Object.keys(workflow)) {
      if (workflow[id]?.class_type === "WanVideoSampler") {
        workflow[id].inputs.frames = inputs.durationFrames;
      }
    }
  }

  return workflow;
}

export function isAllFemalePrompt(prompt?: string): boolean {
  if (!prompt) return false;
  const lower = prompt.toLowerCase();
  const hasFemale = lower.includes("female") || lower.includes("woman") || lower.includes("girl") || lower.includes("lady") || lower.includes("ruby") || lower.includes("blaze");
  if (!hasFemale) return false;
  const maleRegex = /\b(man|men|male|males|boy|boys|gentleman|gentlemen|husband|guy|guys)\b/i;
  const hasMale = maleRegex.test(lower);
  return !hasMale;
}
