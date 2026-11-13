/**
 * src/remotion/layers/ecommerce/AdPresenterLayer.tsx
 *
 * E-Commerce Co-Pilot Presenter / UGC Creator Avatar Layer.
 * Positions an AI spokesperson / influencer in the corner or side of the video,
 * providing authentic human endorsement, UGC reactions, and product walk-throughs.
 * 
 * Supports:
 *   - "bottom_right": Corner anchor presentation (as seen in broadcast commerce & TikTok Shop)
 *   - "bottom_left": Left-aligned co-pilot
 *   - "circle_pip": Circular streamer / VTuber floating PiP
 *   - "split_side": Half-split anchor presentation
 *   - Interactive glassmorphic name badge with live indicator
 *   - Organic breathing & speaking harmonic motion
 */

import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
} from "remotion";
import { AdPresenterConfig } from "@/lib/types/ecommerce";
import { getPersonaById } from "@/lib/tts/personas";
import { ChromaKeyVideo } from "../../components/ChromaKeyVideo";
import { RobustImg } from "../../components/RobustImg";
import { resolveSrc } from "../../utils/resolveSrc";

export interface AdPresenterLayerProps {
  presenter?: AdPresenterConfig;
  brandColor?: string;
  isVoiceActive?: boolean;
  /** Frame at which the presenter transitions in (default: 0 = start of scenes sequence) */
  entranceFrameOffset?: number;
  /** Frame offset for video playback (e.g. activeScene.startFrame for per-scene videos, or 0 for continuous) */
  videoFrameOffset?: number;
  /** Legacy prop for backward compatibility */
  sceneStartFrame?: number;
  /** Whether the presenter should transition in (e.g. at commercial start or when persona/position changed) */
  needsFadeIn?: boolean;
  /** Whether the presenter should transition out (e.g. at commercial end or when next scene has different persona/position) */
  needsFadeOut?: boolean;
  /** Current frame relative to the active scene start */
  sceneLocalFrame?: number;
  /** Duration in frames of the active scene */
  sceneDurationFrames?: number;
  /** Transition style: "slide_fade" | "fade" (default "slide_fade") */
  transitionStyle?: "slide_fade" | "fade";
}

