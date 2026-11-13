"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";

export interface VirtualGridProps<T> {
  items: T[];
  columns?: number;
  responsive?: boolean;
  responsiveColumns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  rowHeight: number;
  overscanRows?: number;
  gapClassName?: string;
  gridClassName?: string;
  containerClassName?: string;
  scrollable?: boolean;
  emptyState?: React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
}

const subscribeWindowResize = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback, { passive: true });
  return () => window.removeEventListener("resize", callback);
};

export function VirtualGrid<T extends { id: string | number }>({
  items,
  columns = 3,
  responsive = true,
  responsiveColumns,
  rowHeight,
  overscanRows = 3,
  gapClassName = "gap-3.5",
  gridClassName = "",
  containerClassName = "",
  scrollable = false,
  emptyState = null,
  renderItem,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(800);
  const [containerCols, setContainerCols] = useState<number | null>(null);

  // Responsive column adaptation using useSyncExternalStore for hydration-safe window tracking:
  const mobileCols = responsiveColumns?.mobile;
  const tabletCols = responsiveColumns?.tablet;
  const desktopCols = responsiveColumns?.desktop;

  // Responsive column adaptation using useSyncExternalStore for hydration-safe window tracking:
  // Mobile (< 768px): 1 column
  // Tablet (< 1200px): 2 columns
  // Desktop (>= 1200px): 3 columns (or prop default)
  const windowCols = useSyncExternalStore(
    subscribeWindowResize,
    () => {
      if (!responsive) return columns;
      const w = window.innerWidth;
      if (w < 768) return mobileCols ?? 1;
      if (w < 1200) return tabletCols ?? 2;
      return desktopCols ?? columns;
    },
    () => columns
  );

  useEffect(() => {
    if (!responsive || typeof window === "undefined") return;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = entry.contentRect.width;
          const w = window.innerWidth;
          // Determine max columns based on viewport breakpoint
          let maxCols: number;
          if (w < 768) {
            maxCols = mobileCols ?? 1;
          } else if (w < 1200) {
            maxCols = tabletCols ?? 2;
          } else {
            maxCols = desktopCols ?? columns;
          }

          // Adapt if container is constrained, but never exceed viewport maxCols
          let cols: number;
          if (width < 460) {
            cols = Math.min(maxCols, mobileCols ?? 1);
          } else if (width < 768) {
            cols = Math.min(maxCols, tabletCols ?? 2);
          } else {
            cols = maxCols;
          }
          setContainerCols((prev) => (prev !== cols ? cols : prev));
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [responsive, columns, mobileCols, tabletCols, desktopCols]);

  const activeColumns = containerCols ?? windowCols;

  // Find the scroll target (self if scrollable, else closest scrollable ancestor)
  const getScrollElement = useCallback((): HTMLElement | Window | null => {
    if (typeof window === "undefined") return null;
    if (scrollable && containerRef.current) {
      return containerRef.current;
    }
    if (containerRef.current) {
      let parent: HTMLElement | null = containerRef.current.parentElement;
      while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          return parent;
        }
        parent = parent.parentElement;
      }
    }
    return window;
  }, [scrollable]);

  useEffect(() => {
    const scrollTarget = getScrollElement();
    if (!scrollTarget) return;

    const handleScroll = () => {
      if (!containerRef.current) return;

      if (scrollable && scrollTarget === containerRef.current) {
        setScrollTop(Math.max(0, containerRef.current.scrollTop));
        setViewportHeight(containerRef.current.clientHeight);
      } else if (scrollTarget === window) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetTop = -rect.top;
        setScrollTop(Math.max(0, offsetTop));
        setViewportHeight(window.innerHeight);
      } else {
        const target = scrollTarget as HTMLElement;
        const targetRect = target.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const offsetTop = targetRect.top - containerRect.top;
        setScrollTop(Math.max(0, offsetTop));
        setViewportHeight(target.clientHeight);
      }
    };

    handleScroll();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [getScrollElement, scrollable, windowCols]);

  const totalRows = Math.ceil(items.length / activeColumns);
  const totalHeight = totalRows * rowHeight;

  const prevItemsLengthRef = useRef<number>(items.length);
  const prevItemIdsRef = useRef<(string | number)[]>(items.map((i) => i.id));

  // Reset scroll ONLY when items list actually shrinks or when search/category filter changes.
  // NEVER reset scroll to 0 merely because scrollTop changed during scrolling.
  // Preserves scroll position when outfits are updated in-place (same IDs).
  useEffect(() => {
    const itemsShrank = items.length < prevItemsLengthRef.current;
    const idsChanged =
      items.length !== prevItemIdsRef.current.length ||
      items.some((item, i) => item.id !== prevItemIdsRef.current[i]);

    if (scrollable && containerRef.current) {
      if (itemsShrank || idsChanged) {
        containerRef.current.scrollTop = 0;
        setScrollTop(0);
      }
    }
    prevItemsLengthRef.current = items.length;
    prevItemIdsRef.current = items.map((i) => i.id);
  }, [items, scrollable]);

  // Compute visible row range safely clamped within bounds
  const { startRow, endRow } = useMemo(() => {
    if (totalRows <= 0) return { startRow: 0, endRow: 0 };
    const rawStart = Math.floor(scrollTop / rowHeight) - overscanRows;
    const start = Math.max(0, Math.min(totalRows - 1, rawStart));
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(totalRows - 1, start + visibleRowCount + overscanRows * 2);
    return { startRow: start, endRow: Math.max(0, end) };
  }, [scrollTop, rowHeight, overscanRows, viewportHeight, totalRows]);

  // Sliced items for Virtual DOM rendering
  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];
    const startIndex = startRow * activeColumns;
    const endIndex = Math.min(items.length, (endRow + 1) * activeColumns);
    return items.slice(startIndex, endIndex).map((item, idx) => ({
      item,
      originalIndex: startIndex + idx,
    }));
  }, [items, startRow, endRow, activeColumns]);

  const topOffset = startRow * rowHeight;

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  // Dynamic grid style based on active columns
  const gridColsClass =
    activeColumns === 1
      ? "grid-cols-1"
      : activeColumns === 2
      ? "grid-cols-2"
      : activeColumns === 3
      ? "grid-cols-3"
      : activeColumns === 4
      ? "grid-cols-4"
      : activeColumns === 5
      ? "grid-cols-5"
      : activeColumns === 6
      ? "grid-cols-6"
      : "grid-cols-3";

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Virtual outfit gallery"
      className={`relative ${scrollable ? "overflow-y-auto" : ""} ${containerClassName}`}
    >
      {/* Total Height Virtual Container */}
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {/* Rendered Viewport Window */}
        <div
          style={{
            transform: `translateY(${topOffset}px)`,
            willChange: "transform",
          }}
          className={`grid ${gridColsClass} ${gapClassName} ${gridClassName}`}
        >
          {visibleItems.map(({ item, originalIndex }) => (
            <React.Fragment key={item.id}>
              {renderItem(item, originalIndex)}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
