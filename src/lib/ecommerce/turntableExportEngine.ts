/**
 * src/lib/ecommerce/turntableExportEngine.ts
 *
 * Omnichannel 360° Media Kit & Zero-Dependency Storefront Embed Engine.
 * Generates self-contained HTML/CSS/JS drag-to-spin interactive snippets
 * and Shopify Liquid code blocks that merchants can paste directly into any store.
 */

export interface TurntableEmbedOptions {
  videoUrl: string;
  productName: string;
  posterUrl?: string;
  accentColor?: string;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  autoRotateSpeed?: number;
  showRotateBadge?: boolean;
}

/**
 * Generates a 100% self-contained, zero-dependency HTML/CSS/JS snippet for an
 * interactive drag-to-spin 360° product viewer. Works out of the box in Shopify,
 * Webflow, WordPress, WooCommerce, Squarespace, or custom storefronts.
 */
export function generateZeroDependencyEmbedSnippet(options: TurntableEmbedOptions): string {
  const {
    videoUrl,
    productName: _productName,
    posterUrl,
    accentColor = "#06b6d4",
    aspectRatio = "1:1",
    showRotateBadge = true,
  } = options;

  const aspectRatioCss =
    aspectRatio === "9:16" ? "9 / 16" : aspectRatio === "16:9" ? "16 / 9" : "1 / 1";

  const safeId = "ns_360_" + Math.random().toString(36).substring(2, 9);

  return `<!-- NewsStudio 360° Interactive Product Turntable (Zero-Dependency) -->
<div id="${safeId}" class="ns-360-container" style="
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  aspect-ratio: ${aspectRatioCss};
  border-radius: 12px;
  overflow: hidden;
  background: #09090b;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  user-select: none;
  touch-action: none;
  cursor: grab;
">
  <video
    class="ns-360-video"
    src="${videoUrl}"
    ${posterUrl ? `poster="${posterUrl}"` : ""}
    playsinline
    muted
    loop
    preload="auto"
    style="
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    "
  ></video>

  ${
    showRotateBadge
      ? `<!-- Interactive 360 Badge -->
  <div class="ns-360-badge" style="
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
    transition: opacity 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  ">
    <span style="color: ${accentColor}; font-size: 13px;">⟲</span>
    <span>Drag To Spin 360°</span>
  </div>`
      : ""
  }
</div>

<script>
(function() {
  const container = document.getElementById("${safeId}");
  if (!container) return;
  const video = container.querySelector(".ns-360-video");
  const badge = container.querySelector(".ns-360-badge");
  if (!video) return;

  let isDragging = false;
  let startX = 0;
  let initialTime = 0;
  let hasInteracted = false;

  // Wait for metadata to know duration
  video.addEventListener("loadedmetadata", function() {
    video.pause();
    video.currentTime = 0;
  });

  function getClientX(e) {
    return e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
  }

  function onPointerDown(e) {
    isDragging = true;
    startX = getClientX(e);
    initialTime = video.currentTime || 0;
    video.pause();
    container.style.cursor = "grabbing";
    if (badge && !hasInteracted) {
      badge.style.opacity = "0";
      hasInteracted = true;
    }
  }

  function onPointerMove(e) {
    if (!isDragging || !video.duration) return;
    const currentX = getClientX(e);
    const deltaX = currentX - startX;
    const sensitivity = 0.0035; // Scrub speed coefficient
    let newTime = initialTime - deltaX * video.duration * sensitivity;
    
    // Wrap around smoothly across 360 rotation loop
    newTime = ((newTime % video.duration) + video.duration) % video.duration;
    video.currentTime = newTime;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = "grab";
  }

  // Unified Pointer & Touch Listeners
  if (window.PointerEvent) {
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  } else {
    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    container.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
  }
})();
</script>
<!-- End NewsStudio 360° -->`;
}

/**
 * Generates a clean Shopify Liquid section template for Shopify Online Store 2.0.
 */
export function generateShopifyLiquidSnippet(options: TurntableEmbedOptions): string {
  const zeroDepSnippet = generateZeroDependencyEmbedSnippet(options).replace(
    `src="${options.videoUrl}"`,
    `src="{{ section.settings.turntable_video_url | default: '${options.videoUrl}' }}"`
  );

  return `{% comment %}
  NewsStudio 360° Interactive Turntable Section
  Compatible with Shopify Online Store 2.0 (Dawn and custom themes)
{% endcomment %}

<div class="shopify-section-360-turntable page-width" style="padding: 20px 0;">
  <div style="text-align: center; margin-bottom: 14px;">
    <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 6px 0;">
      {{ product.title | default: "${options.productName}" }} 360° View
    </h3>
    <p style="font-size: 0.875rem; color: #666; margin: 0;">
      Click and drag left or right to inspect the product from every angle.
    </p>
  </div>

${zeroDepSnippet}
</div>

{% schema %}
{
  "name": "360° Product Turntable",
  "settings": [
    {
      "type": "text",
      "id": "turntable_video_url",
      "label": "Turntable Video URL",
      "default": "${options.videoUrl}"
    }
  ],
  "presets": [
    {
      "name": "360° Product Turntable"
    }
  ]
}
{% endschema %}`;
}