export const AdPresenterLayer: React.FC<AdPresenterLayerProps> = ({
  presenter,
  brandColor = "#06b6d4",
  isVoiceActive = true,
  videoFrameOffset,
  sceneStartFrame,
  needsFadeIn = false,
  needsFadeOut = false,
  sceneLocalFrame,
  sceneDurationFrames,
  transitionStyle = "slide_fade",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (!presenter || !presenter.enabled) {
    return null;
  }

  const personaId = (presenter.personaId || "sofia").toLowerCase();
  const vaultPersona = getPersonaById(personaId);
  const avatarSrc = resolveSrc(presenter.avatarUrl || vaultPersona?.avatarUrl || `/avatars/${personaId}.png`);
  const nameTag = presenter.nameTag || `${vaultPersona?.name || (personaId.charAt(0).toUpperCase() + personaId.slice(1))} • Product Reviewer`;

  const scaleMultiplier = presenter.scale || 1.0;
  const offsetX = presenter.offsetX || 0;
  const offsetY = presenter.offsetY || 0;

  // Video playback offset: starts at 0 for continuous video, or scene.startFrame for per-scene video
  const effectiveVideoOffset = videoFrameOffset !== undefined ? videoFrameOffset : (sceneStartFrame !== undefined ? sceneStartFrame : 0);

  // Transition calculations: 10 frames (~0.33s) responsive slide-in/fade
  const TRANSITION_FRAMES = 10;
  const localFrame = sceneLocalFrame !== undefined ? sceneLocalFrame : frame;
  const effectiveTransitionFrames = sceneDurationFrames
    ? Math.min(TRANSITION_FRAMES, Math.max(4, Math.floor(sceneDurationFrames / 4)))
    : TRANSITION_FRAMES;

  // 1. In-transition progress (0 = before entry, 1 = fully entered)
  // Begins appearing at localFrame = 0 (when scene starts) and finishes entering at effectiveTransitionFrames
  const inProgress = needsFadeIn
    ? interpolate(localFrame, [0, effectiveTransitionFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  // 2. Out-transition progress (1 = fully visible, 0 = fully exited)
  // Begins exiting and reaches 0.0 opacity on the exact last frame of the scene (sceneDurationFrames - 1)
  const outProgress = needsFadeOut && sceneDurationFrames !== undefined
    ? interpolate(sceneDurationFrames - 1 - localFrame, [0, Math.max(1, effectiveTransitionFrames - 1)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  const transitionOpacity = Math.min(inProgress, outProgress);

  const mode = presenter.position || presenter.layoutMode || "bottom_right";

  // 3. Side slide-in / slide-out (strictly 0px if !needsFadeIn && !needsFadeOut)
  const isRight = mode === "bottom_right" || mode === "side_full_right" || mode === "split_side" || mode === "top_right";
  const isLeft = mode === "bottom_left" || mode === "side_full_left" || mode === "top_left";

  let transitionSlideX = 0;
  if (transitionStyle !== "fade") {
    if (isRight) {
      const slideIn = interpolate(inProgress, [0, 1], [80, 0]);
      const slideOut = interpolate(outProgress, [0, 1], [80, 0]);
      transitionSlideX = slideIn + slideOut;
    } else if (isLeft) {
      const slideIn = interpolate(inProgress, [0, 1], [-80, 0]);
      const slideOut = interpolate(outProgress, [0, 1], [-80, 0]);
      transitionSlideX = slideIn + slideOut;
    }
  }

  const renderPresenterVideo = (extraStyle?: React.CSSProperties & { objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"; objectPosition?: string }) => {
    if (!presenter.videoUrl) return null;
    const resolvedVideo = resolveSrc(presenter.videoUrl);
    const isAlphaWebm = resolvedVideo.toLowerCase().endsWith(".webm");
    const objectFit = extraStyle?.objectFit ?? "contain";
    const objectPosition = extraStyle?.objectPosition ?? "bottom center";

    if (isAlphaWebm) {
      return (
        <OffthreadVideo
          src={resolvedVideo}
          style={{
            width: "100%",
            height: "100%",
            clipPath: "inset(0 1.8% 0 1.8%)",
            WebkitClipPath: "inset(0 1.8% 0 1.8%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
            ...extraStyle,
            objectFit,
            objectPosition,
          }}
          transparent={true}
          volume={0}
        />
      );
    }

    return (
      <ChromaKeyVideo
        key={resolvedVideo}
        src={resolvedVideo}
        frameOffset={effectiveVideoOffset}
        objectFit={objectFit}
        objectPosition={objectPosition}
        style={{ width: "100%", height: "100%", ...extraStyle }}
      />
    );
  };

  // 1. FULL SCREEN PRESENTER ANCHOR
  if (mode === "full_screen") {
    const entranceScale = interpolate(inProgress, [0, 1], [0.96, 1]);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          transform: `translateX(${offsetX}px) translateY(${offsetY}px) scale(${entranceScale * scaleMultiplier})`,
          opacity: transitionOpacity,
          visibility: transitionOpacity <= 0.001 ? "hidden" : "visible",
          zIndex: 25,
          pointerEvents: "none",
        }}
      >
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {presenter.videoUrl ? (
            renderPresenterVideo({ objectFit: "cover", objectPosition: "bottom center" })
          ) : (
            <RobustImg
              src={avatarSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "bottom center",
              }}
            />
          )}

          {/* Vignette Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.65) 100%)",
            }}
          />

          {/* Name & Role Plate at Bottom Center */}
          {presenter.showNameBadge !== false && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(9, 9, 11, 0.85)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${brandColor}66`,
                borderRadius: "16px",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 16px ${brandColor}30`,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 10px #10b981",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 900,
                    letterSpacing: "0.3px",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {nameTag}
                </span>
                <span
                  style={{
                    color: brandColor,
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {presenter.role ? presenter.role.replace(/_/g, " ") : "VERIFIED SPOKESPERSON"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. SIDE FULL SPLIT PRESENTER (Left or Right 48% column, 100% height)
  if (
    mode === "side_full_left" ||
    mode === "side_full_right" ||
    mode === "split_side"
  ) {
    const isSideRight = mode === "side_full_right" || mode === "split_side";
    const sideWidth = Math.round(width * 0.48 * scaleMultiplier);

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          ...(isSideRight ? { right: 0 } : { left: 0 }),
          width: sideWidth,
          height: "100%",
          transform: `translateX(${transitionSlideX + offsetX}px) translateY(${offsetY}px)`,
          opacity: transitionOpacity,
          visibility: transitionOpacity <= 0.001 ? "hidden" : "visible",
          zIndex: 25,
          pointerEvents: "none",
          borderLeft: isSideRight ? `2px solid ${brandColor}40` : undefined,
          borderRight: !isSideRight ? `2px solid ${brandColor}40` : undefined,
          boxShadow: `0 0 30px rgba(0, 0, 0, 0.8)`,
          backgroundColor: "#09090b",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {presenter.videoUrl ? (
            renderPresenterVideo({
              objectFit: "cover",
              objectPosition: "bottom center",
            })
          ) : (
            <RobustImg
              src={avatarSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "bottom center",
              }}
            />
          )}

          {/* Name & Role Plate at Bottom */}
          {presenter.showNameBadge !== false && (
            <div
              style={{
                position: "absolute",
                bottom: 30,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(9, 9, 11, 0.85)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${brandColor}66`,
                borderRadius: "14px",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                }}
              />
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {nameTag}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. CIRCULAR PIP BUBBLE PRESENTER
  if (mode === "circle_pip" || mode === "top_right" || mode === "top_left") {
    const size = Math.round(width * 0.28 * scaleMultiplier);
    const translateY = transitionStyle !== "fade"
      ? interpolate(inProgress, [0, 1], [60, 0]) + interpolate(outProgress, [0, 1], [60, 0])
      : 0;
    const isTop = mode === "top_right" || mode === "top_left";
    const isLeft = mode === "top_left";

    // Detect if source is already a square close-up face shot
    const isFaceOnly =
      presenter.selectedPoseId === "face_only" ||
      avatarSrc.includes("face_only") ||
      avatarSrc.includes("/avatars/");

    // Vertical video (9:16) has 77.8% vertical overflow when cover-fit in 1:1 circle.
    // In standing/talking presenter videos, face is situated at ~18%-24% Y.
    // Default zoom = 1.85, default Y offset = 5% to center eyes at ~38% of circle.
    // For close-up square headshots, zoom = 1.08, Y offset = 0%.
    const effectiveFaceZoom = presenter.bubbleFaceZoom ?? (isFaceOnly ? 1.08 : 1.85);
    const effectiveFaceOffsetY = presenter.bubbleFaceOffsetY ?? (isFaceOnly ? 0 : 5);
    const effectiveFaceOffsetX = presenter.bubbleFaceOffsetX ?? 0;

    return (
      <div
        style={{
          position: "absolute",
          ...(isTop ? { top: Math.round(height * 0.08) } : { bottom: Math.round(height * 0.12) }),
          ...(isLeft ? { left: Math.round(width * 0.06) } : { right: Math.round(width * 0.06) }),
          width: size,
          height: size,
          transform: `translateX(${offsetX}px) translateY(${translateY + offsetY}px)`,
          opacity: transitionOpacity,
          visibility: transitionOpacity <= 0.001 ? "hidden" : "visible",
          zIndex: 25,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            border: `3px solid ${brandColor}`,
            boxShadow: `0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px ${brandColor}40`,
            backgroundColor: "#09090b",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${effectiveFaceZoom}) translate(${effectiveFaceOffsetX}%, ${effectiveFaceOffsetY}%)`,
              transformOrigin: isFaceOnly ? "50% 50%" : "50% 22%",
            }}
          >
            {presenter.videoUrl ? (
              renderPresenterVideo({
                objectFit: "cover",
                objectPosition: "center top",
                width: "100%",
                height: "100%",
              })
            ) : (
              <RobustImg
                src={avatarSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                }}
              />
            )}
          </div>
        </div>

        {/* Live Speaking Badge */}
        {presenter.showNameBadge !== false && (
          <div
            style={{
              position: "absolute",
              bottom: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(9, 9, 11, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "20px",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              zIndex: 26,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isVoiceActive ? "#10b981" : "#71717a",
                boxShadow: isVoiceActive ? "0 0 8px #10b981" : "none",
              }}
            />
            <span
              style={{
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 800,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {nameTag}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 4. CORNER PRESENTER ANCHOR (bottom_right or bottom_left)
  const isRightAnchor = mode === "bottom_right";
  const presenterHeight = Math.round(height * 0.44 * scaleMultiplier);
  const presenterWidth = presenter.videoUrl
    ? Math.round(presenterHeight * (9 / 16))
    : Math.round(presenterHeight * 0.82);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        ...(isRightAnchor
          ? { right: Math.round(width * 0.02) }
          : { left: Math.round(width * 0.02) }),
        width: presenterWidth,
        height: presenterHeight,
        transform: `translateX(${transitionSlideX + offsetX}px) translateY(${offsetY}px)`,
        opacity: transitionOpacity,
        visibility: transitionOpacity <= 0.001 ? "hidden" : "visible",
        zIndex: 25,
        pointerEvents: "none",
        filter: "drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45))",
      }}
    >
      {/* Avatar or Video Presenter */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
          clipPath: "inset(0 1.8% 0 1.8%)",
          WebkitClipPath: "inset(0 1.8% 0 1.8%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
        }}
      >
        {presenter.videoUrl ? (
          renderPresenterVideo({
            objectFit: "contain",
            objectPosition: "bottom center",
          })
        ) : (
          <RobustImg
            src={avatarSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom center",
              maskImage:
                "linear-gradient(to bottom, black 85%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 85%, transparent 100%)",
            }}
          />
        )}
      </div>

      {/* Floating Presenter Name & Role Plate */}
      {presenter.showNameBadge !== false && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            ...(isRightAnchor ? { right: 10 } : { left: 10 }),
            background: "rgba(9, 9, 11, 0.85)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${brandColor}66`,
            borderRadius: "14px",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 12px ${brandColor}20`,
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.3px",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.1,
              }}
            >
              {nameTag}
            </span>
            <span
              style={{
                color: brandColor,
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {presenter.role
                ? presenter.role.replace(/_/g, " ")
                : "VERIFIED SPOKESPERSON"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
