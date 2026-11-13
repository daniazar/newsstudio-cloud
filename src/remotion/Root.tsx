import React from "react";
import { Composition, registerRoot } from "remotion";
import { NewsComposition } from "./NewsComposition";
import { ThumbnailComposition } from "./ThumbnailComposition";
import { Broadcast3CameraComposition } from "./Broadcast3CameraComposition";
import { ShortsComposition } from "./ShortsComposition";
import { ProductAdComposition } from "./ProductAdComposition";
import type { CompositionProps, RemotionSegment } from "../lib/types";
import type { ProductAdCompositionProps } from "@/lib/types/ecommerce";

// Default placeholder segments for preview
const defaultSegments: RemotionSegment[] = [
  {
    index: 0,
    startFrame: 0,
    endFrame: 360,
    text: "Breaking news in the world of technology. A major breakthrough has just been announced.",
    bRollType: "placeholder",
    cameraCue: "cam1_wide",
    actionLoop: "state_intro_welcome",
  },
  {
    index: 1,
    startFrame: 360,
    endFrame: 720,
    text: "The new AI model has shattered all existing benchmarks, setting a new standard for the industry.",
    bRollType: "placeholder",
    cameraCue: "cam2_left",
    actionLoop: "state_explaining",
  },
  {
    index: 2,
    startFrame: 720,
    endFrame: 1080,
    text: "Industry experts are calling this a paradigm shift. The implications are massive.",
    bRollType: "placeholder",
    cameraCue: "cam3_closeup",
    actionLoop: "state_breaking_alert",
  },
  {
    index: 3,
    startFrame: 1080,
    endFrame: 1440,
    text: "Companies are already racing to integrate this technology into their products and services.",
    bRollType: "placeholder",
    cameraCue: "cam2_left",
    actionLoop: "state_gesture_left",
  },
  {
    index: 4,
    startFrame: 1440,
    endFrame: 1800,
    text: "Stay tuned for more updates. The future of tech is being written right now.",
    bRollType: "placeholder",
    cameraCue: "cam1_wide",
    actionLoop: "state_signoff_outro",
  },
];

