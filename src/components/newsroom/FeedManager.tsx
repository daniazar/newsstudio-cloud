"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Feed {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  _count?: { stories: number };
}

interface FeedManagerProps {
  feeds: Feed[];
  onAddFeed: (name: string, url: string) => Promise<void>;
  onRemoveFeed: (feedId: string) => Promise<void>;
  onIngest: () => Promise<void>;
}

export const FeedManager: React.FC<FeedManagerProps> = ({
  feeds,
  onAddFeed,
  onRemoveFeed,
  onIngest,
}) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsAdding(true);
    try {
      await onAddFeed(name.trim(), url.trim());
      setName("");
      setUrl("");
      setShowForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleIngest = async () => {
    setIsIngesting(true);
    try {
      await onIngest();
    } finally {
      setTimeout(() => setIsIngesting(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          RSS Feeds ({feeds.length})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ Add Feed"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={isIngesting}
            onClick={handleIngest}
            disabled={feeds.length === 0}
          >
            🔄 Ingest All
          </Button>
        </div>
      </div>

      {/* Add Feed Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-3 rounded-lg bg-surface-raised border border-border">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Feed name (e.g., Engadget)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <input
              type="url"
              placeholder="RSS URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-[2] px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <Button type="submit" size="sm" isLoading={isAdding}>
              Add
            </Button>
          </div>
        </form>
      )}

      {/* Feed List */}
      <div className="space-y-1.5">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-raised group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${feed.isActive ? "bg-success" : "bg-muted"}`}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {feed.name}
                </span>
                <span className="text-xs text-muted ml-2">
                  {feed._count?.stories ?? 0} stories
                </span>
              </div>
            </div>
            <button
              onClick={() => onRemoveFeed(feed.id)}
              className="text-xs text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              Remove
            </button>
          </div>
        ))}

        {feeds.length === 0 && (
          <p className="text-xs text-muted text-center py-4">
            No feeds added yet. Click &quot;+ Add Feed&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
};
