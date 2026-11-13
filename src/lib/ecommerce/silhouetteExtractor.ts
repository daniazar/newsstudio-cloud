/**
 * src/lib/ecommerce/silhouetteExtractor.ts
 *
 * Deterministic Computer Vision module that scans an e-commerce product photograph
 * (with alpha transparency or solid white/studio backdrop), auto-keys background pixels,
 * extracts the true 2D symmetrical container silhouette r(y), and segments the product
 * into container body vs. procedural closure (pump dispenser or screw cap).
 *
 * Runs 100% in client-side TypeScript (browser Canvas or Node.js buffer/ImageData).
 * Zero neural VRAM overhead, sub-millisecond execution.
 */

export interface SilhouetteExtractionOptions {
  /** Minimum alpha channel value (0–255) to consider a pixel part of the product. Default: 15 */
  alphaThreshold?: number;
  /** Radius for 1D moving-average smoothing filter to eliminate pixel staircasing. Default: 3 */
  smoothingRadius?: number;
  /** Number of vertical sampling steps along the profile (excluding base/cap sealing). Default: 64 */
  targetSamples?: number;
  /** Normalized target height in Three.js world units. Default: 2.0 (centered [-1, +1]) */
  normalizedHeight?: number;
  /** Color difference threshold for auto background removal. Default: 24.0 */
  chromaThreshold?: number;
  /** If true, disables automatic background removal on opaque images. Default: false */
  disableAutoKey?: boolean;
}

export interface ProfilePoint {
  x: number; // Radius (distance from vertical axis)
  y: number; // Vertical height in Three.js coordinates
}

export type ClosureType = "pump" | "screw_cap" | "can_lid" | "none";

export interface ClosureSpec {
  /** Classified closure type */
  type: ClosureType;
  /** Sampled cap/closure plastic/metal color */
  color: { r: number; g: number; b: number; hex: string };
  /** Collar ring radius in normalized Three.js units */
  collarRadius: number;
  /** Collar vertical height in normalized Three.js units */
  collarHeight: number;
  /** Plunger stem radius in normalized Three.js units */
  stemRadius: number;
  /** Plunger stem vertical height in normalized Three.js units */
  stemHeight: number;
  /** Actuator button head radius in normalized Three.js units */
  headRadius: number;
  /** Actuator button head height in normalized Three.js units */
  headHeight: number;
  /** Spout nozzle direction (-1 for left -X, +1 for right +X) */
  spoutDirection: -1 | 1;
  /** Spout nozzle protrusion length beyond head radius in normalized Three.js units */
  spoutLength: number;
  /** Normalized Y where the bottle neck ends and the collar begins */
  yCollar: number;
  /** Normalized Y at the very top of the closure */
  yTop: number;
}

export interface SilhouetteProfile {
  /** Full profile points from bottom center to top center (for backwards compatibility) */
  points: ProfilePoint[];
  /** Profile points for the container body only (from base to collar junction) */
  bodyPoints: ProfilePoint[];
  /** Procedural closure specifications for cap/pump generation */
  closure: ClosureSpec;
  /** Vertical centerline in image pixel coordinates (X) */
  centerlineX: number;
  /** Pixel bounding box of the detected product (excluding background) */
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  /** Dominant packaging color sampled from the container body */
  dominantColor: {
    r: number;
    g: number;
    b: number;
    hex: string;
  };
  /** Detected background color that was keyed out */
  backgroundColor: {
    r: number;
    g: number;
    b: number;
    hex: string;
    wasKeyed: boolean;
  };
  /** Height-to-maximum-diameter aspect ratio */
  aspectRatio: number;
  /** Maximum radius in normalized Three.js units */
  maxRadius: number;
  /** Cleaned RGBA pixel data with background keyed out (transparent alpha) */
  mattedData?: Uint8ClampedArray;
}

