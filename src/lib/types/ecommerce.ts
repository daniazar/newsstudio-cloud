/**
 * src/lib/types/ecommerce.ts
 *
 * Strict TypeScript contracts for Ruby E-Commerce Product-to-Video Engine.
 * Covers product specifications, typologies, brand DNA, ad scenes,
 * and Remotion composition properties.
 */

import type { ChainedLoopClip, SceneClipSlice } from "@/lib/ecommerce/actionLoopFsmEngine";

export type ProductTypology =
  | "discrete_object"     // Electronics, appliances, kitchen gadgets, packaged goods
  | "surface_material"   // Flooring, wall paint, tiles, wallpaper, countertops
  | "apparel_wearable"   // Clothing, footwear, jewelry, accessories
  | "sensory_consumable" // Skincare, cosmetics, gourmet food, coffee, supplements
  | "bulky_furniture"    // Sofas, standing desks, mattresses, outdoor equipment
  | "digital_saas"       // Web platforms, mobile apps, software licenses, digital templates
  | "local_service";     // Contractors, roofing, plumbing, auto detailing, cleaning

export type VideoArchetype =
  | "pdp_showcase"       // High-converting silent on-site gallery video
  | "amazon_compliant"   // Amazon 7th-slot listing explainer (strict TOS compliant)
  | "us_vs_them"         // Split-screen side-by-side competitor comparison
  | "flash_sale"         // Urgency-driven price slash, discount badge, countdown clock
  | "viral_ugc"          // Direct-response creator hook, reaction, problem agitation
  | "onboarding_guide";  // Post-purchase 3-step setup walkthrough

export type TargetDistributionChannel =
  | "shopify_pdp"
  | "amazon_listing"
  | "tiktok_shop"
  | "meta_ads"
  | "youtube_shorts"
  | "instagram_reels"
  | "email_loop"
  | "connected_tv";

export type AdAspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export type AudioMode = "voiceover_tts" | "silent_subtitles" | "ambient_music_only";

export type ProductAssetType =
  | "hero_packshot"
  | "detail_macro"
  | "lifestyle_context"
  | "customer_ugc"
  | "existing_video"
  | "dimension_schematic"
  | "before_after_pair";

export interface ExtractedProductAsset {
  id: string;
  url: string;
  type: ProductAssetType;
  altText?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
  mattedUrl?: string; // 32-bit transparent PNG after BiRefNet
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  available: boolean;
  colorHex?: string;
  option1?: string; // e.g., "Midnight Black"
  option2?: string; // e.g., "Size 10"
  imageUrl?: string;
}

export interface CustomerReviewItem {
  id: string;
  author: string;
  rating: number; // 1 to 5
  title?: string;
  body: string;
  verifiedBuyer: boolean;
  date?: string;
  source?: string;
  objectionSolved?: string; // e.g., "Fit & Sizing", "Durability"
}

export interface BrandDNA {
  name: string;
  domain: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  appleTouchIconUrl: string | null;
  primaryColor: string;     // Hex (e.g., "#06b6d4")
  secondaryColor: string;   // Hex (e.g., "#f43f5e")
  surfaceColor: string;     // Hex (e.g., "#09090b")
  fontHeading?: string;
  fontBody?: string;
  toneOfVoice: "playful_hype" | "minimalist_luxury" | "authoritative_clinical" | "rugged_outdoor" | "approachable_friendly";
  taglines: string[];
  missionStatement?: string;
}

// Typology-specific metadata configurations
export interface SurfaceMaterialSpecifics {
  coveragePerUnit?: string;      // e.g. "400 sq. ft. per gallon" or "24 sq. ft. per box"
  installationType?: string;     // e.g. "Click-Lock DIY" or "Roller & Brush"
  durabilityRating?: string;     // e.g. "AC4 Commercial Grade" or "Scuff-X"
  waterproofGrade?: string;      // e.g. "100% Waterproof (72-hr spill seal)"
  scratchResistant: boolean;
  finishType?: "ultra_matte" | "eggshell" | "satin" | "gloss" | "wirebrushed_oak";
  thickness?: string;            // e.g. "10 mm"
  dimensions?: string;           // e.g. "45x90 cm" or "60x120 cm"
  width?: string;                // e.g. "45 cm"
  length?: string;               // e.g. "90 cm"
  origin?: string;               // e.g. "Argentina"
  usageClass?: string;           // e.g. "Alto tránsito residencial"
  rectified?: string;            // e.g. "Incorporado"
  yieldPerBox?: string;          // e.g. "1.22 m² por caja"
  sku?: string;                  // e.g. "24659"
}

