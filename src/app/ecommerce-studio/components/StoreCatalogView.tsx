"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  ArrowLeft,
  Search,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Clapperboard,
  Trash2,
  ShoppingBag,
  RotateCcw,
  FileText,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { StorefrontItem } from "./StorefrontsDirectoryView";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";

export interface CatalogProductItem {
  id: string;
  title: string;
  vendor: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  typology: string;
  sourceUrl: string;
  thumbnailUrl: string;
  variationCount: number;
  assetCount: number;
  spec: ProductSpec;
  createdAt: string;
}

export interface StoreCatalogViewProps {
  store: StorefrontItem | null;
  storeId?: string;
  products?: CatalogProductItem[];
  onSelectProduct: (spec: ProductSpec) => void;
  onOpenStoryboardModal?: (spec: ProductSpec) => void;
  onBackToStores: () => void;
  onSyncStore?: (storeId: string, options?: { limit?: number; maxPages?: number }) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onHarvestSingleUrl: (url: string) => Promise<void>;
  onOpenCsvModal: () => void;
  isSyncingStore?: boolean;
  isHarvesting?: boolean;
}

export const StoreCatalogView: React.FC<StoreCatalogViewProps> = ({
  store,
  storeId,
  products,
  onSelectProduct,
  onOpenStoryboardModal,
  onBackToStores,
  onSyncStore,
  onDeleteProduct,
  onHarvestSingleUrl,
  onOpenCsvModal,
  isSyncingStore = false,
  isHarvesting = false,
}) => {
  const effectiveStoreId = storeId || store?.id;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [typologyFilter, setTypologyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [singleUrlInput, setSingleUrlInput] = useState("");

  const {
    items: serverProducts,
    total: totalServerProducts,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
    mutate,
  } = useInfiniteList<CatalogProductItem>("/api/ecommerce/products", {
    limit: 24,
    filters: {
      storefrontId: effectiveStoreId || undefined,
      search: debouncedSearch || undefined,
      typology: typologyFilter !== "all" ? typologyFilter : undefined,
      sortBy: sortBy !== "newest" ? sortBy : undefined,
    },
  });

  const displayProducts = effectiveStoreId || !products ? serverProducts : products;
  const totalCount = effectiveStoreId || !products ? totalServerProducts : products.length;

  const handleSingleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrlInput.trim()) return;
    await onHarvestSingleUrl(singleUrlInput.trim());
    setSingleUrlInput("");
    mutate();
  };

  const handleSync = async (targetId: string, options?: { limit?: number; maxPages?: number }) => {
    if (onSyncStore) {
      await onSyncStore(targetId, options);
      mutate();
    }
  };

  const handleDelete = async (productId: string) => {
    await onDeleteProduct(productId);
    mutate();
  };


  const typologies = [
    { id: "all", label: "All Items" },
    { id: "surface_material", label: "Surfaces & Flooring" },
    { id: "discrete_object", label: "Tech & Gadgets" },
    { id: "apparel_wearable", label: "Apparel" },
    { id: "sensory_consumable", label: "Beauty & Food" },
    { id: "bulky_furniture", label: "Furniture" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#09090c] text-white">
      {/* Top Breadcrumb & Store Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950/40 via-cyan-950/25 to-purple-950/30 border border-white/10 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToStores}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Stores Directory</span>
            </button>
            <span className="text-muted-foreground/40 font-mono">/</span>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-black text-white">{store ? store.name : "All Store Catalogs"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {store && onSyncStore && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSync(store.id, { limit: 48, maxPages: 1 })}
                  disabled={isSyncingStore}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Scrape first page of catalog"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStore ? "animate-spin" : ""}`} />
                  <span>Sync (48)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSync(store.id, { limit: 150, maxPages: 4 })}
                  disabled={isSyncingStore}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                  title="Scrape multiple pages (100+ items) into database"
                >
                  <Zap className="w-3.5 h-3.5 fill-black stroke-none" />
                  <span>{isSyncingStore ? "Ingesting Catalog..." : "⚡ Deep Ingest (100+ Products)"}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenCsvModal}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        {/* Store Detail Strip */}
        {store && (
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white">{store.name}</h2>
                <a
                  href={store.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono hover:underline"
                >
                  <span>{store.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{store.description || "Connected catalog feed."}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono font-bold">
              <span className="uppercase px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {store.platform}
              </span>
              <span className="uppercase px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Currency: {store.currency}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white border border-white/10 font-bold">
                {totalCount} Products In Catalog
              </span>
              {store.lastScrapedAt && (
                <span className="text-muted-foreground text-[11px]">
                  Last Synced: {new Date(store.lastScrapedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Single URL Harvest Bar */}
      <form onSubmit={handleSingleScrape} className="bg-[#121216] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={singleUrlInput}
            onChange={(e) => setSingleUrlInput(e.target.value)}
            placeholder={
              store
                ? `Paste a single product URL from ${store.name} (e.g. ${store.url}/productos/...)...`
                : "Paste any product URL to scrape immediately (Tiendanube, Shopify, Amazon, WooCommerce)..."
            }
            className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          disabled={isHarvesting || !singleUrlInput.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 shrink-0"
        >
          {isHarvesting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Scrape & Add Item</span>
        </button>
      </form>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title, vendor, or SKU..."
            className="w-full bg-[#121216] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Typology & Sort Controls */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {typologies.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypologyFilter(t.id)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
                  typologyFilter === t.id
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-[#121216] border-white/10 text-muted-foreground hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#121216] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-medium shrink-0"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="title">Title: A-Z</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {displayProducts.map((p) => (
          <div
            key={p.id}
            className="bg-[#121216] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-lg hover:shadow-cyan-500/5 group"
          >
            <div className="space-y-3">
              {/* Thumbnail Image */}
              <div
                onClick={() => onSelectProduct(p.spec)}
                className="w-full h-48 rounded-2xl overflow-hidden bg-black/40 relative border border-white/10 cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder_product.png";
                  }}
                />
                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider border border-white/10">
                  {p.typology.replace(/_/g, " ")}
                </div>
                {p.compareAtPrice && p.compareAtPrice > p.price && (
                  <div className="absolute top-2.5 right-2.5 bg-rose-500/90 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                    -{Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)}%
                  </div>
                )}
                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-white/90 border border-white/10 flex items-center gap-1">
                  <span>📸</span>
                  <span>{p.assetCount || 1} {p.assetCount === 1 ? "Foto" : "Fotos"}</span>
                </div>
              </div>

              {/* Title & Brand */}
              <div>
                <div className="text-[11px] font-bold text-muted-foreground">{p.vendor}</div>
                <h3
                  onClick={() => onSelectProduct(p.spec)}
                  className="text-sm font-extrabold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors mt-0.5 cursor-pointer"
                >
                  {p.title}
                </h3>
              </div>

              {/* Technical Specifications Badge Strip */}
              {p.spec && (
                <div className="flex flex-wrap gap-1">
                  {p.spec.typologySpecifics?.surfaceMaterial?.thickness && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                      {p.spec.typologySpecifics.surfaceMaterial.thickness}
                    </span>
                  )}
                  {p.spec.typologySpecifics?.surfaceMaterial?.dimensions && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
                      {p.spec.typologySpecifics.surfaceMaterial.dimensions}
                    </span>
                  )}
                  {p.spec.typologySpecifics?.surfaceMaterial?.rectified && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Rectificado
                    </span>
                  )}
                  {p.spec.typologySpecifics?.surfaceMaterial?.yieldPerBox && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {p.spec.typologySpecifics.surfaceMaterial.yieldPerBox}
                    </span>
                  )}
                  {p.spec.typologySpecifics?.surfaceMaterial?.usageClass && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {p.spec.typologySpecifics.surfaceMaterial.usageClass}
                    </span>
                  )}
                  {p.spec.typologySpecifics?.surfaceMaterial?.origin && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">
                      {p.spec.typologySpecifics.surfaceMaterial.origin}
                    </span>
                  )}
                </div>
              )}

              {/* Storyboard Status Badge */}
              {p.spec?.savedScript?.scenes?.length ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>
                    Storyboard Ready • {p.spec.savedScript.scenes.length}{" "}
                    {p.spec.savedScript.scenes.length === 1 ? "Scene" : "Scenes"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold animate-pulse">
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Raw Product • Needs Storyboard</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">
                  {p.currency && p.currency !== "USD" ? `${p.currency} $` : "$"}
                  {p.price.toLocaleString()}
                </span>
                {p.compareAtPrice && p.compareAtPrice > p.price && (
                  <span className="text-xs line-through text-muted-foreground">
                    {p.currency && p.currency !== "USD" ? `${p.currency} $` : "$"}
                    {p.compareAtPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Direct Launch Video Studio or Pre-Production Storyboard */}
            <div className="pt-3 border-t border-white/10 flex items-center gap-2">
              {p.spec?.savedScript?.scenes?.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(p.spec)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                  >
                    <Clapperboard className="w-3.5 h-3.5" />
                    <span>Open Editor →</span>
                  </button>

                  {onOpenStoryboardModal && (
                    <button
                      type="button"
                      onClick={() => onOpenStoryboardModal(p.spec)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-muted-foreground hover:text-cyan-300 border border-white/10 transition-colors"
                      title="Re-Direct AI Storyboard"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onOpenStoryboardModal ? onOpenStoryboardModal(p.spec) : onSelectProduct(p.spec)
                  }
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all transform hover:scale-[1.01]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ Direct Storyboard →</span>
                </button>
              )}

              <a
                href={p.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 transition-colors"
                title="View on store website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 transition-colors"
                title="Delete from local database"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        <InfiniteScrollSentinel
          onIntersect={() => setSize(size + 1)}
          disabled={isReachingEnd || isLoadingMore}
          className="col-span-full h-1"
        />

        {isLoadingInitial && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-xs text-muted-foreground">Loading catalog items...</p>
          </div>
        )}

        {!isLoadingInitial && displayProducts.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-[#121216] border border-white/10 rounded-3xl">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-white">
                {search || typologyFilter !== "all" ? "No products match your filter" : "No products found in this catalog"}
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || typologyFilter !== "all"
                  ? "Try clearing your search query or choosing 'All Items' typology."
                  : store
                  ? `Click "Sync Store Catalog" above to scrape products from ${store.name}, or paste an individual product URL.`
                  : "Connect a storefront or import a catalog CSV to start generating video ads."}
              </p>
            </div>
            {search || typologyFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypologyFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : store && onSyncStore ? (
              <button
                type="button"
                onClick={() => handleSync(store.id)}
                disabled={isSyncingStore}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStore ? "animate-spin" : ""}`} />
                <span>Harvest Catalog Now</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