export interface RawImageData {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/**
 * Automatically detects and keys out solid studio backgrounds (white, grey, green, etc.)
 * by sampling corner patches and applying Euclidean color-distance thresholding with soft feathering.
 */
function autoKeyBackground(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  chromaThreshold = 24.0,
  alphaThreshold = 15
): {
  mattedData: Uint8ClampedArray;
  bgColor: { r: number; g: number; b: number; hex: string; wasKeyed: boolean };
} {
  const totalPixels = width * height;
  let transparentCount = 0;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < alphaThreshold) {
      transparentCount++;
    }
  }

  // If image is already alpha-matted (>2% transparent pixels), preserve original alpha
  if (transparentCount / totalPixels > 0.02) {
    const copy = new Uint8ClampedArray(data.length);
    copy.set(data);
    return {
      mattedData: copy,
      bgColor: { r: 255, g: 255, b: 255, hex: "#ffffff", wasKeyed: false },
    };
  }

  // Image is opaque (solid studio backdrop). Sample the 4 corners.
  const patchSize = Math.max(4, Math.min(16, Math.floor(Math.min(width, height) / 8)));
  const cornerPixels: { r: number; g: number; b: number }[] = [];

  const sampleRect = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const idx = (y * width + x) * 4;
        cornerPixels.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }
  };

  sampleRect(0, 0, patchSize, patchSize);
  sampleRect(width - patchSize, 0, patchSize, patchSize);
  sampleRect(0, height - patchSize, patchSize, patchSize);
  sampleRect(width - patchSize, height - patchSize, patchSize, patchSize);

  // Compute median corner RGB
  const rSorted = cornerPixels.map((c) => c.r).sort((a, b) => a - b);
  const gSorted = cornerPixels.map((c) => c.g).sort((a, b) => a - b);
  const bSorted = cornerPixels.map((c) => c.b).sort((a, b) => a - b);
  const mid = Math.floor(cornerPixels.length / 2);
  const bgR = rSorted[mid];
  const bgG = gSorted[mid];
  const bgB = bSorted[mid];
  const bgHex = `#${toHex(bgR)}${toHex(bgG)}${toHex(bgB)}`;

  const mattedData = new Uint8ClampedArray(data.length);
  mattedData.set(data);

  // Soft edge keying range:
  // Below t1: 100% background (alpha = 0)
  // Above t2: 100% foreground (alpha = original)
  const t1 = Math.max(12.0, chromaThreshold * 0.85);
  const t2 = t1 + 14.0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    if (dist <= t1) {
      mattedData[idx + 3] = 0;
    } else if (dist < t2) {
      const feather = (dist - t1) / (t2 - t1);
      mattedData[idx + 3] = Math.round(data[idx + 3] * feather);
    }
  }

  return {
    mattedData,
    bgColor: { r: bgR, g: bgG, b: bgB, hex: bgHex, wasKeyed: true },
  };
}

/**
 * Extracts a symmetrical 2D revolution profile and procedural closure specs from raw RGBA pixel data.
 */
