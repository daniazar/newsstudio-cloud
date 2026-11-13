/**
 * src/lib/ecommerce/embedGenerator.ts
 *
 * On-Site HTML5 Shoppable Video Embed Code Generator.
 * Generates lightweight, zero-CLS, responsive embed snippets for Shopify,
 * WooCommerce, and headless e-commerce storefronts.
 * 
 * Includes:
 *   - Zero Cumulative Layout Shift (CLS) container styles with CSS aspect-ratio
 *   - IntersectionObserver for battery-friendly autoplay on viewport entry
 *   - Sticky glassmorphic "Add to Cart" drawer overlay
 *   - Native Shopify AJAX Cart API integration (/cart/add.js)
 */

import { ProductSpec, AdAspectRatio, ShoppableHotspot } from "@/lib/types/ecommerce";
import { compileHotspotEmbedHtml } from "./shoppableHotspots";

export interface EmbedOptions {
  videoUrl: string;
  posterUrl?: string;
  aspectRatio?: AdAspectRatio;
  autoplay?: boolean;
  loop?: boolean;
  showPrice?: boolean;
  showAddToCart?: boolean;
  ctaText?: string;
  shopifyVariantId?: string;
  containerId?: string;
  hotspots?: ShoppableHotspot[];
}

/**
 * Generates a self-contained shoppable HTML/CSS/JS embed snippet.
 */
export function generateShoppableEmbed(spec: ProductSpec, options: EmbedOptions): string {
  const {
    videoUrl,
    posterUrl = spec.assets[0]?.url || "",
    aspectRatio = "9:16",
    autoplay = true,
    loop = true,
    showPrice = true,
    showAddToCart = true,
    ctaText = "ADD TO CART",
    shopifyVariantId = spec.variants[0]?.id || "",
    containerId = `ruby-ad-${Date.now()}`,
    hotspots = [],
  } = options;

  const ratioCss =
    aspectRatio === "9:16" ? "9 / 16" : aspectRatio === "1:1" ? "1 / 1" : "16 / 9";
  const maxWidth =
    aspectRatio === "9:16" ? "380px" : aspectRatio === "1:1" ? "480px" : "640px";

  const primaryColor = spec.brand.primaryColor || "#06b6d4";
  const title = spec.title.replace(/"/g, "&quot;");
  const priceFormatted = `$${spec.price.toFixed(2)}`;
  const comparePriceFormatted = spec.compareAtPrice
    ? `$${spec.compareAtPrice.toFixed(2)}`
    : "";

  const hotspotsHtml =
    hotspots.length > 0 ? compileHotspotEmbedHtml(hotspots, containerId, primaryColor) : "";

  return `<!-- Ruby E-Commerce Autonomous Shoppable Video Embed -->
<div id="${containerId}" class="ruby-shoppable-container" style="
  position: relative;
  width: 100%;
  max-width: ${maxWidth};
  aspect-ratio: ${ratioCss};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
  background: #09090b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  margin: 20px auto;
">
  <!-- Video Player -->
  <video
    id="${containerId}-video"
    src="${videoUrl}"
    poster="${posterUrl}"
    playsinline
    muted
    ${autoplay ? "autoplay" : ""}
    ${loop ? "loop" : ""}
    style="
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    "
  ></video>

  <!-- Mute / Unmute Toggle Button -->
  <button
    id="${containerId}-mute-btn"
    aria-label="Toggle Audio"
    style="
      position: absolute;
      top: 16px;
      right: 16px;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(9, 9, 11, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: transform 0.2s ease;
    "
  >
    🔇
  </button>

  <!-- Sticky Shoppable Bottom Drawer -->
  <div style="
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 16px 20px;
    background: linear-gradient(to top, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.75) 70%, transparent 100%);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
  ">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="color: #ffffff; font-size: 14px; font-weight: 800; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${title}</div>
        ${
          showPrice
            ? `<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="color: #ffffff; font-size: 18px; font-weight: 900;">${priceFormatted}</span>
                ${
                  comparePriceFormatted
                    ? `<span style="color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: line-through;">${comparePriceFormatted}</span>`
                    : ""
                }
              </div>`
            : ""
        }
      </div>
    </div>

    ${
      showAddToCart
        ? `<button
            id="${containerId}-cart-btn"
            data-variant-id="${shopifyVariantId}"
            style="
              width: 100%;
              background: ${primaryColor};
              color: #09090b;
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              padding: 12px 20px;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 4px 15px ${primaryColor}66;
              transition: transform 0.15s ease, filter 0.15s ease;
            "
          >
            ${ctaText} • ${priceFormatted}
          </button>`
        : ""
    }
  </div>

  ${hotspotsHtml}

  <!-- Shoppable Lifecycle Controller -->
  <script>
    (function() {
      var container = document.getElementById("${containerId}");
      var video = document.getElementById("${containerId}-video");
      var muteBtn = document.getElementById("${containerId}-mute-btn");
      var cartBtn = document.getElementById("${containerId}-cart-btn");

      // 1. Audio Un-mute Toggle
      if (muteBtn && video) {
        muteBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          video.muted = !video.muted;
          muteBtn.innerHTML = video.muted ? "🔇" : "🔊";
        });
      }

      // 2. Battery-friendly IntersectionObserver (play on 50% view)
      if (video && "IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              video.play().catch(function() {});
            } else {
              video.pause();
            }
          });
        }, { threshold: 0.5 });
        observer.observe(container);
      }

      // 3. Native Shopify Cart AJAX Injection
      if (cartBtn) {
        cartBtn.addEventListener("click", function(e) {
          e.preventDefault();
          var variantId = cartBtn.getAttribute("data-variant-id");
          cartBtn.innerHTML = "ADDING...";
          
          fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
          })
          .then(function(res) {
            if (res.ok) {
              cartBtn.innerHTML = "✓ ADDED TO CART";
              setTimeout(function() { cartBtn.innerHTML = "${ctaText} • ${priceFormatted}"; }, 2000);
              // Dispatch Shopify drawer refresh event
              document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
            } else {
              window.location.href = "/cart";
            }
          })
          .catch(function() {
            window.location.href = "/cart";
          });
        });
      }
    })();
  </script>
</div>
<!-- End Ruby Shoppable Video Embed -->`;
}