const defaultProps: CompositionProps = {
  aspectRatio: "vertical",
  segments: defaultSegments,
  presenterImageSrc: "/placeholder_ruby.png",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical — Instagram/TikTok (9:16) */}
      <Composition
        id="RubyNews-Vertical"
        component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: 90 + mainDuration + 90, // Intro (90) + Main + Outro (90)
          };
        }}
        defaultProps={{
          ...defaultProps,
          aspectRatio: "vertical",
        } as Record<string, unknown>}
      />

      {/* Horizontal — YouTube (16:9) */}
      <Composition
        id="RubyNews-Horizontal"
        component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: 90 + mainDuration + 90, // Intro (90) + Main + Outro (90)
          };
        }}
        defaultProps={{
          ...defaultProps,
          aspectRatio: "horizontal",
        } as Record<string, unknown>}
      />

      {/* Square — Instagram Feed / LinkedIn / Facebook (1:1 1080x1080) */}
      <Composition
        id="RubyNews-Square"
        component={NewsComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: 90 + mainDuration + 90, // Intro (90) + Main + Outro (90)
          };
        }}
        defaultProps={{
          ...defaultProps,
          aspectRatio: "square",
        } as Record<string, unknown>}
      />

      {/* 3-Camera Broadcast Studio Array — Master 16:9 Composition */}
      <Composition
        id="RubyNews-3CameraBroadcast-Horizontal"
        component={Broadcast3CameraComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: mainDuration,
          };
        }}
        defaultProps={{
          segments: defaultSegments,
          aspectRatio: "horizontal",
          activeCam: "cam1_wide",
        } as Record<string, unknown>}
      />

      {/* 3-Camera Broadcast Studio Array — Vertical (9:16 Shorts/Reels/TikTok) */}
      <Composition
        id="RubyNews-3CameraBroadcast-Vertical"
        component={Broadcast3CameraComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: mainDuration,
          };
        }}
        defaultProps={{
          segments: defaultSegments,
          aspectRatio: "vertical",
          activeCam: "cam1_wide",
        } as Record<string, unknown>}
      />

      {/* 3-Camera Broadcast Studio Array — Square (1:1 Feed/LinkedIn/Instagram) */}
      <Composition
        id="RubyNews-3CameraBroadcast-Square"
        component={Broadcast3CameraComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const segments = (props.segments as RemotionSegment[]) || [];
          const mainDuration = segments.length > 0 ? segments[segments.length - 1].endFrame : 1800;
          return {
            durationInFrames: mainDuration,
          };
        }}
        defaultProps={{
          segments: defaultSegments,
          aspectRatio: "square",
          activeCam: "cam1_wide",
        } as Record<string, unknown>}
      />

      {/* Thumbnail — Vertical */}
      <Composition
        id="RubyNews-Thumbnail-Vertical"
        component={ThumbnailComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          ...defaultProps,
          aspectRatio: "vertical",
        } as Record<string, unknown>}
      />

      {/* Thumbnail — Horizontal */}
      <Composition
        id="RubyNews-Thumbnail-Horizontal"
        component={ThumbnailComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          ...defaultProps,
          aspectRatio: "horizontal",
        } as Record<string, unknown>}
      />

      {/* Viral Shorts & Auto-Reels (9:16 Vertical) */}
      <Composition
        id="RubyNews-ViralShorts"
        component={ShortsComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={900} // 30 seconds default
        defaultProps={{
          hookHeadline: "THIS CHANGES EVERYTHING",
          hookBadge: "🚨 BREAKING REPORT",
          captionStyle: "hormozi_glow",
          imageSrc: "/avatars/ruby.png",
          channelHandle: "@RubyNewsAI",
        } as Record<string, unknown>}
      />



      {/* ============================================================ */}
      {/* Ruby E-Commerce Product-to-Video Engine Compositions         */}
      {/* ============================================================ */}

      {/* Product Ad Vertical — 9:16 (1080x1920) for TikTok, Reels, Shorts */}
      <Composition
        id="ProductAd-Vertical"
        component={ProductAdComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as ProductAdCompositionProps;
          const introFrames = p?.intro?.enabled ? (p.intro.durationFrames || 60) : 0;
          const outroFrames = p?.outro?.enabled ? (p.outro.durationFrames || 75) : 0;
          const scenes = p?.script?.scenes || [];
          const lastScene = scenes[scenes.length - 1];
          const scenesDuration = lastScene
            ? lastScene.startFrame + lastScene.durationFrames
            : (p?.script?.totalFrames || 600);
          return {
            durationInFrames: Math.max(90, introFrames + scenesDuration + outroFrames),
          };
        }}
        defaultProps={{
          productSpec: defaultSampleProductSpec,
          script: defaultSampleAdScript,
          aspectRatio: "9:16",
          audioMode: "voiceover_tts",
          showSafeZones: false,
          presenter: {
            enabled: true,
            personaId: "sofia",
            position: "bottom_right",
            scale: 1.0,
            nameTag: "Sofia • Tech Reviewer",
            role: "spokesperson",
            showNameBadge: true,
          },
          watermark: {
            enabled: true,
            position: "top_right",
            opacity: 0.85,
            scale: 1.0,
            showDomainTag: true,
          },
        } as unknown as Record<string, unknown>}
      />

      {/* Product Ad Landscape — 16:9 (1920x1080) for Amazon, Shopify Desktop */}
      <Composition
        id="ProductAd-Landscape"
        component={ProductAdComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as ProductAdCompositionProps;
          const introFrames = p?.intro?.enabled ? (p.intro.durationFrames || 60) : 0;
          const outroFrames = p?.outro?.enabled ? (p.outro.durationFrames || 75) : 0;
          const scenes = p?.script?.scenes || [];
          const lastScene = scenes[scenes.length - 1];
          const scenesDuration = lastScene
            ? lastScene.startFrame + lastScene.durationFrames
            : (p?.script?.totalFrames || 600);
          return {
            durationInFrames: Math.max(90, introFrames + scenesDuration + outroFrames),
          };
        }}
        defaultProps={{
          productSpec: defaultSampleProductSpec,
          script: { ...defaultSampleAdScript, aspectRatio: "16:9" },
          aspectRatio: "16:9",
          audioMode: "voiceover_tts",
          showSafeZones: false,
          presenter: {
            enabled: true,
            personaId: "sofia",
            position: "bottom_right",
            scale: 1.0,
            nameTag: "Sofia • Tech Reviewer",
            role: "spokesperson",
            showNameBadge: true,
          },
          watermark: {
            enabled: true,
            position: "top_right",
            opacity: 0.85,
            scale: 1.0,
            showDomainTag: true,
          },
        } as unknown as Record<string, unknown>}
      />

      {/* Product Ad Square — 1:1 (1080x1080) for Meta Feed & Instagram Carousel */}
      <Composition
        id="ProductAd-Square"
        component={ProductAdComposition as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={1080}
        height={1080}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as ProductAdCompositionProps;
          const introFrames = p?.intro?.enabled ? (p.intro.durationFrames || 60) : 0;
          const outroFrames = p?.outro?.enabled ? (p.outro.durationFrames || 75) : 0;
          const scenes = p?.script?.scenes || [];
          const lastScene = scenes[scenes.length - 1];
          const scenesDuration = lastScene
            ? lastScene.startFrame + lastScene.durationFrames
            : (p?.script?.totalFrames || 600);
          return {
            durationInFrames: Math.max(90, introFrames + scenesDuration + outroFrames),
          };
        }}
        defaultProps={{
          productSpec: defaultSampleProductSpec,
          script: { ...defaultSampleAdScript, aspectRatio: "1:1" },
          aspectRatio: "1:1",
          audioMode: "voiceover_tts",
          showSafeZones: false,
          presenter: {
            enabled: true,
            personaId: "sofia",
            position: "bottom_right",
            scale: 1.0,
            nameTag: "Sofia • Tech Reviewer",
            role: "spokesperson",
            showNameBadge: true,
          },
          watermark: {
            enabled: true,
            position: "top_right",
            opacity: 0.85,
            scale: 1.0,
            showDomainTag: true,
          },
        } as unknown as Record<string, unknown>}
      />
    </>
  );
};

