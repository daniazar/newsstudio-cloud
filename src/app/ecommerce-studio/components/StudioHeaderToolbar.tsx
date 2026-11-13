import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Store, ShoppingBag, Clapperboard } from "lucide-react";

export interface StudioHeaderToolbarProps {
  activeLevel: "stores" | "products" | "studio";
  setActiveLevel: (level: "stores" | "products" | "studio") => void;
  activeStudioEngine: "remotion" | "veo";
  setActiveStudioEngine: (engine: "remotion" | "veo") => void;
  onOpenPreProduction?: () => void;
  onOpenOmnichannel?: () => void;
  onOpenQaReport?: () => void;
}

export const StudioHeaderToolbar: React.FC<StudioHeaderToolbarProps> = ({
  activeLevel,
  setActiveLevel,
  activeStudioEngine,
  setActiveStudioEngine,
  onOpenPreProduction,
  onOpenOmnichannel,
  onOpenQaReport: _onOpenQaReport,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          title="Return to Main Studio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              E-Commerce Studio Hub
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              v3.5
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Multi-store catalog scraper, AI ad script generator & Remotion/Veo rendering engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveLevel("stores")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeLevel === "stores"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Stores
          </button>
          <button
            onClick={() => setActiveLevel("products")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeLevel === "products"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Catalog
          </button>
          <button
            onClick={() => setActiveLevel("studio")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeLevel === "studio"
                ? "bg-cyan-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            Ad Studio
          </button>
        </div>

        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveStudioEngine("remotion")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStudioEngine === "remotion"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Remotion 2D/3D
          </button>
          <button
            onClick={() => setActiveStudioEngine("veo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStudioEngine === "veo"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Veo AI Studio
          </button>
        </div>

        {onOpenPreProduction && (
          <button
            onClick={onOpenPreProduction}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
          >
            Pre-Production
          </button>
        )}
        {onOpenOmnichannel && (
          <button
            onClick={onOpenOmnichannel}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Export Campaign
          </button>
        )}
      </div>
    </header>
  );
};
