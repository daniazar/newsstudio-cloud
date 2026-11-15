/**
 * News Composition — Main Remotion composition.
 * 
 * Supports Modern Television Broadcast Scene Layout Strategies:
 * 1. `in_environment`: Studio Desk / Lounge video rendered directly without green keying
 * 2. `chroma_broll`: WebGL ChromaKeyPresenterLayer composited over dynamic B-roll background
 * 3. `multi_anchor`: Dual-anchor split screen panel with active speaker highlight
 * 4. `infographic_ticker`: Financial charts + side anchor + continuous scrolling ticker tape
 * 5. `bubble`: Classic corner presenter bubble overlay
 * 6. `full`: Fullscreen presenter video
 */

import React from "react";
import { AbsoluteFill, Audio, Series, useCurrentFrame, OffthreadVideo } from "remotion";
import { BRollLayer } from "./layers/BRollLayer";
import { PresenterBubble } from "./layers/PresenterBubble";
import { StateMachinePresenterLayer } from "./layers/StateMachinePresenterLayer";
import { ChromaKeyPresenterLayer } from "./layers/ChromaKeyPresenterLayer";
import { SplitScreenSatelliteLayer } from "./layers/SplitScreenSatelliteLayer";
import { CaptionsLayer } from "./layers/CaptionsLayer";
import { BrandingLayer } from "./layers/BrandingLayer";
import { IntroLayer } from "./layers/IntroLayer";
import { SFXLayer } from "./layers/SFXLayer";
import { TickerTapeLayer } from "./layers/TickerTapeLayer";
import { LowerThirdsLayer } from "./layers/LowerThirdsLayer";
import { CitationBadgeLayer } from "./layers/CitationBadgeLayer";
import { OutroLayer } from "./layers/OutroLayer";
import { StickersLayer } from "./layers/StickersLayer";
import { SafeZonesLayer } from "./layers/SafeZonesLayer";
import { PrerenderedClipLayer } from "./layers/PrerenderedClipLayer";
import { VoiceLayer } from "./layers/VoiceLayer";
import { StreamChatLayer } from "./layers/StreamChatLayer";
import { DataGraphicsLayer } from "./layers/DataGraphicsLayer";
import { DynamicOverlaysLayer } from "./layers/DynamicOverlaysLayer";
import { AudioDuckingLayer } from "./components/AudioDuckingLayer";
import { RobustImg } from "./components/RobustImg";
import { resolveSrc } from "./utils/resolveSrc";
import { PERSONAS } from "../lib/tts/personas";
import { type CompositionProps, type RemotionSegment, STUDIO_SETS } from "../lib/types";

