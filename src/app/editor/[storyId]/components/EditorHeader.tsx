"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AspectRatio } from "@/lib/types";

interface EditorHeaderProps {
  story: {
    id: string;
    title: string;
    status: string;
    feed: { name: string };
    script?: { headline: string };
    video?: { id: string };
  };
  aspectRatio: AspectRatio;
  showSafeZones: boolean;
  globalBgEnabled: boolean;
  onUpdateHeadline: (headline: string) => void;
  onUpdateAspectRatio: (ratio: AspectRatio) => void;
  onToggleSafeZones: () => void;
  onToggleGlobalBg: () => void;
  onOpenAutoChoreographer: () => void;
  onSendToPipeline: () => void;
  onRenderVideo: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  story,
  aspectRatio,
  showSafeZones,
  globalBgEnabled,
  onUpdateHeadline,
  onUpdateAspectRatio,
  onToggleSafeZones,
  onToggleGlobalBg,
  onOpenAutoChoreographer,
  onSendToPipeline,
  onRenderVideo,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface select-none">
      {/* Left info & Title */}
      <div className="flex items-center gap-4">
        <a href="/" className="text-muted hover:text-accent text-sm font-medium transition-colors">
          ← Back
        </a>
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              className="text-sm font-bold bg-surface-raised border border-accent rounded px-2 py-0.5 text-foreground w-64 focus:outline-none"
              value={titleEditValue}
              onChange={(e) => setTitleEditValue(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false);
                if (titleEditValue.trim() && titleEditValue !== story.script?.headline) {
                  onUpdateHeadline(titleEditValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          ) : (
            <h1
              className="text-sm font-bold text-foreground truncate max-w-md cursor-text hover:text-accent transition-colors"
              onClick={() => {
                setTitleEditValue(story.script?.headline || "");
                setIsEditingTitle(true);
              }}
              title="Click to edit title"
            >
              {story.script?.headline || "Untitled Story"}
            </h1>
          )}
          <p className="text-xs text-muted">{story.feed.name}</p>
        </div>
        <StatusBadge status={story.status} />
      </div>

      {/* Right Controls & Actions */}
      <div className="flex items-center gap-3">
        {/* Aspect Ratio Switch */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => onUpdateAspectRatio("vertical")}
            className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              aspectRatio === "vertical"
                ? "bg-accent text-white"
                : "bg-surface-raised text-muted hover:text-foreground"
            }`}
          >
            9:16
          </button>
          <button
            type="button"
            onClick={() => onUpdateAspectRatio("horizontal")}
            className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              aspectRatio === "horizontal"
                ? "bg-accent text-white"
                : "bg-surface-raised text-muted hover:text-foreground"
            }`}
          >
            16:9
          </button>
        </div>

        {/* Safe Zones Toggle */}
        <button
          type="button"
          onClick={onToggleSafeZones}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            showSafeZones
              ? "border-accent bg-accent-muted text-accent"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          📏 Safe Zones
        </button>

        {/* Global BG Toggle */}
        <button
          type="button"
          onClick={onToggleGlobalBg}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            globalBgEnabled
              ? "border-accent bg-accent-muted text-accent"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          🎞️ Global BG
        </button>

        {/* SRT Export */}
        {story.video?.id && (
          <a
            href={`/api/videos/${story.video.id}/subtitles?format=srt`}
            download
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-subtle hover:text-foreground hover:bg-white/5 flex items-center gap-1.5 transition-colors"
            title="Download subtitles for external editors"
          >
            📝 SRT
          </a>
        )}

        {/* Live CVI Call shortcut */}
        <Link
          href="/interactive-call"
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 flex items-center gap-1.5 transition-all shadow-sm"
          title="Launch Real-Time Conversational Video Call Engine"
        >
          🎥 Live CVI Call
        </Link>

        {/* Auto-Choreograph FSM Button */}
        <Button size="sm" variant="secondary" onClick={onOpenAutoChoreographer}>
          🪄 Auto-Choreograph
        </Button>

        {/* Pipeline / Render Buttons */}
        <Button size="sm" variant="secondary" onClick={onSendToPipeline}>
          ⚙️ Send to Pipeline
        </Button>

        <Button size="sm" variant="primary" onClick={onRenderVideo}>
          🎬 Render Video
        </Button>
      </div>
    </div>
  );
};
