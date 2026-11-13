"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  RefreshCw,
  Eye,
  ShoppingBag,
} from "lucide-react";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";
import { generatePlatformAdCopy } from "@/lib/ecommerce/socialAdCopy";

export interface SocialChannelOption {
  id: string;
  platform: string;
  name: string;
  handle: string;
  profileImageUrl?: string | null;
  followerCount?: number;
}

export interface SocialPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec;
  script?: AdScript;
  variationId?: string;
}

export const SocialPublishModal: React.FC<SocialPublishModalProps> = ({
  isOpen,
  onClose,
  product,
  script,
  variationId,
}) => {
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const [channels, setChannels] = useState<SocialChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [_isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  // Execution States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    id?: string;
    platformVideoId?: string | null;
    status?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate Platform Copy whenever platform or product changes
  useEffect(() => {
    const copy = generatePlatformAdCopy(product, script, platform);
    setTitle(copy.title);
    setDescription(copy.description);
    setHashtags(copy.hashtags);
  }, [platform, product, script]);

  // Fetch Connected Social Channels on Open
  useEffect(() => {
    if (!isOpen) return;
    setPublishResult(null);
    setErrorMessage(null);

    const fetchChannels = async () => {
      setIsLoadingChannels(true);
      try {
        const res = await fetch("/api/ecommerce/publish");
        if (res.ok) {
          const data = await res.json();
          const loadedChannels: SocialChannelOption[] = data.channels || [];
          setChannels(loadedChannels);
          // Select matching channel if available
          const matching = loadedChannels.find((c) => c.platform.toLowerCase() === platform.toLowerCase());
          if (matching) {
            setSelectedChannelId(matching.id);
          } else if (loadedChannels.length > 0) {
            setSelectedChannelId(loadedChannels[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch channels:", err);
      } finally {
        setIsLoadingChannels(false);
      }
    };

    fetchChannels();
  }, [isOpen, platform]);

  if (!isOpen) return null;

  const filteredChannels = channels.filter(
    (c) => c.platform.toLowerCase() === platform.toLowerCase()
  );

  const handlePublishOrSchedule = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setPublishResult(null);

    try {
      // If no channel is configured in DB, use a mock channel ID for seamless sandbox test
      const targetChannelId = selectedChannelId || `mock_demo_${platform}_channel`;

      const res = await fetch("/api/ecommerce/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationId: variationId || "demo-variation-default",
          channelId: targetChannelId,
          scheduledFor: isScheduled && scheduleDateTime ? scheduleDateTime : undefined,
          customTitle: title,
          customDescription: description,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch publish");
      }

      setPublishResult(data.publish);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141418]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-500/40 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Autonomous Social Publishing Dispatch
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  Sprint E6.4
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                One-click direct publish or schedule commercial ad drops across TikTok, Instagram Reels, and YouTube Shorts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Form + Right Live Post Mockup */}
        <div className="flex-1 grid grid-cols-12 overflow-y-auto">
          {/* Left Form (7 Cols) */}
          <div className="col-span-7 p-6 border-r border-white/10 space-y-5">
            {/* Platform Selector Tabs */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-2">Target Social Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "tiktok", label: "TikTok Shop", icon: "🎵", color: "from-cyan-500 to-pink-500" },
                  { key: "instagram", label: "Instagram Reels", icon: "📸", color: "from-pink-500 to-amber-500" },
                  { key: "youtube", label: "YouTube Shorts", icon: "▶️", color: "from-red-600 to-rose-400" },
                ].map((item) => {
                  const isActive = platform === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setPlatform(item.key as "tiktok" | "instagram" | "youtube")}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? "bg-white/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <div className="text-xs font-bold leading-none text-white">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">9:16 Vertical</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Channel Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/70">Connected Account</label>
                <span className="text-[11px] text-cyan-400">OAuth Verified</span>
              </div>
              {filteredChannels.length > 0 ? (
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {filteredChannels.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#141418]">
                      {c.name} (@{c.handle}) {c.followerCount ? `• ${(c.followerCount / 1000).toFixed(1)}k followers` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                  <span>No live {platform} channel linked yet. Using Sandbox Auto-Dispatcher.</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                    Demo Mode
                  </span>
                </div>
              )}
            </div>

            {/* Post Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/70">Video Ad Title / Headline</label>
                <span className="text-[10px] text-muted-foreground">{title.length} chars</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                placeholder="Catchy headline with discount callout..."
              />
            </div>

            {/* Caption & Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/70">Caption & Viral Hook</label>
                <button
                  onClick={() => {
                    const copy = generatePlatformAdCopy(product, script, platform);
                    setDescription(copy.description);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Re-roll Copy
                </button>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
                placeholder="Product description and call to action..."
              />
            </div>

            {/* Hashtag Bank */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5">Platform Hashtags</label>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-cyan-300 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Schedule Option Toggle */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Schedule for Optimal Engagement Time</span>
                </div>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-500"
                />
              </div>
              {isScheduled && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {publishResult && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Successfully {publishResult.status === "SCHEDULED" ? "Scheduled!" : "Published to " + platform.toUpperCase() + "!"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400/80">
                  Publish Record ID: <span className="font-mono">{publishResult.id}</span>
                  {publishResult.platformVideoId && (
                    <> • External ID: <span className="font-mono">{publishResult.platformVideoId}</span></>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Right Live Post Mockup (5 Cols) */}
          <div className="col-span-5 p-6 bg-[#0a0a0d] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" /> Live Platform Feed Preview
                </span>
                <span className="text-[11px] font-mono text-cyan-400">9:16 Feed Emulation</span>
              </div>

              {/* Smartphone Frame Container */}
              <div className="relative mx-auto w-full max-w-[280px] aspect-[9/16] rounded-3xl border-2 border-white/20 bg-black overflow-hidden shadow-2xl flex flex-col justify-between p-3.5">
                {/* Background Image / Placeholder */}
                {product.assets[0]?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.assets[0].url}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-black to-black" />
                )}

                {/* Top Overlay Controls */}
                <div className="relative z-10 flex items-center justify-between text-white text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                    Sponsored Ad
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live</span>
                  </div>
                </div>

                {/* Right Side Interaction Column (TikTok/Reels icons) */}
                <div className="relative z-10 self-end flex flex-col items-center gap-3 text-white">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs">
                      ❤️
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">24.5k</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs">
                      💬
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">842</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs">
                      ↗️
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">Share</span>
                  </div>
                </div>

                {/* Bottom Card / Caption / CTA */}
                <div className="relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent pt-6 pb-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                      {product.brand?.name?.[0] || "R"}
                    </div>
                    <span className="text-xs font-bold text-white">
                      @{product.brand?.name?.toLowerCase().replace(/\s+/g, "") || "rubystore"}
                    </span>
                  </div>

                  <p className="text-[11px] text-white line-clamp-2 font-medium">
                    {description.split("\n")[0]}
                  </p>

                  {/* Platform CTA Pill */}
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs py-2 px-3 rounded-xl flex items-center justify-between shadow-lg shadow-pink-500/20">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Shop Now • ${product.price.toFixed(2)}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold opacity-90">Order ❯</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Aspect ratio: 9:16 Vertical</span>
              <span>Bitrate: Target 12 Mbps</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#141418]/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePublishOrSchedule}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching to {platform.toUpperCase()}...</span>
                </>
              ) : isScheduled ? (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Drop</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>1-Click Publish to {platform.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
