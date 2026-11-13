"use client";

import React, { useState, useMemo } from "react";
import { Button } from "../ui/Button";
import Link from "next/link";
import { Copy, Check, Globe, Wand2, Save } from "lucide-react";
import { detectLanguage } from "@/lib/ecommerce/languageDetector";

export interface MetadataSegment {
  id?: string;
  index: number;
  text?: string;
  startTime?: number;
  endTime?: number;
}

export interface MetadataStory {
  id: string;
  title: string;
  description?: string | null;
  language?: string | null;
  script?: {
    headline?: string | null;
    youtubeTitle?: string | null;
    youtubeDescription?: string | null;
    instagramCaption?: string | null;
    instagramHashtags?: string | null;
    [key: string]: unknown;
  } | null;
  video?: {
    sloganId?: string | null;
    youtubeTitle?: string | null;
    youtubeDescription?: string | null;
    instagramCaption?: string | null;
    instagramHashtags?: string | null;
    [key: string]: unknown;
  } | null;
}

interface MetadataPanelProps {
  story: MetadataStory | null | undefined;
  segments: MetadataSegment[];
  onReorder?: (newOrder: MetadataSegment[]) => void;
  onUpdateVideoSettings?: (settings: Record<string, unknown>) => void;
  onUpdateStoryMetadata?: (data: { headline?: string; youtubeTitle?: string; instagramCaption?: string; instagramHashtags?: string }) => void;
}

interface MetadataFormProps {
  story: MetadataStory;
  segments: MetadataSegment[];
  onReorder?: (newOrder: MetadataSegment[]) => void;
  onUpdateVideoSettings?: (settings: Record<string, unknown>) => void;
  onUpdateStoryMetadata?: (data: { headline?: string; youtubeTitle?: string; instagramCaption?: string; instagramHashtags?: string }) => void;
}

