"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cachedFetch } from "@/lib/cache/indexedDB";

interface Asset {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified: string;
}

interface AssetGalleryModalProps {
  onSelect: (url: string, type: "video" | "image") => void;
  onClose: () => void;
  suggestedKeywords?: string[];
  articleImageUrls?: string[] | null;
}

export interface StockResultItem {
  externalId: string | number;
  previewUrl: string;
  downloadUrl: string;
  previewVideoUrl?: string | null;
  alt?: string | null;
  type?: "video" | "image" | string;
  provider?: string;
  author?: string;
  duration?: number | string | null;
}

const StockVideoPreview = ({ result }: { result: StockResultItem }) => {
  const [isActivePreview, setIsActivePreview] = useState(false);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsActivePreview(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsActivePreview(false);
  };

  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <div 
      className="w-full h-full relative"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "200px 150px",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={result.previewUrl} 
        alt={result.alt || "Stock asset"} 
        loading="lazy"
        className="w-full h-full object-cover bg-surface"
      />
      {isActivePreview && result.previewVideoUrl && (
        <video 
          src={result.previewVideoUrl} 
          className="absolute inset-0 w-full h-full object-cover" 
          muted 
          autoPlay 
          loop 
          playsInline
          preload="metadata"
        />
      )}
    </div>
  );
};

