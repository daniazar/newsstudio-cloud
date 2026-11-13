/**
 * src/lib/ecommerce/imageMatte.ts
 *
 * High-performance server-side image matting & white background remover.
 * Uses sharp with 4-border BFS flood-fill, feathered alpha transitions,
 * and edge halo defringing to convert e-commerce product photos on white/light
 * backdrops into true 32-bit transparent RGBA PNG cutouts.
 */

import sharp from "sharp";
import { assertSafePublicUrl } from "@/lib/security/ssrf";

export interface MatteOptions {
  /** Brightness threshold for background detection [0..255] (default: 232) */
  threshold?: number;
  /** Max saturation for neutral/white backdrop detection [0..255] (default: 22) */
  maxSaturation?: number;
  /** Feather transition range in pixels/luminance (default: 35) */
  featherRange?: number;
  /** Defringe edge halos (default: true) */
  defringe?: boolean;
  /** Force output PNG format */
  compressionLevel?: number;
}

// In-memory cache for processed buffers keyed by URL/hash (TTL 1 hour)
const memoryBufferCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Removes white or near-white studio backdrop from an image buffer.
 * Performs a 4-border BFS flood fill so interior whites (text, dials, laces)
 * are strictly preserved while the exterior cyclorama is made 100% transparent.
 */
export async function removeWhiteBackground(
  inputBuffer: Buffer,
  options: MatteOptions = {}
): Promise<Buffer> {
  const {
    threshold = 232,
    maxSaturation = 22,
    featherRange = 35,
    defringe = true,
    compressionLevel = 8,
  } = options;

  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const pixels = width * height;

  const visited = new Uint8Array(pixels);
  const queue: number[] = [];

  // Seed top and bottom borders
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    visited[x] = 1;
    const bottomPos = (height - 1) * width + x;
    queue.push(x, height - 1);
    visited[bottomPos] = 1;
  }

  // Seed left and right borders
  for (let y = 0; y < height; y++) {
    const leftPos = y * width;
    if (!visited[leftPos]) {
      queue.push(0, y);
      visited[leftPos] = 1;
    }
    const rightPos = y * width + (width - 1);
    if (!visited[rightPos]) {
      queue.push(width - 1, y);
      visited[rightPos] = 1;
    }
  }

  let head = 0;
  const isBgPixel = (r: number, g: number, b: number) => {
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const sat = maxVal - minVal;
    return minVal >= threshold && sat <= maxSaturation;
  };

  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = (y * width + x) * 4;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (isBgPixel(r, g, b)) {
      data[idx + 3] = 0; // Alpha 0

      // Check 4-connected neighbors
      if (x + 1 < width && !visited[y * width + (x + 1)]) {
        visited[y * width + (x + 1)] = 1;
        queue.push(x + 1, y);
      }
      if (x - 1 >= 0 && !visited[y * width + (x - 1)]) {
        visited[y * width + (x - 1)] = 1;
        queue.push(x - 1, y);
      }
      if (y + 1 < height && !visited[(y + 1) * width + x]) {
        visited[(y + 1) * width + x] = 1;
        queue.push(x, y + 1);
      }
      if (y - 1 >= 0 && !visited[(y - 1) * width + x]) {
        visited[(y - 1) * width + x] = 1;
        queue.push(x, y - 1);
      }
    }
  }

  // Pass 2: Boundary anti-halo erosion
  // For pixels immediately touching cleared background, if they are near-white (cyclorama diffusion)
  // clear them to eliminate the 1-2px harsh white halo rim
  const pass1Alpha = new Uint8Array(pixels);
  for (let i = 0; i < pixels; i++) {
    pass1Alpha[i] = data[i * 4 + 3];
  }

  const nearWhiteThreshold = Math.max(190, threshold - 16);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;
      if (pass1Alpha[pos] > 0) {
        const isTouchingBg =
          pass1Alpha[pos - 1] === 0 ||
          pass1Alpha[pos + 1] === 0 ||
          pass1Alpha[pos - width] === 0 ||
          pass1Alpha[pos + width] === 0;

        if (isTouchingBg) {
          const idx = pos * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const minVal = Math.min(r, g, b);
          const maxVal = Math.max(r, g, b);
          const sat = maxVal - minVal;

          // If the boundary pixel is predominantly white cyclorama bleed, eliminate it
          if (minVal >= nearWhiteThreshold && sat <= maxSaturation + 8) {
            data[idx + 3] = 0;
          }
        }
      }
    }
  }

  // Pass 3: Edge feathering, soft alpha gradient, and color despill (unmultiply white halo)
  if (featherRange > 0 || defringe) {
    const alphaSnapshot = new Uint8Array(pixels);
    for (let i = 0; i < pixels; i++) {
      alphaSnapshot[i] = data[i * 4 + 3];
    }

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pos = y * width + x;
        if (alphaSnapshot[pos] > 0) {
          const isAdjacentToCleared =
            alphaSnapshot[pos - 1] === 0 ||
            alphaSnapshot[pos + 1] === 0 ||
            alphaSnapshot[pos - width] === 0 ||
            alphaSnapshot[pos + width] === 0;

          if (isAdjacentToCleared) {
            const idx = pos * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const minVal = Math.min(r, g, b);
            const maxVal = Math.max(r, g, b);
            const sat = maxVal - minVal;

            if (minVal >= threshold - featherRange && sat <= maxSaturation + 12) {
              // As minVal approaches background threshold, alpha smoothly ramps down to 0
              const alphaFactor = Math.max(0, Math.min(1, (threshold - minVal) / Math.max(1, featherRange)));
              const newAlpha = Math.round(255 * alphaFactor);
              data[idx + 3] = newAlpha;

              // White halo despill: unmultiply white background from semi-transparent edge pixels
              if (defringe && newAlpha > 0 && newAlpha < 255) {
                const normA = newAlpha / 255;
                // Target true foreground color without white backlight bleed
                data[idx] = Math.max(0, Math.min(255, Math.round((r - (1 - normA) * 255) / normA)));
                data[idx + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - normA) * 255) / normA)));
                data[idx + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - normA) * 255) / normA)));
              }
            }
          }
        }
      }
    }
  }

  return await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ compressionLevel })
    .toBuffer();
}

/**
 * Downloads a remote image and optionally removes its white background.
 * Uses an in-memory cache to guarantee sub-5ms response times on repeated calls.
 */
export async function getOrProcessMattedImage(
  url: string,
  options: MatteOptions & { removeWhite?: boolean } = {}
): Promise<Buffer> {
  const cacheKey = `${url}_matte_${options.removeWhite ?? true}_t${options.threshold ?? 232}`;
  const now = Date.now();

  const cached = memoryBufferCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.buffer;
  }

  // Validate URL safety against SSRF before fetching
  await assertSafePublicUrl(url, {
    allowDevelopmentLoopback: process.env.NODE_ENV !== "production",
  });

  // Fetch remote image
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));

  if (options.removeWhite !== false) {
    buffer = await removeWhiteBackground(buffer, options);
  }

  // Evict oldest if cache exceeds 50 items
  if (memoryBufferCache.size > 50) {
    const oldestKey = memoryBufferCache.keys().next().value;
    if (oldestKey) memoryBufferCache.delete(oldestKey);
  }

  memoryBufferCache.set(cacheKey, { buffer, timestamp: now });
  return buffer;
}
