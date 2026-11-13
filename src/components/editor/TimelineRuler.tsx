"use client";

import React, { useEffect, useRef } from "react";

interface TimelineRulerProps {
  totalDuration: number;
  currentFrame?: number;
  fps: number;
}

const TimelineRulerComponent: React.FC<TimelineRulerProps> = ({
  totalDuration,
  currentFrame: _currentFrame,
  fps: _fps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    // Subtle bottom baseline rule
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    const totalSeconds = Math.max(1, totalDuration);
    const pixelsPerSecond = width / totalSeconds;

    // Determine major interval for timestamps
    let majorInterval = 5;
    if (pixelsPerSecond >= 120) {
      majorInterval = 1;
    } else if (pixelsPerSecond >= 60) {
      majorInterval = 2;
    } else if (pixelsPerSecond >= 25) {
      majorInterval = 5;
    } else if (pixelsPerSecond >= 10) {
      majorInterval = 10;
    } else {
      majorInterval = 30;
    }

    // Determine sub-second graduation step (like a precision ruler)
    let subInterval = 1.0;
    if (pixelsPerSecond >= 140) {
      subInterval = 0.1;
    } else if (pixelsPerSecond >= 70) {
      subInterval = 0.2;
    } else if (pixelsPerSecond >= 35) {
      subInterval = 0.25;
    } else if (pixelsPerSecond >= 16) {
      subInterval = 0.5;
    } else {
      subInterval = 1.0;
    }

    const totalSteps = Math.ceil(totalSeconds / subInterval);

    ctx.font = "600 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.textBaseline = "middle";

    for (let step = 0; step <= totalSteps; step++) {
      const t = Math.round(step * subInterval * 1000) / 1000;
      const x = (t / totalSeconds) * width;
      if (x > width + 2) break;

      const isMajor =
        Math.abs(t % majorInterval) < 0.001 ||
        Math.abs(t % majorInterval - majorInterval) < 0.001;
      const isWholeSecond =
        Math.abs(t % 1.0) < 0.001 ||
        Math.abs(t % 1.0 - 1.0) < 0.001;
      const isHalfSecond =
        !isWholeSecond &&
        (Math.abs(t % 0.5) < 0.001 || Math.abs(t % 0.5 - 0.5) < 0.001);

      const sharpX = Math.floor(x) + 0.5;

      if (isMajor) {
        // 1. Major Tick (Tallest, high-contrast zinc-300 + text label)
        ctx.strokeStyle = "#d4d4d8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sharpX, height - 13);
        ctx.lineTo(sharpX, height - 0.5);
        ctx.stroke();

        // Label above tick
        ctx.fillStyle = "#e4e4e7";
        const label = `${Math.round(t)}s`;
        if (t === 0) {
          ctx.textAlign = "left";
          ctx.fillText(label, sharpX + 3, height - 19);
        } else if (x > width - 25) {
          ctx.textAlign = "right";
          ctx.fillText(label, sharpX - 3, height - 19);
        } else {
          ctx.textAlign = "center";
          ctx.fillText(label, sharpX, height - 19);
        }
      } else if (isWholeSecond) {
        // 2. Whole Second Tick (Medium-tall, zinc-400)
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sharpX, height - 9);
        ctx.lineTo(sharpX, height - 0.5);
        ctx.stroke();
      } else if (isHalfSecond) {
        // 3. Half Second Tick (Intermediate, zinc-500)
        ctx.strokeStyle = "#71717a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sharpX, height - 6.5);
        ctx.lineTo(sharpX, height - 0.5);
        ctx.stroke();
      } else {
        // 4. Sub-Second / Fine Ruler Tick (Fine teeth, zinc-600)
        ctx.strokeStyle = "#52525b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sharpX, height - 4);
        ctx.lineTo(sharpX, height - 0.5);
        ctx.stroke();
      }
    }
  }, [totalDuration]); // We don't re-render the ruler on currentFrame changes, the playhead is handled separately in React for now.

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-7 mb-0.5"
      style={{ display: "block" }}
    />
  );
};

export const TimelineRuler = React.memo(TimelineRulerComponent);

