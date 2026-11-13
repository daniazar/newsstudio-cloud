/**
 * src/lib/ai/comfy/imageGen.ts
 *
 * Primary entry point and orchestrator for image generation pipelines in ComfyUI.
 * Delegates specialized sub-tasks (model classification, LoRA filtering, workflow graph mutation)
 * to modular helpers under src/lib/ai/comfy/image/ while maintaining 100% backward-compatible API signatures.
 * Updates SaveImage node filename_prefix in ComfyUI JSON graph so raw output files in ComfyUI/output
 * use the exact persona, variant, and model target filename tags.
 */

import fs from "fs";
import { comfyLog,downloadOutput,getAvailableCheckpoints,getComfyJobError,getOutputFilename,submitPrompt,uploadFileToComfyUI,waitForCompletion } from "./api";
import { LoraConfig,filterCompatibleLoras } from "./image/loraManager";
import { classifyImageModel } from "./image/modelClassifier";
import { ComfyWorkflow } from "./types";
import { applyEmptyLatentCanvas,applyIpAdapterPlus,configureLoaderNodes,injectDynamicLoras,injectFaceDetailer,injectRegionalPrompting,injectRembgBackgroundRemoval } from "./image/workflowMutator";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:imageGen");

export { filterCompatibleLoras,getAvailableLoraFiles } from "./image/loraManager";
export { getImageWorkflowPath } from "./image/modelClassifier";

export interface PersonaFaceReference {
  imagePath: string;
  role: "primary" | "partner";
}

export interface SpatialBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isNsfwText(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return /nude|naked|uncensored|nsfw|sex|doggystyle|blowjob|fellatio|creampie|cowgirl|missionary|penetration|futanari|futa|\bts\b|shemale|ladyboy|neovulva|tucked|transgender|penis|vulva|breasts|genitals|erotic|intimate|anal|topless|bottomless|bare_skin|unclothed|phallus|oral|ejaculation|orgasm|nipples|areola|clitoral|submissive|kneeling|titfuck|paizuri|intercourse/i.test(lower);
}

export function parseSpatialLayout(prompt: string): {
  primary: SpatialBoundingBox;
  partner: SpatialBoundingBox;
} {
  const lower = prompt.toLowerCase();

  let primary: SpatialBoundingBox = { x: 0, y: 0, width: 512, height: 576 };
  let partner: SpatialBoundingBox = { x: 512, y: 0, width: 512, height: 576 };

  if (lower.includes("partner on the left") || lower.includes("primary on the right") || lower.includes("character on the right")) {
    primary = { x: 512, y: 0, width: 512, height: 576 };
    partner = { x: 0, y: 0, width: 512, height: 576 };
  } else if (lower.includes("standing behind") || lower.includes("in the background") || lower.includes("behind the desk")) {
    primary = { x: 0, y: 144, width: 1024, height: 432 };
    partner = { x: 256, y: 0, width: 512, height: 288 };
  }

  return { primary, partner };
}

/**
 * Generates an anchor/presenter studio portrait using ComfyUI.
 * Accepts optional reference images (PuLID face ref + VAE structure ref), LoRAs, resolution settings,
 * and filenamePrefixOverride for ComfyUI/output directory naming.
 */