export interface DiscreteObjectSpecifics {
  batteryLife?: string;          // e.g. "36 Hours with Case"
  weightGrams?: number;
  waterproofIpx?: string;        // e.g. "IPX7 Submersible"
  materials?: string[];          // e.g. ["Aerospace Titanium", "Ceramic"]
}

export interface ApparelSpecifics {
  fabricComposition?: string;    // e.g. "100% Extra-Fine Merino Wool"
  stretchType?: "4-way" | "2-way" | "rigid";
  fitType?: "regular" | "slim" | "relaxed" | "athletic";
  modelHeightWearing?: string;   // e.g. "Model is 5'11\" wearing Size M"
  careInstructions?: string;
}

export interface SensoryConsumableSpecifics {
  volumeOrWeight?: string;       // e.g. "30ml / 1.0 fl oz"
  activeIngredients?: string[];  // e.g. ["2% Pure Hyaluronic Acid", "Vitamin C"]
  clinicalClaim?: string;        // e.g. "94% felt deeper hydration in 7 days"
  certifications?: string[];     // e.g. ["100% Vegan", "Cruelty-Free", "Zero Parabens"]
}

export interface BulkyFurnitureSpecifics {
  dimensionsInches?: { width: number; depth: number; height: number };
  weightCapacityLbs?: number;    // e.g. 500
  doorwayClearanceInches?: number; // e.g. 30
  assemblyTimeMinutes?: number;  // e.g. 15
}

export interface DigitalSaasSpecifics {
  platformType?: "web" | "ios" | "android" | "desktop";
  freeTrialDays?: number;
  timeSavedMetric?: string;      // e.g. "98% time saved (4 hours ➔ 20 seconds)"
  integrations?: string[];       // e.g. ["Slack", "Shopify", "Google Sheets"]
}

export interface LocalServiceSpecifics {
  serviceAreaCity?: string;      // e.g. "Austin Metro Area"
  responseTimeMinutes?: number;  // e.g. 30
  guaranteeYears?: number;       // e.g. 10
  licensedAndInsured: boolean;
  googleRating?: number;         // e.g. 4.9
  googleReviewCount?: number;    // e.g. 480
}

export interface TypologySpecifics {
  surfaceMaterial?: SurfaceMaterialSpecifics;
  discreteObject?: DiscreteObjectSpecifics;
  apparel?: ApparelSpecifics;
  sensoryConsumable?: SensoryConsumableSpecifics;
  bulkyFurniture?: BulkyFurnitureSpecifics;
  digitalSaas?: DigitalSaasSpecifics;
  localService?: LocalServiceSpecifics;
}

export interface ProductSpec {
  id: string;
  sourceUrl: string;
  title: string;
  vendor: string;
  description: string;
  bulletPoints: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
  typology: ProductTypology;
  typologySpecifics?: TypologySpecifics;
  brand: BrandDNA;
  variants: ProductVariant[];
  assets: ExtractedProductAsset[];
  topReviews: CustomerReviewItem[];
  scrapedAt: string;
  language?: string;      // e.g. "es", "en", "pt"
  marketLocale?: string;  // e.g. "es-AR", "en-US"
  savedScript?: AdScript;
  savedPresenterConfig?: AdPresenterConfig;
  category?: string;
  tags?: string[];
  specs?: Record<string, string | number>;
}

export type ProductSpecification = ProductSpec;

