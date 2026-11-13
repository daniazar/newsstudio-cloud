"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play } from "lucide-react";

export interface LazyLoopPlayerProps {
  videoUrl: string;
  name: string;
  frameCount: number;
  durationSec: number;
  isSelected?: boolean;
  isVerifiedDemo?: boolean;
  onClick?: () => void;
  className?: string;
}

export const LazyLoopPlayer = React.memo(function LazyLoopPlayer({
  videoUrl,
  name,
  frameCount,
  durationSec,
  isSelected = false,
  isVerifiedDemo = false,
  onClick,
  className = "",
}: LazyLoopPlayerProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport intersection observer to ensure off-screen videos never consume decoder resources
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Determine whether video should actively play
  const shouldPlay = isInView && (isSelected || isHovered);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      video.play().catch(() => {
        // Autoplay policy or video decode interruption
      });
    } else {
      video.pause();
    }
  }, [shouldPlay]);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={`Preview video loop: ${name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative aspect-[9/14] rounded-lg overflow-hidden bg-black/60 border cursor-pointer transition-all ${
        isSelected
          ? "border-purple-500 shadow-md ring-1 ring-purple-500/40"
          : "border-border/60 hover:border-purple-500/40"
      } ${className}`}
    >
      {/* Video Element mounted only when in viewport */}
      {isInView && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Placeholder / Shimmer while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-surface-raised flex items-center justify-center animate-pulse">
          <span className="text-xl opacity-20 filter grayscale">🎬</span>
        </div>
      )}

      {/* Play Icon Indicator when paused / hovered */}
      {!shouldPlay && isLoaded && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none transition-opacity">
          <div className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 shadow-md">
            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Frame / Duration Badge */}
      <div className="absolute top-1.5 left-1.5 pointer-events-none">
        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white border border-white/10">
          {`${frameCount}F • ${durationSec}s`}
        </span>
      </div>

      {/* Verified Demo Badge */}
      {isVerifiedDemo && (
        <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white shadow-sm">
            Verified
          </span>
        </div>
      )}
    </div>
  );
});
