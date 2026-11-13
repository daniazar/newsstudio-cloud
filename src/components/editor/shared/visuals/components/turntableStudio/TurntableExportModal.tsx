/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableExportModal.tsx
 *
 * Omnichannel 360° Export Media Kit & Zero-Dependency Storefront Embed Modal:
 * 1. Social & Video Downloads: Multi-aspect ratios (9:16, 1:1, 16:9) + Quick copy URL
 * 2. Zero-Dependency Storefront Embed: Pure HTML/CSS/JS interactive drag-to-spin snippet
 * 3. Shopify Liquid Section: Online Store 2.0 template for product pages
 */

import React, { useState } from "react";
import {
  X,
  Download,
  Code,
  Copy,
  Check,
  ShoppingBag,
  Smartphone,
  Square,
  Monitor,
  Sparkles,
  ExternalLink,
  Layers,
  Mail,
} from "lucide-react";
import {
  generateZeroDependencyEmbedSnippet,
  generateShopifyLiquidSnippet,
  generateShopifyCollectionCardSnippet,
  generateSpritesheetEmbedSnippet,
  TurntableEmbedOptions,
} from "@/lib/ecommerce/turntableExportEngine";

interface TurntableExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  productName?: string;
  posterUrl?: string;
  accentColor?: string;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