export interface CachedMediaHistoryItem {
  personaId: string;
  audioUrl?: string;
  audioDuration?: number;
  audioCacheKey?: string;
  presenterVideoUrl?: string;
  /** Audio URL used when generating the presenterVideoUrl */
  lipSyncAudioUrl?: string;
  /** Audio cache key used when generating the presenterVideoUrl */
  lipSyncAudioCacheKey?: string;
  /** Action loop ID used when generating the presenterVideoUrl */
  lipSyncLoopId?: string;
  /** Continuous action loop slices signature used when generating the presenterVideoUrl */
  lipSyncSlicesSignature?: string;
  expiresAt: number; // 48-hour timestamp
}

export interface AdScene {
  id: string;
  sceneIndex: number;
  startFrame: number;
  durationFrames: number;
  sceneType:
    | "pattern_interrupt_hook"
    | "before_after_wipe"
    | "room_staging"
    | "scene_background"
    | "custom_veo_hero"
    | "torture_stress_test"
    | "macro_texture_zoom"
    | "3d_exploded_blueprint"
    | "product_turntable"
    | "device_mockup_screen"
    | "service_trust_map"
    | "colorway_swatch_switcher"
    | "social_proof_review"
    | "price_promo_outro";
  headline: string;
  subheadline?: string;
  visualActionPrompt: string;
  /** Custom Google Veo prompt planned by LLM or user for cinematic text/image-to-video scene */
  customVeoPrompt?: string;
  /** Generated or assigned custom Veo video URL */
  customVeoVideoUrl?: string;
  /** Camera motion cue for Veo generation (e.g. "drone_flyover", "dolly_in_slow", "ambient_orbit_3d") */
  cameraCue?: string;
  primaryMediaUrl: string;
  secondaryMediaUrl?: string; // e.g. for Before/After split
  sfxTag?: string;           // e.g. "[sfx:whoosh_heavy]", "[sfx:cash_register]"
  /** Clean visual subtitle text displayed on screen in Remotion ProductAdCaptionsLayer */
  voiceoverScript?: string;
  /** Phonetically normalized, acoustic voiceover script synthesized by Modern-TTS engines */
  spokenVoiceoverScript?: string;
  featureBadgeText?: string;
  /** When true, keys out white packshot background for 3D floating and turntable presentation */
  removeWhiteBg?: boolean;
  /**
   * Pre-rendered 360° turntable clip (VP9+alpha WebM, or opaque MP4) from the 3D Product
   * Turntable mode (`Product3DAsset.turntableUrl`). When set on a `product_turntable` scene,
   * it replaces the CSS-rotated packshot. Kept separate from `primaryMediaUrl` because a
   * video there is treated as a fullscreen background.
   */
  turntable3dVideoUrl?: string;
  /** Generated or assigned neural product turntable video URL (MiniMax H3 / Veo 3.1) */
  customTurntableVideoUrl?: string;
  /** Preview GIF URL of the generated turntable */
  turntablePreviewGifUrl?: string;
  /** Generation engine used for the turntable */
  turntableEngine?: TurntableEngine;
  /** Object presentation and mounting archetype */
  turntableStagingArchetype?: TurntableStagingArchetype;
  /** Environment backdrop preset ID */
  turntableEnvironmentId?: string;
  /** Custom environment backdrop prompt */
  turntableEnvironmentPrompt?: string;
  /** Rotational kinematics arc preset */
  turntableMotionPreset?: TurntableMotionPreset;
  /** Studio staging pedestal style */
  turntablePedestal?: TurntablePedestalStyle;
  /** Studio lighting atmosphere style */
  turntableLighting?: TurntableLightingStyle;
  /** Step acceleration mode for MiniMax H3 */
  turntableStepMode?: TurntableStepMode;
  /** Camera elevation angle and framing perspective */
  turntableCameraElevation?: TurntableCameraElevation;
  /** Whether to render dynamic feature radar callouts on top of the turntable scene */
  turntableEnableRadarPins?: boolean;
  /** Custom or auto-generated radar callout pins for this turntable scene */
  turntableRadarPins?: TurntableRadarPin[];
  /** Dynamic social proof and scarcity HUD configuration */
  turntableSocialProof?: TurntableSocialProofConfig;
  /** Whether to play ambient contextual soundscapes for this turntable scene */
  turntableAudioAmbient?: boolean;
  /** Whether to play mechanical rotation servo foley for this turntable scene */
  turntableAudioFoley?: boolean;
  /** Whether to play subtle chime blips when radar pins enter */
  turntableAudioChimes?: boolean;
  /** Whether to enable specular sheen sweep across the product packshot */
  enableSpecularSheen?: boolean;
  /** Selected product variant ID used for reference photo & color conditioning */
  turntableSelectedVariantId?: string;
  /** Selected product variant title */
  turntableSelectedVariantTitle?: string;
  /** Compiled or custom prompt used for the turntable generation */
  turntablePrompt?: string;
  /** Word-by-word kinetic captions display style */
  captionStyle?: AdCaptionStyle;
  /** When true (default: true), mutes the native audio of any background/Veo video in this scene so voiceover is clear */
  muteVideoAudio?: boolean;
  /** Generated voiceover audio URL for this scene */
  audioUrl?: string;
  /** Synthesized audio duration in seconds */
  audioDuration?: number;
  /** Deterministic cache key (text + persona + speed + pitch) of the generated voiceover */
  audioCacheKey?: string;
  /** Generated presenter/lip-synced video URL for this scene */
  presenterVideoUrl?: string;
  /** Spoken audio URL that was used when generating the current presenterVideoUrl */
  lipSyncAudioUrl?: string;
  /** Audio cache key that was used when generating the current presenterVideoUrl */
  lipSyncAudioCacheKey?: string;
  /** Action loop ID that was used when generating the current presenterVideoUrl */
  lipSyncLoopId?: string;
  /** Continuous action loop slices signature used when generating the current presenterVideoUrl */
  lipSyncSlicesSignature?: string;
  /** Per-scene Presenter & Avatar configuration override. Overrides the video-level presenterConfig when set. */
  presenterConfig?: ScenePresenterSettings | null;
  /** Alias for presenterConfig */
  presenter?: ScenePresenterSettings | null;
  /** 48-hour Media History cache of persona audio and presenter videos for instant switching without re-generation */
  mediaHistory?: CachedMediaHistoryItem[];
  /** Slices of action loops planned for this scene when using continuous action loops */
  actionLoopSlices?: SceneClipSlice[];
}

