/**
 * src/lib/ai/comfy/image/loraManager.ts
 *
 * LoRA adapter discovery, scanning, and strict architecture compatibility filtering
 * for ComfyUI image generation pipelines (SDXL, Pony V6 XL, FLUX.1/FLUX.2, Lumina-2 / Z-Image-Turbo).
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { comfyLog } from "../api";
import { ModelArchitectureInfo } from "./modelClassifier";
dotenv.config();

export interface LoraConfig {
  name: string;
  strength: number;
}

/**
 * Helper to list all installed .safetensors files in local and shared ComfyUI LoRA directories.
 * Returns a map of lower-case filename -> exact disk filename.
 */
export function getAvailableLoraMap(): Map<string, string> {
  const map = new Map<string, string>();
  const dirs = [
    path.join(process.cwd(), "vendor", "ComfyUI", "models", "loras"),
    "C:/Users/danie/AppData/Local/Comfy-Desktop/ComfyUI-Shared/models/loras",
    "C:/Users/danie/AppData/Local/Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI/models/loras"
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      try {
        const files = fs.readdirSync(d);
        for (const f of files) {
          if (f.endsWith(".safetensors")) {
            map.set(f.toLowerCase(), f);
          }
        }
      } catch {
        // ignore unreadable
      }
    }
  }
  return map;
}

export function getAvailableLoraFiles(): Set<string> {
  const set = new Set<string>();
  const map = getAvailableLoraMap();
  for (const lower of map.keys()) {
    set.add(lower);
  }
  return set;
}

/**
 * Checks if a specific LoRA filename is structurally compatible with a target UNet model architecture.
 */
export function isLoraCompatibleWithModel(loraName: string, unetName: string): boolean {
  const nameLower = loraName.toLowerCase();

  // Video LoRAs (Wan 2.1 / LTX Video) cause PyTorch tensor stalls in 2D UNet image models
  if (nameLower.startsWith("wan-") || nameLower.startsWith("ltx-")) {
    return false;
  }

  const unetLower = unetName.toLowerCase();
  const isFlux = unetLower.includes("flux") || unetLower.includes("flux2");

  // Lumina-2 / Klein architecture (Catalyst, Z-Image, Moody)
  const isKlein = unetLower.includes("z_image") || unetLower.includes("catalyst") || unetLower.includes("moody") || unetLower.includes("lumina");

  // Real SDXL / Pony architecture (CheckpointLoaderSimple / UNETLoader)
  const isPonyOrSdxl = (
    unetLower.includes("sd_xl") ||
    unetLower.includes("sdxl") ||
    unetLower.includes("pony") ||
    unetLower.includes("ponydiffusion") ||
    unetLower.includes("iniverse") ||
    unetLower.includes("cyberrealistic") ||
    unetLower.includes("realxl")
  ) && !isKlein;

  if (isPonyOrSdxl) {
    // SDXL / Pony UNet: reject Krea2 / Lumina-2 LoRAs, FLUX LoRAs, etc.
    if (nameLower.includes("boreal")) return false;
    if (nameLower.startsWith("flux-") || nameLower.includes("krea2") || nameLower.includes("super-realism") || nameLower.includes("aidma") || nameLower.includes("snofs") || nameLower.includes("lenovo") || nameLower.includes("lumina") || nameLower.includes("z_image")) {
      if (!nameLower.includes("instapic") && !nameLower.includes("hyper-sdxl") && !nameLower.includes("lightning")) {
        return false;
      }
    }
    return true;
  }

  if (isKlein) {
    // Lumina-2 / Z-Image / Catalyst / Moody: allow krea2, instapic, nsfw-master, boreal
    if (nameLower.startsWith("flux-") || nameLower.includes("add-detail-xl") || nameLower.includes("pony")) return false;
    if (nameLower.includes("super-realism") || nameLower.includes("aidma") || nameLower.includes("snofs") || nameLower.includes("lenovo")) {
      if (!nameLower.includes("instapic") && !nameLower.includes("boreal") && !nameLower.includes("nsfw-master")) {
        return false;
      }
    }
    return true;
  }

  if (isFlux) {
    // FLUX UNet: allow flux-*, boreal, instapic
    if (nameLower.includes("add-detail-xl") || nameLower.includes("pony")) return false;
    if (nameLower.includes("krea2") && !nameLower.includes("flux")) return false;
    return true;
  }

  return true;
}

