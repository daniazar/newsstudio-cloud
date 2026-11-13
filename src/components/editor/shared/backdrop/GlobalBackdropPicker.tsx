/**
 * src/components/editor/shared/backdrop/GlobalBackdropPicker.tsx
 *
 * Global Video Backdrop & Virtual Studio Environment Selector.
 * Allows merchants and video editors to pick the default environment
 * applied across the entire video advertisement:
 * 1. Virtual Studio Set Plates (Penthouse Lounge, 8K Video Wall, Standup Skyline, Financial Floor, etc.)
 * 2. Lifestyle Contextual Blur (Authentic product lifestyle bokeh)
 * 3. Studio Spotlights & Gradients (Obsidian, Pearl, Cyber, Amber, Crimson, Brand)
 * 4. Custom Solid Color / Direct Image URL
 * Includes live dimming, depth blur, and camera drift controls.
 */

import {
AdAspectRatio,
BrandDNA,
ExtractedProductAsset,
VideoBackdropConfig,
VideoBackdropMode,
} from "@/lib/types/ecommerce";
import {
Building,
Camera,
Check,
ChevronDown,
ChevronUp,
Flame,
Image as ImageIcon,
Laptop,
Palette,
Sliders,
Sparkles,
Sun
} from "lucide-react";
import React,{ useMemo,useState } from "react";

export interface GlobalBackdropPickerProps {
  backdrop: VideoBackdropConfig;
  onChangeBackdrop: (updates: Partial<VideoBackdropConfig>) => void;
  brand?: BrandDNA;
  productAssets?: ExtractedProductAsset[];
  aspectRatio?: AdAspectRatio;
  defaultCollapsed?: boolean;
  hideTuningControls?: boolean;
}

interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
  dotColor: string;
}

const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "obsidian",
    name: "Dark Obsidian",
    gradient: "radial-gradient(circle at 50% 38%, #18181b 0%, #09090b 82%)",
    dotColor: "#27272a",
  },
  {
    id: "midnight_cyan",
    name: "Midnight Cyan",
    gradient: "radial-gradient(circle at 50% 38%, #083344 0%, #020617 85%)",
    dotColor: "#06b6d4",
  },
  {
    id: "executive_amber",
    name: "Executive Bronze",
    gradient: "radial-gradient(circle at 50% 38%, #451a03 0%, #09090b 85%)",
    dotColor: "#f59e0b",
  },
  {
    id: "crimson_hype",
    name: "Crimson Hype",
    gradient: "radial-gradient(circle at 50% 38%, #4c0519 0%, #09090b 85%)",
    dotColor: "#f43f5e",
  },
  {
    id: "clean_pearl",
    name: "Clean Pearl (Light)",
    gradient: "radial-gradient(circle at 50% 38%, #e4e4e7 0%, #71717a 88%)",
    dotColor: "#e4e4e7",
  },
];

// Curated Virtual Studio Sets matching commercial video ads
const POPULAR_STUDIO_SETS: Array<{
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "studio_plate_penthouse_lounge",
    name: "Penthouse Lounge",
    category: "Luxury & Interior",
    description: "Walnut wood slats, leather armchairs, and twilight skyline bokeh.",
    thumbnailUrl: "/studio_environments/studio_plate_penthouse_lounge_9x16.jpg",
    icon: Building,
  },
  {
    id: "studio_plate_videowall_standup",
    name: "8K Video Wall Stage",
    category: "Tech & Corporate",
    description: "High-contrast interactive video wall with dark reflective floor.",
    thumbnailUrl: "/studio_environments/studio_plate_videowall_standup_9x16.jpg",
    icon: Laptop,
  },
  {
    id: "studio_plate_standup_skyline",
    name: "Prime-Time Standup",
    category: "Broadcasting",
    description: "Panoramic twilight skyline with professional 50mm broadcast optics.",
    thumbnailUrl: "/studio_environments/studio_plate_standup_skyline_9x16.jpg",
    icon: Sun,
  },
  {
    id: "studio_plate_financial_trading",
    name: "Financial Command",
    category: "Markets & Business",
    description: "Financial trading center with real-time candlestick charts.",
    thumbnailUrl: "/studio_environments/studio_plate_financial_trading_9x16.jpg",
    icon: Sparkles,
  },
  {
    id: "studio_plate_breaking_red_alert",
    name: "Red Alert Emergency",
    category: "Urgency & Hype",
    description: "High-cadence crimson ambient lighting with industrial trusses.",
    thumbnailUrl: "/studio_environments/studio_plate_breaking_red_alert_9x16.jpg",
    icon: Flame,
  },
  {
    id: "studio_plate_cyber_command_9x16",
    name: "Cyber Command Center",
    category: "Sci-Fi & Gaming",
    description: "Futuristic telemetry HUD with glowing neon blue pillars.",
    thumbnailUrl: "/studio_environments/studio_plate_cyber_command_9x16.jpg",
    icon: Laptop,
  },
];