export async function generatePresenterImage(
  prompt: string,
  faceReferenceAbsPath?: string | string[],
  referenceImageAbsPath?: string,
  loras?: LoraConfig[],
  nativeWidth: number = 1024,
  nativeHeight: number = 1024,
  denoise: number = 0.85,
  unetNameOverride?: string,
  seed?: number,
  negativePromptOverride?: string,
  useEmptyLatent: boolean = true,
  filenamePrefixOverride?: string,
  useDetailer: boolean = false,
  useIpAdapter: boolean = true,
  useRegionalPrompting: boolean = false
): Promise<Buffer> {
  const isMulti = Array.isArray(faceReferenceAbsPath) && faceReferenceAbsPath.length > 1;

  // 1. Upload reference assets if provided
  let faceUploaded: string | null = null;
  let canvasUploaded: string | null = null;
  let primaryUploaded: string | null = null;
  let partnerUploaded: string | null = null;

  if (isMulti) {
    const paths = faceReferenceAbsPath as string[];
    const primaryPath = paths[0];
    const partnerPath = paths[1] || paths[0];

    comfyLog("[ComfyClient] Multi-persona scene detected: Uploading primary and partner reference images...");
    primaryUploaded = await uploadFileToComfyUI(primaryPath);
    partnerUploaded = await uploadFileToComfyUI(partnerPath);
    faceUploaded = primaryUploaded;
    canvasUploaded = partnerUploaded || primaryUploaded;
  } else {
    if (faceReferenceAbsPath) {
      const facePath = Array.isArray(faceReferenceAbsPath) ? faceReferenceAbsPath[0] : faceReferenceAbsPath;
      comfyLog("[ComfyClient] Uploading face reference image for PuLID:", facePath);
      faceUploaded = await uploadFileToComfyUI(facePath as string);
    }
    if (referenceImageAbsPath) {
      comfyLog("[ComfyClient] Uploading canvas/structure reference image for VAEEncode:", referenceImageAbsPath);
      canvasUploaded = await uploadFileToComfyUI(referenceImageAbsPath);
    }

    primaryUploaded = faceUploaded || canvasUploaded;
    partnerUploaded = canvasUploaded;
  }

  // 2. Classify model architecture and load base workflow template
  const arch = classifyImageModel(unetNameOverride, isMulti);
  comfyLog(`[ComfyClient] Loading starting-frame workflow: ${arch.workflowName} (isMulti: ${isMulti}, useRegionalPrompting: ${useRegionalPrompting})`);

  if (!fs.existsSync(arch.workflowPath)) {
    throw new Error(`ComfyUI workflow JSON template not found: ${arch.workflowPath}`);
  }

  const rawJson = fs.readFileSync(arch.workflowPath, "utf-8");
  const workflow: ComfyWorkflow = JSON.parse(rawJson);

  if (arch.isKlein && !isMulti) {
    delete workflow["15"]; // PuLID is designed for FLUX.1 UNet; Lumina2/Klein uses native Qwen UNet
  }

  // 3. Purge existing LoraLoader nodes from template
  const loraNodesToBypass: string[] = [];
  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (node.class_type === "LoraLoader") {
      loraNodesToBypass.push(nodeId);
    }
  }
  for (const loraNodeId of loraNodesToBypass) {
    const loraNode = workflow[loraNodeId];
    const originalModelSource = loraNode.inputs.model;
    const originalClipSource = loraNode.inputs.clip;

    for (const nodeId of Object.keys(workflow)) {
      const node = workflow[nodeId];
      if (!node.inputs) continue;
      for (const inputKey of Object.keys(node.inputs)) {
        const inputValue = node.inputs[inputKey];
        if (Array.isArray(inputValue) && inputValue.length === 2 && inputValue[0] === loraNodeId) {
          if (inputKey === "model") {
            node.inputs[inputKey] = originalModelSource;
          } else if (inputKey === "clip") {
            node.inputs[inputKey] = originalClipSource;
          } else {
            node.inputs[inputKey] = originalModelSource;
          }
        }
      }
    }
    delete workflow[loraNodeId];
  }

  // 4. Filter compatible LoRAs and inject into graph
  const activeLoras = filterCompatibleLoras(loras, arch);
  const mutationState = injectDynamicLoras(workflow, activeLoras, arch, isMulti);

  // 5. Configure loader nodes, sampler settings, and SaveImage filename_prefix
  configureLoaderNodes(workflow, arch, denoise);

  // 6. Inject native Rembg Background Removal Node ONLY when explicitly requested on final transparent isolation pass
  if (filenamePrefixOverride && (filenamePrefixOverride.includes('_stage_7_') || filenamePrefixOverride.includes('_transparent_final_'))) {
    injectRembgBackgroundRemoval(workflow);
  }

  // 6. Inject native Regional Prompting ONLY if explicitly enabled
  if (isMulti && arch.isSdxl && useRegionalPrompting) {
    comfyLog("[ComfyClient] ✂️  useRegionalPrompting is TRUE: Injecting Overlapping Regional Prompting graph...");
    const parts = prompt.split(/Left:|\(left side\):|Right:|\(right side\):/i);
    let globalEnvText = parts[0]?.trim() || prompt;
    globalEnvText = globalEnvText
      .replace(/1boy_1girl,?\s*/gi, "")
      .replace(/2 subjects,?\s*/gi, "")
      .replace(/[A-Za-z0-9_-]+\s+and\s+[A-Za-z0-9_-]+\s+together in a photograph,?\s*/gi, "")
      .replace(/Scene:\s*[^,.]*(reclines|stands|sitting|standing|holding)[^,.]*[,.]?\s*/gi, "")
      .replace(/\b(RubyVance|VoltStryker|[A-Z][a-z]+[A-Z][a-z]+)\b/g, "")
      .trim();

    const primaryPersonaText = parts[1]?.trim() || prompt;
    const partnerPersonaText = parts[2]?.trim() || prompt;

    const clipSource = mutationState.currentClipSource;
    injectRegionalPrompting(workflow, clipSource, globalEnvText, primaryPersonaText, partnerPersonaText, nativeWidth, nativeHeight);
    applyEmptyLatentCanvas(workflow, nativeWidth, nativeHeight, true);
  }

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node?.inputs) continue;

    if (node.class_type === "SaveImage") {
      if (filenamePrefixOverride) {
        node.inputs.filename_prefix = filenamePrefixOverride;
      }
    }

    if (node.class_type === "CLIPTextEncode") {
      const title = String(node._meta?.title || "").toLowerCase();
      if (title.includes("negative") || nodeId === "4") {
        if (negativePromptOverride) {
          node.inputs.text = negativePromptOverride;
        }
      } else if ((!isMulti || !useRegionalPrompting) && (title.includes("positive") || nodeId === "3" || nodeId === "5" || nodeId === "6")) {
        node.inputs.text = prompt;
      }
    }

    if (node.class_type === "EmptyLatentImage") {
      node.inputs.width = nativeWidth || 768;
      node.inputs.height = nativeHeight || 1344;
    }

    if (node.class_type === "KSampler") {
      if (typeof seed === "number" && !isNaN(seed)) {
        node.inputs.seed = Math.floor(seed);
      } else {
        node.inputs.seed = Math.floor(Math.random() * 1000000000);
      }
    }
  }

  const resolveFilename = (obj: unknown): string | undefined => {
    if (!obj) return undefined;
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) return resolveFilename(obj[0]);
    if (typeof obj === "object" && obj !== null) {
      const rec = obj as { name?: string; filename?: string };
      return rec.name || rec.filename || String(obj);
    }
    return String(obj);
  };

  const faceName = resolveFilename(faceUploaded);
  const canvasName = resolveFilename(canvasUploaded);
  const primaryName = resolveFilename(primaryUploaded);
  const partnerName = resolveFilename(partnerUploaded);

  if (isMulti) {
    if (referenceImageAbsPath && workflow["1"]) {
      workflow["1"].inputs.image = canvasName;
    }
    if (workflow["101"]) workflow["101"].inputs.image = partnerName || primaryName;
    if (workflow["14"] && workflow["14"].class_type === "LoadImage") {
      workflow["14"].inputs.image = partnerName || primaryName;
    }
  } else {
    // Single persona scene:
    const _isBodyRefFile = primaryName && /\b(body_ref|uncensored_body_ref|avatars)\b/i.test(primaryName);
    const _isNsfwOrBodyMod = isNsfwText(prompt) || /\b(nude|bare|groin|vulva|futanari|penis|breasts|nipples|pubic|landing strip|shaved|bush|piercing)\b/i.test(prompt);

    // Node 1 is LoadImage for VAEEncode (Canvas background image)
    const isFaceRef = referenceImageAbsPath && (referenceImageAbsPath === faceReferenceAbsPath || /\b(avatars|persona_vault|ruby_master)\b/i.test(referenceImageAbsPath));
    const validCanvasImage = (canvasName && !isFaceRef) ? canvasName : (primaryName || faceName || "luna.png");
    if (workflow["1"]) {
      workflow["1"].inputs.image = validCanvasImage;
    }

    if (!canvasName || isFaceRef) {
      // Wire KSampler to native empty_latent_canvas (768x1344 9:16 vertical ratio)
      if (workflow["8"] && workflow["empty_latent_canvas"]) {
        workflow["8"].inputs.latent_image = ["empty_latent_canvas", 0];
      }
    }

    // Node 14 is LoadImage for PuLID (Face reference photo)
    if (faceName && workflow["14"]) {
      workflow["14"].inputs.image = faceName;
    } else if (primaryName && workflow["14"]) {
      workflow["14"].inputs.image = primaryName;
    }

    // Node 7 (VAEEncode) takes pixels from Node 1 (Canvas image)
    if (workflow["7"] && workflow["1"]?.inputs?.image) {
      workflow["7"].inputs.pixels = ["1", 0];
    }
  }

  // 7b. Inject IP-Adapter-Plus for SDXL/Pony models when reference image is present (prevent body ref override during NSFW/body mod passes)
  const isBodyRefFile = primaryName && /\b(body_ref|uncensored_body_ref|avatars)\b/i.test(primaryName);
  const isNsfwOrBodyMod = isNsfwText(prompt) || /\b(nude|bare|groin|vulva|futanari|penis|breasts|nipples|pubic|landing strip|shaved|bush|piercing)\b/i.test(prompt);

  if (useIpAdapter && arch.isSdxl && primaryName && (!isBodyRefFile || !isNsfwOrBodyMod)) {
    const currentModel: [string, number] = workflow["dynamic_lora_1"] ? ["dynamic_lora_1", 0] : ["2", 0];
    const partnerNodeId = isMulti && workflow["101"] ? "101" : undefined;
    const ipadapterModel = applyIpAdapterPlus(workflow, currentModel, "1", 0.75, 0.35, partnerNodeId);
    if (workflow["8"]) {
      workflow["8"].inputs.model = ipadapterModel;
    }
  }

  // 7c. Suppress PuLID if faceReferenceAbsPath is not provided (e.g. Stage 1 & Stage 2 passes)
  if (!faceReferenceAbsPath && workflow["15"]) {
    comfyLog("[ComfyClient] Suppressing PuLID face injection node (no faceReferenceAbsPath provided)...");
    const pulidModelInput = workflow["15"].inputs?.model || (workflow["dynamic_lora_1"] ? ["dynamic_lora_1", 0] : ["2", 0]);
    if (workflow["8"]) {
      workflow["8"].inputs.model = pulidModelInput;
    }
    delete workflow["15"];
  }

  // 8. Apply EmptyLatentImage canvas if text-guided pose execution is active
  applyEmptyLatentCanvas(workflow, nativeWidth, nativeHeight, useEmptyLatent);

  // 8b. Inject ADetailer-style face + hand detailer nodes (SDXL/Pony only)
  if (useDetailer) {
    const detailerSeed = typeof seed === "number" ? seed + 9999 : Math.floor(Math.random() * 1_000_000_000);
    const availableCheckpoints = await getAvailableCheckpoints();
    let detailerInpaintCkpt: string | undefined = undefined;

    if (arch.isSdxl && (unetNameOverride?.toLowerCase().includes("pony") || unetNameOverride?.toLowerCase().includes("iniverse"))) {
      if (availableCheckpoints.has("cyberrealisticxl_v3.safetensors")) {
        detailerInpaintCkpt = "cyberrealisticXL_v3.safetensors";
        log.info("[Detailer] 🎯 FaceDetailer using photorealistic inpaint checkpoint: cyberrealisticXL_v3.safetensors");
      } else {
        log.info(`[Detailer] ℹ️  cyberrealisticXL_v3.safetensors is downloading — currently using main model (${arch.unetName}) for FaceDetailer pass.`);
      }
    }
    injectFaceDetailer(workflow, arch, detailerSeed, detailerInpaintCkpt);
  }

  // 9. Submit prompt and await render output
  const clientId = `presenter-img-${Math.random().toString(36).slice(2, 9)}`;
  comfyLog("[ComfyClient] Submitting image generation graph to ComfyUI server...");
  let promptId: string;
  try {
    promptId = await submitPrompt(workflow, clientId);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("detailer_ckpt") || errMsg.includes("cyberrealisticXL") || errMsg.includes("value_not_in_list")) {
      comfyLog("[Detailer] ⚠️ detailer_ckpt checkpoint not available on server — falling back to main model UNet for FaceDetailer pass.");
      delete workflow["detailer_ckpt"];
      if (workflow["detail_face"]) {
        workflow["detail_face"].inputs.model = workflow["8"]?.inputs?.model || ["2", 0];
        workflow["detail_face"].inputs.clip = workflow["pony_clip_skip"] ? ["pony_clip_skip", 0] : ["2", 1];
        workflow["detail_face"].inputs.vae = ["2", 2];
      }
      if (workflow["detail_hand"]) {
        workflow["detail_hand"].inputs.model = workflow["8"]?.inputs?.model || ["2", 0];
        workflow["detail_hand"].inputs.clip = workflow["pony_clip_skip"] ? ["pony_clip_skip", 0] : ["2", 1];
        workflow["detail_hand"].inputs.vae = ["2", 2];
      }
      promptId = await submitPrompt(workflow, clientId);
    } else {
      throw err;
    }
  }

  comfyLog(`[ComfyClient] Polling for prompt ID completion: ${promptId}...`);
  const filename = await waitForCompletion(promptId, clientId, 300000, undefined, workflow);

  if (!filename) {
    throw new Error(`ComfyUI image generation succeeded but no output images were produced for prompt ID: ${promptId}`);
  }

  comfyLog(`[ComfyClient] Downloading generated output image: ${filename}...`);
  const imageBuffer = await downloadOutput(filename);

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error(`Failed to download output image buffer for ${filename}`);
  }

  return imageBuffer;
}

