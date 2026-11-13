"use client";

import React from "react";
import { StoryCard, type StoryCardProps } from "./StoryCard";
import { Download, Sparkles, Cpu, CheckCircle2, AlertTriangle } from "lucide-react";

interface Story {
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
  script?: {
    id: string;
    headline: string;
    segments: Array<{
      id: string;
      index: number;
      text: string;
      assetPath: string | null;
      assetType?: string | null;
      personaId: string | null;
    }>;
  } | null;
  video?: {
    id: string;
    status: string;
    outputPath?: string | null;
    bgMusicPath?: string | null;
    bgMusic?: { name: string; mood: string } | null;
  } | null;
}

interface StoryKanbanBoardProps {
  stories: Story[];
  onGenerateScript: (id: string) => void;
  onSendToProduction: (id: string) => void;
  onDeleteStory: (id: string) => void;
  selectedStoryIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectStory: (id: string) => void;
  onViewAssets?: (story: StoryCardProps["story"]) => void;
}

const KANBAN_COLUMNS = [
  { id: "INGESTED", title: "Ingested", icon: Download, color: "border-sky-500/30 text-sky-400 bg-sky-500/10 shadow-sky-500/10" },
  { id: "SCRIPTED", title: "Scripted", icon: Sparkles, color: "border-purple-500/30 text-purple-400 bg-purple-500/10 shadow-purple-500/10" },
  { id: "RENDERING", title: "Rendering 4K", icon: Cpu, color: "border-amber-500/30 text-amber-400 bg-amber-500/10 shadow-amber-500/10" },
  { id: "COMPLETED", title: "Ready", icon: CheckCircle2, color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/10" },
  { id: "FAILED", title: "Failed", icon: AlertTriangle, color: "border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-rose-500/10" },
];

export const StoryKanbanBoard: React.FC<StoryKanbanBoardProps> = ({
  stories,
  onGenerateScript,
  onSendToProduction,
  onDeleteStory,
  selectedStoryIds,
  onToggleSelection,
  onSelectStory,
  onViewAssets,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6">
      {KANBAN_COLUMNS.map((column) => {
        const columnStories = stories.filter((s) => s.status === column.id);
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className="flex flex-col rounded-3xl border border-border/80 glass-panel p-3.5 min-w-[290px] max-h-[calc(100vh-280px)] overflow-hidden shadow-lg"
          >
            {/* Column Header */}
            <div className={`px-3.5 py-2.5 rounded-2xl border mb-3.5 flex items-center justify-between shadow-sm ${column.color}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">{column.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-white tabular-nums">
                {columnStories.length}
              </span>
            </div>

            {/* Stories Column List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {columnStories.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-muted/60 border border-dashed border-border/60 rounded-2xl">
                  No stories in this stage
                </div>
              ) : (
                columnStories.map((story) => (
                  <div key={story.id} className="min-h-[160px]">
                    <StoryCard
                      story={story as unknown as Parameters<typeof StoryCard>[0]["story"]}
                      onGenerateScript={onGenerateScript}
                      onSendToProduction={onSendToProduction}
                      onDeleteStory={onDeleteStory}
                      isSelected={selectedStoryIds.has(story.id)}
                      onToggleSelection={onToggleSelection}
                      onSelect={onSelectStory}
                      onViewAssets={onViewAssets}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
