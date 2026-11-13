"use client";

import React from "react";
import { StoryCard } from "./StoryCard";

interface Story {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  pubDate?: string | null;
  author?: string | null;
  link: string;
  feed: { name: string };
  category?: string | null;
  script?: { 
    id: string; 
    headline: string;
    segments: Array<{ id: string; index: number; text: string; assetPath: string | null; personaId: string | null }>;
  } | null;
  video?: { 
    id: string; 
    status: string; 
    outputPath?: string | null;
    bgMusicPath?: string | null;
    bgMusic?: { name: string; mood: string } | null;
  } | null;
}

interface StoryGridProps {
  stories: Story[];
  selectedStoryIds: Set<string>;
  onGenerateScript: (storyId: string) => void;
  onSendToProduction: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onToggleSelection: (storyId: string) => void;
  onSelectStory?: (storyId: string) => void;
  onViewAssets?: (story: Story) => void;
  /** Optional slot rendered below the grid (e.g. an infinite-scroll sentinel). */
  footer?: React.ReactNode;
}

export const StoryGrid: React.FC<StoryGridProps> = ({
  stories,
  selectedStoryIds,
  onGenerateScript,
  onSendToProduction,
  onDeleteStory,
  onToggleSelection,
  onSelectStory,
  onViewAssets,
  footer,
}) => {
  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-3xl bg-surface-overlay border border-border shadow-inner flex items-center justify-center mb-6">
          <span className="text-4xl">📰</span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Your Newsroom is Empty
        </h3>
        <p className="text-sm text-muted max-w-md mb-6">
          Add an RSS feed and click &quot;Ingest Feeds&quot; to start fetching real-time news stories automatically.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            isSelected={selectedStoryIds.has(story.id)}
            onGenerateScript={onGenerateScript}
            onSendToProduction={onSendToProduction}
            onDeleteStory={onDeleteStory}
            onToggleSelection={onToggleSelection}
            onSelect={onSelectStory}
            onViewAssets={onViewAssets}
          />
        ))}
      </div>
      {footer}
    </>
  );
};
