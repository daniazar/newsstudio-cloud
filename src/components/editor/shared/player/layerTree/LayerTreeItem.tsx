/**
 * src/components/editor/shared/player/layerTree/LayerTreeItem.tsx
 *
 * Single layer row card in the EditorLayerTree stack.
 */

import React from "react";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from "lucide-react";
import { LayerItemConfig, EditorLayerId } from "./types";

export interface LayerTreeItemProps {
  layer: LayerItemConfig;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (id: EditorLayerId) => void;
  onToggleDetails: (id: EditorLayerId, e: React.MouseEvent) => void;
}

const LayerTreeItemComponent: React.FC<LayerTreeItemProps> = ({
  layer,
  isSelected,
  isExpanded,
  onSelect,
  onToggleDetails,
}) => {
  const Icon = layer.icon;

  return (
    <div
      onClick={() => onSelect(layer.id)}
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-950/20"
          : "bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-800/50 text-zinc-300"
      }`}
    >
      {/* Row Header */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {layer.hasDetails ? (
            <button
              type="button"
              onClick={(e) => onToggleDetails(layer.id, e)}
              className="p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-3" />
          )}

          <Icon className={`h-3.5 w-3.5 shrink-0 ${layer.color}`} />
          <span className="text-xs font-semibold truncate">{layer.name}</span>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {layer.onReset && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                layer.onReset?.();
              }}
              title={
                layer.hasCustomOffsets
                  ? "Reset layer to default position (Modified)"
                  : "Reset layer to default position"
              }
              className={`p-1 rounded transition-colors cursor-pointer ${
                layer.hasCustomOffsets
                  ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-500/40"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}

          {layer.onToggleLocked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                layer.onToggleLocked?.();
              }}
              title={layer.locked ? "Unlock layer" : "Lock layer on canvas"}
              className={`p-1 rounded transition-colors cursor-pointer ${
                layer.locked ? "text-amber-400 bg-amber-500/10" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              layer.onToggleVisible();
            }}
            title={layer.visible ? "Hide element" : "Show element"}
            className={`p-1 rounded transition-colors cursor-pointer ${
              layer.visible ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Coordinates Pill */}
      {layer.coords && (
        <div className="px-2 pb-1.5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <span>{layer.coords}</span>
          {isSelected && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          )}
        </div>
      )}

      {/* Collapsible Fine-Tuning Controls */}
      {isExpanded && layer.renderControls && (
        <div className="px-2 pb-2 bg-black/40 rounded-b-lg">
          {layer.renderControls()}
        </div>
      )}
    </div>
  );
};

export const LayerTreeItem = React.memo(LayerTreeItemComponent, (prev, next) => {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isExpanded !== next.isExpanded) return false;
  if (prev.layer.id !== next.layer.id) return false;
  if (prev.layer.visible !== next.layer.visible) return false;
  if (prev.layer.locked !== next.layer.locked) return false;
  if (prev.layer.coords !== next.layer.coords) return false;
  if (prev.layer.hasCustomOffsets !== next.layer.hasCustomOffsets) return false;
  if (prev.layer.name !== next.layer.name) return false;
  // If expanded, allow re-render to reflect inner slider value changes
  if (next.isExpanded) return false;
  return true;
});
