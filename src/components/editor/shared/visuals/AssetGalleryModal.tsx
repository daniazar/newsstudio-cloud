"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Image as ImageIcon,
  Search,
  X,
  Loader2,
  Check,
  Link2,
  FolderOpen,
} from "lucide-react";
import { cachedFetch } from "@/lib/cache/indexedDB";

export interface StockAssetItem {
  id?: string;
  type?: "video" | "photo" | "image";
  downloadUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  previewVideoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  alt?: string;
  duration?: number;
}

export interface AssetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (url: string, type: "video" | "image") => void;
  suggestedKeywords?: string[];
  productAssets?: Array<{ id: string; url: string; assetType: string; label?: string }>;
  currentAssetUrl?: string;
}

export function AssetGalleryModal({
  isOpen,
  onClose,
  onSelectAsset,
  suggestedKeywords = [],
  productAssets = [],
  currentAssetUrl,
}: AssetGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<"stock_video" | "stock_photo" | "catalog" | "url">("stock_video");
  const [searchQuery, setSearchQuery] = useState(() => suggestedKeywords[0] || "");
  const [stockResults, setStockResults] = useState<StockAssetItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [activePreviewVideoId, setActivePreviewVideoId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterVideo = (itemId: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // 180ms hover intent prevents spawning video decoders during fast cursor scrubbing
    hoverTimerRef.current = setTimeout(() => {
      setActivePreviewVideoId(itemId);
    }, 180);
  };

  const handleMouseLeaveVideo = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setActivePreviewVideoId(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Search stock on mount or tab change with IndexedDB caching (1-hour TTL)
  const handleStockSearch = async (queryToSearch?: string, typeOverride?: "video" | "photo") => {
    const q = queryToSearch !== undefined ? queryToSearch : searchQuery;
    const type = typeOverride || (activeTab === "stock_video" ? "video" : "photo");
    if (!q) return;

    setIsSearching(true);
    try {
      const cacheKey = `stock_search:${type}:${q.trim().toLowerCase()}`;
      const data = await cachedFetch<{ results?: StockAssetItem[] }>(
        cacheKey,
        async () => {
          const res = await fetch(`/api/stock/search?query=${encodeURIComponent(q)}&type=${type}&per_page=16`);
          if (!res.ok) throw new Error("Stock search request failed");
          return res.json();
        },
        60 * 60 * 1000 // 1 hour TTL in browser IndexedDB
      );
      if (data) {
        setStockResults(data.results || []);
      }
    } catch (err) {
      console.error("Stock search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (url: string, type: "video" | "image") => {
    onSelectAsset(url, type);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Asset Vault & Stock B-Roll Explorer
              </h3>
              <p className="text-[11px] text-zinc-400">
                Pexels/Pixabay stock footage, high-res photos, and catalog assets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("stock_video");
                  handleStockSearch(searchQuery, "video");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === "stock_video"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>Stock Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("stock_photo");
                  handleStockSearch(searchQuery, "photo");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === "stock_photo"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Stock Photos</span>
              </button>

              {productAssets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                    activeTab === "catalog"
                      ? "bg-emerald-500 text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Product Catalog ({productAssets.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === "url"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Custom URL</span>
              </button>
            </div>

            {/* Keyword Pills */}
            {suggestedKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-zinc-500 font-medium shrink-0">Tags:</span>
                {suggestedKeywords.slice(0, 5).map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      setSearchQuery(kw);
                      handleStockSearch(kw);
                    }}
                    className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors whitespace-nowrap"
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input for Stock Tabs */}
          {(activeTab === "stock_video" || activeTab === "stock_photo") && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStockSearch()}
                  placeholder={
                    activeTab === "stock_video"
                      ? "Search stock video footage (e.g. porcelain tiles, interior architecture, splashing water)..."
                      : "Search high-resolution photos..."
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStockSearch()}
                disabled={isSearching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 font-bold text-xs text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {isSearching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
          {/* Stock Results Grid */}
          {(activeTab === "stock_video" || activeTab === "stock_photo") && (
            <div>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  <p className="text-xs">Searching royalty-free stock assets...</p>
                </div>
              ) : stockResults.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs">
                  No stock results found. Try different search terms or click on suggested tags above.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {stockResults.map((item, idx) => {
                    const isVideo = activeTab === "stock_video" || item.type === "video";
                    const targetUrl = item.downloadUrl || item.videoUrl || item.previewUrl;
                    const isSelected = !!targetUrl && currentAssetUrl === targetUrl;
                    const itemId = item.id || `stock-${idx}`;

                    return (
                      <div
                        key={itemId}
                        onClick={() => {
                          if (targetUrl) {
                            handleSelect(targetUrl, isVideo ? "video" : "image");
                          }
                        }}
                        onMouseEnter={() => isVideo && handleMouseEnterVideo(itemId)}
                        onMouseLeave={() => isVideo && handleMouseLeaveVideo()}
                        style={{
                          contentVisibility: "auto",
                          containIntrinsicSize: "200px 150px",
                        }}
                        className={`group relative aspect-[4/3] rounded-xl border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/50"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        {/* Video / Photo Preview */}
                        {isVideo && activePreviewVideoId === itemId && (item.previewVideoUrl || item.videoUrl) ? (
                          <video
                            src={item.previewVideoUrl || item.videoUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl || item.imageUrl || item.thumbnailUrl}
                            alt={item.alt || "Stock asset"}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white backdrop-blur-sm">
                            {isVideo ? "VIDEO" : "PHOTO"}
                          </span>
                          {item.duration && (
                            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 backdrop-blur-sm">
                              {Math.round(item.duration)}s
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 p-1 text-black shadow">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        {/* Select Button Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs shadow-lg">
                            Use This Asset
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Catalog Assets Grid */}
          {activeTab === "catalog" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {productAssets.map((asset) => {
                const isSelected = currentAssetUrl === asset.url;
                const isVideo = asset.url.endsWith(".mp4") || asset.url.endsWith(".webm");

                return (
                  <div
                    key={asset.id}
                    onClick={() => handleSelect(asset.url, isVideo ? "video" : "image")}
                    className={`group relative aspect-[4/3] rounded-xl border overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/50"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.label || "Product asset"}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <span className="absolute top-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                      {asset.assetType}
                    </span>

                    {isSelected && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 p-1 text-black shadow">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom URL Input */}
          {activeTab === "url" && (
            <div className="max-w-md mx-auto py-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Direct Asset URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/asset.mp4 or .webp"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!customUrl) return;
                  const isVideo = customUrl.endsWith(".mp4") || customUrl.endsWith(".webm");
                  handleSelect(customUrl, isVideo ? "video" : "image");
                }}
                disabled={!customUrl}
                className="w-full py-2.5 rounded-lg bg-emerald-500 font-bold text-xs text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                Apply Custom Media
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