/**
 * Standalone wrapper for generatePresenterImage, providing default parameters suitable for quick CLI calls.
 */
export async function generatePresenterImageStandalone(
  prompt: string,
  faceReferenceAbsPath?: string | string[],
  referenceImageAbsPath?: string,
  loras?: LoraConfig[],
  nativeWidth: number = 1024,
  nativeHeight: number = 1024,
  denoise: number = 0.85,
  unetNameOverride?: string,
  seed?: number,
  negativePromptOverride?: string,
  useEmptyLatent: boolean = false,
  filenamePrefixOverride?: string
): Promise<Buffer> {
  return generatePresenterImage(
    prompt,
    faceReferenceAbsPath,
    referenceImageAbsPath,
    loras,
    nativeWidth,
    nativeHeight,
    denoise,
    unetNameOverride,
    seed,
    negativePromptOverride,
    useEmptyLatent,
    filenamePrefixOverride
  );
}

/**
 * Upscales an image using ComfyUI ESRGAN / 4x-UltraSharp Super Resolution pipeline.
 */
export async function upscaleImage(
  imagePath: string,
  width: number = 3840,
  height: number = 2160
): Promise<Buffer> {
  comfyLog("[ComfyClient] Uploading image for upscaling:", imagePath);
  const uploadedImageName = await uploadFileToComfyUI(imagePath);

  const workflow = {
    "1": {
      "inputs": {
        "image": uploadedImageName,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": { "title": "Load Image" }
    },
    "2": {
      "inputs": {
        "model_name": "4x-UltraSharp.pth"
      },
      "class_type": "UpscaleModelLoader",
      "_meta": { "title": "Load Upscale Model" }
    },
    "3": {
      "inputs": {
        "upscale_model": ["2", 0],
        "image": ["1", 0]
      },
      "class_type": "ImageUpscaleWithModel",
      "_meta": { "title": "Upscale Image" }
    },
    "4": {
      "inputs": {
        "images": ["3", 0],
        "resize_type": "target dimensions",
        "resize_type.width": width,
        "resize_type.height": height,
        "quality": "ULTRA"
      },
      "class_type": "RTXVideoSuperResolution",
      "_meta": { "title": "RTX Super Resolution" }
    },
    "5": {
      "inputs": {
        "images": ["4", 0],
        "filename_prefix": "upscaled_image"
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };

  const clientId = `upscale-${Date.now()}`;
  comfyLog(`[ComfyClient] Submitting image upscale workflow (target resolution: ${width}x${height})...`);
  const promptId = await submitPrompt(workflow, clientId);
  comfyLog("[ComfyClient] Upscale Prompt ID:", promptId);

  const deadline = Date.now() + 300000;
  let outputFilename: string | null = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const jobError = await getComfyJobError(promptId);
    if (jobError) throw new Error(jobError);
    outputFilename = await getOutputFilename(promptId);
    if (outputFilename) break;
  }

  if (!outputFilename) {
    throw new Error("Upscaling timed out or failed on ComfyUI");
  }

  comfyLog("[ComfyClient] Downloading upscaled image:", outputFilename);
  return await downloadOutput(outputFilename);
}
