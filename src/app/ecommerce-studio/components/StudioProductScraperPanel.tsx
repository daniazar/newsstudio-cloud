import React from "react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { Search, Sparkles, Layers, CheckCircle2 } from "lucide-react";
import { SAMPLE_PRODUCTS } from "@/lib/ecommerce/sampleProducts";

export interface StudioProductScraperPanelProps {
  productUrl: string;
  setProductUrl: (url: string) => void;
  isHarvesting: boolean;
  harvestError?: string | null;
  onHarvest: (url?: string) => void;
  selectedProduct: ProductSpec | null;
  onSelectSampleProduct: (product: ProductSpec) => void;
}

export const StudioProductScraperPanel: React.FC<StudioProductScraperPanelProps> = ({
  productUrl,
  setProductUrl,
  isHarvesting,
  harvestError,
  onHarvest,
  selectedProduct,
  onSelectSampleProduct,
}) => {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          Product Harvester & Scraper
        </h2>
        <span className="text-xs text-zinc-500">Shopify • Amazon • Custom URL</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onHarvest();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Paste Shopify or Amazon product link (e.g. https://store.com/products/item)..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isHarvesting}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 text-white font-semibold text-xs transition-colors flex items-center gap-2 shrink-0"
        >
          {isHarvesting ? (
            <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isHarvesting ? "Harvesting..." : "Scrape Product"}
        </button>
      </form>

      {harvestError && (
        <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg p-2.5">
          {harvestError}
        </p>
      )}

      <div className="pt-1">
        <p className="text-xs font-medium text-zinc-400 mb-2">Instant Demo Products:</p>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_PRODUCTS.map((p) => {
            const isSelected = selectedProduct?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectSampleProduct(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <Layers className="w-3.5 h-3.5 text-zinc-500" />}
                {p.title.length > 35 ? p.title.slice(0, 35) + "..." : p.title}
              </button>
            );
          })}
        </div>
      </div>

      {selectedProduct && (
        <div className="pt-2 border-t border-zinc-800/80 flex items-start gap-3">
          {selectedProduct.assets?.[0]?.url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={selectedProduct.assets[0].url}
              alt={selectedProduct.title}
              className="w-14 h-14 rounded-lg object-cover border border-zinc-800 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-white truncate">{selectedProduct.title}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{selectedProduct.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
              <span className="font-semibold text-cyan-400">${selectedProduct.price} {selectedProduct.currency || "USD"}</span>
              <span>•</span>
              <span>{selectedProduct.vendor}</span>
              <span>•</span>
              <span>{selectedProduct.assets?.length || 0} Assets</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
