"use client";

import React, { useState } from "react";
import {
  Share2,
  Send,
  X,
  CheckCircle2,
  Loader2,
  Tag,
} from "lucide-react";

export interface SocialPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultTags?: string[];
  onPublish?: (options: {
    destinations: string[];
    title: string;
    description: string;
    tags: string[];
  }) => Promise<void>;
}

export function SocialPublishModal({
  isOpen,
  onClose,
  defaultTitle = "",
  defaultDescription = "",
  defaultTags = ["news", "tech", "trending"],
  onPublish,
}: SocialPublishModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["youtube", "tiktok"]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [tagInput, setTagInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    try {
      setIsPublishing(true);
      await onPublish({
        destinations: selectedChannels,
        title,
        description,
        tags,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Social Distribution Hub</h3>
              <p className="text-[11px] text-zinc-400">
                1-Click publish to YouTube Shorts, TikTok, and Instagram Reels
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Channel Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Target Platforms</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "youtube", label: "YouTube Shorts", color: "text-red-400 border-red-500/30" },
              { id: "tiktok", label: "TikTok", color: "text-cyan-400 border-cyan-500/30" },
              { id: "instagram", label: "Instagram Reels", color: "text-pink-400 border-pink-500/30" },
            ].map((ch) => {
              const isSelected = selectedChannels.includes(ch.id);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                    isSelected
                      ? `bg-zinc-900 ${ch.color} ring-1`
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Video Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Engaging viral video title..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Description & Hashtags */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Description & Caption</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write compelling captions, links, and disclaimers..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Tag className="h-3 w-3 text-emerald-400" />
              <span>Hashtags</span>
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add hashtag (e.g. porcelain, architecture)..."
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:text-white"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => handleRemoveTag(t)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 hover:text-red-400 border border-zinc-800 text-[11px] cursor-pointer"
                title="Click to remove"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || selectedChannels.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500 text-white font-bold text-xs hover:bg-pink-600 transition-colors disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{isPublishing ? "Publishing Video..." : isSuccess ? "Published!" : "Publish to Socials"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
