import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { AspectRatio, RemotionSegment } from "@/lib/types";
import { ChromaKeyPresenterLayer } from "./layers/ChromaKeyPresenterLayer";
import { LowerThirdsLayer } from "./layers/LowerThirdsLayer";
import { RobustImg } from "./components/RobustImg";

export type CameraCue = "cam1_wide" | "cam2_left" | "cam3_closeup" | "cam1" | "cam2" | "cam3";

export interface CameraCueInterval {
  cam: CameraCue;
  startFrame: number;
  endFrame: number;
}

export interface Broadcast3CameraProps {
  activeCam?: CameraCue;
  segments?: RemotionSegment[];
  cameraCues?: CameraCueInterval[];
  presenterVideoSrc?: string;
  presenterImageSrc?: string;
  backgroundPlateSrc?: string;
  foregroundDeskSrc?: string;
  aspectRatio?: AspectRatio;
  enableParallaxPushIn?: boolean;
  masterAudioSrc?: string;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
  topicHeadline?: string;
  showLowerThirds?: boolean;
}

import { resolveSrc } from "./utils/resolveSrc";

/**
 * Normalizes camera cue names to standard IDs.
 */
export function normalizeCameraCue(cue?: string | null): "cam1_wide" | "cam2_left" | "cam3_closeup" {
  if (!cue) return "cam1_wide";
  if (cue === "cam1" || cue === "cam1_wide") return "cam1_wide";
  if (cue === "cam2" || cue === "cam2_left") return "cam2_left";
  if (cue === "cam3" || cue === "cam3_closeup") return "cam3_closeup";
  return "cam1_wide";
}

/**
 * Enforces the Zero-Hand-Clipping rule for Camera 3 Close-Up shots.
 * In Camera 3 Close-Up, anchor hands are strictly below the chest frame.
 */
export function isHandsBelowFrame(activeCam: string): boolean {
  const norm = normalizeCameraCue(activeCam);
  return norm === "cam3_closeup";
}

/**
 * Returns the exact 3D Parallax Set Transforms for the 3-Camera Broadcast Studio Array.
 * Calibrated for cinematic 30-degree rule switching.
 */
export function getCameraTransform(activeCam: CameraCue | string): {
  scale: number;
  translateX: number;
  translateY: number;
  rotationY: number;
  bgShiftX: number;
  bgShiftY: number;
  foregroundShiftX: number;
  deskShiftY: number;
} {
  const norm = normalizeCameraCue(activeCam);
  switch (norm) {
    case "cam1_wide":
      return {
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        rotationY: 0,
        bgShiftX: 0,
        bgShiftY: 0,
        foregroundShiftX: 0,
        deskShiftY: 0,
      };
    case "cam2_left":
      // 20-Degree Left Angle, waist-up framing
      return {
        scale: 1.25,
        translateX: -60,
        translateY: -35,
        rotationY: 3.5,
        bgShiftX: 25,
        bgShiftY: 10,
        foregroundShiftX: -70,
        deskShiftY: -20,
      };
    case "cam3_closeup":
      // 35-Degree Right Slash Angle, chest-up close-up framing
      return {
        scale: 1.6,
        translateX: 80,
        translateY: -95,
        rotationY: -5.0,
        bgShiftX: -45,
        bgShiftY: 20,
        foregroundShiftX: 95,
        deskShiftY: -45,
      };
    default:
      return {
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        rotationY: 0,
        bgShiftX: 0,
        bgShiftY: 0,
        foregroundShiftX: 0,
        deskShiftY: 0,
      };
  }
}

/**
 * Dynamically resolves the active camera cue based on audio timestamps,
 * segment cues, or explicit camera cue timelines.
 */
export function resolveActiveCameraCue(
  frame: number,
  segments?: RemotionSegment[],
  cameraCues?: CameraCueInterval[]
): "cam1_wide" | "cam2_left" | "cam3_closeup" {
  // 1. Explicit camera cue timeline has highest priority
  if (cameraCues && cameraCues.length > 0) {
    const matched = cameraCues.find((c) => frame >= c.startFrame && frame < c.endFrame);
    if (matched) return normalizeCameraCue(matched.cam);
  }

  // 2. Audio-cued segment camera cues
  if (segments && segments.length > 0) {
    const activeSeg = segments.find((s) => frame >= s.startFrame && frame < s.endFrame);
    if (activeSeg?.cameraCue) {
      return normalizeCameraCue(activeSeg.cameraCue);
    }
    if (activeSeg?.mediaSettings?.cameraCue) {
      return normalizeCameraCue(activeSeg.mediaSettings.cameraCue);
    }
    // Intelligent default: Segment 0 is Cam1 wide, alternating Cam2 and Cam3
    if (activeSeg) {
      if (activeSeg.index === 0) return "cam1_wide";
      if (activeSeg.index % 2 === 1) return "cam2_left";
      return "cam3_closeup";
    }
  }

  return "cam1_wide";
}

