"use client";

import { ProductSpec } from "@/lib/types/ecommerce";
import {
CheckCircle2,
ExternalLink,
FileText,
Globe,
RefreshCw,
Search,
ShoppingBag,
Sparkles,
Store,
Tag,
Upload,
X
} from "lucide-react";
import React,{ useRef,useState } from "react";

export interface StorefrontCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: ProductSpec) => void;
  onBatchGenerate?: (products: ProductSpec[]) => void;
  initialTab?: "crawler" | "csv";
}

export const StorefrontCatalogModal: React.FC<StorefrontCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onBatchGenerate,
  initialTab = "crawler",
}) => {
  const [activeTab, setActiveTab] = useState<"crawler" | "csv">(initialTab);
  const [storeUrl, setStoreUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [discoveredProducts, setDiscoveredProducts] = useState<ProductSpec[]>([]);
  const [detectedProtocol, setDetectedProtocol] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // CSV Drag-and-Drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCrawlStorefront = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || storeUrl;
    if (!targetUrl.trim()) return;

    setIsCrawling(true);
    setCrawlError(null);

    try {
      const res = await fetch("/api/ecommerce/storefront/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, limit: 24 }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setDiscoveredProducts(data.products);
        setDetectedProtocol(data.protocol);
        setStoreName(data.storeName || "Store Catalog");
      } else {
        setCrawlError(data.error || "Failed to discover products at this URL.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCrawlError(msg);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleProcessCsvFile = async (file: File) => {
    setIsUploadingCsv(true);
    setCrawlError(null);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ecommerce/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setDiscoveredProducts(data.products);
        setDetectedProtocol(data.formatLabel || "CSV Import");
        setStoreName(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        setCrawlError(data.error || "Failed to parse CSV product catalog.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCrawlError(msg);
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessCsvFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessCsvFile(e.target.files[0]);
    }
  };

  const handleLoadSampleShopifyCsv = async () => {
    const sampleCsv = `Handle,Title,Body (HTML),Vendor,Variant Price,Variant Compare At Price,Image Src
aerobuds-pro,AeroBuds Pro Active ANC Earbuds,"<p>Active noise cancelling titanium drivers.</p><ul><li>42dB Hybrid ANC</li><li>36h Battery Life</li><li>IPX7 Waterproof</li></ul>",SonicTech,49.99,99.99,https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800
aerobuds-pro,AeroBuds Pro Active ANC Earbuds,"",SonicTech,49.99,99.99,https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800
luxe-oak-flooring,European White Oak Luxury Flooring,"<p>Uniclic glue-free DIY interlocking boards.</p><ul><li>100% Waterproof seal</li><li>Scratch proof AC4</li></ul>",LuxeFloor,79.00,120.00,https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800
cloudflow-saas,CloudFlow AI Workflow Automation,"<p>Automate your business workflows in 2 minutes.</p><ul><li>98% Time Saved</li><li>Instant Integrations</li></ul>",CloudFlow,29.00,59.00,https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800
apex-plumbing,Apex 24/7 Rapid Emergency Plumbing,"<p>Rapid emergency dispatch across the metro area.</p><ul><li>30-Min Arrival</li><li>Licensed & Bonded</li></ul>",Apex Services,149.00,199.00,https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800`;

    setIsUploadingCsv(true);
    setCrawlError(null);
    setUploadedFileName("sample_shopify_catalog.csv");

    try {
      const res = await fetch("/api/ecommerce/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: sampleCsv }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setDiscoveredProducts(data.products);
        setDetectedProtocol(data.formatLabel || "Shopify Product CSV");
        setStoreName("Sample Store");
      }
    } catch {
      setCrawlError("Failed to parse sample catalog.");
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleBatchClick = () => {
    if (onBatchGenerate && discoveredProducts.length > 0) {
      setIsBatchProcessing(true);
      onBatchGenerate(discoveredProducts);
      setTimeout(() => setIsBatchProcessing(false), 2000);
    }
  };

  const samplePresets = [
    { label: "👟 Allbirds (Shopify)", url: "https://www.allbirds.com" },
    { label: "🏃 Gymshark (Shopify)", url: "https://www.gymshark.com" },
    { label: "🪵 LuxeFloor Oak (Direct)", url: "https://luxefloor.com" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0e0e13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-black font-black">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Product Catalog & Feed Ingestion Hub
                </h3>
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Sprint E7
                </span>
                {detectedProtocol && (
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {detectedProtocol.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crawl live e-commerce websites or drag-and-drop Shopify & WooCommerce CSV files to generate multi-format video ads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Strategy Switcher Tabs */}
        <div className="px-5 pt-3 pb-0 border-b border-white/10 bg-black/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("crawler")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
              activeTab === "crawler"
                ? "bg-[#141418] border-white/15 text-cyan-400 shadow-sm"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Storefront & RSS Feed Crawler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
              activeTab === "csv"
                ? "bg-[#141418] border-white/15 text-purple-400 shadow-sm"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Direct CSV / TSV Drag & Drop Upload</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: LIVE STOREFRONT & FEED CRAWLER                             */}
        {/* ================================================================= */}
        {activeTab === "crawler" && (
          <div className="p-5 border-b border-white/5 bg-black/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter storefront website or feed URL (e.g. https://shop.brand.com or /products.json)..."
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrawlStorefront()}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCrawlStorefront()}
                disabled={isCrawling || !storeUrl.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isCrawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>{isCrawling ? "Crawling Catalog..." : "Discover Products"}</span>
              </button>
            </div>

            {/* Quick Preset Pills */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-muted-foreground font-semibold">Test Presets:</span>
              {samplePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setStoreUrl(preset.url);
                    handleCrawlStorefront(preset.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            {crawlError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{crawlError}</span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: DIRECT CSV / TSV DRAG & DROP UPLOAD                        */}
        {/* ================================================================= */}
        {activeTab === "csv" && (
          <div className="p-5 border-b border-white/5 bg-black/30 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? "border-purple-400 bg-purple-500/10 scale-[0.99]"
                  : "border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/50"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/10">
                {isUploadingCsv ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                ) : (
                  <Upload className="w-6 h-6 text-purple-300" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-white">
                  {isUploadingCsv
                    ? `Parsing ${uploadedFileName}...`
                    : "Drag & drop your Shopify, WooCommerce, or custom CSV file here"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Supports .csv, .tsv, and raw product tables with multi-line HTML and multi-row variant grouping
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-white font-mono">
                  Browse Local File
                </span>
                <span className="text-xs text-muted-foreground">or</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSampleShopifyCsv();
                  }}
                  className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1 rounded-lg text-purple-300 font-bold transition-colors"
                >
                  ⚡ Try Sample Shopify CSV (5 items)
                </button>
              </div>
            </div>

            {crawlError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{crawlError}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Body: Products Catalog Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isCrawling || isUploadingCsv ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-white">
                {isUploadingCsv ? "Parsing CSV Catalog & Grouping Variants..." : "Probing Storefront Protocols & Catalog Feeds..."}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Classifying typologies, extracting bullet points, and constructing ProductSpecs...
              </p>
            </div>
          ) : discoveredProducts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-muted-foreground">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No Catalog Ingested Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Crawl a live store website above or drop a Shopify / WooCommerce CSV file to view all products.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {storeName || "Imported"} Catalog
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground">
                    {discoveredProducts.length} Products Found
                  </span>
                </div>

                {onBatchGenerate && (
                  <button
                    type="button"
                    onClick={handleBatchClick}
                    disabled={isBatchProcessing}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Batch Generate All ({discoveredProducts.length})</span>
                  </button>
                )}
              </div>

              {/* Products Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {discoveredProducts.map((p) => {
                  const heroImg = p.assets?.find((a) => a.type === "hero_packshot")?.url || p.assets?.[0]?.url;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/10 flex flex-col justify-between space-y-3 transition-all group"
                    >
                      <div className="space-y-2">
                        {/* Image Preview */}
                        <div className="relative w-full aspect-video rounded-xl bg-black/40 overflow-hidden flex items-center justify-center border border-white/5">
                          {heroImg ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={heroImg}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                          )}
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white border border-white/10">
                            ${p.price.toFixed(2)}
                            {p.compareAtPrice && (
                              <span className="ml-1 text-muted-foreground line-through text-[9px]">
                                ${p.compareAtPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Details */}
                        <div>
                          <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                            {p.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Tag className="w-3 h-3 text-cyan-400" /> {p.typology.replace("_", " ")}
                            </span>
                            {p.vendor && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                • {p.vendor}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(p);
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Load into Studio
                        </button>

                        <a
                          href={p.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                          title="View Live Product Page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-format video ads & viral hooks synthesized automatically on selection.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
