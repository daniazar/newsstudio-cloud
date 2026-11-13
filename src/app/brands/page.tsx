"use client";

import React from "react";
import Link from "next/link";
import { Plus, Trash2, Camera, Tv, Smartphone, Layers, Users } from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";
import type { BrandDetailItem } from "@/lib/types/brand";

type BrandItem = BrandDetailItem;

export default function BrandsPage() {
  const { toast } = useToast();
  const {
    items: brands,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
    mutate,
  } = useInfiniteList<BrandItem>("/api/brands", { limit: 24 });
  const brandsLoaded = !isLoadingInitial;

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete the brand '${name}'? This removes it and its mappings from our DB.`)) {
      try {
        const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast("Deleted", "Brand deleted successfully", "success");
          mutate();
        } else {
          toast("Error", "Could not delete", "error");
        }
      } catch {
        toast("Error", "Connection error", "error");
      }
    }
  };

  const hasPlatform = (brand: BrandItem, platform: string) => {
    return brand.channels.some(c => c.platform === platform && c.isConnected);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  Brands & Channels
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  NETWORK MATRIX
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">
                Configure brand identities, anchor associations, and automated cross-platform distribution
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/brands/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 active:scale-95 border border-emerald-400/30 self-start"
        >
          <Plus className="w-4 h-4" /> 
          <span>New Brand</span>
        </Link>
      </div>

      {!brandsLoaded ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-mono font-medium">Loading network matrix...</span>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-28 border border-border/80 rounded-3xl max-w-md mx-auto p-10 glass-panel-raised flex flex-col items-center gap-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center text-indigo-400">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground tracking-tight">No Brands Found</h3>
            <p className="text-xs text-subtle mt-1 leading-relaxed font-normal">
              Create your first brand profile to link news feeds, anchors, and social channels.
            </p>
          </div>
          <Link
            href="/brands/new"
            className="mt-2 flex items-center gap-1.5 px-4 py-2 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Brand
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="glass-panel-raised border border-border/80 rounded-3xl p-5 flex flex-col gap-4 shadow-xl hover:border-indigo-500/50 transition-all duration-300 relative group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border/80 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                    {brand.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.profileImageUrl} alt={brand.name} className="w-full h-full object-cover" />
                    ) : (
                      <Tv className="w-6 h-6 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground tracking-tight leading-tight line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {brand.name}
                    </h4>
                    <span className="text-[10px] text-muted font-mono font-semibold">{brand.handle}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(brand.id, brand.name, e)}
                  className="p-2 rounded-xl bg-white/[0.04] border border-border/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-subtle hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>


              {/* Brand Stats Row */}
              <div className="flex items-center gap-2">
                 <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-raised rounded-lg text-[10px] font-mono font-bold text-subtle border border-border/60">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> {brand.personas?.length || 0} Anchors
                 </span>
                 <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-raised rounded-lg text-[10px] font-mono font-bold text-subtle border border-border/60">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> {brand.rssGroups?.length || 0} RSS Groups
                 </span>
              </div>

              <div className="border-t border-border/40 pt-3 mt-1 flex items-center justify-between text-[10px] font-mono font-bold">
                <span className="text-muted uppercase tracking-wider">Networks:</span>
                <div className="flex gap-2">
                  {hasPlatform(brand, 'youtube') && <span title="YouTube"><Tv className="w-4 h-4 text-red-500" /></span>}
                  {hasPlatform(brand, 'instagram') && <span title="Instagram"><Camera className="w-4 h-4 text-pink-500" /></span>}
                  {hasPlatform(brand, 'tiktok') && <span title="TikTok"><Smartphone className="w-4 h-4 text-cyan-400" /></span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <InfiniteScrollSentinel
        disabled={isReachingEnd || isLoadingMore}
        onIntersect={() => setSize(size + 1)}
      />
    </div>
  );
}
