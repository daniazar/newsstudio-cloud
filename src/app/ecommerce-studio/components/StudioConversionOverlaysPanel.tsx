import React from "react";
import { Sliders, ShieldCheck, Tag, Zap, Smartphone } from "lucide-react";

export interface StudioConversionOverlaysPanelProps {
  showUsVsThem?: boolean;
  setShowUsVsThem?: (val: boolean) => void;
  showFlashSale?: boolean;
  setShowFlashSale?: (val: boolean) => void;
  showSocialProof?: boolean;
  setShowSocialProof?: (val: boolean) => void;
  showQrCode?: boolean;
  setShowQrCode?: (val: boolean) => void;
  showShoppableHotspots?: boolean;
  setShowShoppableHotspots?: (val: boolean) => void;
}

export const StudioConversionOverlaysPanel: React.FC<StudioConversionOverlaysPanelProps> = ({
  showUsVsThem = true,
  setShowUsVsThem,
  showFlashSale = false,
  setShowFlashSale,
  showSocialProof = true,
  setShowSocialProof,
  showQrCode = false,
  setShowQrCode,
  showShoppableHotspots = false,
  setShowShoppableHotspots,
}) => {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Conversion Overlays & Growth Modules
        </h2>
        <span className="text-xs text-zinc-500">CRO High-Impact Layers</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Us Vs Them Matrix
          </div>
          <input
            type="checkbox"
            checked={showUsVsThem}
            onChange={(e) => setShowUsVsThem && setShowUsVsThem(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <Zap className="w-4 h-4 text-amber-400" />
            Flash Sale Timer
          </div>
          <input
            type="checkbox"
            checked={showFlashSale}
            onChange={(e) => setShowFlashSale && setShowFlashSale(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <Tag className="w-4 h-4 text-emerald-400" />
            Social Proof Popups
          </div>
          <input
            type="checkbox"
            checked={showSocialProof}
            onChange={(e) => setShowSocialProof && setShowSocialProof(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <Smartphone className="w-4 h-4 text-purple-400" />
            QR Code Overlay
          </div>
          <input
            type="checkbox"
            checked={showQrCode}
            onChange={(e) => setShowQrCode && setShowQrCode(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <Tag className="w-4 h-4 text-rose-400" />
            Shoppable Hotspots
          </div>
          <input
            type="checkbox"
            checked={showShoppableHotspots}
            onChange={(e) => setShowShoppableHotspots && setShowShoppableHotspots(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
          />
        </label>
      </div>
    </div>
  );
};