/**
 * Broadcast 3-Camera Array Virtual Studio Composition.
 * Implements full 3D parallax set transforms, WebGL despill chroma keying,
 * and zero-hand-clipping enforcement on Camera 3 Close-Up.
 */
export const Broadcast3CameraComposition: React.FC<Broadcast3CameraProps> = ({
  activeCam: explicitActiveCam,
  segments = [],
  cameraCues = [],
  presenterVideoSrc = "/avatars/master_ruby_archive/chroma_master_poses/ruby_chroma_cam01_center_wide_0deg.mp4",
  presenterImageSrc = "/studio_environments/broadcast_shot_suite/3camera_broadcast_array/ruby_corset_cam01_center_wide_0deg.jpg",
  backgroundPlateSrc = "/studio_environments/section_01_anchor_desk_centered_closeup.jpg",
  foregroundDeskSrc = "/studio_environments/foreground_desk_overlay_transparent.png",
  aspectRatio = "horizontal",
  enableParallaxPushIn = true,
  masterAudioSrc,
  bgMusicSrc,
  bgMusicVolume = 0.12,
  topicHeadline,
  showLowerThirds = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Resolve active camera cue dynamically
  const currentCam = explicitActiveCam
    ? normalizeCameraCue(explicitActiveCam)
    : resolveActiveCameraCue(frame, segments, cameraCues);

  const transforms = getCameraTransform(currentCam);
  const handsBelowFrame = isHandsBelowFrame(currentCam);

  // Subtle digital Ken Burns push-in for broadcast energy
  const pushInScale = enableParallaxPushIn
    ? interpolate(frame % (fps * 4), [0, fps * 4], [1.0, 1.03], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  // Active segment presenter video override
  const activeSegment = segments.find((s) => frame >= s.startFrame && frame < s.endFrame);
  const resolvedPresenterVideo =
    activeSegment?.presenterVideoSrc || presenterVideoSrc;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: "#05070a",
        perspective: "1200px",
      }}
    >
      {/* 3D Parallax Set Main Container */}
      <AbsoluteFill
        style={{
          transform: `scale(${transforms.scale * pushInScale}) translate(${transforms.translateX}px, ${transforms.translateY}px) rotateY(${transforms.rotationY}deg)`,
          transformOrigin: "50% 60%",
          transition: "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Layer 0: Background Skyline & Broadcast Studio Plate */}
        <div
          style={{
            position: "absolute",
            inset: "-5%",
            width: "110%",
            height: "110%",
            transform: `translate(${transforms.bgShiftX}px, ${transforms.bgShiftY}px) translateZ(-200px) scale(1.15)`,
            transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          <RobustImg
            src={resolveSrc(backgroundPlateSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: currentCam === "cam3_closeup" ? "blur(2.5px) brightness(0.92)" : "brightness(0.95)",
            }}
          />
        </div>

        {/* Layer 1: Screen Graphics / Infographics Plate */}
        {activeSegment?.bRollSrc && (
          <div
            style={{
              position: "absolute",
              top: "18%",
              right: "8%",
              width: "32%",
              height: "36%",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
              transform: `translate(${transforms.bgShiftX * 0.7}px, ${transforms.bgShiftY * 0.7}px) translateZ(-80px)`,
              zIndex: 5,
            }}
          >
            {activeSegment.bRollType === "video" ? (
              <OffthreadVideo
                src={resolveSrc(activeSegment.bRollSrc)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <RobustImg
                src={resolveSrc(activeSegment.bRollSrc)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        )}

        {/* Layer 2: Presenter Chroma Key Layer (with WebGL Despill & Zero-Hand-Clipping) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: currentCam === "cam3_closeup" ? "12%" : "20%",
            transform: `translateX(-50%) translateZ(0px)`,
            width: currentCam === "cam3_closeup" ? "62%" : "48%",
            height: currentCam === "cam3_closeup" ? "88%" : "75%",
            zIndex: 15,
            pointerEvents: "none",
          }}
        >
          {segments.length > 0 ? (
            segments.map((seg, idx) => {
              const segVideo = seg.presenterVideoSrc || presenterVideoSrc;
              const durationInFrames = Math.max(1, seg.endFrame - seg.startFrame);
              return (
                <Sequence
                  key={`seg-presenter-${idx}`}
                  from={seg.startFrame}
                  durationInFrames={durationInFrames}
                >
                  {segVideo ? (
                    <ChromaKeyPresenterLayer
                      videoSrc={resolveSrc(segVideo)}
                      similarity={0.42}
                      smoothness={0.16}
                      despillStrength={0.88}
                      showDropShadow={true}
                      dropShadowBlur={currentCam === "cam3_closeup" ? 22 : 16}
                      glassReflectionOpacity={currentCam === "cam3_closeup" ? 0.08 : 0.2}
                      clipPath={handsBelowFrame ? "inset(0% 0% 12% 0% round 0px)" : undefined}
                    />
                  ) : (
                    <RobustImg
                      src={resolveSrc(seg.presenterImageSrc || presenterImageSrc)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        clipPath: handsBelowFrame ? "inset(0% 0% 12% 0%)" : undefined,
                      }}
                    />
                  )}
                </Sequence>
              );
            })
          ) : resolvedPresenterVideo ? (
            <ChromaKeyPresenterLayer
              videoSrc={resolveSrc(resolvedPresenterVideo)}
              similarity={0.42}
              smoothness={0.16}
              despillStrength={0.88}
              showDropShadow={true}
              dropShadowBlur={currentCam === "cam3_closeup" ? 22 : 16}
              glassReflectionOpacity={currentCam === "cam3_closeup" ? 0.08 : 0.2}
              clipPath={handsBelowFrame ? "inset(0% 0% 12% 0% round 0px)" : undefined}
            />
          ) : (
            <RobustImg
              src={presenterImageSrc || ""}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                clipPath: handsBelowFrame ? "inset(0% 0% 12% 0%)" : undefined,
              }}
            />
          )}
        </div>

        {/* Layer 3: Foreground Tempered Glass Desk Top + Laptop Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "38%",
            transform: `translate(${transforms.foregroundShiftX}px, ${transforms.deskShiftY}px) translateZ(100px)`,
            transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
            zIndex: 25,
            pointerEvents: "none",
          }}
        >
          <RobustImg
            src={resolveSrc(foregroundDeskSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom center",
              opacity: currentCam === "cam3_closeup" ? 0.35 : 0.95,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Broadcast Ticker & Camera Cue HUD (Optional Subtle Indicator) */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 28,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
            boxShadow: "0 0 8px #ef4444",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 700,
            color: "#f3f4f6",
            letterSpacing: "0.08em",
          }}
        >
          ON AIR: {currentCam.toUpperCase()}
        </span>
      </div>

      {/* Dynamic Lower Thirds Name Plate */}
      {showLowerThirds && activeSegment && (
        <LowerThirdsLayer
          currentSegment={activeSegment}
          aspectRatio={aspectRatio}
          speakerName={activeSegment.speakerName || activeSegment.personaName || "Ruby Vance"}
          speakerTitle={activeSegment.speakerTitle || topicHeadline || "Broadcast Studio"}
        />
      )}

      {/* Audio Layer: Stitched Master Track OR Sequential Turn Audio Tracks */}
      {masterAudioSrc ? (
        <Audio src={resolveSrc(masterAudioSrc)} />
      ) : (
        segments.map((seg, idx) => {
          const segAudio = seg.audioUrl || seg.audioSrc;
          if (!segAudio) return null;
          const durationInFrames = Math.max(1, seg.endFrame - seg.startFrame);
          return (
            <Sequence
              key={`seg-audio-${idx}`}
              from={seg.startFrame}
              durationInFrames={durationInFrames}
            >
              <Audio src={resolveSrc(segAudio)} />
            </Sequence>
          );
        })
      )}

      {/* Optional Background Ambient Music */}
      {bgMusicSrc && (
        <Audio src={resolveSrc(bgMusicSrc)} volume={bgMusicVolume} />
      )}
    </AbsoluteFill>
  );
};
