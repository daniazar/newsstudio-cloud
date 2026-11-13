"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import {
  Film,
  Image as ImageIcon,
  UploadCloud,
  FolderOpen,
  Search,
  Sparkles,
  AlertCircle,
  X,
  FileVideo,
  FileImage,
} from "lucide-react";

export interface UnifiedAsset {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified?: string;
  type?: "video" | "image";
}

export interface UnifiedMediaStudioModalProps {
  isOpen?: boolean;
  onSelect: (url: string, type: "video" | "image") => void;
  onClose: () => void;
  suggestedKeywords?: string[];
  referenceImageUrls?: string[] | null;
  title?: string;
  segmentId?: string;
}

const StockVideoPreview: React.FC<{ result: { previewUrl: string; previewVideoUrl?: string; alt?: string } }> = ({ result }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={result.previewUrl}
        alt={result.alt || "Stock asset"}
        className="w-full h-full object-cover bg-zinc-900"
        loading="lazy"
      />
      {isHovered && result.previewVideoUrl && (
        <video
          src={result.previewVideoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          autoPlay
          loop
          playsInline
        />
      )}
    </div>
  );
};

export const UnifiedMediaStudioModal: React.FC<UnifiedMediaStudioModalProps> = ({
  isOpen = true,
  onSelect,
  onClose,
  suggestedKeywords = [],
  referenceImageUrls = null,
  title = "Media Studio: B-Roll, Stock & Uploads",
  segmentId,
}) => {
  const [activeTab, setActiveTab] = useState<"stock" | "library" | "upload" | "reference">("stock");

  // Stock state
  const [searchQuery, setSearchQuery] = useState("");
  const [stockType, setStockType] = useState<"video" | "photo">("video");
  const [stockResults, setStockResults] = useState<
    {
      id?: string;
      externalId?: string;
      downloadUrl: string;
      previewUrl: string;
      previewVideoUrl?: string;
      alt?: string;
      type?: "video" | "image";
      duration?: number | string;
      provider?: string;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Library state
  const [libraryAssets, setLibraryAssets] = useState<UnifiedAsset[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tenant library assets
  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const data = await res.json();
        setLibraryAssets(data.assets || []);
      }
    } catch (err) {
      console.error("Failed to fetch library assets", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Stock search handler
  const handleStockSearch = async (queryToSearch?: string, overrideType?: "video" | "photo") => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    const typeToSearch = overrideType || stockType;
    if (!q) return;

    if (queryToSearch && queryToSearch !== searchQuery) {
      setSearchQuery(queryToSearch);
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/stock/search?query=${encodeURIComponent(q)}&type=${typeToSearch}&per_page=20`
      );
      const data = await res.json();

      let results = data.results || [];
      if (results.length === 0 && typeToSearch === "video") {
        const photoRes = await fetch(
          `/api/stock/search?query=${encodeURIComponent(q)}&type=photo&per_page=20`
        );
        const photoData = await photoRes.json();
        results = photoData.results || [];
      }

      setStockResults(results);
    } catch (err) {
      console.error("Stock search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search on mount if keywords available
  useEffect(() => {
    if (suggestedKeywords.length > 0 && stockResults.length === 0 && !searchQuery) {
      setSearchQuery(suggestedKeywords[0]);
      handleStockSearch(suggestedKeywords[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // File upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (segmentId) formData.append("segmentId", segmentId);

      setUploadProgress(45);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload file");
      }

      const data = await res.json();
      setUploadProgress(100);

      // Auto-select uploaded asset
      onSelect(data.url, data.type || (file.type.startsWith("video/") ? "video" : "image"));
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Upload failed", err);
      setUploadError(e?.message || "Failed to upload file");
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0e0e12] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
              <p className="text-[11px] text-zinc-400">
                Pexels & Pixabay stock footage, private library vault & custom file uploads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-zinc-800/80 bg-zinc-950/30 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "stock"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Stock B-Roll & Photos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("library");
                fetchLibrary();
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "library"
                  ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>My Media Library</span>
              {libraryAssets.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                  {libraryAssets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "border-purple-400 text-purple-300 bg-purple-500/10"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Custom File</span>
            </button>

            {referenceImageUrls && referenceImageUrls.length > 0 && (
              <button
                onClick={() => setActiveTab("reference")}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "reference"
                    ? "border-amber-400 text-amber-300 bg-amber-500/10"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Reference / Article Images</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                  {referenceImageUrls.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Stock Search Controls */}
        {activeTab === "stock" && (
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search 1,000,000+ free 4K stock videos and high-res photos..."
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStockSearch()}
                />
              </div>

              {/* Type Switcher */}
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setStockType("video");
                    if (searchQuery) handleStockSearch(searchQuery, "video");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockType === "video"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  VIDEO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockType("photo");
                    if (searchQuery) handleStockSearch(searchQuery, "photo");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockType === "photo"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  PHOTO
                </button>
              </div>

              <Button
                onClick={() => handleStockSearch()}
                isLoading={isSearching}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold px-4"
              >
                Search
              </Button>
            </div>

            {/* AI Keyword Suggestions */}
            {suggestedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  AI Suggestions:
                </span>
                {suggestedKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => handleStockSearch(kw)}
                    className="text-xs px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Stock Gallery */}
          {activeTab === "stock" && (
            <div>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono">Searching Pexels & Pixabay...</p>
                </div>
              ) : stockResults.length > 0 ? (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                  {stockResults.map((result) => (
                    <div
                      key={result.externalId || result.id || result.downloadUrl}
                      className="group relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 cursor-pointer hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 transition-all duration-300 break-inside-avoid"
                      onClick={() => {
                        onSelect(result.downloadUrl, result.type === "video" ? "video" : "image");
                        onClose();
                      }}
                    >
                      {result.type === "video" ? (
                        <StockVideoPreview result={result} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.previewUrl}
                          alt={result.alt || "Stock asset"}
                          className="w-full h-full object-cover bg-zinc-900"
                          loading="lazy"
                        />
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                      {/* Info & Duration */}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white font-mono uppercase">
                        {result.type === "video" ? `${result.duration || "4"}s` : "PHOTO"}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col justify-end pointer-events-none">
                        <p className="text-[10px] text-zinc-200 line-clamp-2 leading-tight font-medium">
                          {result.alt || "Stock Asset"}
                        </p>
                        <span className="text-[9px] text-zinc-400 mt-0.5">{result.provider}</span>
                      </div>

                      {/* Hover Action */}
                      <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                        <span className="text-black font-bold text-xs bg-cyan-400 px-3 py-1 rounded-full shadow-lg">
                          Select {result.type === "video" ? "Video" : "Photo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-500">
                  <Search className="w-10 h-10 mb-3 text-zinc-700" />
                  <p className="text-sm font-semibold text-zinc-300">No stock assets found</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    Try searching for broader keywords like "business", "technology", "city", or "nature".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: My Media Library */}
          {activeTab === "library" && (
            <div>
              {isLoadingLibrary ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono">Loading assets from vault...</p>
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                  <div className="w-14 h-14 mb-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl">
                    📁
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200">Your Media Library is Empty</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                    Upload your own B-roll videos, hero packshots, logos, and custom graphics.
                  </p>
                  <Button
                    onClick={() => setActiveTab("upload")}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                  >
                    Upload Your First File
                  </Button>
                </div>
              ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                  {libraryAssets.map((asset) => {
                    const isVideo =
                      asset.name.endsWith(".mp4") ||
                      asset.name.endsWith(".webm") ||
                      asset.name.endsWith(".mov");

                    return (
                      <div
                        key={asset.key}
                        className="group relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 cursor-pointer hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 transition-all duration-300 break-inside-avoid"
                        onClick={() => {
                          onSelect(asset.url, isVideo ? "video" : "image");
                          onClose();
                        }}
                      >
                        {isVideo ? (
                          <video
                            src={asset.url}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => e.currentTarget.pause()}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover bg-zinc-900"
                            loading="lazy"
                          />
                        )}

                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white font-mono uppercase flex items-center gap-1">
                          {isVideo ? (
                            <>
                              <FileVideo className="w-3 h-3 text-emerald-400" />
                              <span>VIDEO</span>
                            </>
                          ) : (
                            <>
                              <FileImage className="w-3 h-3 text-cyan-400" />
                              <span>IMAGE</span>
                            </>
                          )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                          <p className="text-xs text-white truncate font-medium">{asset.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {(asset.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>

                        <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-black font-bold text-xs bg-emerald-400 px-3 py-1 rounded-full shadow-lg">
                            Apply Asset
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Direct File Upload */}
          {activeTab === "upload" && (
            <div className="max-w-xl mx-auto py-8">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? "border-purple-400 bg-purple-500/10 scale-[1.01]"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-purple-500/50 hover:bg-zinc-900/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  Drag & Drop your video or image here
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-4">
                  Supported formats: MP4, WebM, MOV, PNG, JPG, WebP (up to 500MB)
                </p>

                <Button
                  type="button"
                  size="sm"
                  className="bg-purple-500 hover:bg-purple-400 text-white font-bold"
                >
                  Browse Files on Computer
                </Button>
              </div>

              {/* Uploading Progress */}
              {isUploading && (
                <div className="mt-6 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
                  <div className="flex items-center justify-between text-xs font-mono text-purple-300 mb-2">
                    <span>Uploading and saving to cloud storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mt-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Reference / Article Images */}
          {activeTab === "reference" && referenceImageUrls && (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
              {referenceImageUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 transition-all duration-300 break-inside-avoid"
                  onClick={() => {
                    onSelect(url, "image");
                    onClose();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Reference ${idx}`}
                    className="w-full h-full object-cover bg-zinc-900"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-md p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-xs text-white truncate font-medium">Source Image {idx + 1}</p>
                  </div>
                  <div className="absolute inset-0 bg-amber-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-black font-bold text-xs bg-amber-400 px-3 py-1 rounded-full shadow-lg">
                      Use Image
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