export const NewsComposition: React.FC<CompositionProps> = ({
  aspectRatio = "horizontal",
  segments = [],
  presenterVideoSrc,
  presenterImageSrc,
  audioSrc,
  globalBgVideoSrc,
  bgMusicSrc,
  bgMusicVolume = 0.25,
  sloganId,
  outroId,
  showSafeZones = false,
  captionStyle = "beast",
  clonedPersonas = [],
  watermarkSrc,
  brandPrimaryColor = "#06b6d4",
  brandSecondaryColor = "#f43f5e",
  introVideoSrc,
  outroVideoSrc,
  logoSrc,
  presenterMode = "bubble",
  showStreamChat = false,
  streamChatMessages,
  dataGraphic: globalDataGraphic,
  showTickerTape = true,
  tickerItems,
  customTickerText,
  language,
  sfxEnabled = true,
  studioSetId,
  stemVolumes,
  ambienceTrackPath,
  enableDualCaptions,
  secondaryCaptionColor,
  showPresenter = true,
  showCaptions = true,
  showHeadline = true,
  showCitationBadge = true,
  showBrandLogo = true,
  showBackdrop = true,
  showIntro = true,
  showOutro = true,
  brandLogoOffsetX = 0,
  brandLogoOffsetY = 0,
  brandLogoScale = 1.0,
  citationBadgeOffsetX = 0,
  citationBadgeOffsetY = 0,
  tickerTapeOffsetY = 0,
  presenterConfig,
  presenterScale,
  presenterLayoutMode,
  presenterOffsetX,
  presenterOffsetY,
  presenterBubbleFaceZoom,
  presenterBubbleFaceOffsetY,
  presenterBubbleFaceOffsetX,
}) => {
  const frame = useCurrentFrame();
  const introDuration = showIntro ? 90 : 0; // 3 seconds at 30fps if enabled
  
  const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;

  // Pre-index personas for O(1) constant-time lookup on every frame
  const personasMap = React.useMemo(() => {
    const map = new Map<string, (typeof PERSONAS)[number]>();
    for (const p of PERSONAS) {
      map.set(p.id, p);
    }
    if (clonedPersonas) {
      for (const p of clonedPersonas) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [clonedPersonas]);

  // Pre-index studio sets for O(1) lookup
  const studioSetsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of STUDIO_SETS) {
      if (s.bgUrl) map.set(s.id, s.bgUrl);
    }
    return map;
  }, []);

  // Memoize full-strategy B-Roll segment overrides to avoid recreating segment arrays on every frame
  const bRollSegments: RemotionSegment[] = React.useMemo(() => {
    return segments.map((s) =>
      s.sceneStrategy === "full" && s.presenterVideoSrc
        ? { ...s, bRollSrc: s.presenterVideoSrc, bRollType: "video" as const }
        : s
    );
  }, [segments]);

  // Active segment calculation
  const mainSequenceFrame = frame - introDuration;
  const currentSegment = segments.find(
    (s) => mainSequenceFrame >= s.startFrame && mainSequenceFrame < s.endFrame
  );
  
  // Resolve active Persona in O(1)
  const currentPersona = currentSegment?.personaId 
    ? personasMap.get(currentSegment.personaId)
    : undefined;

  // Determine current scene strategy
  const currentStrategy = (
    currentSegment?.sceneStrategy ||
    currentSegment?.mediaSettings?.sceneStrategy ||
    (presenterMode === "state_machine" ? "state_machine" : "bubble")
  ).toLowerCase();

  // Active data graphic configuration
  const activeGraphic =
    currentSegment?.dataGraphic ||
    currentSegment?.mediaSettings?.dataGraphic ||
    globalDataGraphic;

  const studioSetBg = studioSetId
    ? studioSetsMap.get(studioSetId)
    : undefined;

  const isVertical = aspectRatio === "vertical";

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Global Audio Layer (SFX) */}
      {sfxEnabled && (
        <SFXLayer segments={segments} introDuration={introDuration} />
      )}

      <Series>
        {/* Intro Scene */}
        {showIntro && introDuration > 0 && (
          <Series.Sequence durationInFrames={introDuration}>
            <IntroLayer 
              sloganId={sloganId} 
              durationInFrames={introDuration} 
              introVideoSrc={introVideoSrc}
              logoSrc={logoSrc}
              primaryColor={brandPrimaryColor}
              aspectRatio={aspectRatio}
            />
          </Series.Sequence>
        )}

        {/* Main Content */}
        <Series.Sequence durationInFrames={mainDuration}>
          <AbsoluteFill>
            {/* ── Strategy 1: in_environment (Direct studio scene without keying) ── */}
            {currentStrategy === "in_environment" ? (
              <AbsoluteFill>
                {showPresenter && currentSegment?.presenterVideoSrc ? (
                  <OffthreadVideo
                    src={resolveSrc(currentSegment.presenterVideoSrc)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    volume={0}
                  />
                ) : showBackdrop && currentSegment?.bRollSrc ? (
                  <RobustImg
                    src={currentSegment.bRollSrc}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : showBackdrop ? (
                  <BRollLayer
                    segments={segments}
                    globalBgVideoSrc={globalBgVideoSrc}
                    showGlobalBg={!!globalBgVideoSrc}
                  />
                ) : null}
              </AbsoluteFill>
            ) : currentStrategy === "multi_anchor" ? (
              /* ── Strategy 2: multi_anchor (Dual satellite split-screen) ── */
              <AbsoluteFill>
                {showBackdrop && (
                  <BRollLayer
                    segments={segments}
                    globalBgVideoSrc={globalBgVideoSrc}
                    showGlobalBg={!!globalBgVideoSrc}
                  />
                )}
                {showPresenter && (
                  <SplitScreenSatelliteLayer
                    aspectRatio={aspectRatio}
                    topicHeadline={currentSegment?.text?.slice(0, 55) || "BREAKING TECH ROUNDTABLE"}
                    primaryColor={brandPrimaryColor}
                    leftFeed={{
                      name: currentPersona?.name || "Ruby Sterling",
                      role: currentPersona?.title || "Primary Anchor",
                      location: "STUDIO 1 • NEW YORK",
                      videoSrc: currentSegment?.presenterVideoSrc ? resolveSrc(currentSegment.presenterVideoSrc) : undefined,
                      imageSrc: currentSegment?.personaAvatarUrl ? resolveSrc(currentSegment.personaAvatarUrl) : currentPersona?.avatarUrl,
                      isSpeaking: currentSegment?.speaker !== "guest" && currentSegment?.speaker !== "blaze",
                    }}
                    rightFeed={{
                      name: currentSegment?.speaker === "blaze" ? "Blaze Wilder" : "Dr. Mateo Beltrán",
                      role: currentSegment?.speaker === "blaze" ? "Tech Analyst" : "Chief AI Officer",
                      location: "STUDIO 2 • SILICON VALLEY",
                      videoSrc:
                        currentSegment?.speaker === "blaze"
                          ? "/assets/action_loops/veo/blaze_silver_blazer/blaze_silver_blazer_M1_dynamic_v1.mp4"
                          : "/assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4",
                      imageSrc: currentSegment?.speaker === "blaze" ? "/avatars/blaze.png" : "/avatars/mateo.png",
                      isSpeaking: currentSegment?.speaker === "guest" || currentSegment?.speaker === "blaze",
                    }}
                  />
                )}
              </AbsoluteFill>
            ) : currentStrategy === "infographic_ticker" || currentStrategy === "data_infographic" ? (
              /* ── Strategy 3: infographic_ticker / data_infographic (Motion Charts + side anchor + ticker) ── */
              <AbsoluteFill>
                {showBackdrop && (
                  <BRollLayer
                    segments={segments}
                    globalBgVideoSrc={globalBgVideoSrc}
                    showGlobalBg={!!globalBgVideoSrc}
                  />
                )}
                {/* Side Anchor Feed (Optional if in side_panel layout) */}
                {showPresenter && currentStrategy === "infographic_ticker" && (
                  <div
                    style={{
                      position: "absolute",
                      left: isVertical ? "5%" : "6%",
                      bottom: isVertical ? "16%" : "12%",
                      width: isVertical ? "40%" : "28%",
                      height: isVertical ? "35%" : "55%",
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: "2px solid rgba(255, 255, 255, 0.2)",
                      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
                      zIndex: 20,
                    }}
                  >
                    {currentSegment?.presenterVideoSrc ? (
                      <OffthreadVideo
                        src={resolveSrc(currentSegment.presenterVideoSrc)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <RobustImg
                        src={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterImageSrc || "/avatars/ruby.png"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                )}

                {/* Broadcast Motion Data Graphic Layer */}
                <DataGraphicsLayer
                  dataGraphic={activeGraphic}
                  aspectRatio={aspectRatio}
                  startFrame={currentSegment?.startFrame || 0}
                  layout={currentStrategy === "infographic_ticker" ? "side_panel" : "fullscreen"}
                  showTickerTape={true}
                  accentColor={brandPrimaryColor || "#06b6d4"}
                />
              </AbsoluteFill>
            ) : currentStrategy === "transparent_anchor" ? (
              /* ── Strategy: transparent_anchor (MuseTalk Chroma-Keyed Floating Anchor in Corner over B-Roll / Image) ── */
              <AbsoluteFill>
                {showBackdrop && (
                  <BRollLayer
                    segments={segments}
                    globalBgVideoSrc={globalBgVideoSrc}
                    showGlobalBg={!!globalBgVideoSrc}
                  />
                )}
                {showPresenter && (
                  <PresenterBubble
                    presenterVideoSrc={presenterVideoSrc}
                    presenterImageSrc={presenterImageSrc}
                    aspectRatio={aspectRatio}
                    speaker={currentSegment?.speaker}
                    personaAvatar={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterConfig?.avatarSrc}
                    segments={segments}
                    primaryColor={brandPrimaryColor}
                    presenterConfig={presenterConfig}
                    scale={currentSegment?.mediaSettings?.presenterScale ?? presenterScale ?? presenterConfig?.scale ?? 1.0}
                    layoutMode={currentSegment?.mediaSettings?.layoutMode || presenterLayoutMode || presenterConfig?.layoutMode || "full_screen"}
                    offsetX={currentSegment?.mediaSettings?.presenterOffsetX ?? presenterOffsetX ?? presenterConfig?.offsetX ?? 0}
                    offsetY={currentSegment?.mediaSettings?.presenterOffsetY ?? presenterOffsetY ?? presenterConfig?.offsetY ?? 0}
                    bubbleFaceZoom={currentSegment?.mediaSettings?.bubbleFaceZoom ?? presenterBubbleFaceZoom ?? presenterConfig?.bubbleFaceZoom}
                    bubbleFaceOffsetY={currentSegment?.mediaSettings?.bubbleFaceOffsetY ?? presenterBubbleFaceOffsetY ?? presenterConfig?.bubbleFaceOffsetY}
                    bubbleFaceOffsetX={currentSegment?.mediaSettings?.bubbleFaceOffsetX ?? presenterBubbleFaceOffsetX ?? presenterConfig?.bubbleFaceOffsetX}
                  />
                )}
              </AbsoluteFill>
            ) : currentStrategy === "chroma_broll" ? (
              /* ── Strategy 4: chroma_broll (Chroma key anchor over custom B-Roll) ── */
              <AbsoluteFill>
                {showBackdrop && (
                  <BRollLayer
                    segments={segments}
                    globalBgVideoSrc={globalBgVideoSrc || studioSetBg}
                    showGlobalBg={!!(globalBgVideoSrc || studioSetBg)}
                  />
                )}
                {showPresenter && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      pointerEvents: "none",
                    }}
                  >
                    {currentSegment?.presenterVideoSrc ? (
                      <ChromaKeyPresenterLayer
                        videoSrc={resolveSrc(currentSegment.presenterVideoSrc)}
                        fallbackImageSrc={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterConfig?.avatarSrc || presenterImageSrc || "/avatars/ruby.png"}
                        similarity={0.42}
                        smoothness={0.16}
                        despillStrength={0.88}
                        showDropShadow={true}
                        offsetX={currentSegment?.mediaSettings?.presenterOffsetX ?? presenterOffsetX ?? presenterConfig?.offsetX ?? 0}
                        offsetY={currentSegment?.mediaSettings?.presenterOffsetY ?? presenterOffsetY ?? presenterConfig?.offsetY ?? 0}
                        scale={currentSegment?.mediaSettings?.presenterScale ?? presenterScale ?? presenterConfig?.scale ?? 1.0}
                        layoutMode={currentSegment?.mediaSettings?.layoutMode || presenterLayoutMode || presenterConfig?.layoutMode || "full_screen"}
                      />
                    ) : (
                      <PresenterBubble
                        presenterVideoSrc={presenterVideoSrc}
                        presenterImageSrc={presenterImageSrc}
                        aspectRatio={aspectRatio}
                        speaker={currentSegment?.speaker}
                        personaAvatar={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterConfig?.avatarSrc}
                        segments={segments}
                        primaryColor={brandPrimaryColor}
                        presenterConfig={presenterConfig}
                        scale={currentSegment?.mediaSettings?.presenterScale ?? presenterScale ?? presenterConfig?.scale ?? 1.0}
                        layoutMode={currentSegment?.mediaSettings?.layoutMode || presenterLayoutMode || presenterConfig?.layoutMode || "full_screen"}
                        offsetX={currentSegment?.mediaSettings?.presenterOffsetX ?? presenterOffsetX ?? presenterConfig?.offsetX ?? 0}
                        offsetY={currentSegment?.mediaSettings?.presenterOffsetY ?? presenterOffsetY ?? presenterConfig?.offsetY ?? 0}
                        bubbleFaceZoom={currentSegment?.mediaSettings?.bubbleFaceZoom ?? presenterBubbleFaceZoom ?? presenterConfig?.bubbleFaceZoom}
                        bubbleFaceOffsetY={currentSegment?.mediaSettings?.bubbleFaceOffsetY ?? presenterBubbleFaceOffsetY ?? presenterConfig?.bubbleFaceOffsetY}
                        bubbleFaceOffsetX={currentSegment?.mediaSettings?.bubbleFaceOffsetX ?? presenterBubbleFaceOffsetX ?? presenterConfig?.bubbleFaceOffsetX}
                      />
                    )}
                  </div>
                )}
              </AbsoluteFill>
            ) : (
              /* ── Strategy 5/6: Standard Bubble / State Machine / Full ── */
              <AbsoluteFill>
                {showBackdrop && (
                  <BRollLayer
                    segments={bRollSegments}
                    globalBgVideoSrc={globalBgVideoSrc || studioSetBg}
                    showGlobalBg={!!(globalBgVideoSrc || studioSetBg)}
                  />
                )}

                {showPresenter && (
                  presenterMode === "state_machine" || segments.some((s) => s.targetState) ? (
                    <StateMachinePresenterLayer
                      segments={segments}
                      aspectRatio={aspectRatio}
                      defaultPersonaId={currentSegment?.personaId || currentPersona?.id || "ruby"}
                      defaultAvatarSrc={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterConfig?.avatarSrc || presenterImageSrc}
                    />
                  ) : (
                    <PresenterBubble
                      presenterVideoSrc={presenterVideoSrc}
                      presenterImageSrc={presenterImageSrc}
                      aspectRatio={aspectRatio}
                      speaker={currentSegment?.speaker}
                      personaAvatar={currentSegment?.personaAvatarUrl || currentPersona?.avatarUrl || presenterConfig?.avatarSrc}
                      segments={segments}
                      primaryColor={brandPrimaryColor}
                      presenterConfig={presenterConfig}
                      scale={currentSegment?.mediaSettings?.presenterScale ?? presenterScale ?? presenterConfig?.scale ?? 1.0}
                      layoutMode={currentSegment?.mediaSettings?.layoutMode || presenterLayoutMode || presenterConfig?.layoutMode || "full_screen"}
                      offsetX={currentSegment?.mediaSettings?.presenterOffsetX ?? presenterOffsetX ?? presenterConfig?.offsetX ?? 0}
                      offsetY={currentSegment?.mediaSettings?.presenterOffsetY ?? presenterOffsetY ?? presenterConfig?.offsetY ?? 0}
                      bubbleFaceZoom={currentSegment?.mediaSettings?.bubbleFaceZoom ?? presenterBubbleFaceZoom ?? presenterConfig?.bubbleFaceZoom}
                      bubbleFaceOffsetY={currentSegment?.mediaSettings?.bubbleFaceOffsetY ?? presenterBubbleFaceOffsetY ?? presenterConfig?.bubbleFaceOffsetY}
                      bubbleFaceOffsetX={currentSegment?.mediaSettings?.bubbleFaceOffsetX ?? presenterBubbleFaceOffsetX ?? presenterConfig?.bubbleFaceOffsetX}
                    />
                  )
                )}
              </AbsoluteFill>
            )}

            {/* Layer: Stickers */}
            <StickersLayer 
              stickers={currentSegment?.stickers} 
              startFrame={currentSegment?.startFrame}
            />

            {/* Layer: Lower Thirds */}
            {showHeadline && (
              <LowerThirdsLayer 
                currentSegment={currentSegment ?? null} 
                aspectRatio={aspectRatio} 
                personaName={currentPersona?.name}
                personaTitle={currentPersona?.title}
                primaryColor={brandPrimaryColor}
                secondaryColor={brandSecondaryColor}
              />
            )}

            {/* Layer: Verified Citation Badge */}
            {showCitationBadge && (
              <CitationBadgeLayer
                position="top-left"
                primaryColor={brandPrimaryColor}
                offsetX={citationBadgeOffsetX}
                offsetY={citationBadgeOffsetY}
              />
            )}

            {/* Layer: Captions */}
            {showCaptions && (
              <CaptionsLayer 
                segments={segments} 
                aspectRatio={aspectRatio} 
                captionStyle={captionStyle} 
                primaryColor={brandPrimaryColor}
                secondaryColor={brandSecondaryColor}
                enableDualCaptions={enableDualCaptions}
                secondaryCaptionColor={secondaryCaptionColor}
              />
            )}

            {/* Layer: Branding & Watermark */}
            {showBrandLogo && (
              <BrandingLayer 
                aspectRatio={aspectRatio} 
                segments={segments} 
                includeOutro={false} 
                feedName="Tech News" 
                watermarkSrc={watermarkSrc}
                offsetX={brandLogoOffsetX}
                offsetY={brandLogoOffsetY}
                scale={brandLogoScale}
              />
            )}

            {/* Main Voice Audio track */}
            {audioSrc ? (
              <Audio src={resolveSrc(audioSrc)} />
            ) : (
              <VoiceLayer segments={segments} />
            )}

            {/* Master Audio Ducking Layer (-14dB dialogue dips, -2dB pause swells) */}
            {(bgMusicSrc || ambienceTrackPath) && (
              <AudioDuckingLayer
                bgMusicPath={bgMusicSrc}
                baseMusicVolume={stemVolumes?.music ?? bgMusicVolume ?? 0.25}
                ambienceTrackPath={ambienceTrackPath}
                ambienceVolume={stemVolumes?.ambience ?? 0.12}
                duckingDb={-14}
                swellDb={-2}
                segments={segments}
                attackFrames={8}
                releaseFrames={12}
              />
            )}

            <PrerenderedClipLayer currentSegment={currentSegment ?? null} />

            {/* VTuber/Streamer Mode — Animated Stream Chat Overlay */}
            {showStreamChat && (
              <StreamChatLayer
                messages={streamChatMessages}
                position="right"
              />
            )}

            {/* On-the-Fly Dynamic Script Overlays (Micro-stats, counters, entities, alerts, particle fx) */}
            <DynamicOverlaysLayer
              segments={segments}
              introDuration={introDuration}
              aspectRatio={aspectRatio}
              showEqualizer={true}
            />


            {/* Broadcast Breaking News & Financial Marquee Ticker Tape */}
            {showTickerTape && (
              <TickerTapeLayer
                items={tickerItems}
                segments={segments}
                customTickerText={customTickerText}
                accentColor={brandPrimaryColor}
                language={language}
                offsetY={tickerTapeOffsetY}
              />
            )}

            <SafeZonesLayer aspectRatio={aspectRatio} visible={showSafeZones} />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Outro Scene */}
        {showOutro && (
          <Series.Sequence durationInFrames={90}>
            <OutroLayer 
              outroId={outroId} 
              aspectRatio={aspectRatio} 
              outroVideoSrc={outroVideoSrc}
              logoSrc={logoSrc}
              primaryColor={brandPrimaryColor}
            />
          </Series.Sequence>
        )}
      </Series>
    </AbsoluteFill>
  );
};
