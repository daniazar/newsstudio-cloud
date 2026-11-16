"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PERSONAS, Persona } from "@/lib/tts/personas";
import { getAvatarThumbnailUrl, handleAvatarImgError } from "@/lib/personas/avatarThumbnail";
import {
  Sparkles,
  Clapperboard,
  Film,
  Music,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Users,
  ChevronDown,
  RefreshCw,
  Edit3,
  ShoppingBag,
} from "lucide-react";

export interface StoryCardProps {
  story: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    pubDate?: string | null;
    author?: string | null;
    link: string;
    feed: { id?: string; name: string };
    category?: string | null;
    approvalStatus?: string;
    articleImageUrls?: string | null;
    script?: { 
      id: string; 
      headline: string;
      segments: Array<{ id: string; index: number; text: string; assetPath: string | null; assetType?: string | null; personaId: string | null }>;
    } | null;
    video?: { 
      id: string; 
      status: string; 
      outputPath?: string | null;
      bgMusicPath?: string | null;
      bgMusic?: { name: string; mood: string } | null;
    } | null;
    errorLog?: string | null;
  };
  onGenerateScript: (storyId: string) => void;
  onSendToProduction: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  isSelected: boolean;
  onToggleSelection: (storyId: string) => void;
  onSelect?: (storyId: string) => void;
  onViewAssets?: (story: StoryCardProps["story"]) => void;
}

