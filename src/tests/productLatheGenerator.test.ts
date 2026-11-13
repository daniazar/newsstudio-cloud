import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  extractProfileFromImageData,
  type RawImageData,
} from '@/lib/ecommerce/silhouetteExtractor';
import {
  alignLatheUVs,
  generateProductLatheMesh,
  bakeCylindricalTextureCanvas,
} from '@/lib/ecommerce/productLatheGenerator';

/** Helper to create a synthetic RGBA image buffer */
function createSyntheticBottleImage(
  width = 100,
  height = 200,
  bottleRadius = 25,
  neckRadius = 10,
  bottleColor = { r: 34, g: 139, b: 34 } // Forest Green
): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const centerX = width / 2;

  // Bottle body: bottom 65% (y from 70 to 190)
  // Neck: top 25% (y from 20 to 70)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let inside = false;

      if (y >= 70 && y <= 190) {
        // Body
        if (Math.abs(x - centerX) <= bottleRadius) inside = true;
      } else if (y >= 20 && y < 70) {
        // Neck
        if (Math.abs(x - centerX) <= neckRadius) inside = true;
      }

      if (inside) {
        data[idx] = bottleColor.r;
        data[idx + 1] = bottleColor.g;
        data[idx + 2] = bottleColor.b;
        data[idx + 3] = 255; // fully opaque
      } else {
        data[idx + 3] = 0; // transparent
      }
    }
  }

  return { data, width, height };
}

describe('SilhouetteExtractor', () => {
  it('detects bounding box, centerline, and extracts profile points', () => {
    const synthetic = createSyntheticBottleImage(100, 200, 25, 10);
    const profile = extractProfileFromImageData(synthetic, {
      alphaThreshold: 10,
      targetSamples: 32,
      normalizedHeight: 2.0,
    });

    expect(profile.bbox.minY).toBe(20);
    expect(profile.bbox.maxY).toBe(190);
    expect(profile.bbox.height).toBe(171);
    expect(profile.bbox.minX).toBe(25);
    expect(profile.bbox.maxX).toBe(75);
    expect(profile.centerlineX).toBeCloseTo(50, 1);

    // Sealed endpoints check
    expect(profile.points.length).toBeGreaterThan(30);
    const firstPoint = profile.points[0];
    const lastPoint = profile.points[profile.points.length - 1];

    // Base center (x = 0, y = -1.0)
    expect(firstPoint.x).toBe(0);
    expect(firstPoint.y).toBeCloseTo(-1.0, 3);

    // Top cap center (x = 0, y = 1.0)
    expect(lastPoint.x).toBe(0);
    expect(lastPoint.y).toBeCloseTo(1.0, 3);

    // Body radius should be wider than neck radius
    // Points are ordered bottom to top: bottom points correspond to body
    const bodyPoint = profile.points[5];
    const neckPoint = profile.points[profile.points.length - 5];
    expect(bodyPoint.x).toBeGreaterThan(neckPoint.x);
  });

  it('samples the dominant container body color accurately', () => {
    const greenColor = { r: 18, g: 120, b: 60 };
    const synthetic = createSyntheticBottleImage(100, 200, 25, 10, greenColor);
    const profile = extractProfileFromImageData(synthetic);

    expect(profile.dominantColor.r).toBe(greenColor.r);
    expect(profile.dominantColor.g).toBe(greenColor.g);
    expect(profile.dominantColor.b).toBe(greenColor.b);
    expect(profile.dominantColor.hex.toLowerCase()).toBe('#12783c');
  });

  it('throws an error on an empty / completely transparent image', () => {
    const emptyImage: RawImageData = {
      data: new Uint8ClampedArray(100 * 100 * 4),
      width: 100,
      height: 100,
    };

    expect(() => extractProfileFromImageData(emptyImage)).toThrow(
      'No opaque product pixels found'
    );
  });
});

