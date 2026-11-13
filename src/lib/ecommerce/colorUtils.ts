/**
 * src/lib/ecommerce/colorUtils.ts
 *
 * Pure, dependency-free color calculation utilities.
 * Safe for use in browser bundles, Remotion compositions, and Node.js environments.
 */

/**
 * Calculates readable text color (dark #09090b or light #ffffff)
 * based on the background color's perceived luminance (ITU-R BT.709).
 */
export function getContrastingTextColor(hexColor?: string): string {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "").trim();
  if (hex.length !== 6 && hex.length !== 3) return "#ffffff";
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.48 ? "#09090b" : "#ffffff";
}
