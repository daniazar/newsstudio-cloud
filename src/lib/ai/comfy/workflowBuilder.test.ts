import { describe, it, expect, vi } from "vitest";
import { loadWorkflow, buildWorkflowPrompt, deriveLtxFeatureFlags } from "./workflowBuilder";
import { ComfyWorkflowInputs } from "./types";

describe("workflowBuilder LTX 2.5 Unified Pipeline", () => {
  const mockWorkflowJson = {
    "1": {
      "inputs": { "ckpt_name": "ltx-video-2.5.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "2": {
      "inputs": { "image": "avatar.png" },
      "class_type": "LoadImage"
    },
    "3": {
      "inputs": { "audio": "voice.wav" },
      "class_type": "LoadAudio"
    },
    "7": {
      "inputs": { "audio": ["3", 0], "audio_vae": ["6", 0] },
      "class_type": "LTXVAudioVAEEncode"
    },
    "10": {
      "inputs": { "vae": ["1", 2], "latent": ["8", 0], "num_images": "1", "num_images.image_1": ["9", 0], "num_images.index_1": 0, "num_images.strength_1": 0.85 },
      "class_type": "LTXVImgToVideoInplaceKJ"
    },
    "13": {
      "inputs": { "model": ["1", 0], "positive": ["12", 0] },
      "class_type": "CFGGuider"
    },
    "19": {
      "inputs": { "samples": ["18", 0], "vae": ["1", 2] },
      "class_type": "VAEDecodeTiled"
    },
    "21": {
      "inputs": { "images": ["19", 0], "audio": ["20", 0] },
      "class_type": "VHS_VideoCombine"
    },
    "22": {
      "inputs": { "ckpt_name": "ltx-video-2.5.safetensors" },
      "class_type": "LTXAVTextEncoderLoader"
    }
  };

  it("should derive default feature flags for standard ltx model", () => {
    const flags = deriveLtxFeatureFlags({
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx"
    });
    expect(flags.audioMode).toBe("tts");
    expect(flags.modelVariant).toBe("distilled");
    expect(flags.frameInterpolation).toBe(true);
    expect(flags.noiseReduction).toBe(false);
  });

  it("should derive v2 flags when COMFY_WORKFLOW_VERSION is v2", () => {
    vi.stubEnv("COMFY_WORKFLOW_VERSION", "v2");
    const flags = deriveLtxFeatureFlags({
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx"
    });
    expect(flags.noiseReduction).toBe(true);
    expect(flags.spatialUpscale).toBe(true);
    expect(flags.faceDetailer).toBe(false);
    expect(flags.superResolution).toBe(true);
    vi.unstubAllEnvs();
  });

  it("should respect explicit features overrides", () => {
    const flags = deriveLtxFeatureFlags({
      model: "ltx",
      imagePath: "dummy.png",
      audioPath: "dummy.wav",
      features: {
        noiseReduction: false,
        faceDetailer: true,
      },
    });

    expect(flags.noiseReduction).toBe(false);
    expect(flags.faceDetailer).toBe(true);
  });

  it("should inject distilled model chain nodes", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx" // defaults to distilled variant
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs);
    
    // DiffusionModelLoaderKJ should be node 1
    expect(prompt["1"].class_type).toBe("DiffusionModelLoaderKJ");
    expect(prompt["1"].inputs.model_name).toBe("ltx-2.5-22b-distilled-transformer-fp8_e4m3fn.safetensors");
    expect(prompt["1"].inputs.weight_dtype).toBe("fp8_e4m3fn");
    expect(prompt["1"].inputs.compute_dtype).toBe("bf16");
    // CLIPLoader should be node 22
    expect(prompt["22"].class_type).toBe("CLIPLoader");
    // VAELoaderKJ should be node 23
    expect(prompt["23"].class_type).toBe("VAELoaderKJ");
    expect(prompt["23"].inputs.vae_name).toBe("ltx-2.5-video-vae-conv-bf16.safetensors");

    // CFGGuider should receive model input from injected model and LoRA chain
    expect((prompt["13"].inputs.model as [string, number])[0]).toMatch(/lora_|1/);
  });

  it("should inject DeepFilterNet noise reduction when enabled", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx",
      features: {
        noiseReduction: true
      }
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs);
    
    // DeepFilterNet should be node 23_audio_dfn
    expect(prompt["23_audio_dfn"].class_type).toBe("DeepFilterNet");
    expect(prompt["23_audio_dfn"].inputs.audio).toEqual(["3", 0]);
    // AudioVAEEncode should connect to DeepFilterNet output
    expect(prompt["7"].inputs.audio).toEqual(["23_audio_dfn", 0]);
  });

  it("should inject EmptyAudioLatent for generated mode", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx_flfv_generated"
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs);
    
    expect(prompt["3"]).toBeUndefined(); // LoadAudio deleted
    expect(prompt["7"].class_type).toBe("LTXVEmptyLatentAudio");
  });

  it("should inject advanced post-processing chain nodes", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx",
      features: {
        faceDetailer: true,
        superResolution: true
      }
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs);
    
    expect(prompt["27"].class_type).toBe("FaceDetailer");
    expect(prompt["29"].class_type).toBe("RIFE VFI");
    expect(prompt["32"].class_type).toBe("RTXVideoSuperResolution");
    // Combine should hook up to the end of the post processing chain (RTX VSR)
    expect(prompt["21"].inputs.images).toEqual(["32", 0]);
  });

  it("should automatically prefix music video prompt", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx_music_video",
      positivePrompt: "cinematic style"
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs);
    expect(inputs.positivePrompt).toContain("music video, beat-synchronized movement");
  });

  it("should append facial hair exclusions to negative prompt when all subjects are female", () => {
    const testWorkflow = {
      ...mockWorkflowJson,
      "5": {
        "inputs": { "text": "blurry, low quality" },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "Negative Prompt" }
      }
    };
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx",
      positivePrompt: "A beautiful female news presenter named Ruby standing in a studio"
    };
    
    const prompt = buildWorkflowPrompt(testWorkflow, "uploaded_image.png", "uploaded_audio.wav", inputs);
    expect(prompt["5"].inputs.text).toContain("facial hair, beard, mustache");
  });

  it("should not append facial hair exclusions if prompt contains male subject", () => {
    const testWorkflow = {
      ...mockWorkflowJson,
      "5": {
        "inputs": { "text": "blurry, low quality" },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "Negative Prompt" }
      }
    };
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx",
      positivePrompt: "A beautiful female news presenter named Ruby standing next to a male presenter"
    };
    
    const prompt = buildWorkflowPrompt(testWorkflow, "uploaded_image.png", "uploaded_audio.wav", inputs);
    expect(prompt["5"].inputs.text).not.toContain("facial hair");
  });

  it("should fallback gracefully if custom nodes are missing", () => {
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "ltx",
      features: {
        noiseReduction: true,
        faceDetailer: true,
        superResolution: true,
        modelVariant: "distilled"
      }
    };
    const supportedNodes = {
      "DeepFilterNet": false,
      "FaceDetailer": false,
      "RTXVideoSuperResolution": false,
      "DiffusionModelLoaderKJ": false
    };
    const prompt = buildWorkflowPrompt(mockWorkflowJson, "uploaded_image.png", "uploaded_audio.wav", inputs, undefined, supportedNodes);
    
    // Check that we didn't inject DeepFilterNet or FaceDetailer or RTX VSR
    expect(prompt["23d"]).toBeUndefined(); // DeepFilterNet not injected
    expect(prompt["27"]).toBeUndefined(); // FaceDetailer not injected
    expect(prompt["32"]).toBeUndefined(); // RTX VSR not injected
    // Check that model variant fell back to dev (CheckpointLoaderSimple)
    expect(prompt["1"].class_type).toBe("CheckpointLoaderSimple");
  });

  it("should load HunyuanVideo 1.5 template for hunyuan_1.5, hunyuan, hunyuanvideo_1.5", () => {
    const wf1 = loadWorkflow("hunyuan_1.5");
    expect(wf1["1"].class_type).toBe("UNETLoader");
    expect(wf1["10"].class_type).toBe("HunyuanVideo15ImageToVideo");

    const wf2 = loadWorkflow("hunyuan");
    expect(wf2["1"].class_type).toBe("UNETLoader");
    expect(wf2["10"].class_type).toBe("HunyuanVideo15ImageToVideo");
  });

  it("should configure HunyuanVideo 1.5 prompt graph correctly", () => {
    const hunyuanWf = loadWorkflow("hunyuan_1.5");
    const inputs: ComfyWorkflowInputs = {
      imagePath: "image.png",
      audioPath: "audio.wav",
      model: "hunyuan_1.5",
      positivePrompt: "Ruby news anchor reporting live from the studio",
      negativePrompt: "low quality, artifacts"
    };

    const prompt = buildWorkflowPrompt(hunyuanWf, "uploaded_image.png", "uploaded_audio.wav", inputs);

    // Verify UNETLoader
    expect(prompt["1"].inputs.unet_name).toBe("hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors");
    // Verify ModelSamplingSD3 shift
    expect(prompt["2"].inputs.shift).toBe(7.0);
    // Verify DualCLIPLoader
    expect(prompt["3"].inputs.clip_name1).toBe("qwen_2.5_vl_7b_fp8_scaled.safetensors");
    expect(prompt["3"].inputs.clip_name2).toBe("byt5_small_glyphxl_fp16.safetensors");
    expect(prompt["3"].inputs.type).toBe("hunyuan_video_15");
    // Verify VAELoader
    expect(prompt["4"].inputs.vae_name).toBe("hunyuanvideo15_vae_fp16.safetensors");
    // Verify CLIPVisionLoader
    expect(prompt["5"].inputs.clip_name).toBe("sigclip_vision_patch14_384.safetensors");
    // Verify Image Loader
    expect(prompt["6"].inputs.image).toBe("uploaded_image.png");
    // Verify HunyuanVideo15ImageToVideo
    expect(prompt["10"].class_type).toBe("HunyuanVideo15ImageToVideo");
    expect(prompt["10"].inputs.length).toBeGreaterThanOrEqual(33);
    // Verify Prompts
    expect(prompt["8"].inputs.text).toContain("Ruby news anchor reporting live");
    expect(prompt["9"].inputs.text).toContain("low quality, artifacts");
    // Verify VideoCombine frame rate
    expect(prompt["17"].inputs.frame_rate).toBe(24.0);
    expect(prompt["17"].inputs.fps).toBe(24.0);
  });
});
