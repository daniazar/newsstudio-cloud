"use client";

import React, { useState } from "react";
import { useToast } from "@/components/global/ToastContainer";
import { Tv, Camera, Smartphone, RefreshCw, Save, ExternalLink, Play, Settings } from "lucide-react";
import type { BrandSocialChannel, SocialChannelPublish } from "@/lib/types/brand";

const getPlatformIcon = (platform: string) => {
  if (platform === "youtube") return <Tv className="w-5 h-5 text-red-500" />;
  if (platform === "instagram") return <Camera className="w-5 h-5 text-pink-500" />;
  if (platform === "tiktok") return <Smartphone className="w-5 h-5 text-cyan-400" />;
  return <Tv className="w-5 h-5" />;
};

export default function ChannelDetailsView({ channel, mutate }: { channel: BrandSocialChannel, mutate: () => void }) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [titleOverride, setTitleOverride] = useState(channel.titleTemplate || "");
  const [descOverride, setDescOverride] = useState(channel.descriptionTemplate || "");
  const [saving, setSaving] = useState(false);

  const handleSyncMetrics = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/brands/${channel.brandId}/sync?channelId=${channel.id}`, { method: "POST" });
      if (res.ok) {
        toast("Synced", `Channel metrics successfully updated.`, "success");
        mutate();
      } else {
        toast("Error", "Could not sync metrics", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveOverrides = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          titleTemplate: titleOverride || null, 
          descriptionTemplate: descOverride || null 
        })
      });
      if (res.ok) {
        toast("Saved", "Channel templates updated successfully", "success");
        mutate();
      } else {
        toast("Error", "Could not save templates", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* Header and Stats */}
      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-background/50 border border-border/60 flex items-center justify-center shadow-inner overflow-hidden">
            {channel.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.profileImageUrl || ""} alt={channel.name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{getPlatformIcon(channel.platform)}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              {getPlatformIcon(channel.platform)} {channel.name || channel.platform}
            </h3>
            <p className="text-xs text-muted font-mono">{channel.handle || "No handle provided"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-center px-4 border-r border-border/40">
            <span className="block text-xl font-black text-foreground">
              {channel.subscriberCount?.toLocaleString() || channel.followerCount?.toLocaleString() || "0"}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Followers</span>
          </div>
          <div className="text-center px-4 border-r border-border/40">
            <span className="block text-xl font-black text-foreground">
              {channel.publishes?.length || 0}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Uploads</span>
          </div>
          <div className="text-center px-4 border-r border-border/40">
            <span className="block text-xl font-black text-foreground">
              {channel.publishes?.reduce((acc: number, p: SocialChannelPublish) => acc + (p.viewCount || 0), 0).toLocaleString() || "0"}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Views</span>
          </div>
          <div className="text-center px-4">
            <span className="block text-xl font-black text-warning">1/10</span>
            <span className="text-[9px] uppercase font-bold text-muted tracking-wider">API Quota</span>
          </div>
          
          <button
            onClick={handleSyncMetrics}
            disabled={syncing}
            className="ml-2 p-2.5 rounded-xl bg-surface hover:bg-accent/10 border border-border/60 hover:border-accent/30 text-subtle hover:text-accent transition-all active:scale-95 disabled:opacity-50"
            title="Sync latest channel metrics"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid: Settings and Recent Publishes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Overrides */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl flex flex-col gap-4 shadow-inner">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" /> Channel Overrides
              </h4>
              <p className="text-[10px] text-muted mt-1 leading-relaxed">
                These templates will override the global brand templates for this specific channel.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Title Template</label>
              <input
                type="text"
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                placeholder="Leave blank to use Global template"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Description Template</label>
              <textarea
                value={descOverride}
                onChange={(e) => setDescOverride(e.target.value)}
                placeholder="Leave blank to use Global template"
                rows={4}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none resize-none"
              />
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleSaveOverrides}
                disabled={saving || (titleOverride === (channel.titleTemplate || "") && descOverride === (channel.descriptionTemplate || ""))}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" /> Save Overrides
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Publishes */}
        <div className="lg:col-span-2">
          <div className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl shadow-inner min-h-[300px]">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Play className="w-4 h-4 text-accent" /> Recent Uploads
            </h4>
            
            {!channel.publishes || channel.publishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-2xl">
                <Play className="w-6 h-6 text-muted mb-2" />
                <p className="text-xs font-bold text-foreground">No videos published yet</p>
                <p className="text-[10px] text-muted">Videos published to this channel will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/50 border-b border-border/40 uppercase text-[9px] font-black text-subtle tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Video</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Likes</th>
                      <th className="px-4 py-3 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {channel.publishes.map((pub: SocialChannelPublish) => (
                      <tr key={pub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate" title={pub.video?.story?.title || pub.title || "Unknown Video"}>
                          {pub.video?.story?.title || pub.title || "Unknown Video"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                            pub.status === "PUBLISHED" ? "bg-success/10 text-success border border-success/20" :
                            pub.status === "FAILED" ? "bg-error/10 text-error border border-error/20" :
                            "bg-warning/10 text-warning border border-warning/20"
                          }`}>
                            {pub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{pub.viewCount?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 text-right font-mono">{pub.likeCount?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 text-right">
                          {pub.platformVideoId && pub.status === "PUBLISHED" ? (
                            <a 
                              href={
                                channel.platform === 'youtube' ? `https://youtube.com/watch?v=${pub.platformVideoId}` :
                                channel.platform === 'instagram' ? `https://instagram.com/p/${pub.platformVideoId}` :
                                `https://tiktok.com/@${channel.handle}/video/${pub.platformVideoId}`
                              }
                              target="_blank" rel="noreferrer"
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-surface hover:bg-accent/10 border border-border/40 text-subtle hover:text-accent transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