const MetadataForm: React.FC<MetadataFormProps> = ({
  story,
  segments,
  onUpdateVideoSettings,
  onUpdateStoryMetadata,
}) => {
  const script = story.script || {};
  const video = story.video || {};

  // 1. Detect target video language from segments, story, or persona
  const videoLanguage = useMemo<"es" | "en">(() => {
    if (story.language) {
      return story.language.toLowerCase().startsWith("es") ? "es" : "en";
    }
    const sampleTexts = (segments || [])
      .map((s) => s.text || "")
      .filter(Boolean)
      .join(" ")
      .trim();

    if (sampleTexts) {
      return detectLanguage(sampleTexts) === "Spanish" ? "es" : "en";
    }

    if (detectLanguage(`${story.title} ${story.description || ""}`) === "Spanish") {
      return "es";
    }

    return "en";
  }, [story.language, story.title, story.description, segments]);

  const isSpanishVideo = videoLanguage === "es";

  // 2. Resolve Opening Hook from Segment 0
  const openingHook = useMemo(() => {
    const seg0 = (segments || []).find((s) => s && s.index === 0 && s.text?.trim()) ||
      (segments || []).find((s) => s && s.index >= 0 && s.text?.trim());
    if (!seg0 || !seg0.text) return "";
    const firstSentence = seg0.text.split(/[.!?]/)[0]?.trim();
    return firstSentence && firstSentence.length > 10 ? firstSentence : seg0.text.slice(0, 80);
  }, [segments]);

  // 3. Resolve localized defaults matching the video language
  const defaultHeadline = useMemo(() => {
    // If script has a headline, check if it fits the language
    if (script.headline && script.headline.trim()) {
      return script.headline.trim();
    }
    // If video is Spanish and raw title is English, prioritize Spanish opening hook
    if (isSpanishVideo && detectLanguage(story.title) !== "Spanish" && openingHook) {
      return openingHook;
    }
    return story.title;
  }, [script.headline, story.title, isSpanishVideo, openingHook]);

  const defaultSeoTitle = useMemo(() => {
    const existing = video.youtubeTitle || script.youtubeTitle;
    if (existing && existing.trim()) {
      if (isSpanishVideo && detectLanguage(existing) !== "Spanish" && defaultHeadline) {
        return `${defaultHeadline.slice(0, 80)} | Noticias`;
      }
      return existing.trim();
    }
    return isSpanishVideo
      ? `${defaultHeadline.slice(0, 80)} | Noticias Tech`
      : `${defaultHeadline.slice(0, 80)} | Tech News`;
  }, [video.youtubeTitle, script.youtubeTitle, isSpanishVideo, defaultHeadline]);

  const defaultCaption = useMemo(() => {
    const existing = video.instagramCaption || script.instagramCaption;
    if (existing && existing.trim()) {
      if (isSpanishVideo && detectLanguage(existing) !== "Spanish" && openingHook) {
        return `🔥 ${openingHook}\n\nSeguí toda la información actualizada en vivo.`;
      }
      return existing.trim();
    }
    if (isSpanishVideo) {
      return `🔥 ${openingHook || defaultHeadline}\n\nCobertura completa y análisis minuto a minuto en vivo.`;
    }
    return story.description || `${defaultHeadline}. Watch the full broadcast breakdown.`;
  }, [video.instagramCaption, script.instagramCaption, isSpanishVideo, openingHook, defaultHeadline, story.description]);

  const defaultHashtags = useMemo(() => {
    const existing = video.instagramHashtags || script.instagramHashtags;
    if (existing && existing.trim()) return existing.trim();
    return isSpanishVideo ? "#noticias #tecnologia #envivo #ruby #ia" : "#technews #ruby #ai #breaking";
  }, [video.instagramHashtags, script.instagramHashtags, isSpanishVideo]);

  // 4. Form state for metadata editing and language synchronization
  const [headline, setHeadline] = useState(defaultHeadline);
  const [seoTitle, setSeoTitle] = useState(defaultSeoTitle);
  const [caption, setCaption] = useState(defaultCaption);
  const [hashtags, setHashtags] = useState(defaultHashtags);
  const [isSaved, setIsSaved] = useState(false);

  // Track previous defaults to synchronize form when segments/defaults update
  const [prevDefaultKey, setPrevDefaultKey] = useState(
    `${defaultHeadline}|${defaultSeoTitle}|${defaultCaption}|${defaultHashtags}`
  );
  const currentDefaultKey = `${defaultHeadline}|${defaultSeoTitle}|${defaultCaption}|${defaultHashtags}`;
  if (currentDefaultKey !== prevDefaultKey) {
    setPrevDefaultKey(currentDefaultKey);
    setHeadline(defaultHeadline);
    setSeoTitle(defaultSeoTitle);
    setCaption(defaultCaption);
    setHashtags(defaultHashtags);
  }

  // 5. Auto-sync action: force recalculate matching video language
  const handleAutoSyncLanguage = () => {
    if (isSpanishVideo) {
      const synchedHeadline = openingHook || defaultHeadline;
      setHeadline(synchedHeadline);
      setSeoTitle(`${synchedHeadline.slice(0, 80)} | Noticias Tech`);
      setCaption(`🔥 ${synchedHeadline}\n\nCobertura completa y análisis minuto a minuto en vivo.`);
      setHashtags("#noticias #tecnologia #envivo #ruby #ia");
    } else {
      setHeadline(story.title);
      setSeoTitle(`${story.title.slice(0, 80)} | Tech News`);
      setCaption(story.description || `${story.title}. Full news breakdown.`);
      setHashtags("#technews #ruby #ai #breaking");
    }
  };

  // 6. Save handler
  const handleSaveMetadata = async () => {
    const payload = {
      youtubeTitle: seoTitle,
      instagramCaption: caption,
      instagramHashtags: hashtags,
    };
    if (onUpdateVideoSettings) {
      onUpdateVideoSettings(payload);
    }
    if (onUpdateStoryMetadata) {
      onUpdateStoryMetadata({ headline, ...payload });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // 7. Auto-generate YouTube Chapters with localized prefix
  const generateChapters = () => {
    const introDuration = 3; // Intro offset
    return (segments || [])
      .filter((s) => s && s.index !== -1) // Exclude intro virtual segment
      .map((s) => {
        const sStart = typeof s.startTime === "number" ? s.startTime : 0;
        const timestamp = new Date((sStart + introDuration) * 1000).toISOString().slice(14, 19);
        const title = (s.text || "").split(".")[0].slice(0, 40) + "...";
        return `${timestamp} - ${title}`;
      })
      .join("\n");
  };

  const introLabel = isSpanishVideo ? "Introducción: En Vivo" : `Intro: ${video?.sloganId || "Welcome"}`;
  const chapters = generateChapters();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-y-auto overflow-x-hidden min-w-0">
      {/* Top Header & Language Indicator */}
      <div className="flex items-center justify-between mb-4 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2 text-accent">
          <span className="text-xl">📊</span>
          <h3 className="text-sm font-bold uppercase tracking-widest">Story Metadata</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-950/40 text-sky-300">
          <Globe className="w-3 h-3 text-sky-400" />
          <span>{isSpanishVideo ? "ESPAÑOL (ES-AR)" : "ENGLISH (EN)"}</span>
        </div>
      </div>

      {/* Auto-Match Language Banner */}
      <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-sky-950/40 via-surface to-purple-950/20 border border-sky-500/30 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Wand2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Language Alignment</span>
          </div>
          <p className="text-[10px] text-muted leading-tight">
            Synchronized with video language ({isSpanishVideo ? "Español" : "English"})
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="text-[10px] h-7 px-2.5 gap-1 shrink-0 border-sky-500/40 hover:bg-sky-500/10 text-sky-300"
          onClick={handleAutoSyncLanguage}
          title="Auto-match headline, SEO title, and caption to the video language"
        >
          <Wand2 className="w-3 h-3 text-sky-400" />
          <span>Sync Language</span>
        </Button>
      </div>

      <div className="space-y-5">
        {/* Headline */}
        <div className="w-full min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-muted uppercase block">Headline</label>
            <span className="text-[9px] font-mono text-muted">{headline.length} chars</span>
          </div>
          <div className="relative group w-full min-w-0">
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full min-w-0 max-w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-accent"
              placeholder="Broadcast headline..."
            />
            <button
              onClick={() => copyToClipboard(headline, "headline")}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded transition-opacity flex items-center gap-1"
            >
              {copiedKey === "headline" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              <span>{copiedKey === "headline" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* YouTube Metadata */}
        <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-4 w-full min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-red-600 flex items-center justify-center text-[10px] text-white">YT</span>
              YouTube Optimization
            </h4>
            <span className="text-[9px] font-mono text-muted">{seoTitle.length}/100</span>
          </div>

          <div className="w-full min-w-0">
            <label className="text-[10px] font-bold text-muted uppercase mb-1 block">SEO Title</label>
            <div className="relative group w-full min-w-0">
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                maxLength={100}
                className="w-full min-w-0 max-w-full bg-surface border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => copyToClipboard(seoTitle, "yt-title")}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded transition-opacity flex items-center gap-1"
              >
                {copiedKey === "yt-title" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copiedKey === "yt-title" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="w-full min-w-0">
            <label className="text-[10px] font-bold text-muted uppercase mb-1 block">Chapters (Auto-Sync)</label>
            <div className="relative group w-full min-w-0">
              <textarea
                readOnly
                value={`00:00 - ${introLabel}\n${chapters}`}
                className="w-full min-w-0 max-w-full h-28 bg-surface border border-border rounded-md px-3 py-2 text-xs font-mono resize-none focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(`00:00 - ${introLabel}\n${chapters}`, "yt-chapters")}
                className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded transition-opacity flex items-center gap-1"
              >
                {copiedKey === "yt-chapters" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copiedKey === "yt-chapters" ? "Copied" : "Copy All"}</span>
              </button>
            </div>
          </div>

          <hr className="border-border opacity-50" />

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted uppercase block">Video Thumbnail</label>
            <div className="p-4 bg-surface rounded-lg border border-dashed border-border flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-xl">🖼️</div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold">AI High-Contrast Thumbnail</p>
                <p className="text-[10px] text-muted leading-tight">Generate a click-worthy thumbnail based on your story&apos;s headline.</p>
              </div>
              <Link
                href={`/tools/thumbnail-builder?storyId=${story.id}`}
                className="w-full py-2 px-3 rounded-lg bg-accent text-accent-foreground text-xs font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <span>🎨</span>
                <span>Open Thumbnail Studio</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Instagram/TikTok */}
        <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-4 w-full min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white">IG</span>
              Instagram/TikTok
            </h4>
            <span className="text-[9px] font-mono text-muted">{caption.length}/2200</span>
          </div>

          <div className="w-full min-w-0 space-y-2">
            <label className="text-[10px] font-bold text-muted uppercase block">Caption</label>
            <div className="relative group w-full min-w-0">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="w-full min-w-0 max-w-full bg-surface border border-border rounded-lg p-2.5 text-xs leading-relaxed focus:outline-none focus:border-accent resize-none"
              />
              <button
                onClick={() => copyToClipboard(`${caption}\n\n${hashtags}`, "ig-caption")}
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[10px] bg-accent/10 text-accent px-2 py-1 rounded transition-opacity flex items-center gap-1"
              >
                {copiedKey === "ig-caption" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copiedKey === "ig-caption" ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-muted uppercase mb-1 block">Hashtags</label>
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full min-w-0 max-w-full bg-surface border border-border rounded-md px-3 py-1.5 text-xs text-accent font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Save Metadata Button */}
        <Button
          size="sm"
          onClick={handleSaveMetadata}
          className="w-full text-xs font-bold flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaved ? "Saved to Story" : "Save Story Metadata"}</span>
        </Button>
      </div>

      <div className="mt-auto pt-8 flex justify-center">
        <Link href="/newsroom">
          <Button variant="ghost" size="sm">
            ← Back to Newsroom
          </Button>
        </Link>
      </div>
    </div>
  );
};

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  story,
  segments,
  onReorder,
  onUpdateVideoSettings,
  onUpdateStoryMetadata,
}) => {
  if (!story) return null;

  return (
    <MetadataForm
      key={story.id}
      story={story}
      segments={segments}
      onReorder={onReorder}
      onUpdateVideoSettings={onUpdateVideoSettings}
      onUpdateStoryMetadata={onUpdateStoryMetadata}
    />
  );
};
