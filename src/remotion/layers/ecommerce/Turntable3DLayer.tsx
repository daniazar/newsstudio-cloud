/**
 * src/remotion/layers/ecommerce/Turntable3DLayer.tsx
 *
 * Standalone, backdrop-free 3D turntable layer (docs/3D-TURNTABLE-PRD.md FR-05.1 / FR-05.3).
 *
 * Plays a pre-rendered 360° turntable clip — VP9 WebM with alpha from the
 * Object3D-Server — as a seamless loop over whatever is composited beneath it.
 * The clip already contains the rotation, so no CSS rotation is applied here.
 *
 * The clip is fetched/decoded by Remotion's `<OffthreadVideo>` (frame-accurate,
 * never blocks the render thread); `transparent` makes the compositor extract
 * PNG frames so the alpha channel survives.
 */

import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
import { resolveSrc } from "../../utils/resolveSrc";

/** FR-02.3: the default turntable is a 4-second loop (120 frames @ 30 fps). */
export const TURNTABLE_3D_LOOP_SECONDS = 4;

/** WebM (VP9) is the only container the turntable renderer emits with alpha. */
export function isAlphaTurntableVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/)[0].toLowerCase();
  return path.endsWith(".webm");
}

export interface Turntable3DClipProps {
  turntableUrl: string;
  /** Loop length in composition frames (default: 4 s at the composition fps). */
  loopDurationFrames?: number;
  style?: React.CSSProperties;
}

/**
 * The looping clip itself, sized to its parent (`object-fit: contain`).
 * Shared by `Turntable3DLayer` and `ProductTurntableLayer`.
 */
export const Turntable3DClip: React.FC<Turntable3DClipProps> = ({
  turntableUrl,
  loopDurationFrames,
  style,
}) => {
  const { fps } = useVideoConfig();
  const loopFrames = Math.max(1, Math.round(loopDurationFrames ?? TURNTABLE_3D_LOOP_SECONDS * fps));
  const src = resolveSrc(turntableUrl);

  return (
    <Loop durationInFrames={loopFrames} layout="none" name="3D Turntable Loop">
      <OffthreadVideo
        src={src}
        transparent={isAlphaTurntableVideo(turntableUrl)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "contain", ...style }}
      />
    </Loop>
  );
};

export interface Turntable3DLayerProps {
  turntableUrl: string;
  /** Multiplier on the fitted size (1 = fill the shorter frame side). */
  scale?: number;
  /** Vertical offset in px (positive moves the product down). */
  yOffset?: number;
  /** Loop length in composition frames (default: 4 s at the composition fps). */
  loopDurationFrames?: number;
  /** Frame (relative to the parent sequence) where the loop starts at 0°. */
  startFrame?: number;
}

export const Turntable3DLayer: React.FC<Turntable3DLayerProps> = ({
  turntableUrl,
  scale = 1,
  yOffset = 0,
  loopDurationFrames,
  startFrame = 0,
}) => {
  const { width, height } = useVideoConfig();
  if (!turntableUrl) return null;

  const size = Math.min(width, height) * Math.max(0.05, scale);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ width: size, height: size, transform: `translateY(${yOffset}px)` }}>
        <Sequence from={startFrame} layout="none" name="3D Turntable">
          <Turntable3DClip turntableUrl={turntableUrl} loopDurationFrames={loopDurationFrames} />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

export default Turntable3DLayer;
