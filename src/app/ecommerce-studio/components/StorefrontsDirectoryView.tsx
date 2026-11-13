"use client";

import React, { useState } from "react";
import {
  Store,
  Plus,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
} from "lucide-react";

export interface StorefrontItem {
  id: string;
  name: string;
  url: string;
  platform: string;
  currency: string;
  description?: string;
  logoUrl?: string;
  lastScrapedAt?: string | null;
  productCount: number;
  createdAt: string;
}

export interface StorefrontProductPreview {
  id: string;
  title: string;
  thumbnailUrl: string;
  price: number;
  currency?: string;
}

export interface StorefrontsDirectoryViewProps {
  storefronts: StorefrontItem[];
  allProducts: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    price: number;
    currency?: string;
    storefrontId?: string;
  }>;
  onSelectStore: (store: StorefrontItem) => void;
  onSyncStore: (storeId: string) => Promise<void>;
  onAddStore: (storeData: { url: string; name?: string; platform: string }) => Promise<void>;
  isSyncingStoreId?: string | null;
}

export const StorefrontsDirectoryView: React.FC<StorefrontsDirectoryViewProps> = ({
  storefronts,
  allProducts,
  onSelectStore,
  onSyncStore,
  onAddStore,
  isSyncingStoreId,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStoreUrl, setNewStoreUrl] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [newStorePlatform, setNewStorePlatform] = useState("tiendanube");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddStore({
        url: newStoreUrl.trim(),
        name: newStoreName.trim() || undefined,
        platform: newStorePlatform,
      });
      setShowAddModal(false);
      setNewStoreUrl("");
      setNewStoreName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregate metrics
  const totalStores = storefronts.length;
  const totalProducts = storefronts.reduce((acc, s) => acc + (s.productCount || 0), 0);
  const totalPlatforms = Array.from(new Set(storefronts.map((s) => s.platform))).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#09090c] text-white">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-cyan-950/40 border border-white/10 p-8 overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Independent E-Commerce Hub
              </span>
              <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Omnichannel Video Suite
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Connected E-Commerce Storefronts
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Harvest entire storefronts, ingest product catalogs into your local database, and turn any item into high-conversion Remotion video ads or physical Google Veo demonstrations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>Connect New Storefront</span>
          </button>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="space-y-0.5">
            <div className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
              Connected Stores
            </div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <Store className="w-5 h-5 text-cyan-400" />
              <span>{totalStores}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
              Catalog Items In DB
            </div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <span>{totalProducts}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
              Active Engines
            </div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>{totalPlatforms} Platforms</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
              Video Ad Pipelines
            </div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Remotion + Veo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storefronts Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-cyan-400" /> Active Connected Sites ({storefronts.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Select a store to explore its catalog and launch commercial video production.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storefronts.map((store) => {
            const isSyncing = isSyncingStoreId === store.id;
            // Get sample product packshots for this store
            const storeProducts = allProducts.filter((p) => p.storefrontId === store.id).slice(0, 4);

            return (
              <div
                key={store.id}
                className="bg-[#121216] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-cyan-500/5 group"
              >
                <div className="space-y-4">
                  {/* Card Header: Brand & Live Link */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0 font-black">
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                          {store.name}
                        </h3>
                        <a
                          href={store.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-muted-foreground hover:text-cyan-400 flex items-center gap-1 font-mono hover:underline"
                        >
                          <span>{store.url.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSyncStore(store.id)}
                      disabled={isSyncing}
                      className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-muted-foreground hover:text-cyan-300 border border-white/10 transition-colors disabled:opacity-50"
                      title="Sync / Scrape Catalog Live"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
                    </button>
                  </div>

                  {/* Badges Strip */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono font-bold">
                    <span className="uppercase px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {store.platform}
                    </span>
                    <span className="uppercase px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Currency: {store.currency}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/5 text-white border border-white/10">
                      {store.productCount} Items In DB
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {store.description || `Automated live e-commerce catalog feed connected via ${store.platform}.`}
                  </p>

                  {/* Sample Packshots Strip */}
                  {storeProducts.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                        Ingested Packshots Preview:
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {storeProducts.map((sp) => (
                          <div
                            key={sp.id}
                            className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group/thumb"
                            title={sp.title}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sp.thumbnailUrl}
                              alt={sp.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder_product.png";
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-[11px] text-muted-foreground">
                      No products ingested yet. Click &quot;Sync Catalog&quot; to harvest products.
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {store.lastScrapedAt ? (
                      <span>Synced: {new Date(store.lastScrapedAt).toLocaleTimeString()}</span>
                    ) : (
                      <span>Not synced yet</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectStore(store)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs flex items-center gap-1.5 transition-colors group-hover:bg-cyan-500 group-hover:text-black"
                  >
                    <span>Browse Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick Connect Store Card */}
          <div
            onClick={() => setShowAddModal(true)}
            className="bg-[#121216]/50 border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all hover:bg-white/[0.02] group min-h-[300px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                Connect Another Storefront
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Add any Tiendanube, Shopify, or WooCommerce store to ingest its products and generate commercial video ads.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-lg">
              Auto-Protocol Detection
            </span>
          </div>
        </div>
      </div>

      {/* Connect Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#121216] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Connect Storefront Webpage</h3>
                  <p className="text-[11px] text-muted-foreground">Auto-crawls and registers the product catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">Store Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="https://www.storehaus.com.ar"
                    value={newStoreUrl}
                    onChange={(e) => setNewStoreUrl(e.target.value)}
                    className="w-full bg-[#18181c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">Store Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. StoreHaus"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">Platform / Engine</label>
                <select
                  value={newStorePlatform}
                  onChange={(e) => setNewStorePlatform(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="tiendanube">Tiendanube / Nuvemshop (StoreHaus, etc.)</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="google_merchant">Google Merchant Center XML</option>
                  <option value="custom">Custom / Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newStoreUrl.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Connect & Register</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
