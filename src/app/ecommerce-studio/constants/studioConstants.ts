import { AdAspectRatio, VideoArchetype, TargetDistributionChannel, AudioMode } from "@/lib/types/ecommerce";

export type InspectorTab = "scene" | "anchor" | "audio" | "style" | "specs";

export const ASPECT_RATIO_OPTIONS: { id: AdAspectRatio; label: string; icon: string; width: number; height: number }[] = [
  { id: "9:16", label: "Vertical 9:16 (TikTok / Shorts / Reels)", icon: "Smartphone", width: 1080, height: 1920 },
  { id: "1:1", label: "Square 1:1 (Instagram / Feed)", icon: "Square", width: 1080, height: 1080 },
  { id: "16:9", label: "Horizontal 16:9 (YouTube / Desktop)", icon: "Monitor", width: 1920, height: 1080 },
];

export const ARCHETYPE_OPTIONS: { id: VideoArchetype; label: string; description: string }[] = [
  { id: "viral_ugc", label: "Viral UGC / Hook", description: "Direct-response creator hook, reaction, problem agitation." },
  { id: "pdp_showcase", label: "PDP Showcase", description: "High-converting silent on-site gallery video." },
  { id: "us_vs_them", label: "Us vs. Them Matrix", description: "Split-screen side-by-side competitor comparison." },
  { id: "flash_sale", label: "Flash Sale & Urgency", description: "Urgency-driven price slash, discount badge, countdown clock." },
  { id: "amazon_compliant", label: "Amazon Compliant", description: "Amazon 7th-slot listing explainer (strict TOS compliant)." },
  { id: "onboarding_guide", label: "Onboarding & Usage", description: "Step-by-step usage guide and unboxing walkthrough." },
];

export const CHANNEL_OPTIONS: { id: TargetDistributionChannel; label: string }[] = [
  { id: "tiktok_shop", label: "TikTok Shop & Organic" },
  { id: "instagram_reels", label: "Instagram Reels & Stories" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "meta_ads", label: "Meta Feed & Stories Ads" },
  { id: "amazon_listing", label: "Amazon Video Detail Page" },
  { id: "shopify_pdp", label: "Shopify Storefront PDP" },
];

export const AUDIO_MODE_OPTIONS: { id: AudioMode; label: string }[] = [
  { id: "voiceover_tts", label: "Voiceover + AI TTS" },
  { id: "ambient_music_only", label: "Ambient Music Only" },
  { id: "silent_subtitles", label: "Silent + Subtitles Only" },
];

export const INSPECTOR_TABS: { id: InspectorTab; label: string; icon: string }[] = [
  { id: "scene", label: "Scene Script", icon: "Clapperboard" },
  { id: "anchor", label: "AI Presenter", icon: "UserCheck" },
  { id: "audio", label: "Voice & Audio", icon: "Volume2" },
  { id: "style", label: "Style & Colors", icon: "Palette" },
  { id: "specs", label: "Specs & Meta", icon: "Sliders" },
];

export { SAMPLE_FLOORING, SAMPLE_EARBUDS, SAMPLE_PRODUCTS } from "@/lib/ecommerce/sampleProducts";