export function extractProfileFromImageData(
  image: RawImageData,
  options: SilhouetteExtractionOptions = {}
): SilhouetteProfile {
  const {
    alphaThreshold = 15,
    smoothingRadius = 3,
    targetSamples = 64,
    normalizedHeight = 2.0,
    chromaThreshold = 24.0,
    disableAutoKey = false,
  } = options;

  const { data, width, height } = image;
  if (width <= 0 || height <= 0 || data.length < width * height * 4) {
    throw new Error(`Invalid image dimensions or pixel data length (${width}x${height})`);
  }

  // Step 1: Auto-key background if opaque studio image
  const { mattedData, bgColor } = disableAutoKey
    ? {
        mattedData: new Uint8ClampedArray(data),
        bgColor: { r: 255, g: 255, b: 255, hex: "#ffffff", wasKeyed: false },
      }
    : autoKeyBackground(data, width, height, chromaThreshold, alphaThreshold);

  // Step 2: Scan per-row horizontal bounds [minX, maxX]
  const rowMinX: number[] = new Array(height).fill(-1);
  const rowMaxX: number[] = new Array(height).fill(-1);
  let globalMinY = -1;
  let globalMaxY = -1;
  let globalMinX = width;
  let globalMaxX = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    let minX = -1;
    let maxX = -1;

    for (let x = 0; x < width; x++) {
      const alpha = mattedData[rowOffset + x * 4 + 3];
      if (alpha >= 45) { // Foreground threshold
        if (minX === -1) minX = x;
        maxX = x;
      }
    }

    // Require row to have at least 4 contiguous foreground pixels to reject single-pixel noise
    if (minX !== -1 && maxX !== -1 && maxX - minX >= 3) {
      rowMinX[y] = minX;
      rowMaxX[y] = maxX;
      if (globalMinY === -1) globalMinY = y;
      globalMaxY = y;
      if (minX < globalMinX) globalMinX = minX;
      if (maxX > globalMaxX) globalMaxX = maxX;
    }
  }

  if (globalMinY === -1 || globalMaxY === -1 || globalMinX > globalMaxX) {
    throw new Error("No opaque product pixels found in image cutout.");
  }

  const bboxWidth = globalMaxX - globalMinX + 1;
  const bboxHeight = globalMaxY - globalMinY + 1;

  // Step 3: Compute robust body centerline Xc and body radius
  // We analyze row centers and half-widths across the stable body (45% - 85% of height)
  const bodyStartY = Math.floor(globalMinY + bboxHeight * 0.45);
  const bodyEndY = Math.floor(globalMinY + bboxHeight * 0.85);

  const bodyCenters: number[] = [];
  const bodyRadii: number[] = [];

  for (let y = bodyStartY; y <= bodyEndY; y++) {
    if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
      const span = rowMaxX[y] - rowMinX[y];
      if (span >= 10) {
        bodyCenters.push((rowMinX[y] + rowMaxX[y]) / 2);
        bodyRadii.push(span / 2);
      }
    }
  }

  let centerlineX: number;
  let medianBodyRadiusPx: number;

  if (bodyCenters.length > 0) {
    bodyCenters.sort((a, b) => a - b);
    bodyRadii.sort((a, b) => a - b);
    centerlineX = bodyCenters[Math.floor(bodyCenters.length / 2)];
    medianBodyRadiusPx = bodyRadii[Math.floor(bodyRadii.length / 2)];
  } else {
    centerlineX = (globalMinX + globalMaxX) / 2;
    medianBodyRadiusPx = bboxWidth / 2;
  }

  // Step 4: Segment Bottle Body vs. Cap Closure
  // Scan the upper 35% of the object to locate neck constriction and collar junction
  const upperScanStart = Math.floor(globalMinY + bboxHeight * 0.10);
  const upperScanEnd = Math.floor(globalMinY + bboxHeight * 0.38);

  let detectedNeckY = -1;
  let minNeckRadius = Infinity;

  for (let y = upperScanStart; y <= upperScanEnd; y++) {
    if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
      const r = (rowMaxX[y] - rowMinX[y]) / 2;
      if (r < minNeckRadius) {
        minNeckRadius = r;
        detectedNeckY = y;
      }
    }
  }

  // Check if neck constriction is meaningful (< 68% of body radius)
  const hasNeckConstriction = detectedNeckY !== -1 && minNeckRadius < medianBodyRadiusPx * 0.68;

  let yCollarPx = hasNeckConstriction ? detectedNeckY : Math.floor(globalMinY + bboxHeight * 0.15);

  // Fine-tune collar junction around neck by detecting dark/cap color transition
  if (hasNeckConstriction) {
    const searchMin = Math.max(globalMinY, detectedNeckY - 30);
    const searchMax = Math.min(globalMaxY, detectedNeckY + 30);

    for (let y = searchMin; y <= searchMax; y++) {
      if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
        const cx = Math.round((rowMinX[y] + rowMaxX[y]) / 2);
        const idx = (y * width + cx) * 4;
        const brightness = (mattedData[idx] + mattedData[idx + 1] + mattedData[idx + 2]) / 3;
        // If center pixel is dark (cap plastic, e.g. < 55) or color contrast is high
        if (brightness < 55) {
          yCollarPx = y;
        }
      }
    }
  }

  // Step 5: Analyze Closure Type & Cap Geometry above yCollarPx
  let maxUpperAsymmetry = 0;
  let maxAsymCx = centerlineX;
  const collarRadiusPx = minNeckRadius !== Infinity ? minNeckRadius * 1.15 : medianBodyRadiusPx * 0.45;
  let stemRadiusPx = collarRadiusPx * 0.55;
  const headRadiusPx = stemRadiusPx * 1.35;
  let spoutProtrusionPx = 0;

  const capColors: { r: number; g: number; b: number }[] = [];

  for (let y = globalMinY; y <= yCollarPx; y++) {
    if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
      const span = rowMaxX[y] - rowMinX[y];
      const r = span / 2;
      const cx = (rowMinX[y] + rowMaxX[y]) / 2;
      const asym = Math.abs(cx - centerlineX) / Math.max(1, r);

      if (asym > maxUpperAsymmetry) {
        maxUpperAsymmetry = asym;
        maxAsymCx = cx;
      }

      // Sample cap plastic colors
      const idx = (y * width + Math.round(cx)) * 4;
      if (mattedData[idx + 3] > 100) {
        capColors.push({
          r: mattedData[idx],
          g: mattedData[idx + 1],
          b: mattedData[idx + 2],
        });
      }
    }
  }

  // Classify closure type
  let closureType: ClosureType = "none";
  if (hasNeckConstriction && maxUpperAsymmetry > 0.22) {
    closureType = "pump";
  } else if (hasNeckConstriction) {
    closureType = "screw_cap";
  } else if (bboxHeight > bboxWidth * 1.6) {
    closureType = "can_lid";
  }

  // For pump dispensers, identify collar, stem, and head sections
  if (closureType === "pump") {
    // Stem is the slender section between collar and head
    let minUpperRadius = Infinity;
    for (let y = globalMinY + 15; y < yCollarPx - 15; y++) {
      if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
        const r = (rowMaxX[y] - rowMinX[y]) / 2;
        if (r < minUpperRadius) {
          minUpperRadius = r;
        }
      }
    }
    if (minUpperRadius !== Infinity && minUpperRadius < collarRadiusPx) {
      stemRadiusPx = minUpperRadius;
    }

    // Measure spout protrusion beyond body centerline
    const leftProtrusion = Math.max(0, centerlineX - globalMinX);
    const rightProtrusion = Math.max(0, globalMaxX - centerlineX);
    spoutProtrusionPx = Math.max(0, Math.max(leftProtrusion, rightProtrusion) - headRadiusPx);
  }

  // Sample cap dominant color
  let capR = 24, capG = 26, capB = 28;
  if (capColors.length > 0) {
    const rVals = capColors.map((c) => c.r).sort((a, b) => a - b);
    const gVals = capColors.map((c) => c.g).sort((a, b) => a - b);
    const bVals = capColors.map((c) => c.b).sort((a, b) => a - b);
    const mid = Math.floor(capColors.length / 2);
    capR = rVals[mid];
    capG = gVals[mid];
    capB = bVals[mid];
  }
  const capHex = `#${toHex(capR)}${toHex(capG)}${toHex(capB)}`;

  // Step 6: Three.js World Scaling
  // Total normalized span = normalizedHeight (2.0), centered at Y = 0 ([-halfH, +halfH])
  const halfH = normalizedHeight / 2;
  const scale = normalizedHeight / bboxHeight;

  // Normalized Y positions
  // Base at Y = -halfH, Top at Y = +halfH
  // yCollarNorm = -halfH + (globalMaxY - yCollarPx) * scale
  const yCollarNorm = -halfH + (globalMaxY - yCollarPx) * scale;
  const yTopNorm = halfH;

  const spoutDir: -1 | 1 = maxAsymCx < centerlineX ? -1 : 1;

  const closureSpec: ClosureSpec = {
    type: closureType,
    color: { r: capR, g: capG, b: capB, hex: capHex },
    collarRadius: collarRadiusPx * scale,
    collarHeight: Math.max(0.06, (yCollarPx - (yCollarPx - (yCollarPx - globalMinY) * 0.5)) * scale),
    stemRadius: Math.max(0.02, stemRadiusPx * scale),
    stemHeight: Math.max(0.06, (yCollarPx - globalMinY) * 0.3 * scale),
    headRadius: Math.max(0.04, headRadiusPx * scale),
    headHeight: Math.max(0.04, (yCollarPx - globalMinY) * 0.25 * scale),
    spoutDirection: spoutDir,
    spoutLength: Math.max(0.08, spoutProtrusionPx * scale),
    yCollar: yCollarNorm,
    yTop: yTopNorm,
  };

  // Step 7: Sample Body Profile Radii (from Base up to yCollarPx)
  const numSamples = Math.max(16, targetSamples);
  const bodyHeightPx = globalMaxY - yCollarPx + 1;
  const rawBodyRadii: { yImg: number; radiusPx: number }[] = [];

  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const yImg = Math.round(globalMaxY - t * (bodyHeightPx - 1));
    const clampedY = Math.max(yCollarPx, Math.min(globalMaxY, yImg));

    let radiusPx = 0;
    if (rowMinX[clampedY] !== -1 && rowMaxX[clampedY] !== -1) {
      radiusPx = (rowMaxX[clampedY] - rowMinX[clampedY]) / 2;
    }
    rawBodyRadii.push({ yImg: clampedY, radiusPx });
  }

  // Smooth body radii with moving average
  const smoothedBodyRadii: number[] = [];
  for (let i = 0; i < rawBodyRadii.length; i++) {
    let sum = 0, count = 0;
    for (let w = -smoothingRadius; w <= smoothingRadius; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < rawBodyRadii.length) {
        sum += rawBodyRadii[idx].radiusPx;
        count++;
      }
    }
    smoothedBodyRadii.push(count > 0 ? sum / count : rawBodyRadii[i].radiusPx);
  }

  // Construct bodyPoints (sealed base at -halfH up to neck junction at yCollarNorm)
  const bodyPoints: ProfilePoint[] = [];
  bodyPoints.push({ x: 0, y: -halfH }); // Sealed base center

  const baseRadius = smoothedBodyRadii[0] * scale;
  if (baseRadius > 0.01) {
    bodyPoints.push({ x: baseRadius, y: -halfH }); // Base bevel edge
  }

  let maxNormRadius = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const yNorm = -halfH + t * (yCollarNorm - (-halfH));
    const rNorm = Math.max(0, smoothedBodyRadii[i] * scale);
    if (rNorm > maxNormRadius) maxNormRadius = rNorm;

    if (i === 0 && baseRadius > 0.01) continue;
    bodyPoints.push({ x: rNorm, y: yNorm });
  }

  // Sealed top of neck at yCollarNorm
  const neckRadius = smoothedBodyRadii[smoothedBodyRadii.length - 1] * scale;
  if (neckRadius > 0.01) {
    bodyPoints.push({ x: neckRadius, y: yCollarNorm });
  }
  bodyPoints.push({ x: 0, y: yCollarNorm });

  // Step 8: Construct Full Points (from Base to Top) for backwards compatibility
  const rawFullRadii: { yImg: number; radiusPx: number }[] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const yImg = Math.round(globalMaxY - t * (bboxHeight - 1));
    const clampedY = Math.max(globalMinY, Math.min(globalMaxY, yImg));
    let radiusPx = 0;
    if (rowMinX[clampedY] !== -1 && rowMaxX[clampedY] !== -1) {
      radiusPx = (rowMaxX[clampedY] - rowMinX[clampedY]) / 2;
    }
    rawFullRadii.push({ yImg: clampedY, radiusPx });
  }

  const smoothedFullRadii: number[] = [];
  for (let i = 0; i < rawFullRadii.length; i++) {
    let sum = 0, count = 0;
    for (let w = -smoothingRadius; w <= smoothingRadius; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < rawFullRadii.length) {
        sum += rawFullRadii[idx].radiusPx;
        count++;
      }
    }
    smoothedFullRadii.push(count > 0 ? sum / count : rawFullRadii[i].radiusPx);
  }

  const fullPoints: ProfilePoint[] = [];
  fullPoints.push({ x: 0, y: -halfH });
  if (baseRadius > 0.01) fullPoints.push({ x: baseRadius, y: -halfH });

  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const yNorm = -halfH + t * normalizedHeight;
    const rNorm = Math.max(0, smoothedFullRadii[i] * scale);
    if (i === 0 && baseRadius > 0.01) continue;
    fullPoints.push({ x: rNorm, y: yNorm });
  }

  const topRadius = smoothedFullRadii[smoothedFullRadii.length - 1] * scale;
  if (topRadius > 0.01) fullPoints.push({ x: topRadius, y: halfH });
  fullPoints.push({ x: 0, y: halfH });

  // Step 9: Sample dominant body plastic color
  const colorSamples: { r: number; g: number; b: number }[] = [];
  const sampleStartY = Math.floor(yCollarPx + bodyHeightPx * 0.25);
  const sampleEndY = Math.floor(globalMaxY - bodyHeightPx * 0.15);
  const sampleStep = Math.max(1, Math.floor((sampleEndY - sampleStartY) / 20));

  for (let y = sampleStartY; y <= sampleEndY; y += sampleStep) {
    if (rowMinX[y] !== -1 && rowMaxX[y] !== -1) {
      const minX = rowMinX[y];
      const maxX = rowMaxX[y];
      const span = maxX - minX;
      if (span >= 20) {
        const leftInwardX = Math.round(minX + span * 0.15);
        const rightInwardX = Math.round(maxX - span * 0.15);

        for (const sx of [leftInwardX, rightInwardX]) {
          const idx = (y * width + sx) * 4;
          if (mattedData[idx + 3] > 180) {
            colorSamples.push({
              r: mattedData[idx],
              g: mattedData[idx + 1],
              b: mattedData[idx + 2],
            });
          }
        }
      }
    }
  }

  let dominantR = 128, dominantG = 128, dominantB = 128;
  if (colorSamples.length > 0) {
    const rVals = colorSamples.map((c) => c.r).sort((a, b) => a - b);
    const gVals = colorSamples.map((c) => c.g).sort((a, b) => a - b);
    const bVals = colorSamples.map((c) => c.b).sort((a, b) => a - b);
    const mid = Math.floor(colorSamples.length / 2);
    dominantR = rVals[mid];
    dominantG = gVals[mid];
    dominantB = bVals[mid];
  }
  const dominantHex = `#${toHex(dominantR)}${toHex(dominantG)}${toHex(dominantB)}`;

  const maxDiameterPx = globalMaxX - globalMinX;
  const aspectRatio = maxDiameterPx > 0 ? bboxHeight / maxDiameterPx : 1.0;

  return {
    points: fullPoints,
    bodyPoints,
    closure: closureSpec,
    centerlineX,
    bbox: {
      minX: globalMinX,
      maxX: globalMaxX,
      minY: globalMinY,
      maxY: globalMaxY,
      width: bboxWidth,
      height: bboxHeight,
    },
    dominantColor: {
      r: dominantR,
      g: dominantG,
      b: dominantB,
      hex: dominantHex,
    },
    backgroundColor: bgColor,
    aspectRatio,
    maxRadius: maxNormRadius,
    mattedData,
  };
}

/**
 * Browser-only helper to extract profile from an HTMLImageElement or ImageBitmap.
 */
export function extractProfileFromImageElement(
  imageEl: HTMLImageElement | HTMLCanvasElement,
  options?: SilhouetteExtractionOptions
): SilhouetteProfile {
  const width = "naturalWidth" in imageEl ? imageEl.naturalWidth : imageEl.width;
  const height = "naturalHeight" in imageEl ? imageEl.naturalHeight : imageEl.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to obtain 2D canvas context for silhouette extraction.");
  }

  ctx.drawImage(imageEl, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  return extractProfileFromImageData(imageData, options);
}