export const KNOWN_LORA_URLS: Record<string, string> = {
  "instapic_ultrareal_v1.safetensors": "https://civitai.com/api/download/models/2909558",
  "instapic-ultrareal.safetensors": "https://civitai.com/api/download/models/2909558",
  "instapic_ultrareal.safetensors": "https://civitai.com/api/download/models/2909558",
  "nsfw_master_zit_v2.safetensors": "https://civitai.com/api/download/models/2904324",
  "nsfw-master-zit-v2.safetensors": "https://civitai.com/api/download/models/2904324",
  "boreal-flux-dev2.safetensors": "https://civitai.com/api/download/models/2455415",
  "boreal-fd-flux.safetensors": "https://civitai.com/api/download/models/2455415",
  "boreal_flux_dev2.safetensors": "https://civitai.com/api/download/models/2455415",
  "hyper-sdxl-8steps-cfg-lora.safetensors": "https://huggingface.co/ByteDance/Hyper-SD/resolve/main/Hyper-SDXL-8steps-CFG-lora.safetensors",
  "hyper-sdxl-8steps-cfg-lora": "https://huggingface.co/ByteDance/Hyper-SD/resolve/main/Hyper-SDXL-8steps-CFG-lora.safetensors",
  "sdxl_lightning_4step_lora.safetensors": "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors",
  "sdxl_lightning_8step_lora.safetensors": "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_8step_lora.safetensors",
  "add-detail-xl.safetensors": "https://civitai.com/api/download/models/122359",
  "aidmansfwunlock-flux-v0.2.safetensors": "https://civitai.com/api/download/models/723467",
  "flux-skin-detailer.safetensors": "https://civitai.com/api/download/models/712398",
  "futanari-bulge.safetensors": "https://civitai.com/api/download/models/654321",
  "cyberrealisticxl_v3.safetensors": "https://civitai.com/api/download/models/960060"
};

