"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  X,
  RefreshCw,
  Trash2,
  Star,
  Play,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PersonaLook, PERSONA_LOOK_CATEGORIES } from "@/lib/wardrobe/personaLookTypes";

export interface SavedLooksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: string;
  personaName: string;
  onLoadInPlayer: (look: PersonaLook) => void;
  storyId?: string | null;
  onLooksUpdated?: () => void;
}

export const SavedLooksDrawer = React.memo(function SavedLooksDrawer({
  isOpen,
  onClose,
  personaId,
  personaName,
  onLoadInPlayer,
  storyId,
  onLooksUpdated,
}: SavedLooksDrawerProps) {
  const [looks, setLooks] = useState<PersonaLook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLoopTagByLook, setActiveLoopTagByLook] = useState<Record<string, string>>({});

  const fetchLooks = useCallback(async () => {
    if (!personaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wardrobe/looks?personaId=${encodeURIComponent(personaId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLooks(data.looks || []);
      } else {
        setError(data.error || "Failed to load saved looks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching looks");
    } finally {
      setIsLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    if (isOpen) {
      fetchLooks();
    }
  }, [isOpen, fetchLooks]);

  const handleDelete = async (lookId: string) => {
    setDeletingId(lookId);
    try {
      const res = await fetch(
        `/api/wardrobe/looks?lookId=${encodeURIComponent(lookId)}&personaId=${encodeURIComponent(
          personaId
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setLooks((prev) => prev.filter((l) => l.id !== lookId));
        onLooksUpdated?.();
      } else {
        alert(data.error || "Failed to delete look");
      }
    } catch {
      alert("Error deleting look");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (lookId: string) => {
    setSettingDefaultId(lookId);
    try {
      const res = await fetch("/api/wardrobe/looks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          lookId,
          isDefault: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLooks((prev) =>
          prev.map((l) => ({
            ...l,
            isDefault: l.id === lookId,
          }))
        );
        onLooksUpdated?.();
      } else {
        alert(data.error || "Failed to update default look");
      }
    } catch {
      alert("Error updating default look");
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl h-full bg-background border-l border-border/80 shadow-2xl flex flex-col p-6 overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
              <Bookmark className="w-4 h-4 fill-amber-300/40" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{personaName}&apos;s Saved Looks Vault</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {looks.length} {looks.length === 1 ? "Look" : "Looks"}
                </span>
              </h3>
              <p className="text-[10px] font-mono text-muted">
                Pre-configured wardrobe, hairstyles & lighting presets ready for broadcast
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchLooks}
              isLoading={isLoading}
              aria-label="Refresh saved looks"
              className="text-xs font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            </Button>
            <button
              onClick={onClose}
              aria-label="Close saved looks drawer"
              className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-raised transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {looks.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-muted font-mono text-xs flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bookmark className="w-6 h-6" />
              </div>
              <p className="text-foreground font-bold">No saved looks yet</p>
              <p className="text-[10px] text-muted max-w-xs">
                Transform any video action loop in the studio, then click &ldquo;Save as Persona
                Look&rdquo; to store reusable outfits and hairstyles.
              </p>
            </div>
          ) : (
            looks.map((look) => {
              const catMeta = PERSONA_LOOK_CATEGORIES.find((c) => c.id === look.category);
              return (
                <div
                  key={look.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-3 ${
                    look.isDefault
                      ? "bg-purple-950/20 border-purple-500/50 shadow-md ring-1 ring-purple-500/30"
                      : "bg-surface/50 hover:bg-surface border-border/60"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Video loop thumbnail */}
                    {(() => {
                      const currentTag = activeLoopTagByLook[look.id] || look.poseTag || "M1";
                      const rawVideoUrl = look.loops?.[currentTag]?.videoUrl || look.videoUrl;
                      const safeVideoUrl = rawVideoUrl
                        ? rawVideoUrl.replace(/^public[\\/]/, "").replace(/^([^/])/, "/$1")
                        : "";

                      return (
                        <div className="relative w-24 sm:w-28 aspect-[9/16] rounded-xl overflow-hidden bg-black border border-purple-500/30 shrink-0">
                          {safeVideoUrl ? (
                            <video
                              key={safeVideoUrl}
                              src={safeVideoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                              No video
                            </div>
                          )}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{currentTag}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Metadata */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {look.isDefault && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" />
                            Default Look
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            catMeta?.badgeColor || "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          }`}
                        >
                          {catMeta?.label || look.category}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/20 text-purple-200 border border-purple-500/30">
                          {Object.keys(look.loops || {}).length >= 3
                            ? "3/3 Full Suite"
                            : `${Object.keys(look.loops || {}).length || 1} Loop(s)`}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-foreground truncate">{look.lookName}</h4>

                      <div className="flex flex-col gap-0.5 text-[10px] font-mono text-muted">
                        <div>
                          <span className="text-muted">Outfit:</span>{" "}
                          <span className="text-white font-medium">{look.outfitName}</span>
                        </div>
                        {look.hairstyleName && (
                          <div>
                            <span className="text-muted">Hair:</span>{" "}
                            <span className="text-white font-medium">{look.hairstyleName}</span>
                          </div>
                        )}
                        {look.hairColorSwatch && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted">Color:</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/40"
                              style={{ backgroundColor: look.hairColorSwatch }}
                            />
                            <span className="text-white font-medium">{look.hairColorSwatch}</span>
                          </div>
                        )}
                        {look.lightingPreset && (
                          <div>
                            <span className="text-muted">Lighting:</span>{" "}
                            <span className="text-white font-medium">{look.lightingPreset}</span>
                          </div>
                        )}
                      </div>

                      {/* Multi-loop slot chips with interactive hover/click preview */}
                      {look.loops && Object.keys(look.loops).length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {Object.entries(look.loops).map(([tag, loop]) => {
                            const isCurrent = (activeLoopTagByLook[look.id] || look.poseTag || "M1") === tag;
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                  setActiveLoopTagByLook((prev) => ({ ...prev, [look.id]: tag }))
                                }
                                onMouseEnter={() =>
                                  setActiveLoopTagByLook((prev) => ({ ...prev, [look.id]: tag }))
                                }
                                className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-all flex items-center gap-1 border ${
                                  isCurrent
                                    ? "bg-purple-600 text-white border-purple-400 font-bold shadow-sm"
                                    : "bg-purple-500/15 text-purple-200 border-purple-500/30 hover:border-purple-400 hover:text-white"
                                }`}
                                aria-label={`Preview loop ${tag} for ${look.lookName}`}
                              >
                                <span>{tag}: {loop.actionName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onLoadInPlayer(look);
                          onClose();
                        }}
                        className="text-[11px] font-mono flex items-center gap-1 px-2.5 py-1"
                        aria-label={`Load ${look.lookName} in studio player`}
                      >
                        <Play className="w-3 h-3 text-purple-400 fill-purple-400" />
                        <span>Load in Player</span>
                      </Button>

                      {!look.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(look.id)}
                          disabled={settingDefaultId === look.id}
                          className="text-[11px] font-mono text-muted hover:text-amber-300 transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Set Default</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {storyId && (
                        <Link
                          href={`/editor/${storyId}?attire=${encodeURIComponent(
                            look.outfitName
                          )}&videoOverride=${encodeURIComponent(look.videoUrl)}`}
                          className="text-[11px] font-mono text-purple-400 hover:text-purple-300 underline flex items-center gap-0.5"
                        >
                          <span>Use in Story</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(look.id)}
                        disabled={deletingId === look.id}
                        aria-label={`Delete look ${look.lookName}`}
                        className="p-1 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