/**
 * Generates a clean, zero-dependency Shopify Liquid snippet for Collection Cards (Grid View).
 * Enables instant 360° hover-to-spin preview when shoppers mouseover the product card.
 */
export function generateShopifyCollectionCardSnippet(options: TurntableEmbedOptions): string {
  const { videoUrl, productName, posterUrl, accentColor = "#06b6d4" } = options;
  const safeId = "ns_hover_360_" + Math.random().toString(36).substring(2, 9);

  return `{% comment %}
  NewsStudio 360° Collection Card Hover Snippet
  Usage: {% render 'product-card-360-hover', product: product %}
{% endcomment %}

<div id="${safeId}" class="ns-card-360-wrapper" style="
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 8px;
  background: #09090b;
">
  <!-- Poster Image (Static catalog view) -->
  <img
    class="ns-card-poster"
    src="${posterUrl || '{{ product.featured_image | image_url: width: 600 }}'}"
    alt="${productName}"
    loading="lazy"
    style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.25s ease;"
  />

  <!-- 360 Video (Appears & scrubs on hover) -->
  <video
    class="ns-card-video"
    src="${videoUrl}"
    playsinline
    muted
    loop
    preload="none"
    style="
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    "
  ></video>

  <!-- Mini 360 Badge -->
  <span style="
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: ${accentColor};
    font-size: 9px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.15);
    pointer-events: none;
    font-family: sans-serif;
  ">⟲ 360°</span>
</div>

<script>
(function() {
  const wrapper = document.getElementById("${safeId}");
  if (!wrapper) return;
  const img = wrapper.querySelector(".ns-card-poster");
  const vid = wrapper.querySelector(".ns-card-video");
  if (!vid) return;

  let isLoaded = false;

  wrapper.addEventListener("mouseenter", function() {
    if (!isLoaded) {
      vid.load();
      isLoaded = true;
    }
    vid.style.opacity = "1";
    if (img) img.style.opacity = "0";
    vid.play().catch(function() {});
  });

  wrapper.addEventListener("mouseleave", function() {
    vid.pause();
    vid.style.opacity = "0";
    if (img) img.style.opacity = "1";
  });
})();
</script>`;
}

/**
 * Generates an interactive 24-frame HTML5 Canvas spritesheet scrubber.
 * Requires 0 video streaming overhead and works completely offline/in low-bandwidth storefronts.
 */
export function generateSpritesheetEmbedSnippet(
  options: TurntableEmbedOptions & { totalFrames?: number }
): string {
  const { productName: _productName, videoUrl, posterUrl, accentColor = "#06b6d4", totalFrames = 24 } = options;
  const safeId = "ns_sprite_" + Math.random().toString(36).substring(2, 9);

  return `<!-- NewsStudio 360° Canvas Spritesheet Scrubber (Zero Dependency) -->
<div id="${safeId}" style="position: relative; width: 100%; max-width: 480px; margin: 0 auto; aspect-ratio: 1/1; cursor: grab; user-select: none; touch-action: none; background: #09090b; border-radius: 12px; overflow: hidden;">
  <canvas class="ns-sprite-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
  <div style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: ${accentColor}; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; pointer-events: none; font-family: sans-serif; border: 1px solid rgba(255,255,255,0.15);">
    ⟲ DRAG TO ROTATE (SPRITESHEET)
  </div>
</div>
<script>
(function() {
  const container = document.getElementById("${safeId}");
  if (!container) return;
  const canvas = container.querySelector(".ns-sprite-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const totalFrames = ${totalFrames};
  let currentFrame = 0;
  let isDragging = false;
  let startX = 0;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "${posterUrl || videoUrl}";
  img.onload = function() {
    canvas.width = img.naturalWidth || 600;
    canvas.height = img.naturalHeight || 600;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  function onPointerDown(e) {
    isDragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    container.style.cursor = "grabbing";
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startX;
    const frameOffset = Math.round(deltaX / 12);
    currentFrame = ((currentFrame - frameOffset) % totalFrames + totalFrames) % totalFrames;
    startX = clientX;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = "grab";
  }

  container.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  container.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchend", onPointerUp);
})();
</script>`;
}