export async function autoDownloadLoraIfMissing(loraName: string): Promise<boolean> {
  const map = getAvailableLoraMap();
  const lower = loraName.toLowerCase();

  if (map.has(lower)) {
    return true;
  }

  const downloadUrl = KNOWN_LORA_URLS[lower];
  if (!downloadUrl) {
    return false;
  }

  const sharedDest = path.join("C:/Users/danie/AppData/Local/Comfy-Desktop/ComfyUI-Shared/models/loras", loraName);
  const vendorDest = path.join(process.cwd(), "vendor", "ComfyUI", "models", "loras", loraName);
  const destPaths = [sharedDest, vendorDest];

  const apiKey = process.env.CIVITAI_API_KEY || process.env.CIVITAI_TOKEN;
  const candidateUrls = [downloadUrl];
  if (downloadUrl.includes("civitai.com")) {
    if (apiKey) {
      candidateUrls.unshift(`${downloadUrl}?token=${apiKey}`);
    }
    candidateUrls.push(downloadUrl.replace("civitai.com", "civitai.red"));
  }

  comfyLog(`⚡ [LoRA Auto-Downloader] Missing LoRA requested: ${loraName}`);

  for (const targetUrl of candidateUrls) {
    comfyLog(`   Downloading from: ${targetUrl}...`);
    for (const destPath of destPaths) {
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const res = await fetch(targetUrl);
        if (!res.ok) continue;

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 1024 * 1024) {
          fs.writeFileSync(destPath, buffer);
          comfyLog(`   ✅ Auto-downloaded LoRA to: ${destPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
          return true;
        }
      } catch (err: unknown) {
        comfyLog(`   ❌ Auto-download attempt failed for ${destPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return false;
}

export async function ensureCandidateLorasDownloaded(loras: LoraConfig[] = []): Promise<void> {
  for (const l of loras) {
    await autoDownloadLoraIfMissing(l.name);
  }
}

/**
 * Filters a list of requested LoRAs against installed files and architecture compatibility rules.
 * Automatically maps LoRA filenames to exact disk case matching ComfyUI's model list.
 */
export function filterCompatibleLoras(
  loras: LoraConfig[] | undefined,
  arch: ModelArchitectureInfo
): LoraConfig[] {
  const availableLoraMap = getAvailableLoraMap();

  const filtered: LoraConfig[] = [];
  for (const l of (loras || [])) {
    const lower = l.name.toLowerCase();
    const exactDiskName = availableLoraMap.get(lower);

    if (availableLoraMap.size > 0 && !exactDiskName) {
      comfyLog(`⚠️ [ComfyClient] LoRA adapter "${l.name}" not found in ComfyUI models/loras. Skipping.`);
      continue;
    }

    const realName = exactDiskName || l.name;
    if (isLoraCompatibleWithModel(realName, arch.unetName)) {
      filtered.push({
        name: realName,
        strength: l.strength
      });
    }
  }

  if (filtered.length !== (loras || []).length) {
    comfyLog(`🔌 [ComfyClient] Filtered out ${(loras || []).length - filtered.length} incompatible or missing LoRA(s) for UNet model: "${arch.unetName}"`);
  }

  return filtered;
}

/**
 * Scopes active LoRAs specifically for a target pipeline stage.
 * Strips character, anatomy, body, and clothing LoRAs from Stage 1 (Environment) and Stage 2 (Props).
 */
export function scopeLorasForStage(loras: LoraConfig[] = [], stageIndex: number): LoraConfig[] {
  if (!loras || loras.length === 0) return [];

  if (stageIndex === 1 || stageIndex === 2) {
    // Stages 1 & 2: Environment and Props plates ONLY.
    // Exclude character, body, face, detailer, anatomy, and clothing LoRAs.
    return loras.filter(l => {
      const name = l.name.toLowerCase();
      const isCharacterOrBody = /detail|futanari|bulge|persona|character|face|body|nude|skin|costume|outfit|attire|dress|suit|boob|breast|penis|cock|pussy|vulva/i.test(name);
      return !isCharacterOrBody;
    });
  }

  return loras;
}

/**
 * Intelligently auto-detects and routes compatible installed LoRAs based on:
 * 1. UNet Model Architecture compatibility
 * 2. Stage index relevance
 * 3. Prompt text & selected custom trait keywords
 *
 * Prevents unnecessary LoRA bloat by ONLY adding LoRAs when explicitly relevant.
 */
export function autoDetectRelevantLoras(
  unetName: string,
  promptText: string,
  customTraits: string[] = [],
  stageIndex?: number
): LoraConfig[] {
  const availableMap = getAvailableLoraMap();
  if (availableMap.size === 0) return [];

  const fullPromptStr = `${promptText} ${customTraits.join(" ")}`.toLowerCase();
  const detected: LoraConfig[] = [];

  // Helper to check if installed and compatible
  const tryAddLora = (keyPattern: RegExp, defaultFileName: string, strength: number, intentPattern?: RegExp) => {
    if (intentPattern && !intentPattern.test(fullPromptStr)) {
      return; // Do NOT add if prompt/traits do not explicitly match intent!
    }

    // Find installed match
    for (const [lowerName, exactDiskName] of availableMap.entries()) {
      if (keyPattern.test(lowerName)) {
        if (isLoraCompatibleWithModel(exactDiskName, unetName)) {
          // Avoid duplicate additions
          if (!detected.some(d => d.name.toLowerCase() === lowerName)) {
            detected.push({ name: exactDiskName, strength });
            return;
          }
        }
      }
    }
  };

  // 1. Anatomy & Genital LoRAs (Only if prompt/customTraits explicitly request specific anatomy)
  if (/futanari|shemale|transgender|ladyboy|penis|cock|bulge|phallus|glans/i.test(fullPromptStr)) {
    tryAddLora(/futanari|bulge/i, "futanari-bulge.safetensors", 0.70);
    tryAddLora(/krea2-futanari-anatomy/i, "krea2-futanari-anatomy.safetensors", 0.75);
    tryAddLora(/krea2-large-penis|large-penis/i, "krea2-large-penis.safetensors", 0.75);
    tryAddLora(/krea2-penis|penis-size-slider/i, "krea2-penis.safetensors", 0.75);
    if (/glans|penis head/i.test(fullPromptStr)) {
      tryAddLora(/krea2-bigger-glans/i, "krea2-bigger-glans.safetensors", 0.70);
    }
  }

  // 2. Breast & Nipples Anatomy LoRAs
  if (/nipple|areola/i.test(fullPromptStr)) {
    tryAddLora(/krea2-hard-nipples|hard-nipples/i, "krea2-hard-nipples.safetensors", 0.75);
  }
  if (/fake breasts|bimbo/i.test(fullPromptStr)) {
    tryAddLora(/fake-breasts-krea2/i, "fake-breasts-krea2.safetensors", 0.70);
  }
  if (/saggy breasts|sagging/i.test(fullPromptStr)) {
    tryAddLora(/flux-saggy-breasts/i, "flux-saggy-breasts.safetensors", 0.75);
  }
  if (/macromastia|colossal breasts/i.test(fullPromptStr)) {
    tryAddLora(/flux-macromastia/i, "flux-macromastia-clothed.safetensors", 0.70);
  }

  // 3. Detailer & Quality LoRAs (Only if photorealistic / detail / skin pores / sharp focus is requested)
  if (/detail|photorealistic|raw photo|sharp focus|skin pores|hyperreal/i.test(fullPromptStr)) {
    // Pony / SDXL detailer
    tryAddLora(/add-detail|add_detail|detail-xl/i, "add-detail-xl.safetensors", 0.65);
    // Flux skin detailers
    tryAddLora(/flux-skin-detailer|skin-detail/i, "flux-skin-detailer.safetensors", 0.60);
    tryAddLora(/flux-detailer/i, "flux-detailer.safetensors", 0.60);
    tryAddLora(/super-realism/i, "super-realism.safetensors", 0.65);
    tryAddLora(/flux-lenovo-ultrareal/i, "flux-lenovo-ultrareal.safetensors", 0.70);
    // Lumina-2 / Z-Image ultrareal & enhancers
    tryAddLora(/instapic|ultrareal/i, "InstaPic_Ultrareal_v1.safetensors", 0.70);
    tryAddLora(/krea2_enhancer/i, "krea2_Enhancer.safetensors", 0.65);
    tryAddLora(/realistic_studio_zimage/i, "Realistic_studio_zimage_epoch_10.safetensors", 0.60);
    tryAddLora(/pornmaster-detail-slider/i, "pornmaster-detail-slider-krea2.safetensors", 0.70);
  }

  // 4. Attire & Jewelry LoRAs
  if (/latex|shiny outfit/i.test(fullPromptStr)) {
    tryAddLora(/krea2-latex/i, "krea2-latex.safetensors", 0.75);
  }
  if (/lingerie|stockings/i.test(fullPromptStr)) {
    tryAddLora(/vintage-lingerie/i, "flux-vintage-lingerie.safetensors", 0.75);
  }
  if (/bondage|metal harness/i.test(fullPromptStr)) {
    tryAddLora(/metal-bondage/i, "krea2-metal-bondage.safetensors", 0.75);
  }

  // 5. Explicit Fluid / Ejaculation LoRAs (Only if cum/semen is requested)
  if (/cum|semen|cumshot|ejaculat/i.test(fullPromptStr)) {
    tryAddLora(/hmcum/i, "hmcum-krea2.safetensors", 0.75);
    tryAddLora(/facial-cumshot/i, "facial-cumshot-krea2.safetensors", 0.75);
    tryAddLora(/cumshot-slider/i, "flux-klein-cumshot-slider.safetensors", 0.70);
  }

  // 6. NSFW Master LoRAs (Only if uncensored / explicit NSFW is active and model is Z-Image / Lumina-2)
  if (/nude|uncensored|explicit|nsfw|bare skin/i.test(fullPromptStr)) {
    tryAddLora(/nsfw_master|nsfw-master/i, "NSFW_MASTER_ZIT_v2.safetensors", 0.65);
    tryAddLora(/krea2-aio-nsfw/i, "krea2-aio-nsfw.safetensors", 0.70);
    tryAddLora(/aidmansfwunlock/i, "aidmaNSFWunlock-FLUX-V0.2.safetensors", 0.80);
  }

  // 7. Boreal / Lighting LoRAs (Only if cinematic lighting / boreal style is explicitly requested)
  if (/boreal|cinematic lighting|volumetric/i.test(fullPromptStr)) {
    tryAddLora(/boreal/i, "boreal-flux-dev2.safetensors", 0.50);
  }

  // If stageIndex is provided, filter through stage scoping rules
  if (stageIndex !== undefined) {
    return scopeLorasForStage(detected, stageIndex);
  }

  return detected;
}