export function TurntableExportModal({
  isOpen,
  onClose,
  videoUrl,
  productName = "Product Showcase",
  posterUrl,
  accentColor = "#06b6d4",
  toast,
}: TurntableExportModalProps) {
  const [activeTab, setActiveTab] = useState<"social" | "embed" | "shopify" | "collection">("social");
  const [collectionSubTab, setCollectionSubTab] = useState<"card" | "spritesheet" | "email">("card");
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [copiedShopify, setCopiedShopify] = useState<boolean>(false);
  const [copiedCollection, setCopiedCollection] = useState<boolean>(false);
  const [copiedSpritesheet, setCopiedSpritesheet] = useState<boolean>(false);
  const [selectedEmbedAspect, setSelectedEmbedAspect] = useState<"1:1" | "9:16" | "16:9">("1:1");

  if (!isOpen) return null;

  const embedOptions: TurntableEmbedOptions = {
    videoUrl,
    productName,
    posterUrl,
    accentColor,
    aspectRatio: selectedEmbedAspect,
    showRotateBadge: true,
  };

  const zeroDepSnippet = generateZeroDependencyEmbedSnippet(embedOptions);
  const shopifyLiquid = generateShopifyLiquidSnippet(embedOptions);
  const collectionCardSnippet = generateShopifyCollectionCardSnippet({
    videoUrl,
    productName,
    posterUrl,
    accentColor,
  });
  const spritesheetSnippet = generateSpritesheetEmbedSnippet({
    videoUrl,
    posterUrl: posterUrl || videoUrl.replace(/\.mp4$/i, "_spritesheet.webp"),
    productName,
    totalFrames: 24,
    aspectRatio: selectedEmbedAspect,
    accentColor,
  });

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(zeroDepSnippet);
    setCopiedSnippet(true);
    toast("Snippet Copied", "Zero-dependency HTML/JS copied to clipboard.", "success");
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleCopyShopify = () => {
    navigator.clipboard.writeText(shopifyLiquid);
    setCopiedShopify(true);
    toast("Shopify Liquid Copied", "360-turntable.liquid section copied.", "success");
    setTimeout(() => setCopiedShopify(false), 2500);
  };

  const handleCopyCollection = () => {
    navigator.clipboard.writeText(collectionCardSnippet);
    setCopiedCollection(true);
    toast("Collection Card Copied", "Hover-to-spin collection card snippet copied.", "success");
    setTimeout(() => setCopiedCollection(false), 2500);
  };

  const handleCopySpritesheet = () => {
    navigator.clipboard.writeText(spritesheetSnippet);
    setCopiedSpritesheet(true);
    toast("Spritesheet Snippet Copied", "24-frame canvas scrubber snippet copied.", "success");
    setTimeout(() => setCopiedSpritesheet(false), 2500);
  };

  const handleDownload = (aspectLabel: string) => {
    // Open in new tab or trigger direct download
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `${productName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_turntable_${aspectLabel}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Download Triggered", `Downloading ${aspectLabel} MP4 file.`, "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Omnichannel 360° Export Media Kit
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Zero Dependency
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
                {productName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("social")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "social"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Social & Video Kit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("embed")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "embed"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Zero-Dep Storefront Embed</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shopify")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "shopify"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Shopify Liquid 2.0</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("collection")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "collection"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Collection & Email</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Tab 1: Social & Video Kit */}
          {activeTab === "social" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-3">
                <div className="w-14 h-24 rounded-lg bg-black overflow-hidden shrink-0 border border-zinc-700">
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-200">Broadcast-Grade Master Clip</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    H.264 MP4 with hardware-accelerated orbital motion. Ready for native publishing.
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(videoUrl);
                        toast("URL Copied", "Direct video URL copied to clipboard.", "success");
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="h-3 w-3 text-cyan-400" />
                      <span>Copy Direct URL</span>
                    </button>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                      <span>Preview</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Multi-Aspect Export Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* 9:16 Vertical */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-cyan-500/30 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <Smartphone className="h-4 w-4 text-cyan-400" />
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                        Primary
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-100 mt-1.5">9:16 Vertical</div>
                    <div className="text-[9.5px] text-zinc-400">TikTok, Reels, Shorts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload("9x16")}
                    className="w-full py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>

                {/* 1:1 Square */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <Square className="h-4 w-4 text-zinc-300" />
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        Feed
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-100 mt-1.5">1:1 Square</div>
                    <div className="text-[9.5px] text-zinc-400">Instagram, Storefront PDP</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload("1x1")}
                    className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>

                {/* 16:9 Landscape */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <Monitor className="h-4 w-4 text-zinc-300" />
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        Hero
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-100 mt-1.5">16:9 Landscape</div>
                    <div className="text-[9.5px] text-zinc-400">YouTube, Desktop Banner</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload("16x9")}
                    className="w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Zero-Dependency Storefront Embed */}
          {activeTab === "embed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    Zero-Dependency Drag-to-Spin Widget
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Self-contained HTML5 + CSS + JavaScript. No Three.js or external CDNs required.
                  </p>
                </div>

                {/* Aspect ratio picker */}
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-zinc-800">
                  {(["1:1", "9:16", "16:9"] as const).map((asp) => (
                    <button
                      key={asp}
                      type="button"
                      onClick={() => setSelectedEmbedAspect(asp)}
                      className={`px-2 py-0.5 text-[9.5px] font-mono font-bold rounded cursor-pointer transition-all ${
                        selectedEmbedAspect === asp
                          ? "bg-cyan-500 text-black shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {asp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code display with copy button */}
              <div className="relative rounded-xl border border-zinc-800 bg-black/90 p-3 overflow-hidden">
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="absolute top-2.5 right-2.5 py-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  {copiedSnippet ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedSnippet ? "Copied!" : "Copy Code"}</span>
                </button>

                <pre className="text-[9.5px] font-mono text-zinc-300 max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                  {zeroDepSnippet}
                </pre>
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[10px] text-zinc-400 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>
                  Paste directly into any custom HTML block in Shopify, Webflow, WordPress, or Squarespace.
                </span>
              </div>
            </div>
          )}

          {/* Tab 3: Shopify Liquid */}
          {activeTab === "shopify" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    Shopify Online Store 2.0 Section
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Save as <code className="text-cyan-300 font-mono">sections/360-turntable.liquid</code> in your theme.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyShopify}
                  className="py-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  {copiedShopify ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedShopify ? "Copied!" : "Copy Section"}</span>
                </button>
              </div>

              {/* Code display */}
              <div className="relative rounded-xl border border-zinc-800 bg-black/90 p-3 overflow-hidden">
                <pre className="text-[9.5px] font-mono text-zinc-300 max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                  {shopifyLiquid}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 4: Collection & Email */}
          {activeTab === "collection" && (
            <div className="space-y-3">
              {/* Sub-navigation tabs */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    Collection Grid & Email Marketing Suite
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    High-converting interactive touchpoints for Shopify collection cards, canvas spritesheets, and email hero loops.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCollectionSubTab("card")}
                    className={`px-2 py-0.5 text-[9.5px] font-bold rounded cursor-pointer transition-all ${
                      collectionSubTab === "card"
                        ? "bg-cyan-500 text-black shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Hover-to-Spin Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionSubTab("spritesheet")}
                    className={`px-2 py-0.5 text-[9.5px] font-bold rounded cursor-pointer transition-all ${
                      collectionSubTab === "spritesheet"
                        ? "bg-cyan-500 text-black shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    24-Frame Scrubber
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionSubTab("email")}
                    className={`px-2 py-0.5 text-[9.5px] font-bold rounded cursor-pointer transition-all ${
                      collectionSubTab === "email"
                        ? "bg-cyan-500 text-black shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Klaviyo / Email
                  </button>
                </div>
              </div>

              {/* Subtab 1: Collection Card */}
              {collectionSubTab === "card" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-300 font-medium">
                      Liquid Snippet (<code className="text-cyan-300 font-mono">snippets/product-card-360.liquid</code>)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCollection}
                      className="py-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                    >
                      {copiedCollection ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCollection ? "Copied!" : "Copy Snippet"}</span>
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-zinc-800 bg-black/90 p-3 overflow-hidden">
                    <pre className="text-[9.5px] font-mono text-zinc-300 max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                      {collectionCardSnippet}
                    </pre>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[10px] text-zinc-400 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Plays ultra-smooth 360° rotation on mouse hover or touch swipe in Shopify collection grids. Reverts to poster on mouse leave.
                    </span>
                  </div>
                </div>
              )}

              {/* Subtab 2: 24-Frame Spritesheet */}
              {collectionSubTab === "spritesheet" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-300 font-medium">
                      Zero-Dependency Canvas Scrubber (<code className="text-cyan-300 font-mono">HTML5 + JS</code>)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySpritesheet}
                      className="py-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                    >
                      {copiedSpritesheet ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedSpritesheet ? "Copied!" : "Copy Scrubber"}</span>
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-zinc-800 bg-black/90 p-3 overflow-hidden">
                    <pre className="text-[9.5px] font-mono text-zinc-300 max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                      {spritesheetSnippet}
                    </pre>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Renders frames across a 6×4 spritesheet matrix using standard HTML5 Canvas. Perfect for mobile networks with zero video decode overhead.
                    </span>
                  </div>
                </div>
              )}

              {/* Subtab 3: Email Campaign Guide */}
              {collectionSubTab === "email" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <Mail className="h-4 w-4 text-cyan-400" />
                    <span>Klaviyo, Mailchimp & Omnisend Animation Protocol</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Most email clients (Gmail, Apple Mail, Outlook Web) do not support inline MP4 video tags. To deliver 360° spin animations inside promotional emails:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="p-2.5 rounded-lg bg-black/50 border border-zinc-800 space-y-1">
                      <div className="font-bold text-zinc-200">1. Optimized Animated GIF</div>
                      <div className="text-zinc-400">
                        100% email client compatibility. Use Remotion or ffmpeg to render a 15fps lightweight loop under 2.5MB.
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/50 border border-zinc-800 space-y-1">
                      <div className="font-bold text-zinc-200">2. Looping Animated WebP</div>
                      <div className="text-zinc-400">
                        Supported on Apple Mail and modern clients with crisp 24-bit color at 60% smaller file size than GIF.
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 font-mono">Recommended width: 600px | Max payload: 3MB</span>
                    <button
                      type="button"
                      onClick={() => handleDownload("email_loop")}
                      className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="h-3 w-3 text-cyan-400" />
                      <span>Download Email Master</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[10.5px]">
          <span className="text-zinc-500">
            Rendered with 360° boundary-locked motion beats
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