export interface AdScript {
  id: string;
  archetype: VideoArchetype;
  targetChannel: TargetDistributionChannel;
  aspectRatio: AdAspectRatio;
  durationSeconds: number;
  totalFrames: number;
  fps: number;
  scenes: AdScene[];
  hookHeadline: string;
  callToAction: string;
  promoCode?: string;
  discountPercentage?: number;
  /** AI-Selected Anchor Persona for this specific commercial */
  selectedPersonaId?: string;
  /** AI reasoning for choosing this anchor persona */
  personaReasoning?: string;
  /** AI-Recommended Integral Layout Template */
  recommendedTemplateId?: string;
  /** AI reasoning for choosing this integral layout template */
  templateReasoning?: string;
  /** Exclusive Google Imagen 3 photo studio prompt engineered for this product */
  bespokePhotoPrompt?: string;
  /** Exclusive Google Veo 8s video diffusion prompt engineered for this product */
  bespokeVeoPrompt?: string;
  /** Full commercial chained FSM action loop sequence for continuous presenter choreography */
  actionLoopSequence?: ChainedLoopClip[];
}

export type PresenterLayoutMode =
  | "bottom_right"
  | "bottom_left"
  | "circle_pip"
  | "split_side"
  | "full_screen"
  | "side_full_left"
  | "side_full_right"
  | "top_right"
  | "top_left";

