import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { RemotionSegment, AspectRatio } from "@/lib/types";
import {
  parseInlineAnimationTags,
  type AnimationCue,
  type StatAnimationData,
  type CounterAnimationData,
  type EntityAnimationData,
  type AlertAnimationData,
  type BadgeAnimationData,
  type FxAnimationData,
} from "@/lib/animation/inlineAnimationParser";

export interface DynamicOverlaysLayerProps {
  segments?: RemotionSegment[];
  introDuration?: number;
  aspectRatio?: AspectRatio;
  showEqualizer?: boolean;
}

export const DynamicOverlaysLayer: React.FC<DynamicOverlaysLayerProps> = ({
  segments = [],
  introDuration = 90,
  aspectRatio = "horizontal",
  showEqualizer = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = aspectRatio === "vertical" || aspectRatio === "square" || width <= 1080;

  // Parse all animation cues across all segments
  const allCues = useMemo(() => {
    const cuesList: Array<{ cue: AnimationCue; absoluteStartFrame: number; segIndex: number }> = [];

    segments.forEach((seg) => {
      if (!seg.text) return;
      const parseResult = parseInlineAnimationTags(seg.text, { fps });
      const segStart = introDuration + seg.startFrame;

      parseResult.cues.forEach((c) => {
        cuesList.push({
          cue: c,
          absoluteStartFrame: segStart + c.startFrame,
          segIndex: seg.index,
        });
      });
    });

    return cuesList;
  }, [segments, introDuration, fps]);

  // Find currently active cues at current frame
  const activeCues = allCues.filter(
    ({ cue, absoluteStartFrame }) =>
      frame >= absoluteStartFrame && frame < absoluteStartFrame + cue.durationFrames
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 45 }}>
      {/* 1. Render Active Cue Overlays */}
      {activeCues.map(({ cue, absoluteStartFrame }, idx) => {
        const relFrame = frame - absoluteStartFrame;
        const dur = cue.durationFrames;

        // Overall fade-in and fade-out spring/interpolations
        const enterSpring = spring({
          frame: relFrame,
          fps,
          config: { damping: 14, stiffness: 100 },
        });

        // Exit fade out during the last 15 frames
        const exitOpacity = interpolate(relFrame, [dur - 15, dur], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const masterOpacity = interpolate(enterSpring, [0, 1], [0, 1]) * exitOpacity;

        switch (cue.type) {
          case "stat":
            return (
              <StatMicroPop
                key={`${cue.id}_${idx}`}
                data={cue.data as StatAnimationData}
                enterSpring={enterSpring}
                opacity={masterOpacity}
                isVertical={isVertical}
                indexOffset={idx}
              />
            );

          case "counter":
            return (
              <CounterMicroPop
                key={`${cue.id}_${idx}`}
                data={cue.data as CounterAnimationData}
                enterSpring={enterSpring}
                relFrame={relFrame}
                fps={fps}
                opacity={masterOpacity}
                isVertical={isVertical}
                indexOffset={idx}
              />
            );

          case "entity":
            return (
              <EntityBioChip
                key={`${cue.id}_${idx}`}
                data={cue.data as EntityAnimationData}
                enterSpring={enterSpring}
                opacity={masterOpacity}
                isVertical={isVertical}
                indexOffset={idx}
              />
            );

          case "alert":
            return (
              <AlertScannerOverlay
                key={`${cue.id}_${idx}`}
                data={cue.data as AlertAnimationData}
                enterSpring={enterSpring}
                relFrame={relFrame}
                opacity={masterOpacity}
                width={width}
              />
            );

          case "badge":
            return (
              <CitationBadgeMicroPop
                key={`${cue.id}_${idx}`}
                data={cue.data as BadgeAnimationData}
                enterSpring={enterSpring}
                opacity={masterOpacity}
                isVertical={isVertical}
              />
            );

          case "fx":
            return (
              <ParticleShowerOverlay
                key={`${cue.id}_${idx}`}
                data={cue.data as FxAnimationData}
                relFrame={relFrame}
                fps={fps}
                opacity={masterOpacity}
                width={width}
                height={height}
              />
            );

          default:
            return null;
        }
      })}

      {/* 2. Optional Ambient Voice-Reactive Spectrum Visualizer */}
      {showEqualizer && (
        <AmbientVoiceSpectrum
          frame={frame}
          isVertical={isVertical}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── 1. Stat Micro-Pop Component ──────────────────────────────────────────────

function StatMicroPop({
  data,
  enterSpring,
  opacity,
  isVertical,
  indexOffset,
}: {
  data: StatAnimationData;
  enterSpring: number;
  opacity: number;
  isVertical: boolean;
  indexOffset: number;
}) {
  const slideX = interpolate(enterSpring, [0, 1], [120, 0]);
  const scale = interpolate(enterSpring, [0, 1], [0.8, 1]);

  const colorHex =
    data.color === "emerald" || data.color === "green"
      ? "#10b981"
      : data.color === "red"
      ? "#ef4444"
      : data.color === "amber" || data.color === "yellow"
      ? "#f59e0b"
      : data.color === "purple"
      ? "#8b5cf6"
      : "#06b6d4";

  const topOffset = isVertical ? 160 + indexOffset * 90 : 120 + indexOffset * 95;

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        right: isVertical ? 24 : 48,
        transform: `translateX(${slideX}px) scale(${scale})`,
        opacity,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.96) 100%)",
        border: `1.5px solid ${colorHex}80`,
        boxShadow: `0 12px 35px rgba(0,0,0,0.75), 0 0 25px ${colorHex}35`,
        borderRadius: "16px",
        padding: isVertical ? "10px 18px" : "14px 22px",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: colorHex,
          boxShadow: `0 0 10px ${colorHex}`,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: isVertical ? "20px" : "26px",
            fontWeight: 900,
            fontFamily: "monospace",
            letterSpacing: "-0.02em",
            color: colorHex,
            lineHeight: 1.1,
          }}
        >
          {data.value}
        </span>
        {data.label && (
          <span
            style={{
              fontSize: isVertical ? "10px" : "12px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {data.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 2. Counter Micro-Pop Component ──────────────────────────────────────────

function CounterMicroPop({
  data,
  enterSpring,
  relFrame,
  fps,
  opacity,
  isVertical,
  indexOffset,
}: {
  data: CounterAnimationData;
  enterSpring: number;
  relFrame: number;
  fps: number;
  opacity: number;
  isVertical: boolean;
  indexOffset: number;
}) {
  const slideX = interpolate(enterSpring, [0, 1], [120, 0]);
  const scale = interpolate(enterSpring, [0, 1], [0.85, 1]);

  const durationFrames = Math.max(1, (data.durationSeconds || 1.5) * fps);
  const countProgress = Math.min(1, relFrame / durationFrames);

  // Smooth numeric interpolation with easing
  const displayedNum = (data.targetValue * countProgress).toLocaleString(undefined, {
    maximumFractionDigits: data.targetValue % 1 !== 0 ? 2 : 0,
  });

  const topOffset = isVertical ? 250 + indexOffset * 90 : 220 + indexOffset * 95;

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        right: isVertical ? 24 : 48,
        transform: `translateX(${slideX}px) scale(${scale})`,
        opacity,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.96) 100%)",
        border: "1.5px solid rgba(6, 182, 212, 0.8)",
        boxShadow: "0 12px 35px rgba(0,0,0,0.75), 0 0 25px rgba(6, 182, 212, 0.35)",
        borderRadius: "16px",
        padding: isVertical ? "10px 18px" : "14px 22px",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: isVertical ? "22px" : "28px",
          fontWeight: 900,
          fontFamily: "monospace",
          letterSpacing: "-0.02em",
          color: "#ffffff",
          lineHeight: 1.1,
        }}
      >
        <span style={{ color: "#06b6d4" }}>{data.prefix || ""}</span>
        <span>{displayedNum}</span>
        <span style={{ color: "#06b6d4", fontSize: "0.8em" }}>{data.suffix || ""}</span>
      </div>
      {data.label && (
        <span
          style={{
            fontSize: isVertical ? "10px" : "12px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {data.label}
        </span>
      )}
    </div>
  );
}

// ─── 3. Entity Bio Chip Component ────────────────────────────────────────────

function EntityBioChip({
  data,
  enterSpring,
  opacity,
  isVertical,
  indexOffset,
}: {
  data: EntityAnimationData;
  enterSpring: number;
  opacity: number;
  isVertical: boolean;
  indexOffset: number;
}) {
  const slideX = interpolate(enterSpring, [0, 1], [-140, 0]);
  const scale = interpolate(enterSpring, [0, 1], [0.85, 1]);

  const topOffset = isVertical ? 160 + indexOffset * 85 : 120 + indexOffset * 90;

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        left: isVertical ? 24 : 48,
        transform: `translateX(${slideX}px) scale(${scale})`,
        opacity,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.96) 100%)",
        border: "1.5px solid rgba(59, 130, 246, 0.6)",
        boxShadow: "0 12px 35px rgba(0,0,0,0.75), 0 0 25px rgba(59, 130, 246, 0.25)",
        borderRadius: "16px",
        padding: isVertical ? "10px 16px" : "12px 20px",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: isVertical ? "32px" : "38px",
          height: isVertical ? "32px" : "38px",
          borderRadius: "10px",
          background: "rgba(59, 130, 246, 0.2)",
          border: "1px solid rgba(59, 130, 246, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isVertical ? "16px" : "18px",
        }}
      >
        {data.icon || "💼"}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: isVertical ? "13px" : "16px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
          }}
        >
          {data.name}
        </span>
        {data.role && (
          <span
            style={{
              fontSize: isVertical ? "10px" : "12px",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            {data.role}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 4. Alert Scanner Overlay ────────────────────────────────────────────────

function AlertScannerOverlay({
  data,
  enterSpring,
  relFrame,
  opacity,
  width,
}: {
  data: AlertAnimationData;
  enterSpring: number;
  relFrame: number;
  opacity: number;
  width: number;
}) {
  const slideY = interpolate(enterSpring, [0, 1], [-80, 0]);
  const laserX = (relFrame * 18) % (width + 200);

  return (
    <div
      style={{
        position: "absolute",
        top: 30,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${slideY}px)`,
        opacity,
      }}
    >
      {/* Alert Top Strobe Bar */}
      <div
        style={{
          background: "linear-gradient(90deg, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.95) 100%)",
          border: "1px solid #f87171",
          boxShadow: "0 10px 40px rgba(239, 68, 68, 0.5)",
          borderRadius: "12px",
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <span style={{ fontSize: "16px" }} className="animate-pulse">
          🚨
        </span>
        <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.08em" }}>
          {data.title}
        </span>
        {data.subtitle && (
          <span style={{ fontSize: "12px", color: "#fecaca", fontWeight: 600 }}>
            • {data.subtitle}
          </span>
        )}
      </div>

      {/* Laser Scan Sweep Light Line */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          left: `${laserX - 100}px`,
          width: "200px",
          height: "2px",
          background: "linear-gradient(90deg, transparent 0%, #ffffff 50%, transparent 100%)",
          boxShadow: "0 0 15px #ef4444",
        }}
      />
    </div>
  );
}

// ─── 5. Citation Badge Micro-Pop ─────────────────────────────────────────────

function CitationBadgeMicroPop({
  data,
  enterSpring,
  opacity,
  isVertical,
}: {
  data: BadgeAnimationData;
  enterSpring: number;
  opacity: number;
  isVertical: boolean;
}) {
  const slideY = interpolate(enterSpring, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: isVertical ? 100 : 40,
        left: isVertical ? 24 : 48,
        transform: `translateY(${slideY}px)`,
        opacity,
        background: "rgba(15, 23, 42, 0.9)",
        border: "1px solid rgba(6, 182, 212, 0.6)",
        borderRadius: "8px",
        padding: "4px 12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(6, 182, 212, 0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span style={{ color: "#06b6d4", fontSize: "11px", fontWeight: 900 }}>{data.icon || "✓"}</span>
      <span
        style={{
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          fontFamily: "monospace",
        }}
      >
        {data.text}
      </span>
    </div>
  );
}

// ─── 6. Particle Shower Overlay ──────────────────────────────────────────────

function ParticleShowerOverlay({
  data,
  relFrame,
  fps,
  opacity,
  width,
  height,
}: {
  data: FxAnimationData;
  relFrame: number;
  fps: number;
  opacity: number;
  width: number;
  height: number;
}) {
  const icon =
    data.effect === "fire"
      ? "🔥"
      : data.effect === "money"
      ? "💵"
      : data.effect === "rocket"
      ? "🚀"
      : data.effect === "confetti"
      ? "🎉"
      : "⚡";

  // Generate 8 floating particle coordinates
  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      xRatio: 0.15 + (i / 8) * 0.7,
      speedMultiplier: 0.8 + (i % 3) * 0.4,
      driftMultiplier: ((i % 2 === 0 ? 1 : -1) * (i + 1)) * 4,
      size: 24 + (i % 4) * 8,
      delayFrames: (i % 4) * 3,
    }));
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}>
      {particles.map((p, idx) => {
        const pFrame = Math.max(0, relFrame - p.delayFrames);
        const yOffset = height - (pFrame * 8 * p.speedMultiplier);
        const xOffset = p.xRatio * width + Math.sin(pFrame / 6) * p.driftMultiplier;
        const pScale = interpolate(pFrame, [0, 10, fps * 2], [0, 1.2, 0.8], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        if (yOffset < -50) return null;

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: `${yOffset}px`,
              left: `${xOffset}px`,
              fontSize: `${p.size}px`,
              transform: `scale(${pScale})`,
              filter: "drop-shadow(0 0 12px rgba(255,255,255,0.4))",
            }}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
}

// ─── 7. Ambient Voice Spectrum Visualizer ────────────────────────────────────

function AmbientVoiceSpectrum({
  frame,
  isVertical,
}: {
  frame: number;
  isVertical: boolean;
}) {
  // 12 procedural equalizer bars
  const barCount = 12;

  return (
    <div
      style={{
        position: "absolute",
        bottom: isVertical ? 120 : 50,
        left: isVertical ? 24 : 48,
        display: "flex",
        alignItems: "flex-end",
        gap: "3px",
        opacity: 0.35,
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // High-frequency rhythm oscillation
        const barHeight = 6 + Math.abs(Math.sin((frame + i * 8) / 3.5)) * 18;
        return (
          <div
            key={i}
            style={{
              width: "3px",
              height: `${barHeight}px`,
              backgroundColor: i % 2 === 0 ? "#06b6d4" : "#3b82f6",
              borderRadius: "2px",
              boxShadow: "0 0 6px #06b6d4",
            }}
          />
        );
      })}
    </div>
  );
}
