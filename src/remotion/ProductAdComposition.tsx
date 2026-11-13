import React from "react";
import { useCurrentFrame, AbsoluteFill, Audio, Sequence, OffthreadVideo, Loop } from "remotion";
import { ProductAdCompositionProps, AdScene } from "@/lib/types/ecommerce";
import { AudioDuckingLayer } from "./components/AudioDuckingLayer";
import { SafeZonesLayer } from "./layers/SafeZonesLayer";
import { CommercialIntroLayer } from "./layers/ecommerce/CommercialIntroLayer";
import { CommercialOutroLayer } from "./layers/ecommerce/CommercialOutroLayer";
import { ProductHero3DLayer } from "./layers/ecommerce/ProductHero3DLayer";
import { BeforeAfterWipeLayer } from "./layers/ecommerce/BeforeAfterWipeLayer";
import { RoomVisualizerLayer } from "./layers/ecommerce/RoomVisualizerLayer";
import { MacroTextureLayer } from "./layers/ecommerce/MacroTextureLayer";
import { TortureTestLayer } from "./layers/ecommerce/TortureTestLayer";
import { PricePromoBadgeLayer } from "./layers/ecommerce/PricePromoBadgeLayer";
import { FeaturePillsLayer } from "./layers/ecommerce/FeaturePillsLayer";
import { ReviewSocialProofLayer } from "./layers/ecommerce/ReviewSocialProofLayer";
import { DimensionCalipersLayer } from "./layers/ecommerce/DimensionCalipersLayer";
import { CallToActionLayer } from "./layers/ecommerce/CallToActionLayer";
import { AdPresenterLayer } from "./layers/ecommerce/AdPresenterLayer";
import { UsVsThemComparisonLayer } from "./layers/ecommerce/UsVsThemComparisonLayer";
import { DynamicQrCodeLayer } from "./layers/ecommerce/DynamicQrCodeLayer";
import { SocialProofPopupLayer } from "./layers/ecommerce/SocialProofPopupLayer";
import { DeviceMockup3DLayer } from "./layers/ecommerce/DeviceMockup3DLayer";
import { ServiceTrustMapLayer } from "./layers/ecommerce/ServiceTrustMapLayer";
import { ProductTurntableLayer } from "./layers/ecommerce/ProductTurntableLayer";
import { FlashSaleUrgencyLayer } from "./layers/ecommerce/FlashSaleUrgencyLayer";
import { ShoppableHotspotLayer } from "./layers/ecommerce/ShoppableHotspotLayer";
import { VideoBackdropLayer } from "./layers/ecommerce/VideoBackdropLayer";
import { ProductAdCaptionsLayer } from "./layers/ecommerce/ProductAdCaptionsLayer";
import { inferTurntableForProduct } from "@/lib/ecommerce/productRelighter";
import { detectProductLanguage } from "@/lib/ecommerce/languageDetector";
import { resolveEffectivePresenter } from "@/lib/ecommerce/presenterResolver";
import { getContrastingTextColor } from "@/lib/ecommerce/colorUtils";
import { compileTurntableSfxTriggers, getTurntableAmbientTrack } from "@/lib/ecommerce/turntableAudioEngine";
import { RobustImg } from "./components/RobustImg";
import { resolveSrc } from "./utils/resolveSrc";

