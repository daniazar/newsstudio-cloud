"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { NewsComposition } from "@/remotion/NewsComposition";
import type { CompositionProps, AspectRatio } from "@/lib/types";
import { PlayerViewport } from "@/components/editor/shared/player/PlayerViewport";
import { EditorCanvasGizmo } from "@/components/editor/shared/player/EditorCanvasGizmo";
import { EditorLayerTree, type EditorLayerId } from "@/components/editor/shared/player/EditorLayerTree";
import type { SafeZonePlatform } from "@/components/editor/shared/hooks/useSafeZones";

interface VideoPlayerProps {
  compositionProps: CompositionProps;
  onFrameUpdate?: (frame: number) => void;
  seekToFrame?: number | { frame: number; nonce: number };
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  missingAudioSegments?: number[];
  onPan?: (dx: number, dy: number) => void;
  onPanEnd?: () => void;
  isPanEnabled?: boolean;
  selectedSegmentIndex?: number | null;
  onUpdateAnchorPosition?: (preset: "bottom-right" | "bottom-left" | "center" | "fullscreen") => void;
  showSocialSafeZones?: boolean;
  onToggleSocialSafeZones?: () => void;
  isSplitPreview?: boolean;

  // Viewport, Gizmo & Layer Tree controls
  showLayerTree?: boolean;
  onToggleLayerTree?: () => void;
  showGizmo?: boolean;
  onToggleGizmo?: () => void;
  selectedLayer?: EditorLayerId;
  onSelectLayer?: (layer: EditorLayerId) => void;
  onChangeAspectRatio?: (aspectRatio: AspectRatio) => void;
  onUpdatePresenter?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetPresenter?: () => void;
  avatarLocked?: boolean;
  onToggleAvatarLocked?: () => void;
  captionLocked?: boolean;
  onToggleCaptionLocked?: () => void;
  onUpdateCaptionOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetCaptionOffsets?: () => void;
  onCommitChanges?: () => void;

  // Layer Tree fine-tuning and visibility
  mode?: "ecommerce" | "broadcast";
  avatarVisible?: boolean;
  onToggleAvatarVisible?: () => void;
  captionVisible?: boolean;
  onToggleCaptionVisible?: () => void;
  headlineVisible?: boolean;
  onToggleHeadlineVisible?: () => void;
  headlineOffsetX?: number;
  headlineOffsetY?: number;
  onUpdateHeadlineOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetHeadline?: () => void;
  tickerTapeVisible?: boolean;
  onToggleTickerTapeVisible?: () => void;
  tickerTapeOffsetY?: number;
  onUpdateTickerTapeOffsets?: (patch: { offsetY?: number }) => void;
  onResetTickerTape?: () => void;
  brandLogoVisible?: boolean;
  onToggleBrandLogoVisible?: () => void;
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  brandLogoScale?: number;
  onUpdateBrandLogoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetBrandLogo?: () => void;
  badgeVisible?: boolean;
  onToggleBadgeVisible?: () => void;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  onUpdateBadgeOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetBadge?: () => void;
  introBumperVisible?: boolean;
  onToggleIntroBumperVisible?: () => void;
  outroEndCardVisible?: boolean;
  onToggleOutroEndCardVisible?: () => void;
  backdropVisible?: boolean;
  onToggleBackdropVisible?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  compositionProps,
  onFrameUpdate,
  seekToFrame,
  playing,
  onPlayingChange,
  missingAudioSegments = [],
  selectedSegmentIndex,
  showSocialSafeZones = false,
  onToggleSocialSafeZones,
  isSplitPreview = false,
  showLayerTree,
  onToggleLayerTree,
  showGizmo,
  onToggleGizmo,
  selectedLayer,
  onSelectLayer,
  onChangeAspectRatio,
  onUpdatePresenter,
  onResetPresenter,
  avatarLocked = false,
  onToggleAvatarLocked,
  captionLocked = false,
  onToggleCaptionLocked,
  onUpdateCaptionOffsets,
  onResetCaptionOffsets,
  onCommitChanges,
  mode = "broadcast",
  avatarVisible,
  onToggleAvatarVisible,
  captionVisible,
  onToggleCaptionVisible,
  headlineVisible,
  onToggleHeadlineVisible,
  headlineOffsetX,
  headlineOffsetY,
  onUpdateHeadlineOffsets,
  onResetHeadline,
  tickerTapeVisible,
  onToggleTickerTapeVisible,
  tickerTapeOffsetY,
  onUpdateTickerTapeOffsets,
  onResetTickerTape,
  brandLogoVisible,
  onToggleBrandLogoVisible,
  brandLogoOffsetX,
  brandLogoOffsetY,
  brandLogoScale,
  onUpdateBrandLogoOffsets,
  onResetBrandLogo,
  badgeVisible,
  onToggleBadgeVisible,
  badgeOffsetX,
  badgeOffsetY,
  onUpdateBadgeOffsets,
  onResetBadge,
  introBumperVisible,
  onToggleIntroBumperVisible,
  outroEndCardVisible,
  onToggleOutroEndCardVisible,
  backdropVisible,
  onToggleBackdropVisible,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const secondaryPlayerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const fps = 30;
  const segments = useMemo(() => compositionProps.segments || [], [compositionProps.segments]);
  const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 0;

