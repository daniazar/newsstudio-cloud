import { ASPECT_RATIO_OPTIONS } from "@/app/ecommerce-studio/constants/studioConstants";
import { AdAspectRatio } from "@/lib/types/ecommerce";
import { ArrowLeft,Play,RotateCcw,RotateCw,Save } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface EditorHeaderToolbarProps {
  productTitle?: string;
  storeName?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  aspectRatio: AdAspectRatio;
  setAspectRatio: (aspectRatio: AdAspectRatio) => void;
  onSave?: () => void;
  onRender?: () => void;
}

export const EditorHeaderToolbar: React.FC<EditorHeaderToolbarProps> = ({
  productTitle = "Product Video Editor",
  storeName = "Storefront",
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  aspectRatio,
  setAspectRatio,
  onSave,
  onRender,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/ecommerce-studio"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          title="Return to Ecommerce Studio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight line-clamp-1">
              {productTitle}
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Editor
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate max-w-sm">{storeName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAspectRatio(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === opt.id ? "bg-cyan-600 text-white font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              {opt.id}
            </button>
          ))}
        </div>

        {onSave && (
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        )}
        {onRender && (
          <button
            onClick={onRender}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Render Video
          </button>
        )}
      </div>
    </header>
  );
};
