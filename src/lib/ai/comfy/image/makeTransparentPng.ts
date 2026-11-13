/**
 * Transparent RGBA PNG Processor (Converts solid studio background to true 32-bit Alpha Channel)
 */
export async function makeTransparentPng(
  inputPath: string,
  outputPath: string,
  _depthMapPath?: string,
  _isStanding = false,
): Promise<string> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const pixels = width * height;

  // 1. Detect top-most persona hair Y boundary in center 60% of frame (x between width*0.2 and width*0.8)
  let minPersonaY = height;
  for (let y = 60; y < height; y++) {
    for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (r < 240 || g < 240 || b < 240 || sat > 12) {
        minPersonaY = y;
        break;
      }
    }
    if (minPersonaY < height) break;
  }

  // Force 100% transparent for ALL rows y < minPersonaY - 5 (Guarantees removal of studio ceiling lighting rig!)
  for (let y = 0; y < Math.max(0, minPersonaY - 5); y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = 0;
    }
  }

  // Detect background type from top corners
  const cornerR = (data[0] + data[width * 4 - 4]) / 2;
  const isDarkBg = cornerR < 50;

  // 2. BFS Flood Fill (Seeds outer borders + cavities)
  const visited = new Uint8Array(pixels);
  const queue: number[] = [];

  // Seed top background space
  for (let x = 0; x < width; x += 5) {
    queue.push(x, 0);
    visited[x] = 1;
  }

  // Seed bottom studio floor edge for floor removal
  for (let x = 0; x < width; x += 5) {
    const pBottom = (height - 1) * width + x;
    if (!visited[pBottom]) {
      queue.push(x, height - 1);
      visited[pBottom] = 1;
    }
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = (y * width + x) * 4;

    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);

    const isFloorZone = y >= height * 0.82;
    const isStudioBg = isDarkBg
      ? (r <= 10 && g <= 10 && b <= 10)
      : ((r >= 210 && g >= 210 && b >= 210 && sat <= 24) || (isFloorZone && r >= 170 && g >= 170 && b >= 170 && sat <= 30));

    if (isStudioBg) {
      data[idx + 3] = 0; // Clear background & studio floor to 100% Transparent

      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nPos = ny * width + nx;
          if (!visited[nPos]) {
            visited[nPos] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // 3. Guided Alpha Border Defringing
  for (let pass = 0; pass < 3; pass++) {
    const alphaCopy = new Uint8Array(pixels);
    for (let i = 0; i < pixels; i++) alphaCopy[i] = data[i * 4 + 3];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pos = y * width + x;
        const idx = pos * 4;

        if (alphaCopy[pos] > 0) {
          const neighbors = [pos - 1, pos + 1, pos - width, pos + width];
          let isEdge = false;
          for (const np of neighbors) {
            if (alphaCopy[np] === 0) {
              isEdge = true;
              break;
            }
          }

          if (isEdge) {
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            const avgLum = (r + g + b) / 3;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);

            if (isDarkBg) {
              if (avgLum < 20) data[idx + 3] = 0;
              else if (avgLum < 30) data[idx + 3] = Math.round(alphaCopy[pos] * 0.4);
            } else {
              if (avgLum > 195 && sat < 25) {
                data[idx + 3] = 0;
              } else if (avgLum > 165 && sat < 30) {
                data[idx + 3] = Math.round(alphaCopy[pos] * 0.3);
              }
            }
          }
        }
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  return outputPath;
}
