import React from "react";
import { Palette } from "lucide-react";

export interface EditorStyleInspectorProps {
  primaryColor?: string;
  onUpdatePrimaryColor?: (color: string) => void;
  secondaryColor?: string;
  onUpdateSecondaryColor?: (color: string) => void;
  captionStyle?: string;
  onUpdateCaptionStyle?: (style: string) => void;
}

export const EditorStyleInspector: React.FC<EditorStyleInspectorProps> = ({
  primaryColor = "#06b6d4",
  onUpdatePrimaryColor,
  secondaryColor = "#f59e0b",
  onUpdateSecondaryColor,
  captionStyle = "tiktok_yellow",
  onUpdateCaptionStyle,
}) => {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <Palette className="w-4 h-4 text-cyan-400" />
        Brand Styling & Captions
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => onUpdatePrimaryColor && onUpdatePrimaryColor(e.target.value)}
              className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
            />
            <span className="text-xs text-zinc-300 font-mono">{primaryColor}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Secondary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => onUpdateSecondaryColor && onUpdateSecondaryColor(e.target.value)}
              className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
            />
            <span className="text-xs text-zinc-300 font-mono">{secondaryColor}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Caption Subtitle Style</label>
        <select
          value={captionStyle}
          onChange={(e) => onUpdateCaptionStyle && onUpdateCaptionStyle(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="tiktok_yellow">TikTok Pop Yellow</option>
          <option value="clean_minimal">Clean Minimal White</option>
          <option value="neon_glow">Neon Glow Cyan</option>
          <option value="bold_box">Bold Background Box</option>
        </select>
      </div>
    </div>
  );
};
