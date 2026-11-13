"use client";

import React, { useState, useEffect, useRef } from "react";

export interface LazyThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  priority?: boolean;
  fallbackIcon?: string;
  category?: string;
  onClick?: () => void;
}

export const LazyThumbnail = React.memo(function LazyThumbnail({
  src,
  alt,
  className = "",
  containerClassName = "",
  aspectRatio = "aspect-[16/10]",
  priority = false,
  fallbackIcon = "👗",
  category,
  onClick,
}: LazyThumbnailProps) {
  const [isInView, setIsInView] = useState<boolean>(priority);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // IntersectionObserver & Proximity Detection for eager mounting when near viewport
  useEffect(() => {
    if (priority || isInView) return;

    const el = containerRef.current;
    if (!el) return;

    if (isInView) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    let scrollParent: HTMLElement | null = null;
    let parent = el.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollParent = parent;
        break;
      }
      parent = parent.parentElement;
    }

    // Fast synchronous check: if element is already within 800px proximity of viewport/scrollParent, mount immediately
    try {
      const rect = el.getBoundingClientRect();
      const isVisibleNow = scrollParent
        ? (() => {
            const pRect = scrollParent.getBoundingClientRect();
            return rect.bottom >= pRect.top - 800 && rect.top <= pRect.bottom + 800;
          })()
        : rect.bottom >= -800 && rect.top <= (window.innerHeight || 800) + 800;

      if (isVisibleNow) {
        setIsInView(true);
        return;
      }
    } catch {
      // In non-DOM or layout error environments, fall through to observer
    }

    // Safety fallback timer to prevent sticking in pulsing skeleton state
    const safetyTimer = setTimeout(() => {
      setIsInView(true);
    }, 250);

    try {
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            clearTimeout(safetyTimer);
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          root: scrollParent,
          rootMargin: "800px 0px", // Preload well before user scrolls into view
          threshold: 0,
        }
      );

      observer.observe(el);
      return () => {
        clearTimeout(safetyTimer);
        observer.disconnect();
      };
    } catch {
      clearTimeout(safetyTimer);
      setIsInView(true);
    }
  }, [priority, isInView]);

  // Sync image load state upon src change
  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden bg-black/60 rounded-xl select-none ${aspectRatio} ${containerClassName}`}
    >
      {/* Skeleton Shimmer Loading State */}
      {!isLoaded && !hasError && src && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-surface-raised animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-white/[0.02] via-white/[0.08] to-white/[0.02] animate-shimmer" />
          <span className="text-xl opacity-20 filter grayscale select-none absolute">
            {fallbackIcon}
          </span>
        </div>
      )}

      {/* Actual Image when in View */}
      {isInView && src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            imgRef.current = node;
            if (node && node.complete && node.naturalWidth > 0 && !isLoaded) {
              setIsLoaded(true);
            }
          }}
          src={src}
          alt={alt}
          loading="eager"
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
        />
      ) : null}

      {/* Fallback Display if Error or No Image Provided */}
      {(hasError || !src) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface p-2 text-center text-muted">
          <span className="text-2xl mb-1">{fallbackIcon}</span>
          <span className="text-[10px] font-mono text-muted/80 truncate max-w-full px-1">
            {category || "Technical Plate"}
          </span>
        </div>
      )}
    </div>
  );
});