  const [internalShowLayerTree, setInternalShowLayerTree] = useState(false);
  const [internalShowGizmo, setInternalShowGizmo] = useState(true);
  const [internalSelectedLayer, setInternalSelectedLayer] = useState<EditorLayerId>("avatar");
  const [internalAvatarLocked, setInternalAvatarLocked] = useState(avatarLocked);
  const [internalCaptionLocked, setInternalCaptionLocked] = useState(captionLocked);
  const [safeZonePlatform, setSafeZonePlatform] = useState<SafeZonePlatform>("tiktok");

  const [internalAvatarVisible, setInternalAvatarVisible] = useState(compositionProps.showPresenter !== false);
  const [internalCaptionVisible, setInternalCaptionVisible] = useState(compositionProps.showCaptions !== false);
  const [internalHeadlineVisible, setInternalHeadlineVisible] = useState(compositionProps.showHeadline !== false);
  const [internalTickerTapeVisible, setInternalTickerTapeVisible] = useState(compositionProps.showTickerTape !== false);
  const [internalBrandLogoVisible, setInternalBrandLogoVisible] = useState(compositionProps.showBrandLogo !== false);
  const [internalBadgeVisible, setInternalBadgeVisible] = useState(compositionProps.showCitationBadge !== false);
  const [internalIntroVisible, setInternalIntroVisible] = useState(compositionProps.showIntro !== false);
  const [internalOutroVisible, setInternalOutroVisible] = useState(compositionProps.showOutro !== false);
  const [internalBackdropVisible, setInternalBackdropVisible] = useState(compositionProps.showBackdrop !== false);

  const effectiveShowLayerTree = showLayerTree !== undefined ? showLayerTree : internalShowLayerTree;
  const effectiveShowGizmo = showGizmo !== undefined ? showGizmo : internalShowGizmo;
  const effectiveSelectedLayer = selectedLayer !== undefined ? selectedLayer : internalSelectedLayer;
  const effectiveAvatarLocked = avatarLocked !== undefined ? avatarLocked : internalAvatarLocked;
  const effectiveCaptionLocked = captionLocked !== undefined ? captionLocked : internalCaptionLocked;

  const effectiveAvatarVisible = avatarVisible !== undefined ? avatarVisible : internalAvatarVisible;
  const effectiveCaptionVisible = captionVisible !== undefined ? captionVisible : internalCaptionVisible;
  const effectiveHeadlineVisible = headlineVisible !== undefined ? headlineVisible : internalHeadlineVisible;
  const effectiveTickerTapeVisible = tickerTapeVisible !== undefined ? tickerTapeVisible : internalTickerTapeVisible;
  const effectiveBrandLogoVisible = brandLogoVisible !== undefined ? brandLogoVisible : internalBrandLogoVisible;
  const effectiveBadgeVisible = badgeVisible !== undefined ? badgeVisible : internalBadgeVisible;
  const effectiveIntroVisible = introBumperVisible !== undefined ? introBumperVisible : internalIntroVisible;
  const effectiveOutroVisible = outroEndCardVisible !== undefined ? outroEndCardVisible : internalOutroVisible;
  const effectiveBackdropVisible = backdropVisible !== undefined ? backdropVisible : internalBackdropVisible;