const StoryCardComponent: React.FC<StoryCardProps> = ({
  story,
  onGenerateScript,
  onSendToProduction,
  onDeleteStory,
  isSelected,
  onToggleSelection,
  onSelect,
  onViewAssets,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showHostTooltip, setShowHostTooltip] = useState(false);

  const handleAction = async (
    action: string,
    handler: (id: string) => void
  ) => {
    setLoadingAction(action);
    try {
      handler(story.id);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const formattedDate = story.pubDate
    ? new Date(story.pubDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const scenesCount = story.script?.segments?.length || 0;
  const assetsCount = story.script?.segments
    ? `${story.script.segments.filter((s) => s.assetPath).length} / ${story.script.segments.length}`
    : "0 / 0";

  const hostPersonaIds = story.script?.segments
    ? Array.from(
        new Set(story.script.segments.map((s) => s.personaId).filter(Boolean))
      )
    : [];
  const hostPersonas = hostPersonaIds
    .map((id) => PERSONAS.find((p) => p.id === id))
    .filter((p): p is Persona => !!p);

  const bgMusicName = story.video?.bgMusic
    ? `${story.video.bgMusic.name} (${story.video.bgMusic.mood})`
    : "None";

  return (
    <Card
      hover
      className={`!p-4 group transition-all duration-200 flex flex-col justify-between h-full min-h-[160px] relative rounded-2xl glass-panel-raised border ${
        isSelected
          ? "border-accent/80 bg-accent/[0.04] ring-1 ring-accent/50 shadow-lg shadow-accent/10"
          : "border-border/80 hover:border-border-hover"
      }`}
    >
      <div className="flex-1 flex flex-col justify-between min-w-0">
        {/* Main Content Info */}
        <div className="min-w-0 cursor-pointer" onClick={() => onSelect?.(story.id)}>
          {/* Header Row: Checkbox, Title, Status & Actions */}
          <div className="flex items-start gap-2.5 justify-between">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(story.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 mt-0.5 rounded border-border/80 bg-surface text-accent focus:ring-accent cursor-pointer flex-shrink-0 accent-accent"
              />
              <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors pr-1">
                {story.title}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={story.status} className="scale-[0.85] origin-right" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStory(story.id);
                }}
                className="text-muted hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
                title="Delete Story"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metadata Sub-header */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-muted">
            <span className="text-accent font-bold">{story.feed.name}</span>
            {story.category && (
              <>
                <span className="text-muted/40">•</span>
                <span className="text-subtle uppercase tracking-wider font-semibold">
                  {story.category}
                </span>
              </>
            )}
            {formattedDate && (
              <>
                <span className="text-muted/40">•</span>
                <span className="tabular-nums">{formattedDate}</span>
              </>
            )}
          </div>

          {/* Description */}
          {story.description && (
            <p className="text-[11px] text-subtle mt-2 line-clamp-2 leading-relaxed font-normal">
              {story.description}
            </p>
          )}

          {/* Error panel if failed */}
          {story.status === "FAILED" && story.errorLog && (
            <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                  Error:
                </span>
                <p className="text-[10px] text-rose-300 truncate flex-1 font-mono">{story.errorLog}</p>
              </div>
            </div>
          )}

          {/* Script Detail Sub-panel with waveform visualizer */}
          {story.script && (
            <div className="mt-2.5 p-2 rounded-xl bg-surface/80 border border-border/80 space-y-1.5">
              {/* Horizontal flex metrics */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-subtle">
                <div className="flex items-center gap-1">
                  <Film className="w-3 h-3 text-muted" />
                  <span>Scenes:</span>
                  <span className="text-foreground font-bold">{scenesCount}</span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAssets?.(story);
                  }}
                  className="flex items-center gap-1 hover:text-accent cursor-pointer transition-colors"
                  title="View selected assets"
                >
                  <ImageIcon className="w-3 h-3 text-muted" />
                  <span>Assets:</span>
                  <span className="text-foreground font-bold">{assetsCount}</span>
                </div>

                {hostPersonas.length > 0 ? (
                  <div 
                    onMouseEnter={() => setShowHostTooltip(true)}
                    onMouseLeave={() => setShowHostTooltip(false)}
                    className="relative cursor-help flex items-center gap-1"
                  >
                    <Users className="w-3 h-3 text-muted" />
                    <span>Host:</span>
                    <span className="text-foreground font-bold underline decoration-dotted decoration-accent/60 underline-offset-2">
                      {hostPersonas.map((p) => p.name).join(", ")}
                    </span>

                    {/* Persona Tooltip */}
                    {showHostTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-2xl glass-floating border border-white/10 shadow-2xl z-50 flex flex-col gap-2 pointer-events-none">
                        {hostPersonas.map((persona) => (
                          <div
                            key={persona.id}
                            className="flex items-start gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getAvatarThumbnailUrl(persona.avatarUrl)}
                              alt={persona.name}
                              loading="lazy"
                              onError={(e) => handleAvatarImgError(e, persona.avatarUrl || "/avatars/ruby.png")}
                              className="w-12 h-12 rounded-xl border border-accent/30 object-cover bg-surface-overlay shrink-0 shadow"
                            />
                            <div className="min-w-0 text-left flex-1">
                              <h4 className="text-xs font-black text-foreground leading-none mb-1 flex items-center justify-between">
                                <span>{persona.name}</span>
                                <span className="text-[8px] bg-accent/15 px-1 py-0.2 rounded text-accent font-mono font-bold uppercase">
                                  {persona.language}
                                </span>
                              </h4>
                              <p className="text-[10px] text-muted font-bold leading-tight">
                                {persona.title}
                              </p>
                              <p className="text-[9px] text-subtle font-normal mt-1 leading-relaxed line-clamp-2 italic">
                                {persona.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted">
                    <Users className="w-3 h-3" />
                    <span>Host: None</span>
                  </div>
                )}

                <div className={`flex items-center gap-1 truncate max-w-[100px] ${story.video?.bgMusic ? "text-emerald-400" : "text-muted"}`}>
                  <Music className="w-3 h-3" />
                  <span className="truncate">{bgMusicName}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Row */}
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(story.status === "INGESTED" ||
              (story.status === "FAILED" && !story.script)) && (
              <Button
                size="sm"
                variant={story.status === "FAILED" ? "secondary" : "emerald-glow"}
                isLoading={loadingAction === "script"}
                onClick={() => handleAction("script", onGenerateScript)}
                className="text-[10px] py-1 px-2.5 h-7 min-h-0 font-bold"
              >
                {story.status === "FAILED" ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Script</span>
                  </>
                )}
              </Button>
            )}

            {(story.status === "SCRIPTED" ||
              (story.status === "FAILED" && !!story.script)) && (
              <Button
                size="sm"
                variant={story.status === "FAILED" ? "secondary" : "emerald-glow"}
                isLoading={loadingAction === "production"}
                onClick={() => handleAction("production", onSendToProduction)}
                className="text-[10px] py-1 px-2.5 h-7 min-h-0 font-bold"
              >
                {story.status === "FAILED" ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </>
                ) : (
                  <>
                    <Clapperboard className="w-3 h-3" />
                    <span>Produce</span>
                  </>
                )}
              </Button>
            )}

            {story.script && (
              <div className="relative group/studio">
                <Button
                  size="sm"
                  variant="glass"
                  className="text-[10px] py-1 px-2.5 h-7 min-h-0 font-bold flex items-center gap-1 text-accent border-accent/30 hover:bg-accent/10"
                >
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span>Studios</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/studio:flex flex-col gap-0.5 p-2 rounded-2xl glass-floating border border-white/10 shadow-2xl z-50 min-w-[180px]">
                  <span className="text-[9px] font-mono font-bold text-muted uppercase tracking-wider px-2.5 py-1 border-b border-border/40">
                    Produce in Studio
                  </span>
                  <Link
                    href={`/ecommerce-studio?storyId=${story.id}`}
                    prefetch={false}
                    className="text-xs font-semibold text-foreground hover:bg-cyan-500/15 hover:text-cyan-300 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" /> E-Commerce Studio
                  </Link>
                </div>
              </div>
            )}

            {story.script && (
              <>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => onGenerateScript(story.id)}
                  className="text-[10px] py-1 px-2.5 h-7 min-h-0 font-bold text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 flex items-center gap-1"
                  title="Open Pre-Production Control Room Storyboard"
                >
                  <Clapperboard className="w-3 h-3 text-cyan-400" />
                  <span>Brief</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-[10px] py-1 px-2.5 h-7 min-h-0 font-bold"
                >
                  <Link href={`/editor/${story.id}`} prefetch={false} className="inline-flex items-center gap-1.5 text-foreground hover:text-accent-hover">
                    <Edit3 className="w-3 h-3 text-muted" />
                    <span>Editor</span>
                  </Link>
                </Button>
              </>
            )}
          </div>

          <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-mono text-muted hover:text-accent font-semibold transition-colors whitespace-nowrap"
          >
            <span>Original</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Card>
  );
};

export const StoryCard = React.memo(StoryCardComponent, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.story.id === next.story.id &&
    prev.story.status === next.story.status &&
    prev.story.title === next.story.title &&
    prev.story.description === next.story.description &&
    prev.story.category === next.story.category &&
    prev.story.pubDate === next.story.pubDate &&
    prev.story.script?.id === next.story.script?.id &&
    prev.story.script?.segments?.length === next.story.script?.segments?.length &&
    prev.story.video?.id === next.story.video?.id &&
    prev.story.video?.status === next.story.video?.status &&
    prev.story.video?.outputPath === next.story.video?.outputPath &&
    prev.story.video?.bgMusicPath === next.story.video?.bgMusicPath &&
    prev.story.errorLog === next.story.errorLog
  );
});
