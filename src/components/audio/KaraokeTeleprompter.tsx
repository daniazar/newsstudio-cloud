"use client";

import React from "react";
import { getWordTimestamps } from "@/lib/audio/subtitleGenerator";

interface KaraokeTeleprompterProps {
  text: string;
  durationSec: number;
  currentTimeSec: number;
  isPlaying: boolean;
  className?: string;
}

export function KaraokeTeleprompter({
  text,
  durationSec,
  currentTimeSec,
  isPlaying,
  className = "",
}: KaraokeTeleprompterProps) {
  const wordTimestamps = getWordTimestamps(text, durationSec);

  return (
    <div
      className={`p-4 rounded-xl bg-background/80 border border-border flex flex-wrap gap-1.5 text-sm font-medium leading-relaxed max-h-36 overflow-y-auto ${className}`}
    >
      {wordTimestamps.map((item, idx) => {
        const isActive =
          isPlaying &&
          currentTimeSec >= item.startSec &&
          currentTimeSec <= item.endSec;

        const isPast = isPlaying && currentTimeSec > item.endSec;

        return (
          <span
            key={idx}
            className={`transition-all duration-100 rounded px-1 py-0.5 ${
              isActive
                ? "bg-accent text-white font-bold scale-105 shadow-sm shadow-accent/40"
                : isPast
                ? "text-foreground font-semibold"
                : "text-muted/60"
            }`}
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
}
