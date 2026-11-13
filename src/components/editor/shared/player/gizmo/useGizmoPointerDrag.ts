/**
 * src/components/editor/shared/player/gizmo/useGizmoPointerDrag.ts
 *
 * Hook managing pointer dragging, scaling calculations, and RAF throttling
 * for canvas gizmo elements.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { DragAction, SelectedGizmoElement } from "./types";

interface UseGizmoPointerDragProps {
  compWidth: number;
  compHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setSelected: (elem: SelectedGizmoElement) => void;
  onUpdatePresenter?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onUpdateCaptionOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onUpdateHeadlineOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onUpdateProductOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onUpdateBadgeOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onUpdatePricePromoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onUpdateCtaOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onUpdateTickerTapeOffsets?: (patch: { offsetY?: number }) => void;
  onUpdateBrandLogoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onUpdateFeaturePillsOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onUpdateReviewCardOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onCommitChanges?: () => void;
}

export function useGizmoPointerDrag({
  compWidth,
  compHeight,
  containerRef,
  setSelected,
  onUpdatePresenter,
  onUpdateCaptionOffsets,
  onUpdateHeadlineOffsets,
  onUpdateProductOffsets,
  onUpdateBadgeOffsets,
  onUpdatePricePromoOffsets,
  onUpdateCtaOffsets,
  onUpdateTickerTapeOffsets,
  onUpdateBrandLogoOffsets,
  onUpdateFeaturePillsOffsets,
  onUpdateReviewCardOffsets,
  onCommitChanges,
}: UseGizmoPointerDragProps) {
  const [dragAction, setDragAction] = useState<DragAction>("none");
  const dragActionRef = useRef<DragAction>("none");

  // Cache drag parameters & coordinate scaling to avoid calling getBoundingClientRect() inside RAF loop
  const dragParamsRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
    startScale: number;
    scaleX: number;
    scaleY: number;
  }>({
    clientX: 0,
    clientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startScale: 1.0,
    scaleX: 1.0,
    scaleY: 1.0,
  });

  // Keep latest callbacks in ref to prevent closure churn
  const callbacksRef = useRef({
    setSelected,
    onUpdatePresenter,
    onUpdateCaptionOffsets,
    onUpdateHeadlineOffsets,
    onUpdateProductOffsets,
    onUpdateBadgeOffsets,
    onUpdatePricePromoOffsets,
    onUpdateCtaOffsets,
    onUpdateTickerTapeOffsets,
    onUpdateBrandLogoOffsets,
    onUpdateFeaturePillsOffsets,
    onUpdateReviewCardOffsets,
    onCommitChanges,
  });

  useEffect(() => {
    callbacksRef.current = {
      setSelected,
      onUpdatePresenter,
      onUpdateCaptionOffsets,
      onUpdateHeadlineOffsets,
      onUpdateProductOffsets,
      onUpdateBadgeOffsets,
      onUpdatePricePromoOffsets,
      onUpdateCtaOffsets,
      onUpdateTickerTapeOffsets,
      onUpdateBrandLogoOffsets,
      onUpdateFeaturePillsOffsets,
      onUpdateReviewCardOffsets,
      onCommitChanges,
    };
  });

  const rafIdRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handlePointerDown = (
    e: React.PointerEvent,
    action: DragAction,
    elem: SelectedGizmoElement,
    initialX: number,
    initialY: number,
    initialScale: number = 1.0,
    isLocked: boolean = false
  ) => {
    if (isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Measure bounding rect once on pointer-down
    const rect = containerRef.current?.getBoundingClientRect();
    const scaleX = rect && rect.width > 0 ? compWidth / rect.width : 1;
    const scaleY = rect && rect.height > 0 ? compHeight / rect.height : 1;

    dragParamsRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: initialX,
      startOffsetY: initialY,
      startScale: initialScale,
      scaleX,
      scaleY,
    };

    dragActionRef.current = action;
    setDragAction(action);
    callbacksRef.current.setSelected(elem);
  };

  const processPointerDelta = useCallback(
    (clientX: number, clientY: number) => {
      const currentAction = dragActionRef.current;
      if (currentAction === "none") return;

      const { clientX: startX, clientY: startY, startOffsetX, startOffsetY, startScale, scaleX, scaleY } =
        dragParamsRef.current;

      const deltaX = (clientX - startX) * scaleX;
      const deltaY = (clientY - startY) * scaleY;
      const cbs = callbacksRef.current;

      if (currentAction === "move_avatar") {
        cbs.onUpdatePresenter?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_avatar")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.4);
        if (currentAction.includes("_nw") || currentAction.includes("_ne")) {
          scaleDelta = factor / (compHeight * 0.4);
        }
        const newScale = Math.max(0.2, Math.min(3.0, startScale + scaleDelta));
        cbs.onUpdatePresenter?.({ scale: parseFloat(newScale.toFixed(2)) });
      } else if (currentAction === "move_caption") {
        cbs.onUpdateCaptionOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction === "move_headline") {
        cbs.onUpdateHeadlineOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction === "move_product") {
        cbs.onUpdateProductOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_product")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.35);
        if (currentAction.includes("_nw") || currentAction.includes("_ne")) {
          scaleDelta = factor / (compHeight * 0.35);
        }
        const newScale = Math.max(0.3, Math.min(2.5, startScale + scaleDelta));
        cbs.onUpdateProductOffsets?.({ scale: parseFloat(newScale.toFixed(2)) });
      } else if (currentAction === "move_badge") {
        cbs.onUpdateBadgeOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction === "move_pricePromo") {
        cbs.onUpdatePricePromoOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_pricePromo")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.35);
        if (currentAction.includes("_nw")) {
          scaleDelta = factor / (compHeight * 0.35);
        }
        const newScale = Math.max(0.4, Math.min(2.5, startScale + scaleDelta));
        cbs.onUpdatePricePromoOffsets?.({ scale: parseFloat(newScale.toFixed(2)) });
      } else if (currentAction === "move_ctaButton") {
        cbs.onUpdateCtaOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_ctaButton")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.2);
        if (currentAction.includes("_nw")) {
          scaleDelta = factor / (compHeight * 0.2);
        }
        const newScale = Math.max(0.5, Math.min(2.0, startScale + scaleDelta));
        cbs.onUpdateCtaOffsets?.({ scale: parseFloat(newScale.toFixed(2)) });
      } else if (currentAction === "move_tickerTape") {
        cbs.onUpdateTickerTapeOffsets?.({
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction === "move_brandLogo") {
        cbs.onUpdateBrandLogoOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_brandLogo")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.2);
        if (currentAction.includes("_nw")) {
          scaleDelta = factor / (compHeight * 0.2);
        }
        const newScale = Math.max(0.4, Math.min(2.5, startScale + scaleDelta));
        cbs.onUpdateBrandLogoOffsets?.({ scale: parseFloat(newScale.toFixed(2)) });
      } else if (currentAction === "move_featurePills") {
        cbs.onUpdateFeaturePillsOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction === "move_reviewCard") {
        cbs.onUpdateReviewCardOffsets?.({
          offsetX: Math.round(startOffsetX + deltaX),
          offsetY: Math.round(startOffsetY + deltaY),
        });
      } else if (currentAction.startsWith("scale_reviewCard")) {
        const factor = (clientY - startY) * scaleY;
        let scaleDelta = -factor / (compHeight * 0.35);
        if (currentAction.includes("_nw")) {
          scaleDelta = factor / (compHeight * 0.35);
        }
        const newScale = Math.max(0.4, Math.min(2.5, startScale + scaleDelta));
        cbs.onUpdateReviewCardOffsets?.({ scale: parseFloat(newScale.toFixed(2)) });
      }
    },
    [compHeight]
  );

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragActionRef.current === "none") return;
    e.stopPropagation();

    pendingMoveRef.current = { clientX: e.clientX, clientY: e.clientY };

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!pendingMoveRef.current) return;
        const { clientX, clientY } = pendingMoveRef.current;
        processPointerDelta(clientX, clientY);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingMoveRef.current) {
      processPointerDelta(pendingMoveRef.current.clientX, pendingMoveRef.current.clientY);
      pendingMoveRef.current = null;
    }
    if (dragActionRef.current !== "none") {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragActionRef.current = "none";
      setDragAction("none");
      callbacksRef.current.onCommitChanges?.();
    }
  };

  return {
    dragAction,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