  const handleToggleAvatarVisible = () => {
    if (onToggleAvatarVisible) onToggleAvatarVisible();
    else setInternalAvatarVisible((prev) => !prev);
  };
  const handleToggleCaptionVisible = () => {
    if (onToggleCaptionVisible) onToggleCaptionVisible();
    else setInternalCaptionVisible((prev) => !prev);
  };
  const handleToggleHeadlineVisible = () => {
    if (onToggleHeadlineVisible) onToggleHeadlineVisible();
    else setInternalHeadlineVisible((prev) => !prev);
  };
  const handleToggleTickerTapeVisible = () => {
    if (onToggleTickerTapeVisible) onToggleTickerTapeVisible();
    else setInternalTickerTapeVisible((prev) => !prev);
  };
  const handleToggleBrandLogoVisible = () => {
    if (onToggleBrandLogoVisible) onToggleBrandLogoVisible();
    else setInternalBrandLogoVisible((prev) => !prev);
  };
  const handleToggleBadgeVisible = () => {
    if (onToggleBadgeVisible) onToggleBadgeVisible();
    else setInternalBadgeVisible((prev) => !prev);
  };
  const handleToggleIntroVisible = () => {
    if (onToggleIntroBumperVisible) onToggleIntroBumperVisible();
    else setInternalIntroVisible((prev) => !prev);
  };
  const handleToggleOutroVisible = () => {
    if (onToggleOutroEndCardVisible) onToggleOutroEndCardVisible();
    else setInternalOutroVisible((prev) => !prev);
  };
  const handleToggleBackdropVisible = () => {
    if (onToggleBackdropVisible) onToggleBackdropVisible();
    else setInternalBackdropVisible((prev) => !prev);
  };

  const introFrames = effectiveIntroVisible ? 90 : 0;
  const outroFrames = effectiveOutroVisible ? 90 : 0;
  const durationInFrames = introFrames + mainDuration + outroFrames;
  const currentTime = (currentFrame / fps).toFixed(1);
  const totalTime = (durationInFrames / fps).toFixed(1);

  const isVertical = compositionProps.aspectRatio === "vertical";
  const compositionWidth = isVertical ? 1080 : 1920;
  const compositionHeight = isVertical ? 1920 : 1080;

  const handleToggleLayerTree = () => {
    if (onToggleLayerTree) onToggleLayerTree();
    else setInternalShowLayerTree((prev) => !prev);
  };

  const handleToggleGizmo = () => {
    if (onToggleGizmo) onToggleGizmo();
    else setInternalShowGizmo((prev) => !prev);
  };

  const handleSelectLayer = useCallback((layer: EditorLayerId) => {
    if (onSelectLayer) onSelectLayer(layer);
    else setInternalSelectedLayer(layer);
  }, [onSelectLayer]);

  const handleToggleAvatarLocked = () => {
    if (onToggleAvatarLocked) onToggleAvatarLocked();
    else setInternalAvatarLocked((prev) => !prev);
  };

  const handleToggleCaptionLocked = () => {
    if (onToggleCaptionLocked) onToggleCaptionLocked();
    else setInternalCaptionLocked((prev) => !prev);
  };

  const introDuration = effectiveIntroVisible ? 90 : 0;
  const adjustedFrame = Math.max(0, currentFrame - introDuration);
  const activeSegment =
    selectedSegmentIndex !== null && selectedSegmentIndex !== undefined
      ? segments.find((s) => s.index === selectedSegmentIndex) || segments[0]
      : segments.find((s) => adjustedFrame >= s.startFrame && adjustedFrame < s.endFrame) || segments[0];

  const mediaSettings = activeSegment?.mediaSettings as Record<string, unknown> | undefined;
  const avatarScale = (mediaSettings?.presenterScale as number | undefined) ?? compositionProps.presenterScale ?? compositionProps.presenterConfig?.scale ?? 1.0;
  const avatarOffsetX = (mediaSettings?.presenterOffsetX as number | undefined) ?? compositionProps.presenterOffsetX ?? compositionProps.presenterConfig?.offsetX ?? 0;
  const avatarOffsetY = (mediaSettings?.presenterOffsetY as number | undefined) ?? compositionProps.presenterOffsetY ?? compositionProps.presenterConfig?.offsetY ?? 0;
  const captionOffsetX = (mediaSettings?.captionOffsetX as number | undefined) ?? 0;
  const captionOffsetY = (mediaSettings?.captionOffsetY as number | undefined) ?? 0;
  const headlineText = activeSegment?.text?.slice(0, 50) || "Breaking News";
  const captionText = activeSegment?.text || "";
  const presenterName = activeSegment?.speakerName || activeSegment?.personaId || "Ruby";