const defaultSampleProductSpec = {
  id: "sample_oak_flooring",
  sourceUrl: "https://luxefloor.com/products/natural-oak",
  title: "Natural European White Oak Engineered Hardwood Flooring",
  vendor: "LuxeFloor Co",
  description: "Transform your home with authentic European White Oak planks.",
  bulletPoints: [
    "100% Waterproof with 72-hour spill barrier",
    "Uniclic® DIY interlocking with zero glue",
    "Scratch-resistant AC4 commercial wear layer",
  ],
  price: 89.99,
  compareAtPrice: 129.99,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 142,
  typology: "surface_material" as const,
  brand: {
    name: "LuxeFloor Co",
    domain: "luxefloor.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "minimalist_luxury" as const,
    taglines: ["Engineered for Living"],
  },
  variants: [],
  assets: [
    {
      id: "asset_0",
      url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      type: "hero_packshot" as const,
      isPrimary: true,
    },
    {
      id: "asset_1",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080",
      type: "lifestyle_context" as const,
    },
  ],
  topReviews: [
    {
      id: "rev_1",
      author: "Sarah M.",
      rating: 5,
      body: "Completely transformed our home. Dogs run on it daily and not a single scratch!",
      verifiedBuyer: true,
    },
  ],
  scrapedAt: new Date().toISOString(),
};

const defaultSampleAdScript = {
  id: "script_sample",
  archetype: "pdp_showcase" as const,
  targetChannel: "tiktok_shop" as const,
  aspectRatio: "9:16" as const,
  durationSeconds: 20,
  totalFrames: 600,
  fps: 30,
  scenes: [
    {
      id: "scene_1",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 120,
      sceneType: "before_after_wipe" as const,
      headline: "Tired of Outdated, Scuffed Floors?",
      subheadline: "Watch the transformation...",
      visualActionPrompt: "Curtain wipe reveal",
      primaryMediaUrl: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      secondaryMediaUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080",
      sfxTag: "[sfx:whoosh]",
      voiceoverScript: "Tired of dated, scuffed floors? Here is the transformation you've been waiting for.",
    },
    {
      id: "scene_2",
      sceneIndex: 1,
      startFrame: 120,
      durationFrames: 120,
      sceneType: "3d_exploded_blueprint" as const,
      headline: "Engineered Without Compromise",
      subheadline: "Uniclic® DIY installation with zero glue or nails.",
      visualActionPrompt: "Dimension calipers HUD",
      primaryMediaUrl: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      sfxTag: "[sfx:pop]",
      voiceoverScript: "Engineered with Uniclic interlocking technology for seamless DIY installation.",
    },
    {
      id: "scene_3",
      sceneIndex: 2,
      startFrame: 240,
      durationFrames: 120,
      sceneType: "torture_stress_test" as const,
      headline: "100% Waterproof & Pet-Proof",
      subheadline: "72-hour standing spill barrier with AC4 commercial wear layer.",
      visualActionPrompt: "Waterproof stress test badges",
      primaryMediaUrl: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      sfxTag: "[sfx:ding]",
      voiceoverScript: "Completely waterproof and scratch resistant against dog claws and heavy spills.",
    },
    {
      id: "scene_4",
      sceneIndex: 3,
      startFrame: 360,
      durationFrames: 120,
      sceneType: "social_proof_review" as const,
      headline: "5.0 Stars • Verified Homeowner",
      subheadline: "\"Dogs run on it daily and not a single scratch!\"",
      visualActionPrompt: "Customer review card",
      primaryMediaUrl: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      sfxTag: "[sfx:ding]",
      voiceoverScript: "Rated five stars by thousands of satisfied homeowners nationwide.",
    },
    {
      id: "scene_5",
      sceneIndex: 4,
      startFrame: 480,
      durationFrames: 120,
      sceneType: "price_promo_outro" as const,
      headline: "$89.99 (Was $129.99)",
      subheadline: "Order free sample box today!",
      visualActionPrompt: "Price promo and CTA",
      primaryMediaUrl: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1080",
      sfxTag: "[sfx:cash_register]",
      voiceoverScript: "Save 31% today and order your free sample box. Tap below to shop!",
    },
  ],
  hookHeadline: "Tired of Outdated, Scuffed Floors?",
  callToAction: "ORDER FREE SAMPLES 📦",
  promoCode: "RUBY15",
  discountPercentage: 31,
};

registerRoot(RemotionRoot);