export const ProductAdComposition: React.FC<ProductAdCompositionProps> = ({
  productSpec,
  script,
  aspectRatio = "9:16",
  audioMode = "voiceover_tts",
  audioUrl,
  musicBedUrl,
  showSafeZones = false,
  enableSpecularSheen = true,
  accentColorOverride,
  presenter,
  showPresenter = true,
  usVsThem,
  qrCode,
  socialPopup,
  flashSaleUrgency,
  hotspotsConfig,
  baseMusicVolume = 0.35,
  duckingDb = -14,
  turntablePedestal,
  backdrop,
  captionStyle = "kinetic_glow",
  captionOffsetY = 0,
  captionOffsetX = 0,
  showCaptions = true,
  headlineOffsetY = 0,
  headlineOffsetX = 0,
  showHeadline = true,
  productOffsetX = 0,
  productOffsetY = 0,
  productScale = 1.0,
  showProductVisual = true,
  showPricePromo = true,
  pricePromoOffsetX = 0,
  pricePromoOffsetY = 0,
  pricePromoScale = 1.0,
  showCtaButton = true,
  ctaOffsetX = 0,
  ctaOffsetY = 0,
  ctaScale = 1.0,
  showTickerTape = true,
  tickerTapeOffsetY = 0,
  showBackdrop = true,
  showBrandLogo = true,
  brandLogoOffsetX = 0,
  brandLogoOffsetY = 0,
  brandLogoScale = 1.0,
  showFeaturePills = true,
  featurePillsOffsetX = 0,
  featurePillsOffsetY = 0,
  showReviewCard = true,
  reviewCardOffsetX = 0,
  reviewCardOffsetY = 0,
  reviewCardScale = 1.0,
  intro,
  outro,
}) => {
  const frame = useCurrentFrame();

  const {
    isSpanish,
    isArgentine,
    brand,
    accentColor,
    heroAssetUrl,
    lifestyleAssetUrl,
  } = React.useMemo(() => {
    const langInfo = detectProductLanguage(productSpec);
    const spanish = langInfo.isSpanish;
    const argentine = langInfo.isArgentine || productSpec?.currency === "ARS";

    const b = productSpec?.brand || {
      name: productSpec?.vendor || "Brand",
      primaryColor: "#06b6d4",
      surfaceColor: "#09090b",
      logoUrl: undefined,
    };
    const accent = accentColorOverride || b.primaryColor || "#06b6d4";

    const assets = productSpec?.assets || [];
    const rawHero =
      assets.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
      assets[0]?.url ||
      "/placeholder_product.png";

    const rawLifestyle =
      assets.find((a) => a.type === "lifestyle_context" && a.url !== rawHero)?.url ||
      rawHero;

    return {
      isSpanish: spanish,
      isArgentine: argentine,
      brand: b,
      accentColor: accent,
      heroAssetUrl: resolveSrc(rawHero),
      lifestyleAssetUrl: resolveSrc(rawLifestyle),
    };
  }, [productSpec, accentColorOverride]);

  // Calculate Intro & Outro Offsets
  const introEnabled = intro?.enabled ?? false;
  const introDuration = introEnabled ? (intro?.durationFrames || 60) : 0;

  const scenes = React.useMemo(() => script?.scenes || [], [script?.scenes]);
  const scenesDuration =
    scenes.length > 0
      ? scenes[scenes.length - 1].startFrame + scenes[scenes.length - 1].durationFrames
      : 450;

  const outroEnabled = outro?.enabled ?? false;
  const outroDuration = outroEnabled ? (outro?.durationFrames || 75) : 0;
  const outroStartFrame = introDuration + scenesDuration;

  // Scene relative frame for scene calculations
  const sceneRelativeFrame = Math.max(0, frame - introDuration);

  // Determine current active scene
  let activeScene: AdScene = scenes[0] || {
    id: "default_scene",
    sceneIndex: 0,
    startFrame: 0,
    durationFrames: 90,
    sceneType: "pattern_interrupt_hook",
    headline: productSpec?.title || "Product Showcase",
    subheadline: productSpec?.vendor || "Featured Product",
    visualActionPrompt: "Showcase product in hero lighting",
    primaryMediaUrl: heroAssetUrl,
  };

  for (const scene of scenes) {
    if (sceneRelativeFrame >= scene.startFrame && sceneRelativeFrame < scene.startFrame + scene.durationFrames) {
      activeScene = scene;
      break;
    }
  }

  // Dynamically resolve effective presenter configuration for the active scene
  // (per-scene presenterConfig overrides the commercial video-level presenter)
  const effectivePresenter = React.useMemo(() => {
    return resolveEffectivePresenter(
      presenter,
      activeScene.presenterConfig || activeScene.presenter,
      activeScene.presenterVideoUrl
    );
  }, [presenter, activeScene.presenterConfig, activeScene.presenter, activeScene.presenterVideoUrl]);

  // Derive SFX Triggers from scenes (offset by introDuration) - memoized to prevent garbage collection churn
  const sfxTriggers = React.useMemo(() => {
    const standardTriggers = scenes
      .filter((s) => s.sfxTag)
      .map((s) => {
        const tag = s.sfxTag || "";
        const match = tag.match(/\[sfx:([a-z0-9_-]+)\]/i);
        const sfxId = match ? match[1] : "whoosh";
        return {
          sfxId,
          triggerFrame: s.startFrame + introDuration,
          volume: 0.7,
        };
      });

    // Compile spatial turntable foley cues & radar hotspot chimes
    const turntableTriggers = scenes
      .filter((s) => s.sceneType === "product_turntable")
      .flatMap((s) => compileTurntableSfxTriggers(s, introDuration));

    return [...standardTriggers, ...turntableTriggers];
  }, [scenes, introDuration]);

  // Contextual ambient soundscape resolved from turntable environment
  const turntableAmbient = React.useMemo(() => {
    const turntableScene = scenes.find(
      (s) => s.sceneType === "product_turntable" && s.turntableAudioAmbient !== false
    );
    if (!turntableScene) return null;
    return getTurntableAmbientTrack(turntableScene.turntableEnvironmentId);
  }, [scenes]);

  // Speech intervals for audio ducking (offset by introDuration) - memoized
  const speechIntervals = React.useMemo(() => {
    return audioMode === "voiceover_tts"
      ? scenes.map((s) => ({
          startFrame: s.startFrame + introDuration,
          endFrame: s.startFrame + s.durationFrames - 10 + introDuration,
        }))
      : [];
  }, [scenes, introDuration, audioMode]);

  const isSurface = productSpec?.typology === "surface_material";

  return (
    <AbsoluteFill style={{ backgroundColor: brand.surfaceColor || "#09090b", overflow: "hidden" }}>
      {/* 0. Audio & SFX Ducking Engine */}
      <AudioDuckingLayer
        bgMusicPath={musicBedUrl}
        speechActive={audioMode === "voiceover_tts"}
        speechIntervals={speechIntervals}
        sfxTriggers={sfxTriggers}
        ambienceTrackPath={turntableAmbient?.path}
        ambienceVolume={turntableAmbient?.defaultVolume}
        baseMusicVolume={baseMusicVolume}
        duckingDb={duckingDb}
      />

      {/* Voiceover Audio: Master track OR Per-Scene audio tracks, offset by introDuration */}
      {audioMode === "voiceover_tts" && (
        <>
          {audioUrl ? (
            <Sequence from={introDuration} durationInFrames={scenesDuration} name="Master Voiceover">
              <Audio src={resolveSrc(audioUrl)} />
            </Sequence>
          ) : (
            scenes.map((scene) =>
              scene.audioUrl ? (
                <Sequence
                  key={`voice_${scene.id}`}
                  from={introDuration + scene.startFrame}
                  durationInFrames={Math.max(1, Math.round(scene.durationFrames))}
                  name={`Scene ${scene.sceneIndex + 1} Voiceover`}
                >
                  <Audio src={resolveSrc(scene.audioUrl)} />
                </Sequence>
              ) : null
            )
          )}
        </>
      )}

      {/* Commercial Intro Bumper Sequence */}
      {introEnabled && (
        <Sequence from={0} durationInFrames={introDuration} name="Commercial Intro Bumper">
          <CommercialIntroLayer
            config={intro}
            brand={brand}
            accentColor={accentColor}
            aspectRatio={aspectRatio}
            isSpanish={isSpanish}
          />
        </Sequence>
      )}

      {/* Main Product Commercial Scenes Sequence */}
      <Sequence from={introDuration} durationInFrames={scenesDuration} name="Product Ad Scenes">
        {/* 1. Background Layer */}
        {showBackdrop !== false && (
          <AbsoluteFill>
            {/* If active scene has no custom video background, render room visualizer or ambient backdrop */}
            {!(
              activeScene.sceneType === "custom_veo_hero" ||
              activeScene.customVeoVideoUrl ||
              activeScene.customTurntableVideoUrl ||
              (activeScene.primaryMediaUrl &&
                (activeScene.primaryMediaUrl.endsWith(".mp4") ||
                  activeScene.primaryMediaUrl.endsWith(".webm") ||
                  activeScene.primaryMediaUrl.includes("veo_")))
            ) &&
              (activeScene.sceneType === "scene_background" ? (
                <RoomVisualizerLayer
                  roomImageSrc={activeScene.secondaryMediaUrl || activeScene.primaryMediaUrl || lifestyleAssetUrl}
                  surfaceTextureUrl={undefined}
                  startFrame={activeScene.startFrame}
                  durationFrames={activeScene.durationFrames}
                  accentColor={accentColor}
                  cleanBackgroundMode={true}
                />
              ) : activeScene.sceneType === "room_staging" ? (
                <RoomVisualizerLayer
                  roomImageSrc={activeScene.secondaryMediaUrl || activeScene.primaryMediaUrl || lifestyleAssetUrl}
                  surfaceTextureUrl={
                    activeScene.secondaryMediaUrl && !activeScene.secondaryMediaUrl.includes("photo_")
                      ? activeScene.primaryMediaUrl
                      : undefined
                  }
                  startFrame={activeScene.startFrame}
                  durationFrames={activeScene.durationFrames}
                  accentColor={accentColor}
                  roomTypeLabel={activeScene.headline ? activeScene.headline.toUpperCase() : undefined}
                />
              ) : (
                <VideoBackdropLayer
                  config={backdrop}
                  surfaceColor={brand.surfaceColor}
                  accentColor={accentColor}
                  aspectRatio={aspectRatio}
                  lifestyleAssetUrl={activeScene.secondaryMediaUrl || lifestyleAssetUrl}
                />
              ))}

            {/* Per-scene Video Backgrounds: sequence per scene so playback always starts from frame 0 of each scene and loops if needed */}
            {scenes.map((scene) => {
              const videoUrl =
                scene.customTurntableVideoUrl ||
                scene.customVeoVideoUrl ||
                (scene.primaryMediaUrl &&
                (scene.primaryMediaUrl.endsWith(".mp4") ||
                  scene.primaryMediaUrl.endsWith(".webm") ||
                  scene.primaryMediaUrl.includes("veo_"))
                  ? scene.primaryMediaUrl
                  : null);

              if (!videoUrl) return null;

              return (
                <Sequence
                  key={`bg_video_${scene.id || scene.sceneIndex}`}
                  from={scene.startFrame}
                  durationInFrames={Math.max(1, Math.round(scene.durationFrames))}
                  name={`Scene ${scene.sceneIndex + 1} Video Background`}
                >
                  <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
                    {scene.durationFrames > 240 ? (
                      <Loop durationInFrames={240}>
                        <OffthreadVideo
                          src={resolveSrc(videoUrl)}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          muted={scene.muteVideoAudio ?? true}
                          volume={scene.muteVideoAudio === false ? 1 : 0}
                        />
                      </Loop>
                    ) : (
                      <OffthreadVideo
                        src={resolveSrc(videoUrl)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        muted={scene.muteVideoAudio ?? true}
                        volume={scene.muteVideoAudio === false ? 1 : 0}
                      />
                    )}
                    {/* Cinematic subtle bottom gradient for subtitle & badge legibility */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.3) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </Sequence>
              );
            })}
          </AbsoluteFill>
        )}

      {/* 2. Visual Hero Presentation */}
      {showProductVisual !== false && (
        <AbsoluteFill
          style={{
            transform: `translate3d(${productOffsetX}px, ${productOffsetY}px, 0) scale(${productScale})`,
            transformOrigin: "center center",
          }}
        >
        {activeScene.sceneType === "custom_veo_hero" ||
        activeScene.sceneType === "scene_background" ||
        Boolean(activeScene.customTurntableVideoUrl) ||
        (activeScene.sceneType === "room_staging" && !activeScene.removeWhiteBg) ||
        (activeScene.primaryMediaUrl && (activeScene.primaryMediaUrl.endsWith(".mp4") || activeScene.primaryMediaUrl.endsWith(".webm"))) ? null : activeScene.sceneType === "before_after_wipe" ? (
          <BeforeAfterWipeLayer
            beforeImageSrc={activeScene.secondaryMediaUrl || lifestyleAssetUrl}
            afterImageSrc={activeScene.primaryMediaUrl || heroAssetUrl}
            startFrame={activeScene.startFrame}
            wipeDurationFrames={Math.min(activeScene.durationFrames, 60)}
            accentColor={accentColor}
          />
        ) : activeScene.sceneType === "macro_texture_zoom" ? (
          <MacroTextureLayer
            textureImageSrc={heroAssetUrl}
            startFrame={activeScene.startFrame}
            durationFrames={activeScene.durationFrames}
            accentColor={accentColor}
          />
        ) : activeScene.sceneType === "device_mockup_screen" ? (
          <DeviceMockup3DLayer
            screenMediaUrl={activeScene.primaryMediaUrl || heroAssetUrl}
            startFrame={activeScene.startFrame}
            accentColor={accentColor}
            deviceType={
              productSpec.typologySpecifics?.digitalSaas?.platformType === "ios" ||
              productSpec.typologySpecifics?.digitalSaas?.platformType === "android"
                ? "phone"
                : "laptop"
            }
            timeSavedMetric={productSpec.typologySpecifics?.digitalSaas?.timeSavedMetric}
            integrations={productSpec.typologySpecifics?.digitalSaas?.integrations}
            brandName={brand.name}
          />
        ) : activeScene.sceneType === "service_trust_map" ? (
          <ServiceTrustMapLayer
            startFrame={activeScene.startFrame}
            accentColor={accentColor}
            serviceArea={
              productSpec.typologySpecifics?.localService?.serviceAreaCity || "Metro Area"
            }
            responseTimeMinutes={
              productSpec.typologySpecifics?.localService?.responseTimeMinutes || 30
            }
            guaranteeYears={
              productSpec.typologySpecifics?.localService?.guaranteeYears || 10
            }
            licensedAndInsured={
              productSpec.typologySpecifics?.localService?.licensedAndInsured ?? true
            }
            googleRating={
              productSpec.typologySpecifics?.localService?.googleRating ||
              productSpec.rating ||
              4.9
            }
            googleReviewCount={
              productSpec.typologySpecifics?.localService?.googleReviewCount ||
              productSpec.reviewCount ||
              480
            }
            brandName={brand.name}
          />
        ) : activeScene.sceneType === "product_turntable" ? (
          <ProductTurntableLayer
            imageSrc={activeScene.primaryMediaUrl || heroAssetUrl}
            startFrame={activeScene.startFrame}
            durationFrames={activeScene.durationFrames}
            pedestalKey={turntablePedestal || inferTurntableForProduct(productSpec)}
            accentColor={accentColor}
            enableSheen={enableSpecularSheen}
            headline={activeScene.headline ? activeScene.headline.toUpperCase() : undefined}
            removeWhiteBg={activeScene.removeWhiteBg ?? false}
            turntableVideoUrl={activeScene.customTurntableVideoUrl || activeScene.turntable3dVideoUrl}
            enableRadarPins={activeScene.turntableEnableRadarPins !== false}
            radarPins={activeScene.turntableRadarPins}
            socialProof={activeScene.turntableSocialProof}
          />
        ) : (
          <ProductHero3DLayer
            imageSrc={activeScene.primaryMediaUrl || heroAssetUrl}
            startFrame={activeScene.startFrame}
            enableFloating={true}
            floatingMotionStyle="dancing"
            enableSpecularSheen={enableSpecularSheen}
            accentColor={accentColor}
            removeWhiteBg={activeScene.removeWhiteBg ?? false}
          />
        )}
      </AbsoluteFill>
      )}

      {/* 3. Persistent Brand Logo (Top-Left) */}
      {showBrandLogo !== false && brand.logoUrl && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 36,
            zIndex: 48,
            display: "flex",
            alignItems: "center",
            gap: 10,
            transform: `translate3d(${brandLogoOffsetX}px, ${brandLogoOffsetY}px, 0) scale(${brandLogoScale})`,
            transformOrigin: "top left",
          }}
        >
          <RobustImg
            src={brand.logoUrl}
            alt={brand.name}
            style={{
              maxHeight: 38,
              maxWidth: 140,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
            }}
          />
        </div>
      )}

      {/* 4. Co-Pilot Presenter Avatar Layer (Corner Anchor / PiP) */}
      {showPresenter !== false && (() => {
        const hasPerSceneAvatars = scenes.some(
          (s) =>
            Boolean(s.presenterVideoUrl) ||
            Boolean(s.presenterConfig?.videoUrl) ||
            Boolean(s.presenter?.videoUrl) ||
            Boolean(s.presenterConfig?.overrideDefault) ||
            Boolean(s.presenterConfig?.personaId) ||
            Boolean(s.presenter?.personaId) ||
            Boolean(s.presenterConfig?.selectedActionLoopId) ||
            Boolean(s.presenterConfig?.selectedPoseId) ||
            s.presenterConfig?.mode === "custom" ||
            s.presenterConfig?.mode === "hidden"
        );

        if (hasPerSceneAvatars) {
          // Per-scene Presenter Sequences (Identical to NewsStudio PresenterBubble architecture)
          return (
            <>
              {scenes.map((scene, idx) => {
                // If this is a Veo video scene or a persona orbit turntable scene, the presenter is already the full-frame hero. Skip avatar overlay!
                if (
                  scene.sceneType === "custom_veo_hero" ||
                  Boolean(scene.customVeoVideoUrl) ||
                  (Boolean(scene.customTurntableVideoUrl) && scene.turntableStagingArchetype === "persona_orbit")
                ) return null;

                const scenePresenter = resolveEffectivePresenter(
                  presenter,
                  scene.presenterConfig || scene.presenter,
                  scene.presenterVideoUrl
                );
                if (!scenePresenter || !scenePresenter.enabled) return null;

                // Every scene presenter should cleanly enter at the start of the scene and exit at the end of the scene
                const needsFadeIn = true;
                const needsFadeOut = true;

                return (
                  <Sequence
                    key={`ad-presenter-${scene.id || idx}`}
                    from={scene.startFrame}
                    durationInFrames={Math.max(1, Math.round(scene.durationFrames))}
                    name={`Scene ${scene.sceneIndex + 1} Presenter`}
                  >
                    <AdPresenterLayer
                      presenter={scenePresenter}
                      brandColor={accentColor}
                      isVoiceActive={audioMode === "voiceover_tts"}
                      entranceFrameOffset={0}
                      videoFrameOffset={0}
                      needsFadeIn={needsFadeIn}
                      needsFadeOut={needsFadeOut}
                      sceneDurationFrames={scene.durationFrames}
                      transitionStyle="slide_fade"
                    />
                  </Sequence>
                );
              })}
            </>
          );
        }

        // Global single-stream presenter across all scenes
        if (effectivePresenter && effectivePresenter.enabled) {
          const activeSceneIndex = scenes.findIndex((s) => s.id === activeScene.id);
          const prevScene = activeSceneIndex > 0 ? scenes[activeSceneIndex - 1] : null;
          const nextScene = activeSceneIndex >= 0 && activeSceneIndex < scenes.length - 1 ? scenes[activeSceneIndex + 1] : null;

          const prevPresenter = prevScene ? resolveEffectivePresenter(presenter, prevScene.presenterConfig || prevScene.presenter) : null;
          const nextPresenter = nextScene ? resolveEffectivePresenter(presenter, nextScene.presenterConfig || nextScene.presenter) : null;

          const needsFadeIn =
            activeSceneIndex <= 0 ||
            !prevPresenter ||
            !prevPresenter.enabled ||
            prevPresenter.personaId !== effectivePresenter.personaId ||
            prevPresenter.position !== effectivePresenter.position;

          const needsFadeOut =
            activeSceneIndex === scenes.length - 1 ||
            !nextPresenter ||
            !nextPresenter.enabled ||
            nextPresenter.personaId !== effectivePresenter.personaId ||
            nextPresenter.position !== effectivePresenter.position;

          const sceneLocalFrame = Math.max(0, sceneRelativeFrame - activeScene.startFrame);

          return (
            <Sequence from={0} durationInFrames={scenesDuration} name="Global Presenter">
              <AdPresenterLayer
                presenter={effectivePresenter}
                brandColor={accentColor}
                isVoiceActive={audioMode === "voiceover_tts"}
                entranceFrameOffset={0}
                videoFrameOffset={0}
                needsFadeIn={needsFadeIn}
                needsFadeOut={needsFadeOut}
                sceneLocalFrame={sceneLocalFrame}
                sceneDurationFrames={activeScene.durationFrames}
                transitionStyle="slide_fade"
              />
            </Sequence>
          );
        }

        return null;
      })()}




      {/* 5c. Us vs. Them Comparison Battle Card Layer */}
      {usVsThem && usVsThem.enabled && (
        <UsVsThemComparisonLayer
          config={usVsThem}
          primaryColor={accentColor}
          aspectRatio={aspectRatio}
        />
      )}

      {/* 5d. Floating Social Proof Notification Popup */}
      {socialPopup && socialPopup.enabled && (
        <SocialProofPopupLayer
          config={socialPopup}
          primaryColor={accentColor}
          aspectRatio={aspectRatio}
        />
      )}

      {/* 5e. Dynamic QR Code Bug Overlay (Scan To Buy) */}
      {qrCode && qrCode.enabled && (
        <DynamicQrCodeLayer
          config={{
            ...qrCode,
            label: qrCode.label || (isSpanish ? (isArgentine ? "ESCANEÁ Y COMPRÁ" : "ESCANEA Y COMPRA") : "SCAN TO BUY"),
            sublabel: qrCode.sublabel || (isSpanish ? "COMPRA DIRECTA" : "DIRECT CHECKOUT"),
          }}
          primaryColor={accentColor}
          aspectRatio={aspectRatio}
        />
      )}

      {/* 5f. Dynamic Flash Sale Urgency & Live Stock Counter Layer */}
      {flashSaleUrgency && flashSaleUrgency.enabled && (
        <FlashSaleUrgencyLayer
          config={flashSaleUrgency}
          aspectRatio={aspectRatio}
        />
      )}

      {/* 5g. Interactive Shoppable Hotspot Pins Layer */}
      {hotspotsConfig && hotspotsConfig.enabled && (
        <ShoppableHotspotLayer
          config={hotspotsConfig}
          accentColor={accentColor}
          aspectRatio={aspectRatio}
        />
      )}

      {/* 6. Dynamic Overlays Container */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: aspectRatio === "9:16" ? "95px 28px 65px 28px" : "40px 32px 45px 32px",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        {/* Top Region: Kinetic Headline & Spoken Subtitles */}
        <div style={{ textAlign: "center", width: "100%" }}>
          {showHeadline !== false && activeScene.sceneType !== "social_proof_review" && (
            <>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: aspectRatio === "9:16" ? 40 : 32,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.95)",
                  lineHeight: 1.18,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  transform: `translate3d(${headlineOffsetX}px, ${headlineOffsetY}px, 0)`,
                }}
              >
                {activeScene.headline}
              </div>
            </>
          )}

          {/* Dynamic Word-Illuminated Spoken Subtitles (Positioned at Top to keep Center & Persona clean) */}
          {showCaptions !== false && activeScene.voiceoverScript && (activeScene.captionStyle || captionStyle) !== "hidden" && (
            <ProductAdCaptionsLayer
              text={activeScene.voiceoverScript}
              sceneStartFrame={activeScene.startFrame}
              sceneDurationFrames={activeScene.durationFrames}
              audioDurationFrames={activeScene.audioDuration ? Math.round(activeScene.audioDuration * 30) : undefined}
              aspectRatio={aspectRatio}
              accentColor={accentColor}
              styleType={activeScene.captionStyle || captionStyle || "kinetic_glow"}
              offsetY={captionOffsetY}
              offsetX={captionOffsetX}
            />
          )}
        </div>

        {/* Center Region: Specific HUD Badges & Kinetic Punch Captions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 16,
          }}
        >
          {activeScene.sceneType === "torture_stress_test" ? (
            <TortureTestLayer
              startFrame={activeScene.startFrame}
              accentColor={accentColor}
              badges={[
                {
                  icon: "💧",
                  title: isSpanish ? "100% IMPERMEABLE" : "100% WATERPROOF",
                  subtitle: isSpanish ? "Barrera contra derrames y humedad" : "72-Hour Standing Spill Barrier",
                  accentColor: "#06b6d4",
                },
                {
                  icon: "🐾",
                  title: isSpanish ? "MÁXIMA RESISTENCIA" : "PET CLAW RESISTANT",
                  subtitle: isSpanish ? "Capa de alto tránsito anti-rayones" : "AC4 Commercial Protective Wear Layer",
                  accentColor: "#10b981",
                },
              ]}
            />
          ) : activeScene.sceneType === "social_proof_review" ? (
            showReviewCard !== false && (
              <div
                style={{
                  transform: `translate3d(${reviewCardOffsetX}px, ${reviewCardOffsetY}px, 0) scale(${reviewCardScale})`,
                  transformOrigin: "center center",
                }}
              >
                <ReviewSocialProofLayer
                  reviewText={
                    activeScene.subheadline?.replace(/^"|"$/g, "") ||
                    productSpec?.topReviews?.[0]?.body ||
                    "Honestly the best purchase I made all year!"
                  }
                  author={
                    productSpec?.topReviews?.[0]?.author ||
                    (activeScene.headline?.includes("•")
                      ? activeScene.headline.split("•")[1].trim()
                      : isSpanish
                      ? "Cliente Verificado"
                      : "Verified Customer")
                  }
                  rating={productSpec?.topReviews?.[0]?.rating || 5}
                  title={productSpec?.topReviews?.[0]?.title}
                  location={
                    productSpec?.topReviews?.[0]?.objectionSolved
                      ? `Solved: ${productSpec.topReviews[0].objectionSolved.replace(/_/g, " ")}`
                      : undefined
                  }
                  highlightPhrase={activeScene.featureBadgeText}
                  startFrame={activeScene.startFrame}
                  accentColor={accentColor}
                  aspectRatio={aspectRatio}
                  verifiedBuyer={productSpec?.topReviews?.[0]?.verifiedBuyer ?? true}
                  platform={script.targetChannel === "amazon_listing" ? "amazon" : "shopify"}
                />
              </div>
            )
          ) : activeScene.sceneType === "price_promo_outro" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {showPricePromo !== false && (
                <div
                  style={{
                    transform: `translate3d(${pricePromoOffsetX}px, ${pricePromoOffsetY}px, 0) scale(${pricePromoScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <PricePromoBadgeLayer
                    price={productSpec.price}
                    compareAtPrice={productSpec.compareAtPrice}
                    currency={productSpec.currency}
                    discountPercentage={script.discountPercentage}
                    promoCode={script.promoCode}
                    startFrame={activeScene.startFrame}
                    accentColor={accentColor}
                  />
                </div>
              )}
              {showCtaButton !== false && (
                <div
                  style={{
                    transform: `translate3d(${ctaOffsetX}px, ${ctaOffsetY}px, 0) scale(${ctaScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <CallToActionLayer
                    ctaText={script.callToAction}
                    targetChannel={script.targetChannel}
                    startFrame={activeScene.startFrame + 10}
                    accentColor={accentColor}
                  />
                </div>
              )}
            </div>
          ) : activeScene.sceneType === "3d_exploded_blueprint" ? (
            <DimensionCalipersLayer
              widthLabel={
                isSurface
                  ? productSpec?.typologySpecifics?.surfaceMaterial?.dimensions
                    ? `FORMATO ${productSpec.typologySpecifics.surfaceMaterial.dimensions.toUpperCase()}`
                    : isSpanish
                    ? "DIMENSIÓN EXACTA"
                    : "7.5\" WIDTH"
                  : isSpanish
                  ? "AJUSTE ERGONÓMICO"
                  : "COMPACT ERGONOMIC FIT"
              }
              heightLabel={
                isSurface
                  ? productSpec?.typologySpecifics?.surfaceMaterial?.thickness
                    ? `${productSpec.typologySpecifics.surfaceMaterial.thickness.toUpperCase()} ${isSpanish ? "ESPESOR" : "THICKNESS"}`
                    : isSpanish
                    ? "ALTA RESISTENCIA"
                    : "48\" LENGTH"
                  : isSpanish
                  ? "ULTRA LIVIANO"
                  : "LIGHTWEIGHT"
              }
              doorwayClearance={
                isSurface
                  ? productSpec?.typologySpecifics?.surfaceMaterial?.rectified
                    ? isSpanish
                      ? "RECTIFICADO PRECISO"
                      : "PRECISION RECTIFIED"
                    : isSpanish
                    ? "SIN OBRA HÚMEDA"
                    : "UNICLIC® ZERO GLUE"
                  : isSpanish
                  ? "COMPACTO Y PORTÁTIL"
                  : "POCKET PORTABLE"
              }
              startFrame={activeScene.startFrame}
              accentColor={accentColor}
            />
          ) : activeScene.sceneType === "pattern_interrupt_hook" ||
            activeScene.sceneType === "before_after_wipe" ||
            activeScene.sceneType === "device_mockup_screen" ||
            activeScene.sceneType === "service_trust_map" ||
            activeScene.sceneType === "custom_veo_hero" ||
            Boolean(activeScene.customVeoVideoUrl) ? null : (
            showFeaturePills !== false && (
              <div
                style={{
                  transform: `translate3d(${featurePillsOffsetX}px, ${featurePillsOffsetY}px, 0)`,
                }}
              >
                <FeaturePillsLayer
                  features={productSpec?.bulletPoints || []}
                  startFrame={activeScene.startFrame}
                  accentColor={accentColor}
                />
              </div>
            )
          )}
        </div>


      </AbsoluteFill>


      {/* 7. Bottom Live Wire Ticker Tape (Uses Brand Parsed Color) */}
      {showTickerTape !== false && (() => {
        const tickerTextColor = getContrastingTextColor(accentColor);
        return (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: aspectRatio === "9:16" ? 50 : 34,
              backgroundColor: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              zIndex: 50,
              transform: `translate3d(0, ${tickerTapeOffsetY || 0}px, 0)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: tickerTextColor,
                fontWeight: 900,
                fontSize: aspectRatio === "9:16" ? 17 : 13,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: tickerTextColor,
                }}
              />
              <span>{isSpanish ? "• OFERTA DESTACADA" : "• LIVE DEAL"}</span>
            </div>
            <div
              style={{
                color: tickerTextColor,
                fontWeight: 800,
                fontSize: aspectRatio === "9:16" ? 16 : 12,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.4px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                maxWidth: "75%",
              }}
            >
            {productSpec.title.toUpperCase()} •{" "}
            {productSpec.compareAtPrice
              ? isSpanish
                ? isArgentine
                  ? `AHORRÁ ${Math.round(
                      ((productSpec.compareAtPrice - productSpec.price) /
                        productSpec.compareAtPrice) *
                        100
                    )}% HOY`
                  : `AHORRA ${Math.round(
                      ((productSpec.compareAtPrice - productSpec.price) /
                        productSpec.compareAtPrice) *
                        100
                    )}% HOY`
                : `SAVE ${Math.round(
                    ((productSpec.compareAtPrice - productSpec.price) /
                      productSpec.compareAtPrice) *
                      100
                  )}% TODAY`
              : isSpanish
              ? "OFERTA EXCLUSIVA"
              : "EXCLUSIVE COMMERCIAL OFFER"}
          </div>
        </div>
        );
      })()}
      </Sequence>

      {/* Commercial Outro End-Card Sequence */}
      {outroEnabled && (
        <Sequence from={outroStartFrame} durationInFrames={outroDuration} name="Commercial Outro CTA">
          <CommercialOutroLayer
            config={outro}
            brand={brand}
            accentColor={accentColor}
            aspectRatio={aspectRatio}
            isSpanish={isSpanish}
            productRating={productSpec?.rating || 4.9}
            productReviewCount={productSpec?.reviewCount || 1240}
          />
        </Sequence>
      )}

      {/* Mobile Safe Zones Visualizer */}
      <SafeZonesLayer
        aspectRatio={
          aspectRatio === "9:16" || aspectRatio === "4:5"
            ? "vertical"
            : aspectRatio === "1:1"
            ? "square"
            : "horizontal"
        }
        visible={showSafeZones}
      />
    </AbsoluteFill>
  );
};
