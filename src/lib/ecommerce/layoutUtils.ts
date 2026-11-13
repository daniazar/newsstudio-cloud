import { AdCanvasLayoutConfig,DEFAULT_CANVAS_LAYOUT,applyIntegralLayout } from "@/lib/ecommerce/layoutTemplates";

export function applyLayoutTemplateToCanvas(
  layoutConfig?: AdCanvasLayoutConfig,
  templateId?: string
): AdCanvasLayoutConfig {
  if (!templateId) return layoutConfig || DEFAULT_CANVAS_LAYOUT;
  return applyIntegralLayout(templateId);
}

export function resetLayerPositions(
  layoutConfig?: AdCanvasLayoutConfig,
  targetLayerId?: string
): AdCanvasLayoutConfig {
  const baseLayout = layoutConfig || DEFAULT_CANVAS_LAYOUT;
  if (!targetLayerId) {
    return { ...DEFAULT_CANVAS_LAYOUT };
  }

  const updated: AdCanvasLayoutConfig = JSON.parse(JSON.stringify(baseLayout));

  if (targetLayerId === "caption" && updated.caption) {
    updated.caption.offsetX = 0;
    updated.caption.offsetY = 0;
    updated.caption.scale = 1;
  } else if (targetLayerId === "headline" && updated.headline) {
    updated.headline.offsetX = 0;
    updated.headline.offsetY = 0;
    updated.headline.scale = 1;
  } else if (targetLayerId === "product" && updated.product) {
    updated.product.offsetX = 0;
    updated.product.offsetY = 0;
    updated.product.scale = 1;
  }
  return updated;
}

export function calculateGizmoTransforms(
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 1
): { transform: string; x: number; y: number; scale: number } {
  return {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    x: offsetX,
    y: offsetY,
    scale,
  };
}