describe('ProductLatheGenerator', () => {
  it('creates a valid Three.js LatheGeometry with unmirrored aligned UVs', () => {
    const synthetic = createSyntheticBottleImage(100, 200, 25, 10);
    const profile = extractProfileFromImageData(synthetic, { targetSamples: 20 });
    const points = profile.points.map((p) => new THREE.Vector2(p.x, p.y));

    const segments = 64;
    const geometry = new THREE.LatheGeometry(points, segments, -Math.PI, Math.PI * 2);
    alignLatheUVs(geometry, points.length, segments);

    const uvAttr = geometry.getAttribute('uv');
    expect(uvAttr).toBeDefined();

    // Check vertex UVs at key angles with phiStart = -Math.PI:
    // Segment 0:  phi = -pi   (Rear seam -Z)          -> u = 0.00
    // Segment 16: phi = -pi/2 (Screen Left -X)        -> u = 0.25
    // Segment 32: phi = 0     (Front Camera +Z)       -> u = 0.50
    // Segment 48: phi = +pi/2 (Screen Right +X)       -> u = 0.75
    // Segment 64: phi = +pi   (Rear seam -Z)          -> u = 1.00
    const numPoints = points.length;

    // Point 10 (mid-height)
    const midP = 10;
    const idxRear = 0 * numPoints + midP;
    const idxLeft = 16 * numPoints + midP;
    const idxFront = 32 * numPoints + midP;
    const idxRight = 48 * numPoints + midP;

    expect(uvAttr.getX(idxRear)).toBeCloseTo(0.00, 2);
    expect(uvAttr.getX(idxLeft)).toBeCloseTo(0.25, 2);
    expect(uvAttr.getX(idxFront)).toBeCloseTo(0.50, 2);
    expect(uvAttr.getX(idxRight)).toBeCloseTo(0.75, 2);

    // Front text direction check: Going from left (idxLeft) to right (idxRight), u increases monotonically
    expect(uvAttr.getX(idxFront)).toBeGreaterThan(uvAttr.getX(idxLeft));
    expect(uvAttr.getX(idxRight)).toBeGreaterThan(uvAttr.getX(idxFront));
  });

  it('generates a complete GeneratedProductMesh with PBR material', async () => {
    const synthetic = createSyntheticBottleImage(100, 200, 25, 10);
    const result = await generateProductLatheMesh(synthetic, {
      segments: 32,
      roughness: 0.25,
      metalness: 0.05,
    });

    expect(result.mesh).toBeDefined();
    expect(result.mesh.name).toMatch(/Product(Assembly|BodyMesh)/);
    expect(result.bodyMesh).toBeDefined();
    expect(result.geometry).toBeDefined();
    expect((result.material as THREE.MeshStandardMaterial).roughness).toBe(0.25);
    expect((result.material as THREE.MeshStandardMaterial).metalness).toBe(0.05);
    expect(result.profile).toBeDefined();

    const glbBlob = await result.exportGLB();
    expect(glbBlob).toBeDefined();
    expect(glbBlob.size).toBeGreaterThan(100);
    expect(glbBlob.type).toBe('model/gltf-binary');
  });

  it('auto-keys solid white studio background on opaque images', () => {
    // Create an opaque image with solid white background [254, 254, 254, 255]
    // and an olive green bottle [120, 140, 120, 255] in the center
    const width = 100;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isBottle = y >= 20 && y <= 180 && x >= 30 && x <= 70;
        if (isBottle) {
          data[idx] = 120;
          data[idx + 1] = 140;
          data[idx + 2] = 120;
          data[idx + 3] = 255;
        } else {
          data[idx] = 254;
          data[idx + 1] = 254;
          data[idx + 2] = 254;
          data[idx + 3] = 255; // Fully opaque white background
        }
      }
    }

    const profile = extractProfileFromImageData({ data, width, height });
    expect(profile.backgroundColor.wasKeyed).toBe(true);
    expect(profile.bbox.minX).toBe(30);
    expect(profile.bbox.maxX).toBe(70);
    expect(profile.bbox.minY).toBe(20);
    expect(profile.bbox.maxY).toBe(180);
    expect(profile.dominantColor.g).toBeGreaterThan(100);
  });

  it('bakes cylindrical texture map when 2D canvas is available', () => {
    const synthetic = createSyntheticBottleImage(100, 200, 25, 10);
    const profile = extractProfileFromImageData(synthetic);

    // Mock HTMLCanvasElement and 2D context
    const mockCtx = {
      fillStyle: '',
      fillRect: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      save: () => {},
      restore: () => {},
      drawImage: () => {},
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      }),
      putImageData: () => {},
    };

    const origCreateElement = document.createElement.bind(document);
    // @ts-expect-error Mocking canvas for testing
    document.createElement = (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockCtx,
        };
      }
      return origCreateElement(tag);
    };

    try {
      const canvas = bakeCylindricalTextureCanvas(synthetic, profile, {
        width: 1024,
        height: 512,
      });

      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(512);
    } finally {
      document.createElement = origCreateElement;
    }
  });

  it('detects pump closure with spout nozzle and creates multi-part 3D assembly', async () => {
    // Construct a bottle with body, neck, collar, stem, head, and nozzle spout pointing left
    const width = 120;
    const height = 240;
    const data = new Uint8ClampedArray(width * height * 4);
    const cx = 60;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let inside = false;

        if (y >= 90 && y <= 220) {
          // Body (radius 30)
          if (Math.abs(x - cx) <= 30) inside = true;
        } else if (y >= 65 && y < 90) {
          // Neck constriction (radius 10)
          if (Math.abs(x - cx) <= 10) inside = true;
        } else if (y >= 45 && y < 65) {
          // Collar (radius 14)
          if (Math.abs(x - cx) <= 14) inside = true;
        } else if (y >= 30 && y < 45) {
          // Stem (radius 6)
          if (Math.abs(x - cx) <= 6) inside = true;
        } else if (y >= 18 && y <= 24 && x >= 20 && x <= cx) {
          // Spout extending left to x = 20
          inside = true;
        } else if (y >= 15 && y < 30) {
          // Head (radius 10)
          if (Math.abs(x - cx) <= 10) inside = true;
        }

        if (inside) {
          data[idx] = 18;
          data[idx + 1] = 20;
          data[idx + 2] = 24;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    const profile = extractProfileFromImageData({ data, width, height });
    expect(profile.closure.type).toBe('pump');
    expect(profile.closure.spoutDirection).toBe(-1); // Points left
    expect(profile.closure.collarRadius).toBeGreaterThan(0);
    expect(profile.closure.stemRadius).toBeGreaterThan(0);
    expect(profile.closure.spoutLength).toBeGreaterThan(0);

    const result = await generateProductLatheMesh({ data, width, height });
    expect(result.closureMesh).toBeDefined();
    expect(result.mesh.children.length).toBeGreaterThan(1); // Body + Closure Assembly
  });
});
