/**
 * src/lib/ecommerce/shoppableHotspots.ts
 *
 * Interactive Shoppable Hotspot & Web Video Embed Engine.
 * Generates coordinate-positioned interactive product pins, time-synchronized
 * Remotion broadcast overlays, and HTML5 on-site embed interactive markup.
 */

import {
  ProductSpec,
  ShoppableHotspot,
  ShoppableHotspotsConfig,
} from "@/lib/types/ecommerce";

/**
 * Automatically synthesizes 2-3 contextual hotspot pins based on product variants or USP bullet points.
 */
export function generateDefaultHotspots(productSpec: ProductSpec): ShoppableHotspotsConfig {
  const brandColor = productSpec.brand?.primaryColor || "#06b6d4";
  const hotspots: ShoppableHotspot[] = [];

  const heroAssetUrl =
    productSpec.assets?.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
    productSpec.assets?.[0]?.url ||
    "/placeholder_product.png";

  if (productSpec.variants && productSpec.variants.length > 0) {
    // Generate pins mapped to product variants
    const defaultCoords = [
      { x: 65, y: 36, startFrame: 90, durationFrames: 180 },  // Scene 2 (3s - 9s)
      { x: 34, y: 56, startFrame: 180, durationFrames: 180 }, // Scene 3 (6s - 12s)
      { x: 70, y: 68, startFrame: 270, durationFrames: 180 }, // Scene 4 (9s - 15s)
    ];

    productSpec.variants.slice(0, 3).forEach((variant, idx) => {
      const coords = defaultCoords[idx] || { x: 50, y: 50, startFrame: 90, durationFrames: 180 };
      hotspots.push({
        id: `hotspot_var_${variant.id || idx}`,
        variantId: variant.id,
        title: variant.title,
        price: variant.price || productSpec.price,
        compareAtPrice: variant.compareAtPrice || productSpec.compareAtPrice,
        imageUrl: variant.imageUrl || heroAssetUrl,
        x: coords.x,
        y: coords.y,
        startFrame: coords.startFrame,
        durationFrames: coords.durationFrames,
        pulseColor: brandColor,
        calloutText: variant.title,
      });
    });
  } else {
    // Generate pins mapped to bullet points / features
    const bullets =
      productSpec.bulletPoints && productSpec.bulletPoints.length > 0
        ? productSpec.bulletPoints
        : ["Premium Engineering", "Precision Durability"];
    const featureCoords = [
      { x: 58, y: 38, startFrame: 90, durationFrames: 180 },
      { x: 38, y: 54, startFrame: 180, durationFrames: 180 },
    ];

    bullets.slice(0, 2).forEach((bullet, idx) => {
      const coords = featureCoords[idx] || { x: 50, y: 50, startFrame: 90, durationFrames: 180 };
      hotspots.push({
        id: `hotspot_feat_${idx}`,
        title: bullet.slice(0, 32),
        price: productSpec.price,
        compareAtPrice: productSpec.compareAtPrice,
        imageUrl: heroAssetUrl,
        x: coords.x,
        y: coords.y,
        startFrame: coords.startFrame,
        durationFrames: coords.durationFrames,
        pulseColor: brandColor,
        calloutText: bullet.slice(0, 28),
      });
    });
  }

  return {
    enabled: true,
    hotspots,
    showCardOnHover: true,
  };
}

/**
 * Returns which hotspots are currently visible at the given video frame.
 */
export function computeActiveHotspots(
  hotspots: ShoppableHotspot[],
  currentFrame: number
): ShoppableHotspot[] {
  return hotspots.filter((h) => {
    const start = h.startFrame ?? 0;
    const duration = h.durationFrames ?? 99999;
    return currentFrame >= start && currentFrame < start + duration;
  });
}

/**
 * Generates HTML/CSS/JS code snippet for interactive time-synced hotspots in the HTML5 video embed.
 */
export function compileHotspotEmbedHtml(
  hotspots: ShoppableHotspot[],
  containerId: string,
  primaryColor = "#06b6d4",
  fps = 30
): string {
  if (!hotspots || hotspots.length === 0) return "";

  const hotspotsJson = JSON.stringify(
    hotspots.map((h) => ({
      id: h.id,
      variantId: h.variantId || "",
      title: h.title,
      price: h.price ? `$${h.price.toFixed(2)}` : "",
      comparePrice: h.compareAtPrice ? `$${h.compareAtPrice.toFixed(2)}` : "",
      imageUrl: h.imageUrl || "",
      callout: h.calloutText || h.title,
      x: h.x,
      y: h.y,
      startSec: (h.startFrame ?? 0) / fps,
      endSec: ((h.startFrame ?? 0) + (h.durationFrames ?? 180)) / fps,
      color: h.pulseColor || primaryColor,
    }))
  );

  return `
  <!-- Ruby Shoppable Hotspot Pins Layer -->
  <div id="${containerId}-hotspots-layer" style="position: absolute; inset: 0; pointer-events: none; z-index: 15;"></div>

  <style>
    @keyframes ruby-pulse-wave {
      0% { transform: scale(0.95); opacity: 0.85; box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7); }
      70% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 0 14px rgba(6, 182, 212, 0); }
      100% { transform: scale(0.95); opacity: 0.85; box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
    }
    .ruby-hotspot-pin {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
      animation: ruby-pulse-wave 2s infinite ease-in-out;
      backdrop-filter: blur(8px);
      z-index: 20;
    }
    .ruby-hotspot-pin:hover {
      transform: translate(-50%, -50%) scale(1.25);
    }
    .ruby-hotspot-tag {
      position: absolute;
      left: 36px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(10, 10, 14, 0.92);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 6px 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .ruby-hotspot-tag:hover {
      background: rgba(18, 18, 24, 0.98);
      border-color: ${primaryColor};
    }
  </style>

  <script>
    (function() {
      var container = document.getElementById("${containerId}");
      var video = document.getElementById("${containerId}-video");
      var layer = document.getElementById("${containerId}-hotspots-layer");
      var hotspots = ${hotspotsJson};

      if (!video || !layer) return;

      function renderHotspots(currentTime) {
        layer.innerHTML = "";
        hotspots.forEach(function(h) {
          if (currentTime >= h.startSec && currentTime <= h.endSec) {
            var pin = document.createElement("div");
            pin.className = "ruby-hotspot-pin";
            pin.style.left = h.x + "%";
            pin.style.top = h.y + "%";
            pin.style.backgroundColor = h.color;
            pin.style.boxShadow = "0 0 18px " + h.color;
            pin.innerHTML = '<span style="color:#09090b; font-size:14px; font-weight:900; line-height:1;">+</span>';

            var tag = document.createElement("div");
            tag.className = "ruby-hotspot-tag";
            tag.innerHTML = '<span style="color:#ffffff; font-size:11px; font-weight:800;">' + h.callout + '</span>' +
              (h.price ? '<span style="color:' + h.color + '; font-size:11px; font-weight:900;">' + h.price + '</span>' : '');

            pin.appendChild(tag);

            // On click, trigger quick-buy or select variant
            pin.addEventListener("click", function(e) {
              e.stopPropagation();
              var cartBtn = document.getElementById("${containerId}-cart-btn");
              if (cartBtn && h.variantId) {
                cartBtn.setAttribute("data-variant-id", h.variantId);
                cartBtn.click();
              }
            });

            layer.appendChild(pin);
          }
        });
      }

      video.addEventListener("timeupdate", function() {
        renderHotspots(video.currentTime);
      });
    })();
  </script>
  `;
}