  // Sync frame updates
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onFrame = () => {
      const f = current.getCurrentFrame();
      setCurrentFrame(f);
      onFrameUpdate?.(f);
    };

    current.addEventListener("frameupdate", onFrame);
    return () => current.removeEventListener("frameupdate", onFrame);
  }, [onFrameUpdate]);

  // Seek when requested externally
  useEffect(() => {
    if (seekToFrame !== undefined) {
      const targetFrame = typeof seekToFrame === "object" ? seekToFrame.frame : seekToFrame;
      playerRef.current?.seekTo(targetFrame);
      secondaryPlayerRef.current?.seekTo(targetFrame);
    }
  }, [seekToFrame]);

  // Handle external play/pause control
  useEffect(() => {
    if (!playerRef.current && !secondaryPlayerRef.current) return;
    if (playing === true && !isPlaying) {
      playerRef.current?.play();
      secondaryPlayerRef.current?.play();
    } else if (playing === false && isPlaying) {
      playerRef.current?.pause();
      secondaryPlayerRef.current?.pause();
    }
  }, [playing, isPlaying]);

  // Sync isPlaying with internal player state
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onPlay = () => {
      setIsPlaying(true);
      onPlayingChange?.(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
    };

    current.addEventListener("play", onPlay);
    current.addEventListener("pause", onPause);

    return () => {
      current.removeEventListener("play", onPlay);
      current.removeEventListener("pause", onPause);
    };
  }, [onPlayingChange]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current && !secondaryPlayerRef.current) return;
    if (isPlaying) {
      playerRef.current?.pause();
      secondaryPlayerRef.current?.pause();
    } else {
      playerRef.current?.play();
      secondaryPlayerRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Voice loading helper
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", handleVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", handleVoices);
    }
  }, []);

  const lastSpokenTextRef = useRef<string | null>(null);

  // Fallback Auto-TTS during playback for scenes missing AI audio
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (!isPlaying) {
      window.speechSynthesis.cancel();
      lastSpokenTextRef.current = null;
      return;
    }

    const introDuration = 90; // 3 seconds
    if (currentFrame < introDuration) {
      lastSpokenTextRef.current = null;
      return;
    }

    const adjustedFrame = currentFrame - introDuration;
    const currentSegment = segments.find(
      (seg) => adjustedFrame >= seg.startFrame && adjustedFrame < seg.endFrame
    );

    if (currentSegment) {
      const isMissingAudio = missingAudioSegments.includes(currentSegment.index);

      if (isMissingAudio) {
        const textToSpeak = currentSegment.text;
        if (textToSpeak && textToSpeak !== lastSpokenTextRef.current) {
          lastSpokenTextRef.current = textToSpeak;

          window.speechSynthesis.cancel();

          setTimeout(() => {
            if (!isPlaying) return;
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const voices = window.speechSynthesis.getVoices();
            const gender = (currentSegment.voiceParams?.pitchShift || 0) < 0 ? "male" : "female";
            const voice =
              voices.find((v) => v.name.toLowerCase().includes(gender) && v.lang.startsWith("en")) ||
              voices.find((v) => v.lang.startsWith("en")) ||
              voices[0];

            if (voice) utterance.voice = voice;
            utterance.rate = (currentSegment.voiceParams?.speed || 1.0) * 0.9;
            window.speechSynthesis.speak(utterance);
          }, 50);
        }
      } else {
        if (lastSpokenTextRef.current !== null) {
          window.speechSynthesis.cancel();
          lastSpokenTextRef.current = null;
        }
      }
    } else {
      if (lastSpokenTextRef.current !== null) {
        window.speechSynthesis.cancel();
        lastSpokenTextRef.current = null;
      }
    }
  }, [currentFrame, isPlaying, missingAudioSegments, segments]);

  const memoizedLeftSidebar = useMemo(() => {
    if (!effectiveShowLayerTree) return undefined;
    return (
      <EditorLayerTree
        mode={mode}
        selectedLayer={effectiveSelectedLayer}
        onSelectLayer={handleSelectLayer}
        isOpen={effectiveShowLayerTree}
        onToggleOpen={handleToggleLayerTree}
        avatarVisible={effectiveAvatarVisible}
        onToggleAvatarVisible={handleToggleAvatarVisible}
        avatarLocked={effectiveAvatarLocked}
        onToggleAvatarLocked={handleToggleAvatarLocked}
        avatarOffsetX={avatarOffsetX}
        avatarOffsetY={avatarOffsetY}
        avatarScale={avatarScale}
        avatarName={presenterName}
        onUpdateAvatarOffsets={(patch) => onUpdatePresenter?.(patch)}
        onResetAvatar={() => onResetPresenter?.()}
        captionVisible={effectiveCaptionVisible}
        onToggleCaptionVisible={handleToggleCaptionVisible}
        captionLocked={effectiveCaptionLocked}
        onToggleCaptionLocked={handleToggleCaptionLocked}
        captionOffsetX={captionOffsetX}
        captionOffsetY={captionOffsetY}
        onUpdateCaptionOffsets={(patch) => onUpdateCaptionOffsets?.(patch)}
        onResetCaption={() => onResetCaptionOffsets?.()}
        headlineVisible={effectiveHeadlineVisible}
        onToggleHeadlineVisible={handleToggleHeadlineVisible}
        headlineLocked={false}
        headlineOffsetX={headlineOffsetX ?? 0}
        headlineOffsetY={headlineOffsetY ?? 0}
        headlineText={headlineText}
        onUpdateHeadlineOffsets={(patch) => onUpdateHeadlineOffsets?.(patch)}
        onResetHeadline={() => onResetHeadline?.()}
        tickerTapeVisible={effectiveTickerTapeVisible}
        onToggleTickerTapeVisible={handleToggleTickerTapeVisible}
        tickerTapeOffsetY={tickerTapeOffsetY ?? 0}
        onUpdateTickerTapeOffsets={(patch) => onUpdateTickerTapeOffsets?.(patch)}
        onResetTickerTape={() => onResetTickerTape?.()}
        brandLogoVisible={effectiveBrandLogoVisible}
        onToggleBrandLogoVisible={handleToggleBrandLogoVisible}
        brandLogoOffsetX={brandLogoOffsetX ?? 0}
        brandLogoOffsetY={brandLogoOffsetY ?? 0}
        brandLogoScale={brandLogoScale ?? 1.0}
        onUpdateBrandLogoOffsets={(patch) => onUpdateBrandLogoOffsets?.(patch)}
        onResetBrandLogo={() => onResetBrandLogo?.()}
        badgeVisible={effectiveBadgeVisible}
        onToggleBadgeVisible={handleToggleBadgeVisible}
        badgeOffsetX={badgeOffsetX ?? 0}
        badgeOffsetY={badgeOffsetY ?? 0}
        onUpdateBadgeOffsets={(patch) => onUpdateBadgeOffsets?.(patch)}
        onResetBadge={() => onResetBadge?.()}
        introBumperVisible={effectiveIntroVisible}
        onToggleIntroBumperVisible={handleToggleIntroVisible}
        outroEndCardVisible={effectiveOutroVisible}
        onToggleOutroEndCardVisible={handleToggleOutroVisible}
        backdropVisible={effectiveBackdropVisible}
        onToggleBackdropVisible={handleToggleBackdropVisible}
        productVisible={mode === "broadcast" ? false : Boolean(activeSegment?.bRollSrc)}
        onToggleProductVisible={() => {}}
        productOffsetX={0}
        productOffsetY={0}
        productScale={1.0}
        onUpdateProductOffsets={() => {}}
        onResetProduct={() => {}}
        showBadgeLayer={effectiveBadgeVisible}
        qrCodeVisible={false}
        onToggleQrCodeVisible={() => {}}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handlers mutate state/props; layer tree is memoized on UI display values
  }, [
    effectiveShowLayerTree,
    mode,
    effectiveSelectedLayer,
    effectiveAvatarVisible,
    effectiveAvatarLocked,
    avatarOffsetX,
    avatarOffsetY,
    avatarScale,
    presenterName,
    effectiveCaptionVisible,
    effectiveCaptionLocked,
    captionOffsetX,
    captionOffsetY,
    effectiveHeadlineVisible,
    headlineOffsetX,
    headlineOffsetY,
    headlineText,
    effectiveTickerTapeVisible,
    tickerTapeOffsetY,
    effectiveBrandLogoVisible,
    brandLogoOffsetX,
    brandLogoOffsetY,
    brandLogoScale,
    effectiveBadgeVisible,
    badgeOffsetX,
    badgeOffsetY,
    effectiveIntroVisible,
    effectiveOutroVisible,
    effectiveBackdropVisible,
    activeSegment?.bRollSrc,
    onUpdatePresenter,
    onResetPresenter,
    onUpdateCaptionOffsets,
    onResetCaptionOffsets,
    onUpdateHeadlineOffsets,
    onResetHeadline,
    onUpdateTickerTapeOffsets,
    onResetTickerTape,
    onUpdateBrandLogoOffsets,
    onResetBrandLogo,
    onUpdateBadgeOffsets,
    onResetBadge,
  ]);

  const memoizedOverlay = useMemo(() => {
    if (!effectiveShowGizmo || isPlaying) return undefined;
    return (
      <EditorCanvasGizmo
        aspectRatio={isVertical ? "9:16" : compositionProps.aspectRatio === "square" ? "1:1" : "16:9"}
        selectedElement={effectiveSelectedLayer}
        onSelectElement={(el) => {
          if (el !== "none") handleSelectLayer(el);
        }}
        presenter={{
          enabled: effectiveAvatarVisible,
          personaId: activeSegment?.personaId || compositionProps.voiceId || "ruby",
          presenterName: presenterName,
          position: (mediaSettings?.layoutMode as string | undefined) || (mediaSettings?.presenterPosition as string | undefined) || compositionProps.presenterLayoutMode || compositionProps.presenterConfig?.layoutMode || "bottom_right",
          layoutMode: (mediaSettings?.layoutMode as string | undefined) || compositionProps.presenterLayoutMode || compositionProps.presenterConfig?.layoutMode || "bottom_right",
          scale: avatarScale,
          offsetX: avatarOffsetX,
          offsetY: avatarOffsetY,
        }}
        avatarLocked={effectiveAvatarLocked}
        onUpdatePresenter={(patch) => onUpdatePresenter?.(patch)}
        onResetPresenter={() => onResetPresenter?.()}
        captionVisible={effectiveCaptionVisible}
        captionLocked={effectiveCaptionLocked}
        captionText={captionText}
        captionOffsetX={captionOffsetX}
        captionOffsetY={captionOffsetY}
        captionPlacement="bottom"
        onUpdateCaptionOffsets={(patch) => onUpdateCaptionOffsets?.(patch)}
        onResetCaptionOffsets={() => onResetCaptionOffsets?.()}
        headlineVisible={effectiveHeadlineVisible}
        headlineLocked={false}
        headlineText={headlineText}
        headlineOffsetX={headlineOffsetX ?? 0}
        headlineOffsetY={headlineOffsetY ?? 0}
        productVisible={mode === "broadcast" ? false : Boolean(activeSegment?.bRollSrc) && effectiveBackdropVisible}
        productLocked={false}
        productTitle={activeSegment?.bRollSrc?.split("/").pop() || "B-Roll Graphic"}
        productOffsetX={0}
        productOffsetY={0}
        productScale={1.0}
        badgeVisible={effectiveBadgeVisible}
        qrCodeVisible={false}
        onCommitChanges={onCommitChanges}
      />
    );
  }, [
    effectiveShowGizmo,
    isPlaying,
    isVertical,
    compositionProps.aspectRatio,
    effectiveSelectedLayer,
    activeSegment?.personaId,
    compositionProps.voiceId,
    presenterName,
    avatarScale,
    avatarOffsetX,
    avatarOffsetY,
    effectiveAvatarLocked,
    captionText,
    captionOffsetX,
    captionOffsetY,
    headlineText,
    activeSegment?.bRollSrc,
    onUpdatePresenter,
    onResetPresenter,
    onUpdateCaptionOffsets,
    onResetCaptionOffsets,
    onCommitChanges,
    compositionProps.presenterConfig?.layoutMode,
    compositionProps.presenterLayoutMode,
    effectiveAvatarVisible,
    effectiveBackdropVisible,
    effectiveBadgeVisible,
    effectiveCaptionLocked,
    effectiveCaptionVisible,
    effectiveHeadlineVisible,
    handleSelectLayer,
    headlineOffsetX,
    headlineOffsetY,
    mediaSettings?.layoutMode,
    mediaSettings?.presenterPosition,
    mode,
  ]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative select-none">
      {isSplitPreview ? (
        /* ── DUAL ASPECT RATIO SPLIT PREVIEW MODE ── */
        <div className="flex gap-6 w-full h-full max-h-[520px] justify-center items-center px-4 animate-in fade-in">
          {/* Landscape 16:9 Viewport */}
          <div className="flex-1 h-full flex flex-col items-center max-w-xl">
            <span className="text-[11px] font-mono font-bold text-sky-400 mb-1.5 flex items-center gap-1.5">
              <span>📺</span> 16:9 YouTube / Broadcast
            </span>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-sky-500/40 shadow-2xl bg-black">
              <Player
                ref={playerRef}
                component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
                inputProps={{ ...compositionProps, aspectRatio: "horizontal" } as unknown as Record<string, unknown>}
                durationInFrames={durationInFrames}
                fps={fps}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{ width: "100%", height: "100%" }}
                acknowledgeRemotionLicense
              />
            </div>
          </div>

          {/* Vertical 9:16 Viewport */}
          <div className="w-64 h-full flex flex-col items-center shrink-0">
            <span className="text-[11px] font-mono font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
              <span>📱</span> 9:16 Shorts / TikTok
            </span>
            <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden border border-rose-500/40 shadow-2xl bg-black">
              <Player
                ref={secondaryPlayerRef}
                component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
                inputProps={{ ...compositionProps, aspectRatio: "vertical" } as unknown as Record<string, unknown>}
                durationInFrames={durationInFrames}
                fps={fps}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: "100%", height: "100%" }}
                acknowledgeRemotionLicense
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── STANDARD VIEWPORT WITH GIZMO, LAYER TREE & SAFE ZONES ── */
        <PlayerViewport
          aspectRatio={isVertical ? "9:16" : compositionProps.aspectRatio === "square" ? "1:1" : "16:9"}
          onChangeAspectRatio={(ratio) => {
            const converted: AspectRatio = ratio === "9:16" ? "vertical" : ratio === "1:1" ? "square" : "horizontal";
            onChangeAspectRatio?.(converted);
          }}
          safeZonePlatform={safeZonePlatform}
          onChangeSafeZonePlatform={setSafeZonePlatform}
          showSafeZones={showSocialSafeZones}
          onToggleSafeZones={onToggleSocialSafeZones}
          showGizmo={effectiveShowGizmo}
          onToggleGizmo={handleToggleGizmo}
          isPlaying={isPlaying}
          showLayerTree={effectiveShowLayerTree}
          onToggleLayerTree={handleToggleLayerTree}
          className="w-full h-full max-h-[calc(100vh-280px)]"
          leftSidebar={memoizedLeftSidebar}
          overlay={memoizedOverlay}
        >
          <Player
            ref={playerRef}
            component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
            inputProps={compositionProps as unknown as Record<string, unknown>}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionWidth={compositionWidth}
            compositionHeight={compositionHeight}
            style={{ width: "100%", height: "100%" }}
            acknowledgeRemotionLicense
          />
        </PlayerViewport>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between w-full max-w-2xl px-4 mt-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center cursor-pointer shadow-lg shadow-accent/20 transition-transform active:scale-95"
            title="Play / Pause (Space)"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-foreground">
              {currentTime}s <span className="text-muted font-normal">/ {totalTime}s</span>
            </span>
            <span className="text-[10px] font-mono text-muted">
              Frame {currentFrame} / {durationInFrames}
            </span>
          </div>
        </div>

        {/* Safe-Zone Toggle Button */}
        {onToggleSocialSafeZones && isVertical && (
          <button
            onClick={onToggleSocialSafeZones}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showSocialSafeZones
                ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/30"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
            title="Toggle TikTok/Reels Safe-Zone Overlay"
          >
            <span>📱</span>
            <span>{showSocialSafeZones ? "Hide Safe-Zones" : "Social Safe-Zones"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