export interface AdPresenterConfig {
  enabled: boolean;
  personaId: string;
  position: PresenterLayoutMode;
  layoutMode?: PresenterLayoutMode;
  avatarUrl?: string;
  avatarSrc?: string;
  videoUrl?: string;
  scale?: number; // default 1.0 (0.5 to 1.5)
  offsetX?: number;
  offsetY?: number;
  nameTag?: string;
  presenterName?: string;
  role?: "spokesperson" | "ugc_creator" | "verified_buyer" | "qvc_host" | "lead_anchor";
  roleTag?: string;
  showNameBadge?: boolean;
  showNametag?: boolean;
  selectedPoseId?: string;
  selectedActionLoopId?: string;
  actionLoopSlices?: SceneClipSlice[];
  disableCloningIfDifferentLanguage?: boolean;
  bubbleFaceZoom?: number; // Face crop zoom in circle_pip mode (e.g. 1.85 for 9:16 portrait video/standing poses, 1.08 for headshots)
  bubbleFaceOffsetY?: number; // Face vertical offset % in circle_pip mode (-30 to +30, default +5)
  bubbleFaceOffsetX?: number; // Face horizontal offset % in circle_pip mode (-30 to +30, default 0)
}

export type ScenePresenterMode = "inherit" | "custom" | "hidden";

export interface ScenePresenterSettings extends Partial<AdPresenterConfig> {
  mode?: ScenePresenterMode;
  overrideDefault?: boolean;
  actionLoopSlices?: SceneClipSlice[];
}

export interface BrandWatermarkConfig {
  enabled: boolean;
  position: "top_right" | "top_left" | "bottom_left" | "bottom_right";
  opacity: number;         // 0.2 to 1.0 (default 0.85)
  scale: number;           // 0.5 to 1.5 (default 1.0)
  showDomainTag?: boolean; // e.g. "luminafloors.com"
  customLogoUrl?: string;  // overrides brand.logoUrl if set
}

export interface UsVsThemRow {
  feature: string;
  us: string | boolean;
  them: string | boolean;
}

export interface UsVsThemConfig {
  enabled: boolean;
  usTitle?: string;     // e.g. "Lumina Oak"
  themTitle?: string;   // e.g. "Standard Laminate"
  rows?: UsVsThemRow[];
}

export interface QrCodeConfig {
  enabled: boolean;
  url?: string;
  label?: string;       // e.g. "SCAN TO BUY"
  sublabel?: string;    // e.g. "SAVE 15% TODAY"
  position?: "top_right" | "bottom_right" | "bottom_left";
  size?: number;        // default 110px
}

export interface SocialProofPopupConfig {
  enabled: boolean;
  platform?: "amazon" | "trustpilot" | "shopify" | "tiktok";
  customerName?: string;
  location?: string;    // e.g. "Verified Buyer • Austin, TX"
  rating?: number;      // default 5
  quote?: string;
  position?: "bottom_left" | "top_right" | "bottom_right";
}

export type UrgencyTheme = "neon_fire" | "cyber_amber" | "emerald_surge" | "midnight_crimson";

export interface StockScarcityConfig {
  enabled: boolean;
  totalStock?: number;       // default: 50
  remainingStock: number;    // e.g. 7
  claimedPercentage?: number; // e.g. 86
  dynamicDepletion?: boolean; // drops by 1-3 units during playback
  lowStockThreshold?: number; // e.g. 10
}

export interface FlashSaleUrgencyConfig {
  enabled: boolean;
  headline?: string;         // e.g. "FLASH SALE ENDS TONIGHT"
  initialSeconds?: number;   // e.g. 7200 (2 hours)
  stockScarcity?: StockScarcityConfig;
  theme?: UrgencyTheme;
  position?: "top_banner" | "bottom_card" | "floating_pill";
  showMilliseconds?: boolean;
}

export interface ShoppableHotspot {
  id: string;
  variantId?: string;
  title: string;
  price?: number;
  compareAtPrice?: number;
  imageUrl?: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  startFrame?: number;
  durationFrames?: number;
  pulseColor?: string;
  calloutText?: string;
}

export interface ShoppableHotspotsConfig {
  enabled: boolean;
  hotspots: ShoppableHotspot[];
  showCardOnHover?: boolean;
}

export type VideoBackdropMode =
  | "gradient"
  | "studio_plate"
  | "lifestyle_blur"
  | "custom_color";