export const AssetGalleryModal: React.FC<AssetGalleryModalProps> = ({ onSelect, onClose, suggestedKeywords = [], articleImageUrls = null }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"library" | "stock" | "article">("stock");
  const [searchQuery, setSearchQuery] = useState(() => suggestedKeywords[0] || "");
  const [stockType, setStockType] = useState<"video" | "photo">("video");
  const [stockResults, setStockResults] = useState<StockResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleStockSearch = async (queryToSearch?: string, overrideType?: "video" | "photo") => {
    const q = queryToSearch || searchQuery;
    const typeToSearch = overrideType || stockType;
    if (!q) return;
    
    if (queryToSearch && queryToSearch !== searchQuery) {
      setSearchQuery(queryToSearch);
    }
    
    setIsSearching(true);
    try {
      // Fetch based on selected type with 1h indexedDB cache
      const cacheKey = `stock_search:${typeToSearch}:${q.trim().toLowerCase()}`;
      const data = await cachedFetch<{ results?: StockResultItem[] }>(
        cacheKey,
        async () => {
          const res = await fetch(`/api/stock/search?query=${encodeURIComponent(q)}&type=${typeToSearch}&per_page=15`);
          return res.json();
        },
        1000 * 60 * 60
      );
      
      // If no videos found, try photos (only fallback if we were searching for videos)
      let results = data?.results || [];
      if (results.length === 0 && typeToSearch === "video") {
        const photoKey = `stock_search:photo:${q.trim().toLowerCase()}`;
        const photoData = await cachedFetch<{ results?: StockResultItem[] }>(
          photoKey,
          async () => {
            const photoRes = await fetch(`/api/stock/search?query=${encodeURIComponent(q)}&type=photo&per_page=15`);
            return photoRes.json();
          },
          1000 * 60 * 60
        );
        results = photoData?.results || [];
      }
      
      setStockResults(results);
    } catch (err) {
      console.error("Stock search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await cachedFetch<{ assets?: Asset[] }>(
          "api:assets:all",
          async () => {
            const res = await fetch("/api/assets");
            return res.json();
          },
          1000 * 60 * 5
        );
        setAssets(data?.assets || []);
      } catch (err) {
        console.error("Failed to fetch assets", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Auto-search on mount if keywords are provided
  useEffect(() => {
    let isCancelled = false;
    if (suggestedKeywords.length > 0) {
      const q = suggestedKeywords[0];
      const videoKey = `stock_search:video:${q.trim().toLowerCase()}`;
      cachedFetch<{ results?: StockResultItem[] }>(
        videoKey,
        async () => {
          const res = await fetch(`/api/stock/search?query=${encodeURIComponent(q)}&type=video&per_page=15`);
          return res.json();
        },
        1000 * 60 * 60
      ).then(async (data) => {
        if (isCancelled) return;
        let results = data?.results || [];
        if (results.length === 0) {
          const photoKey = `stock_search:photo:${q.trim().toLowerCase()}`;
          const photoData = await cachedFetch<{ results?: StockResultItem[] }>(
            photoKey,
            async () => {
              const res = await fetch(`/api/stock/search?query=${encodeURIComponent(q)}&type=photo&per_page=15`);
              return res.json();
            },
            1000 * 60 * 60
          );
          if (isCancelled) return;
          results = photoData?.results || [];
        }
        setStockResults(results);
      }).catch((err) => {
        console.error("Auto stock search failed", err);
      });
    }
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSelect = (asset: Asset) => {
    const isVideo = asset.name.endsWith(".mp4") || asset.name.endsWith(".mov") || asset.name.endsWith(".webm");
    onSelect(asset.url, isVideo ? "video" : "image");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab("library")}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === "library" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
            >
              My Library
            </button>
            <button 
              onClick={() => setActiveTab("article")}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === "article" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
            >
              Article Images
            </button>
            <button 
              onClick={() => setActiveTab("stock")}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === "stock" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
            >
              Stock Gallery
            </button>
          </div>
          <button aria-label="Close modal" onClick={onClose} className="text-muted hover:text-foreground text-xl">✕</button>
        </div>

        {activeTab === "stock" && (
          <div className="p-4 border-b border-border flex flex-col gap-3">
            <div className="flex gap-2">
              <input 
                type="text" 
                autoFocus
                placeholder="Search free stock footage and photos..." 
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStockSearch()}
              />
              <div className="flex bg-background border border-border rounded-lg p-1">
                <button 
                  onClick={() => {
                    setStockType("video");
                    if (searchQuery) handleStockSearch(searchQuery, "video");
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${stockType === "video" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
                >
                  VIDEO
                </button>
                <button 
                  onClick={() => {
                    setStockType("photo");
                    if (searchQuery) handleStockSearch(searchQuery, "photo");
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${stockType === "photo" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
                >
                  PHOTO
                </button>
              </div>
              <Button onClick={() => handleStockSearch()} isLoading={isSearching} size="sm">Search</Button>
            </div>
            
            {suggestedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted font-medium uppercase tracking-wider">AI Suggestions:</span>
                {suggestedKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => handleStockSearch(kw)}
                    className="text-xs px-2 py-1 bg-surface-raised border border-border rounded-md hover:border-accent hover:text-accent transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "article" ? (
             articleImageUrls && articleImageUrls.length > 0 ? (
               <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                 {articleImageUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="group relative rounded-lg overflow-hidden border border-border bg-black cursor-pointer hover:border-accent hover:shadow-[0_0_15px_rgba(var(--accent),0.3)] hover:-translate-y-1 transition-all duration-300 break-inside-avoid"
                      onClick={() => {
                        onSelect(url, "image");
                        onClose();
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Article Image ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-xs text-white truncate">Article Image {idx + 1}</p>
                      </div>
                    </div>
                 ))}
               </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted">
                  <div className="w-16 h-16 mb-4 bg-surface-overlay border border-border rounded-2xl flex items-center justify-center shadow-inner">
                    <span className="text-3xl">🖼️</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">No Reference Images</h3>
                  <p className="text-sm text-muted max-w-sm mb-6">
                    No images were found in the original article.
                  </p>
                </div>
             )
          ) : activeTab === "library" ? (
            isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 mb-4 bg-surface-overlay border border-border rounded-2xl flex items-center justify-center shadow-inner">
                  <span className="text-3xl">📁</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Your Library is Empty</h3>
                <p className="text-sm text-muted max-w-sm mb-6">
                  Upload your own videos, logos, and images to use them across all your Ruby News scenes.
                </p>
                <p className="text-[10px] text-accent uppercase tracking-wider font-bold bg-accent-muted px-3 py-1 rounded border border-accent/20">
                  Drag & Drop inside the Scene Editor
                </p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                {assets.map((asset) => (
                  <div 
                    key={asset.key} 
                    className="group relative rounded-lg overflow-hidden border border-border bg-black cursor-pointer hover:border-accent hover:shadow-[0_0_15px_rgba(var(--accent),0.3)] hover:-translate-y-1 transition-all duration-300 break-inside-avoid"
                    onClick={() => handleSelect(asset)}
                  >
                    {(asset.name.endsWith(".mp4") || asset.name.endsWith(".webm") || asset.name.endsWith(".mov")) ? (
                      <video src={asset.url} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-xs text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-muted">{(asset.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
              {stockResults.map((result: StockResultItem) => (
                <div 
                  key={result.externalId} 
                  className="group relative rounded-lg overflow-hidden border border-border bg-black cursor-pointer hover:border-accent hover:shadow-[0_0_15px_rgba(var(--accent),0.3)] hover:-translate-y-1 transition-all duration-300 break-inside-avoid"
                  onClick={() => {
                    onSelect(result.downloadUrl, result.type === "video" ? "video" : "image");
                    onClose();
                  }}
                >
                  {result.type === "video" ? (
                    <StockVideoPreview result={result} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.previewUrl} alt={result.alt || "Stock asset"} className="w-full h-full object-cover bg-surface" />
                  )}
                  
                  {/* Subtle gradient for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                  
                  {/* Text description at bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col justify-end pointer-events-none">
                    <p className="text-[9px] text-white/90 line-clamp-2 leading-tight">
                      {result.alt || "Stock Media"}
                    </p>
                  </div>
                  
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white font-mono uppercase">
                    {result.type === "video" ? `${result.duration}s` : "PHOTO"}
                  </div>
                  
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                    <span className="text-white font-bold text-xs bg-black/50 px-2 py-1 rounded">Select {result.type}</span>
                    <span className="text-white text-[9px] mt-1 opacity-80">{result.provider}</span>
                  </div>
                </div>
              ))}
              {stockResults.length === 0 && !isSearching && (
                <div className="col-span-full flex items-center justify-center h-full text-muted py-12">
                  Enter a query to find stock assets.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
