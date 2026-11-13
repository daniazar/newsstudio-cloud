/**
 * Presenter Bubble — Ruby's circular video/image overlay.
 * Supports per-segment lip-sync videos with proper timeline placement.
 * Supports "Guest" speaker for interview-style segments.
 */

import React, { useState, useCallback } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
} from "remotion";
import type { AspectRatio, RemotionSegment } from "@/lib/types";
import { RobustImg } from "../components/RobustImg";
import { ChromaKeyVideo } from "../components/ChromaKeyVideo";
import { ChromaKeyImage } from "../components/ChromaKeyImage";
import { resolveSrc } from "../utils/resolveSrc";

export interface PresenterBubbleConfig {
  scale?: number;
  layoutMode?: string;
  offsetX?: number;
  offsetY?: number;
  bubbleFaceZoom?: number;
  bubbleFaceOffsetY?: number;
  bubbleFaceOffsetX?: number;
  avatarSrc?: string;
  personaId?: string;
  [key: string]: unknown;
}

interface PresenterBubbleProps {
  presenterVideoSrc?: string;
  presenterImageSrc?: string;
  aspectRatio: AspectRatio;
  speaker?: string | null;
  personaAvatar?: string;
  /** All segments — used to place per-segment presenter videos at correct times */
  segments?: RemotionSegment[];
  primaryColor?: string;
  rimColor?: [number, number, number];
  rimStrength?: number;
  ambientTint?: [number, number, number];
  presenterConfig?: PresenterBubbleConfig;
  scale?: number;
  layoutMode?: string;
  offsetX?: number;
  offsetY?: number;
  bubbleFaceZoom?: number;
  bubbleFaceOffsetY?: number;
  bubbleFaceOffsetX?: number;
}

const hexToRgb = (hex?: string): [number, number, number] => {
  if (!hex || !hex.startsWith("#")) return [0.0, 0.94, 1.0];
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
};