export interface VideoBackdropConfig {
  mode: VideoBackdropMode;
  studioBackgroundId?: string; // id from STUDIO_BACKGROUNDS or image URL
  customColor?: string;        // Hex color or CSS gradient
  customImageUrl?: string;     // Direct custom image URL
  blurPx?: number;             // Gaussian blur on background image (0..40)
  dimmingPercent?: number;     // Darkening overlay (0..80) to maximize foreground contrast
  enableCameraPan?: boolean;   // Subtle slow cinematic zoom/drift
}

export interface AdIntroConfig {
  enabled: boolean;
  durationFrames: number; // default 60 (2.0s at 30fps)
  sloganId?: string;
  customHeadline?: string;
  customSubheadline?: string;
  showVerifiedBadge?: boolean;
  showLogo?: boolean;
  introVideoSrc?: string;
  audioSfx?: string;
}

export interface AdOutroConfig {
  enabled: boolean;
  durationFrames: number; // default 75 (2.5s at 30fps)
  outroId?: string;
  customHeadline?: string;
  customCta?: string;
  promoCode?: string;
  discountPercentage?: number;
  showReviewsRating?: boolean;
  showGuaranteeBadge?: boolean;
  showDomain?: boolean;
  outroVideoSrc?: string;
  audioSfx?: string;
}

export interface ProductAdCompositionProps {
  productSpec: ProductSpec;
  script: AdScript;
  aspectRatio: AdAspectRatio;
  audioMode: AudioMode;
  audioUrl?: string;
  musicBedUrl?: string;
  showSafeZones?: boolean;
  enableSpecularSheen?: boolean;
  accentColorOverride?: string;
  presenter?: AdPresenterConfig;
  showPresenter?: boolean;
  watermark?: BrandWatermarkConfig;
  usVsThem?: UsVsThemConfig;
  qrCode?: QrCodeConfig;
  socialPopup?: SocialProofPopupConfig;
  flashSaleUrgency?: FlashSaleUrgencyConfig;
  hotspotsConfig?: ShoppableHotspotsConfig;
  baseMusicVolume?: number;
  duckingDb?: number;
  showFactBadge?: boolean;
  showSourceBar?: boolean;
  turntablePedestal?: TurntablePedestalKey;
  backdrop?: VideoBackdropConfig;
  captionStyle?: AdCaptionStyle;
  captionOffsetY?: number;
  captionOffsetX?: number;
  showCaptions?: boolean;
  headlineOffsetY?: number;
  headlineOffsetX?: number;
  showHeadline?: boolean;
  productOffsetX?: number;
  productOffsetY?: number;
  productScale?: number;
  showProductVisual?: boolean;
  badgeOffsetY?: number;
  badgeOffsetX?: number;
  featureBadgeText?: string;
  watermarkOffsetX?: number;
  watermarkOffsetY?: number;
  showPricePromo?: boolean;
  pricePromoOffsetX?: number;
  pricePromoOffsetY?: number;
  pricePromoScale?: number;
  showCtaButton?: boolean;
  ctaOffsetX?: number;
  ctaOffsetY?: number;
  ctaScale?: number;
  showTickerTape?: boolean;
  tickerTapeOffsetY?: number;
  showBackdrop?: boolean;
  showWatermark?: boolean;
  showBrandLogo?: boolean;
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  brandLogoScale?: number;
  showFeaturePills?: boolean;
  featurePillsOffsetX?: number;
  featurePillsOffsetY?: number;
  showReviewCard?: boolean;
  reviewCardOffsetX?: number;
  reviewCardOffsetY?: number;
  reviewCardScale?: number;
  intro?: AdIntroConfig;
  outro?: AdOutroConfig;
}

export type AdCaptionStyle =
  | "kinetic_glow"   // Vibrant yellow/cyan spring pop (Hormozi / Viral Reels)
  | "beast_pop"       // High-contrast pill with electric cyan/yellow (MrBeast style)
  | "karaoke_flow"    // Smooth wave illumination across words
  | "minimal_clean"   // Subtle high-contrast lower-third pill
  | "hidden";         // Captions hidden

export type TurntablePedestalKey =
  | "carrara_marble"
  | "matte_obsidian"
  | "scandinavian_oak"
  | "glass_mirror"
  | "neon_cyber";

