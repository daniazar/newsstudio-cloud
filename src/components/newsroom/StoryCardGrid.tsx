"use client";

import React from "react";
import { StoryCard, type StoryCardProps } from "./StoryCard";
import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";

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
  errorLog?: string | null;
}

interface StoryCardGridProps {
  stories: Story[];
  onGenerateScript: (id: string) => void;
  onSendToProduction: (id: string) => void;
  onDeleteStory: (id: string) => void;
  selectedStoryIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectStory: (id: string) => void;
  onViewAssets?: (story: StoryCardProps["story"]) => void;
  isLoadingMore?: boolean;
  isReachingEnd?: boolean;
  onLoadMore?: () => void;
}

export const StoryCardGrid: React.FC<StoryCardGridProps> = ({
  stories,
  onGenerateScript,
  onSendToProduction,
  onDeleteStory,
  selectedStoryIds,
  onToggleSelection,
  onSelectStory,
  onViewAssets,
  isLoadingMore = false,
  isReachingEnd = true,
  onLoadMore,
}) => {
  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-border/80 rounded-3xl glass-panel-raised shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border/80 flex items-center justify-center mb-4 text-emerald-400">
          <span className="text-2xl font-black">📰</span>
        </div>
        <h3 className="text-base font-black text-foreground tracking-tight">No Stories Found</h3>
        <p className="text-xs text-subtle mt-1.5 max-w-md font-normal leading-relaxed">
          No news items match the active filters or search terms. Try clearing filters or clicking &quot;Ingest RSS&quot; to fetch breaking stories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {stories.map((story) => (
          <div 
            key={story.id} 
            className="h-full"
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "380px 260px",
            }}
          >
            <StoryCard
              story={story as unknown as StoryCardProps["story"]}
              onGenerateScript={onGenerateScript}
              onSendToProduction={onSendToProduction}
              onDeleteStory={onDeleteStory}
              isSelected={selectedStoryIds.has(story.id)}
              onToggleSelection={onToggleSelection}
              onSelect={onSelectStory}
              onViewAssets={onViewAssets}
            />
          </div>
        ))}
      </div>

      {onLoadMore && !isReachingEnd && (
        <InfiniteScrollSentinel
          disabled={isReachingEnd || isLoadingMore}
          onIntersect={onLoadMore}
        />
      )}
    </div>
  );
};