export const PresenterBubble: React.FC<PresenterBubbleProps> = ({
  presenterVideoSrc,
  presenterImageSrc = "/placeholder_ruby.png",
  aspectRatio,
  speaker = "ruby",
  personaAvatar,
  segments = [],
  primaryColor,
  rimColor,
  rimStrength = 0.28,
  ambientTint = [1.0, 1.0, 1.0],
  presenterConfig,
  scale: propScale,
  layoutMode: propLayoutMode,
  offsetX: propOffsetX,
  offsetY: propOffsetY,
  bubbleFaceZoom: propBubbleFaceZoom,
  bubbleFaceOffsetY: propBubbleFaceOffsetY,
  bubbleFaceOffsetX: propBubbleFaceOffsetX,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const finalRimColor = rimColor || hexToRgb(primaryColor);
  const isVertical = aspectRatio === "vertical";
  const isGuest = speaker === "guest";
  
  // Use personaAvatar if available, else fall back to presenterImageSrc
  const finalAvatar = personaAvatar || presenterConfig?.avatarSrc || presenterImageSrc;

  // Check if ANY segment has a per-segment presenter video
  const hasPerSegmentVideos = segments.some(s => s.presenterVideoSrc);

  const [failedVideos, setFailedVideos] = useState<Record<string, boolean>>({});

  const handleVideoError = useCallback((videoUrl: string) => {
    setFailedVideos((prev) => ({ ...prev, [videoUrl]: true }));
  }, []);

  const currentSegment = segments.find(s => frame >= s.startFrame && frame < s.endFrame);
  if ((currentSegment?.sceneStrategy === "full" || currentSegment?.sceneStrategy === "ltx_full_portrait") && currentSegment?.presenterVideoSrc) {
    return null;
  }

  const activeAvatar = currentSegment?.personaAvatarUrl || finalAvatar || "";
  const isFaceOnly =
    activeAvatar.includes("face_only") ||
    activeAvatar.includes("headshot") ||
    activeAvatar.includes("portrait") ||
    // Simple face headshots in /avatars/ like /avatars/ruby.png, /avatars/mateo.png, but NOT master archive wardrobe poses
    (activeAvatar.includes("/avatars/") &&
      !activeAvatar.includes("archive") &&
      !activeAvatar.includes("master_") &&
      !activeAvatar.includes("suite") &&
      !activeAvatar.includes("_m") &&
      !activeAvatar.includes("pose"));

  const effectiveLayoutMode =
    currentSegment?.mediaSettings?.layoutMode ||
    propLayoutMode ||
    presenterConfig?.layoutMode ||
    (currentSegment?.sceneStrategy === "ltx_green_screen" ||
     currentSegment?.sceneStrategy === "green_screen" ||
     currentSegment?.sceneStrategy === "transparent_anchor" ||
     currentSegment?.sceneStrategy === "chroma_bubble"
      ? "bottom_right"
      : "bottom_right");

  const isSplitOrFull =
    effectiveLayoutMode === "full_screen" ||
    effectiveLayoutMode === "side_full_left" ||
    effectiveLayoutMode === "side_full_right" ||
    effectiveLayoutMode === "split_side";

  const isGreenScreen =
    !isSplitOrFull &&
    (effectiveLayoutMode === "bottom_right" ||
      effectiveLayoutMode === "bottom_left" ||
      currentSegment?.sceneStrategy === "ltx_green_screen" ||
      currentSegment?.sceneStrategy === "green_screen" ||
      currentSegment?.sceneStrategy === "transparent_anchor" ||
      currentSegment?.sceneStrategy === "chroma_bubble");

  const anchorOffsetX =
    currentSegment?.mediaSettings?.presenterOffsetX ??
    propOffsetX ??
    presenterConfig?.offsetX ??
    0;
  const anchorOffsetY =
    currentSegment?.mediaSettings?.presenterOffsetY ??
    propOffsetY ??
    presenterConfig?.offsetY ??
    0;
  const anchorScale =
    currentSegment?.mediaSettings?.presenterScale ??
    propScale ??
    presenterConfig?.scale ??
    1.0;

  // Corner presenter anchor bounding dimensions:
  // Must match useGizmoBounds.ts:
  // height = Math.round(compHeight * 0.44 * scale)
  // width = Math.round(presenterHeight * 0.82)
  // With anchorScale applied via CSS transform scale, base dimensions are:
  const baseCornerHeight = Math.round(height * 0.44);
  const baseCornerWidth = Math.round(baseCornerHeight * 0.82);
  const cornerWidth = baseCornerWidth;
  const cornerHeight = baseCornerHeight;

  const bubbleSize = (isVertical
    ? width * (isFaceOnly ? 0.30 : 0.38)
    : height * (isFaceOnly ? 0.28 : 0.35)) * anchorScale;
  const bottomOffset = isVertical ? 200 : 40;

  // Shared animation logic
  const getBubbleStyle = (isRuby: boolean): React.CSSProperties => {
    const entrance = spring({
      frame,
      fps,
      config: { damping: 15, stiffness: 80 },
    });

    const springScale = interpolate(entrance, [0, 1], [0.8, 1]);
    const breathe = interpolate(frame % (fps * 3), [0, fps * 1.5, fps * 3], [1, 1.02, 1]);
    const isLeft = effectiveLayoutMode === "bottom_left";

    // 1. FULL SCREEN HERO
    if (effectiveLayoutMode === "full_screen") {
      return {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        transform: `translate3d(${anchorOffsetX}px, ${anchorOffsetY}px, 0) scale(${springScale * anchorScale})`,
        transformOrigin: "bottom center",
        zIndex: 25,
        filter: "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75))",
        pointerEvents: "none",
        overflow: "hidden",
      };
    }

    // 2. SIDE FULL SPLIT (LEFT 48%)
    if (effectiveLayoutMode === "side_full_left") {
      const sideWidth = Math.round(width * 0.48 * anchorScale);
      return {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: sideWidth,
        height: "100%",
        transform: `translate3d(${anchorOffsetX}px, ${anchorOffsetY}px, 0)`,
        transformOrigin: "bottom left",
        zIndex: 25,
        backgroundColor: "#09090b",
        borderRight: `2px solid ${primaryColor || "#10b981"}40`,
        boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
        pointerEvents: "none",
        overflow: "hidden",
      };
    }

    // 3. SIDE FULL SPLIT (RIGHT 48%)
    if (effectiveLayoutMode === "side_full_right" || effectiveLayoutMode === "split_side") {
      const sideWidth = Math.round(width * 0.48 * anchorScale);
      return {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: sideWidth,
        height: "100%",
        transform: `translate3d(${anchorOffsetX}px, ${anchorOffsetY}px, 0)`,
        transformOrigin: "bottom right",
        zIndex: 25,
        backgroundColor: "#09090b",
        borderLeft: `2px solid ${primaryColor || "#10b981"}40`,
        boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
        pointerEvents: "none",
        overflow: "hidden",
      };
    }
    
    // 4. FLOATING TRANSPARENT CORNER ANCHOR
    if (isGreenScreen) {
      return {
        position: "absolute",
        bottom: 0,
        [isLeft ? "left" : "right"]: Math.round(width * 0.02),
        width: cornerWidth,
        height: cornerHeight,
        transform: `translate3d(${anchorOffsetX}px, ${anchorOffsetY}px, 0) scale(${springScale * breathe * anchorScale})`,
        transformOrigin: isLeft ? "bottom left" : "bottom right",
        zIndex: 25,
        filter: "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75))",
        pointerEvents: "none",
        overflow: "hidden",
      };
    }

    // 5. CIRCLE PIP BUBBLE
    const borderColor = isRuby ? "#10b981" : "#3b82f6";
    const glowColor = isRuby ? "rgba(16, 185, 129, 0.4)" : "rgba(59, 130, 246, 0.4)";

    return {
      position: "absolute",
      bottom: bottomOffset,
      [isLeft ? "left" : "right"]: 40,
      width: bubbleSize,
      height: bubbleSize,
      borderRadius: "50%",
      overflow: "hidden",
      border: `4px solid ${borderColor}`,
      boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
      transform: `translate3d(${anchorOffsetX}px, ${anchorOffsetY}px, 0) scale(${springScale * breathe * anchorScale})`,
      transformOrigin: "center center",
      zIndex: 10,
    };
  };

  const effectiveZoom =
    presenterConfig?.bubbleFaceZoom ??
    propBubbleFaceZoom ??
    (isFaceOnly ? 1.15 : 2.15);
  const effectiveOffsetY =
    presenterConfig?.bubbleFaceOffsetY ??
    propBubbleFaceOffsetY ??
    (isFaceOnly ? 0 : 7);
  const effectiveOffsetX =
    presenterConfig?.bubbleFaceOffsetX ??
    propBubbleFaceOffsetX ??
    0;

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: isSplitOrFull ? "cover" : isGreenScreen ? "contain" : "cover",
    objectPosition: isSplitOrFull ? "bottom center" : isGreenScreen ? "bottom center" : "center top",
    transform: isSplitOrFull || isGreenScreen ? undefined : `scale(${effectiveZoom}) translate(${effectiveOffsetX}%, ${effectiveOffsetY}%)`,
    transformOrigin: isSplitOrFull || isGreenScreen ? undefined : "50% 20%",
  };

  const guestMediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
  };

  return (
    <>
      {/* Ruby / Main Presenter */}
      <div style={getBubbleStyle(true)}>
        {hasPerSegmentVideos ? (
          <>
            {/* Per-segment lip-sync videos, each placed at its correct timeline position */}
            {segments.map((seg) => {
              const isWebM = seg.presenterVideoSrc?.toLowerCase().endsWith(".webm") || seg.presenterVideoSrc?.includes("transparent");
              const segIsGreen =
                (seg.sceneStrategy === "ltx_green_screen" ||
                seg.sceneStrategy === "green_screen" ||
                seg.sceneStrategy === "transparent_anchor" ||
                seg.sceneStrategy === "chroma_bubble") && !isWebM;

              const isVideoFailed = Boolean(seg.presenterVideoSrc && failedVideos[seg.presenterVideoSrc]);
              const shouldRenderVideo = Boolean(seg.presenterVideoSrc && !isVideoFailed);

              return shouldRenderVideo ? (
                <Sequence
                  key={`pv-${seg.index}-${seg.personaId || 'default'}`}
                  from={seg.startFrame}
                  durationInFrames={Math.max(1, Math.round(seg.endFrame - seg.startFrame))}
                >
                  {isWebM ? (
                    <OffthreadVideo
                      src={resolveSrc(seg.presenterVideoSrc)}
                      style={{
                        ...mediaStyle,
                        clipPath: "inset(0 1.8% 0 1.8%)",
                        WebkitClipPath: "inset(0 1.8% 0 1.8%)",
                        maskImage:
                          "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
                        WebkitMaskImage:
                          "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
                      }}
                      transparent={true}
                      volume={0}
                    />
                  ) : segIsGreen ? (
                    <ChromaKeyVideo
                      src={seg.presenterVideoSrc!}
                      style={mediaStyle}
                      rimColor={finalRimColor}
                      rimStrength={rimStrength}
                      ambientTint={ambientTint}
                      onError={() => handleVideoError(seg.presenterVideoSrc!)}
                    />
                  ) : (
                    <OffthreadVideo
                      src={resolveSrc(seg.presenterVideoSrc)}
                      style={mediaStyle}
                      volume={0}
                    />
                  )}
                </Sequence>
              ) : (
                /* Segments without a presenter video (or whose video failed to load) show the static avatar */
                <Sequence
                  key={`pi-${seg.index}-${seg.personaId || 'default'}`}
                  from={seg.startFrame}
                  durationInFrames={Math.max(1, Math.round(seg.endFrame - seg.startFrame))}
                >
                  {segIsGreen || isGreenScreen ? (
                    <ChromaKeyImage
                      src={resolveSrc(seg.personaAvatarUrl || finalAvatar)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "bottom center",
                      }}
                      rimColor={finalRimColor}
                      rimStrength={rimStrength}
                      ambientTint={ambientTint}
                    />
                  ) : (
                    <RobustImg
                      src={resolveSrc(seg.personaAvatarUrl || finalAvatar)}
                      style={
                        isSplitOrFull
                          ? {
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "bottom center",
                            }
                          : mediaStyle
                      }
                    />
                  )}
                </Sequence>
              );
            })}
          </>
        ) : presenterVideoSrc && !failedVideos[presenterVideoSrc] ? (
          /* Global presenter video (legacy path) */
          isGreenScreen ? (
            <ChromaKeyVideo
              src={presenterVideoSrc}
              style={mediaStyle}
              rimColor={finalRimColor}
              rimStrength={rimStrength}
              ambientTint={ambientTint}
              onError={() => handleVideoError(presenterVideoSrc)}
            />
          ) : (
            <OffthreadVideo src={resolveSrc(presenterVideoSrc)} style={mediaStyle} />
          )
        ) : (
          /* Static avatar fallback */
          isGreenScreen ? (
            <ChromaKeyImage
              src={resolveSrc(finalAvatar)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "bottom center",
              }}
              rimColor={finalRimColor}
              rimStrength={rimStrength}
              ambientTint={ambientTint}
            />
          ) : (
            <RobustImg
              src={resolveSrc(finalAvatar)}
              style={
                isSplitOrFull
                  ? {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "bottom center",
                    }
                  : mediaStyle
              }
            />
          )
        )}
      </div>

      {/* Guest - Only if speaker is guest */}
      {isGuest && (
        <div style={getBubbleStyle(false)}>
          <RobustImg 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" 
            style={guestMediaStyle} 
          />
          <div style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#3b82f6",
            color: "white",
            fontSize: "10px",
            fontWeight: "bold",
            padding: "2px 8px",
            borderRadius: "4px",
            textTransform: "uppercase"
          }}>Guest</div>
        </div>
      )}
    </>
  );
};