export interface TurntableLighting {
  spotlightColor: string;
  ambientIntensity: number;
  rimLightColor: string;
  rimLightIntensity: number;
  shadowSoftness: number;
  specularShininess: number;
  particlesColor: string;
}

export interface TurntablePedestal {
  key: TurntablePedestalKey;
  name: string;
  description: string;
  surfaceColor: string;
  bevelColor: string;
  cylinderGradient: string;
  reflectionOpacity: number;
  reflectionBlurPx: number;
  lighting: TurntableLighting;
  texturePatternUrl?: string;
}

// ---------------------------------------------------------------------------
// Neural Product Turntable Studio Types (MiniMax H3 + Google Veo 3.1)
// ---------------------------------------------------------------------------

export type TurntableEngine = "minimax_h3" | "google_veo" | "veo_3_1";

export type TurntableStagingArchetype =
  | "podium_pedestal"    // Bottles, gadgets, watches, cosmetics, sneakers
  | "persona_orbit"      // AI Persona wearing / using item with 360 camera orbit
  | "material_swatch"    // Flooring planks, tiles, stone, wallpaper with raking light
  | "paint_finish"       // Paint cans, primers, stain finishes with dipped paddle
  | "apparel_mannequin"  // Clothing, jackets, dresses, shirts on ghost mannequin
  | "showroom_floor"     // Furniture, large equipment on revolving floor platform
  | "exploded_view";     // Deconstructed engineering breakdown for electronics & mechanical products

export type TurntableMotionPreset = "hero_arc_60" | "turnaround_180" | "loop_360";

export type TurntablePedestalStyle =
  | "obsidian_black"
  | "brushed_titanium"
  | "pure_white"
  | "warm_wood";

export type TurntableLightingStyle =
  | "luxury_gold"
  | "tech_cyan"
  | "high_key_white";

export type TurntableStepMode = "tao_2step" | "tao_3step";

export type TurntableCameraElevation =
  | "eye_level"          // 0° straight-on commercial hero packshot
  | "high_angle_35"      // 35° elevated downward perspective for shoes, bags, laptops, materials
  | "low_angle_hero"     // -15° low-angle upward heroic/majestic stance
  | "macro_detail_orbit"; // Tight macro close-up inspecting micro-textures & details

export interface TurntableRadarPin {
  id: string;
  label: string;
  subtitle?: string;
  detail?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  pulseColor?: string;
  startFrame?: number;
  durationFrames?: number;
}

export interface TurntableSocialProofConfig {
  showRatingBadge?: boolean;
  rating?: number;
  reviewCount?: number;
  showBuyerQuote?: boolean;
  buyerQuoteText?: string;
  buyerAuthor?: string;
  showScarcityTicker?: boolean;
  scarcityText?: string;
  trustSeal?: "30_day_guarantee" | "free_shipping" | "official_warranty" | "none";
}

export interface TurntableRadarConfig {
  enabled: boolean;
  pins: TurntableRadarPin[];
}

export interface TurntableSceneJob {
  id: string;
  productId: string;
  sceneIndex: number;
  engine: TurntableEngine;
  stagingArchetype: TurntableStagingArchetype;
  environmentId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: string;
  videoUrl?: string;
  previewGifUrl?: string;
  videoFilePath?: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  wallClockDuration?: number;
  vramPeakGb?: number;
  currentStep?: number;
  totalSteps?: number;
  elapsedSeconds?: number;
  logs?: string[];
  baseName?: string;
}

export interface TurntableCompilationParams {
  productName: string;
  brandName?: string;
  category?: string;
  engine?: TurntableEngine;
  stagingArchetype?: TurntableStagingArchetype;
  motionPreset?: TurntableMotionPreset;
  pedestalStyle?: TurntablePedestalStyle;
  lightingStyle?: TurntableLightingStyle;
  stepMode?: TurntableStepMode;
  environmentId?: string;
  environmentPrompt?: string;
  personaId?: string;
  personaName?: string;
  personaAttire?: string;
  attireId?: string;
  groundedFeatures?: string[];
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSeconds?: number;
  cameraElevation?: TurntableCameraElevation;
  variantTitle?: string;
  variantColorHex?: string;
}

