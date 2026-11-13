/**
 * src/remotion/layers/StateMachinePresenterLayer.tsx
 *
 * State-Machine Video Orchestration Presenter Layer.
 * Dynamically switches between Anchor States (Standing Wide, Seated Desk, Face Close-up)
 * and plays dual-keyframe transition videos with zero jump cuts and frame-locked continuity.
 */

import React from "react";
import {
  useVideoConfig,
  OffthreadVideo,
  Sequence,
} from "remotion";
import type { AspectRatio, RemotionSegment } from "@/lib/types";
import type { AnchorStateId } from "@/lib/types/stateMachine";
import { buildTransitionId } from "@/lib/types/stateMachine";
import { resolvePersonaLookLoop } from "@/lib/wardrobe/personaLookTypes";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

interface StateMachinePresenterLayerProps {
  segments: RemotionSegment[];
  aspectRatio: AspectRatio;
  defaultPersonaId?: string;
  defaultAvatarSrc?: string;
}

function computeScheduledClips(
  segments: RemotionSegment[],
  defaultPersonaId: string,
  defaultAvatarSrc: string
) {
  let lastState: AnchorStateId = "standing_wide";

  return segments.map((seg, idx) => {
    const targetState: AnchorStateId = seg.targetState || (idx === 0 ? "standing_wide" : lastState);
    const hasTransition = targetState !== lastState || Boolean(seg.transitionVideoSrc);
    const transitionDuration = hasTransition ? Math.min(30, Math.floor((seg.endFrame - seg.startFrame) / 2)) : 0;

    const transitionSrc = seg.transitionVideoSrc || (hasTransition ? `/transitions/transition_${seg.personaId || defaultPersonaId}_${buildTransitionId(lastState, targetState)}.webm` : undefined);

    const mainClipStart = seg.startFrame + transitionDuration;
    const mainClipDuration = seg.endFrame - mainClipStart;

    lastState = targetState;

    const resolvedFromLook = seg.personaLook
      ? resolvePersonaLookLoop(seg.personaLook, seg.poseState || targetState || seg.actionLoop)
      : undefined;

    return {
      segIndex: seg.index,
      personaId: seg.personaId || defaultPersonaId,
      state: targetState,
      hasTransition,
      transitionSrc,
      transitionStart: seg.startFrame,
      transitionDuration,
      mainStart: mainClipStart,
      mainDuration: mainClipDuration,
      presenterVideoSrc: seg.presenterVideoSrc || resolvedFromLook,
      avatarUrl: seg.personaAvatarUrl || defaultAvatarSrc,
    };
  });
}

export const StateMachinePresenterLayer: React.FC<StateMachinePresenterLayerProps> = ({
  segments = [],
  aspectRatio,
  defaultPersonaId = "ruby",
  defaultAvatarSrc = "/avatars/ruby.png",
}) => {
  const { width, height } = useVideoConfig();
  const isVertical = aspectRatio === "vertical";
  const [failedVideos, setFailedVideos] = React.useState<Record<string, boolean>>({});
  const [failedTransitions, setFailedTransitions] = React.useState<Record<string, boolean>>({});

  const scheduledClips = computeScheduledClips(segments, defaultPersonaId, defaultAvatarSrc);

  // Calculate layout scale & positioning based on current state
  const getContainerStyle = (state: AnchorStateId): React.CSSProperties => {
    if (state === "face_closeup") {
      return {
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: isVertical ? width * 0.95 : height * 0.9,
        height: isVertical ? height * 0.75 : height * 0.9,
        zIndex: 20,
        pointerEvents: "none",
      };
    }

    if (state === "seated_desk") {
      return {
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: isVertical ? width * 0.88 : height * 0.82,
        height: isVertical ? height * 0.65 : height * 0.8,
        zIndex: 15,
        pointerEvents: "none",
      };
    }

    // Default: standing_wide
    return {
      position: "absolute",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: isVertical ? width * 0.8 : height * 0.75,
      height: isVertical ? height * 0.68 : height * 0.85,
      zIndex: 15,
      pointerEvents: "none",
    };
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "bottom center",
    clipPath: "inset(0 1.8% 0 1.8%)",
    WebkitClipPath: "inset(0 1.8% 0 1.8%)",
    maskImage:
      "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
    WebkitMaskImage:
      "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
  };

  return (
    <>
      {scheduledClips.map((item) => (
        <React.Fragment key={`sm-seg-${item.segIndex}`}>
          {/* 1. Optional Edge Transition Clip (Start Keyframe -> End Keyframe) */}
          {item.hasTransition && item.transitionSrc && item.transitionDuration > 0 && !failedTransitions[item.transitionSrc] && (
            <Sequence
              from={item.transitionStart}
              durationInFrames={item.transitionDuration}
              key={`trans-${item.segIndex}`}
            >
              <div style={getContainerStyle(item.state)}>
                <OffthreadVideo
                  src={resolveSrc(item.transitionSrc)}
                  style={mediaStyle}
                  transparent
                  onError={() => {
                    if (item.transitionSrc) {
                      setFailedTransitions((prev) => ({ ...prev, [item.transitionSrc!]: true }));
                    }
                  }}
                />
              </div>
            </Sequence>
          )}

          {/* 2. Main State Video (Lip-Sync or State Action Loop) */}
          {item.mainDuration > 0 && (
            <Sequence
              from={item.mainStart}
              durationInFrames={item.mainDuration}
              key={`main-${item.segIndex}`}
            >
              <div style={getContainerStyle(item.state)}>
                {item.presenterVideoSrc && !failedVideos[item.presenterVideoSrc] ? (
                  <OffthreadVideo
                    src={resolveSrc(item.presenterVideoSrc)}
                    style={mediaStyle}
                    transparent
                    onError={() => {
                      if (item.presenterVideoSrc) {
                        setFailedVideos((prev) => ({ ...prev, [item.presenterVideoSrc!]: true }));
                      }
                    }}
                  />
                ) : (
                  <RobustImg
                    src={resolveSrc(item.avatarUrl)}
                    style={mediaStyle}
                  />
                )}
              </div>
            </Sequence>
          )}
        </React.Fragment>
      ))}
    </>
  );
};