export const GlobalBackdropPicker: React.FC<GlobalBackdropPickerProps> = ({
  backdrop,
  onChangeBackdrop,
  brand,
  productAssets = [],
  aspectRatio = "9:16",
  defaultCollapsed = false,
  hideTuningControls = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<VideoBackdropMode>(backdrop.mode || "gradient");
  const [customHex, setCustomHex] = useState(backdrop.customColor || brand?.surfaceColor || "#18181b");
  const [_customImgInput, _setCustomImgInput] = useState(backdrop.customImageUrl || "");

  // Resolve current active studio set name if in studio_plate mode
  const currentStudioSet = POPULAR_STUDIO_SETS.find(
    (s) =>
      backdrop.studioBackgroundId === s.id ||
      (backdrop.studioBackgroundId || "").includes(s.id.replace(/_(9x16|16x9)$/, ""))
  );
  const currentBadgeLabel =
    backdrop.mode === "studio_plate"
      ? currentStudioSet?.name || "Virtual Studio"
      : backdrop.mode === "lifestyle_blur"
      ? "Lifestyle Blur"
      : backdrop.mode === "custom_color"
      ? "Custom"
      : "Spotlight";

  // Find lifestyle asset if available
  const lifestyleAsset = useMemo(() => {
    return (
      productAssets.find((a) => a.type === "lifestyle_context")?.url ||
      productAssets[1]?.url ||
      productAssets[0]?.url
    );
  }, [productAssets]);

  const handleSelectMode = (mode: VideoBackdropMode) => {
    setActiveTab(mode);
    onChangeBackdrop({ mode });
  };

  const handleSelectStudioSet = (setId: string) => {
    onChangeBackdrop({
      mode: "studio_plate",
      studioBackgroundId: setId,
    });
  };

  const handleSelectGradient = (grad: GradientPreset) => {
    onChangeBackdrop({
      mode: "gradient",
      customColor: grad.gradient,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── 1. GLOBAL BACKDROP HEADER & MODE TABS ───────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-3">
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
                  Default Video Backdrop
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase">
                  {currentBadgeLabel}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Environment rendered across all scenes in this video ad
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 group-hover:text-cyan-300 transition-colors p-1"
            title={isCollapsed ? "Expand Video Backdrop" : "Collapse Video Backdrop"}
          >
            <span>{isCollapsed ? "Expand" : "Collapse"}</span>
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {/* Mode Switcher Tabs (shown when expanded) */}
        {!isCollapsed && (
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => handleSelectMode("studio_plate")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === "studio_plate"
                  ? "bg-cyan-500 text-black shadow font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building className="h-3 w-3" />
              <span>Studio Sets</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode("lifestyle_blur")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === "lifestyle_blur"
                  ? "bg-cyan-500 text-black shadow font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ImageIcon className="h-3 w-3" />
              <span>Lifestyle Blur</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode("gradient")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === "gradient"
                  ? "bg-cyan-500 text-black shadow font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Palette className="h-3 w-3" />
              <span>Spotlight</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode("custom_color")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === "custom_color"
                  ? "bg-cyan-500 text-black shadow font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sliders className="h-3 w-3" />
              <span>Custom</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. MODE CONTENT AREA (shown when expanded) ──────────────── */}
      {!isCollapsed && (
        <>

      {/* TAB A: Virtual Studio Sets */}
      {activeTab === "studio_plate" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">
              Select Virtual Studio Environment ({POPULAR_STUDIO_SETS.length})
            </span>
            <span className="text-[10px] text-zinc-400">
              Aspect-matched for {aspectRatio}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto custom-scrollbar p-0.5">
            {POPULAR_STUDIO_SETS.map((set) => {
              const Icon = set.icon;
              const isSelected =
                backdrop.mode === "studio_plate" &&
                (backdrop.studioBackgroundId === set.id ||
                  (backdrop.studioBackgroundId || "").includes(set.id.replace(/_(9x16|16x9)$/, "")));

              return (
                <div
                  key={set.id}
                  onClick={() => handleSelectStudioSet(set.id)}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50"
                      : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/60"
                  }`}
                >
                  {/* Aspect Ratio Preview Container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={set.thumbnailUrl}
                      alt={set.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Active Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-cyan-500 text-black p-1 rounded-md shadow">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Category Tag */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-zinc-300 border border-white/10 font-medium">
                      <Icon className="h-2.5 w-2.5 text-cyan-400" />
                      <span>{set.category}</span>
                    </div>

                    {/* Name & Short Description */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-xs font-bold text-white truncate">{set.name}</h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{set.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB B: Lifestyle Contextual Blur */}
      {activeTab === "lifestyle_blur" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-200">
                Product Lifestyle Contextual Bokeh
              </span>
              <p className="text-[10px] text-zinc-400">
                Blurs the product&apos;s scraped lifestyle photo for natural depth of field
              </p>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              PHOTO BOKEH
            </span>
          </div>

          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black">
            {lifestyleAsset ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lifestyleAsset}
                  alt="Lifestyle blur preview"
                  className="w-full h-full object-cover scale-110"
                  style={{ filter: `blur(${backdrop.blurPx ?? 28}px) saturate(1.15)` }}
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow">
                    Active Lifestyle Photo: {lifestyleAsset.split("/").pop()?.slice(0, 24)}...
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
                <ImageIcon className="h-6 w-6 mb-1 text-zinc-600" />
                <span>No lifestyle photo found. Falling back to hero packshot.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: Spotlight Gradients */}
      {activeTab === "gradient" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <span className="text-xs font-bold text-zinc-200">
            Studio Spotlight Gradients
          </span>

          <div className="grid grid-cols-3 gap-2">
            {GRADIENT_PRESETS.map((grad) => {
              const isSelected =
                backdrop.mode === "gradient" &&
                (backdrop.customColor === grad.gradient || (!backdrop.customColor && grad.id === "obsidian"));

              return (
                <button
                  key={grad.id}
                  type="button"
                  onClick={() => handleSelectGradient(grad)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-500/30"
                      : "border-zinc-800 hover:border-zinc-700 bg-zinc-900"
                  }`}
                  style={{ background: grad.gradient }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: grad.dotColor }}
                    />
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-cyan-400 stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-200 drop-shadow">
                    {grad.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB D: Custom Color / Image */}
      {activeTab === "custom_color" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <span className="text-xs font-bold text-zinc-200">
            Custom Solid Color or Direct URL
          </span>

          <div className="space-y-2">
            <label className="text-[11px] text-zinc-400 block">Hex Color Code</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customHex.startsWith("#") ? customHex : "#18181b"}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  onChangeBackdrop({ mode: "custom_color", customColor: e.target.value });
                }}
                className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  onChangeBackdrop({ mode: "custom_color", customColor: e.target.value });
                }}
                placeholder="#18181b"
                className="flex-1 bg-black/60 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ── 3. AMBIENT LIGHTING, BLUR & DRIFT CONTROLS ───────────────── */}
      {!hideTuningControls && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
              Backdrop Lighting & Camera Tuning
            </span>
          </div>

          {/* Dimming / Contrast Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300 font-medium">Ambient Dimming (Contrast Boost)</span>
              <span className="font-mono font-bold text-cyan-400">
                {backdrop.dimmingPercent ?? 25}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={75}
              step={5}
              value={backdrop.dimmingPercent ?? 25}
              onChange={(e) =>
                onChangeBackdrop({ dimmingPercent: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">
              Darkens background plate so the 3D product silhouette and text pop.
            </p>
          </div>

          {/* Depth Blur Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300 font-medium">Depth-of-Field Blur</span>
              <span className="font-mono font-bold text-cyan-400">
                {backdrop.blurPx ?? 0}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={backdrop.blurPx ?? 0}
              onChange={(e) =>
                onChangeBackdrop({ blurPx: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Cinematic Camera Drift Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-zinc-400" />
              <div>
                <span className="text-xs font-semibold text-zinc-200">
                  Cinematic Camera Drift (Ken Burns)
                </span>
                <p className="text-[10px] text-zinc-500">
                  Subtle slow zoom to keep background dynamically alive
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onChangeBackdrop({ enableCameraPan: !(backdrop.enableCameraPan ?? true) })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (backdrop.enableCameraPan ?? true) ? "bg-cyan-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  (backdrop.enableCameraPan ?? true) ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
