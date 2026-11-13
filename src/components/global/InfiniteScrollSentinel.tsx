"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  /** Called when the sentinel scrolls into view (and not disabled). Usually `() => setSize(size + 1)`. */
  onIntersect: () => void;
  /** When true (e.g. reached end or currently loading), the observer is inert. */
  disabled?: boolean;
  className?: string;
}

/**
 * Invisible element that triggers `onIntersect` when it enters the viewport.
 * Drop it at the bottom of a grid / list / kanban column to drive infinite scroll.
 */
export function InfiniteScrollSentinel({ onIntersect, disabled, className }: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
