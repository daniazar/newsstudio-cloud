"use client";

import React, { useMemo } from "react";
import { Users, PlaySquare, TrendingUp } from "lucide-react";
import type { BrandDetailItem, BrandSocialChannel, SocialChannelPublish } from "@/lib/types/brand";

export default function BrandAnalyticsDashboard({ brand }: { brand: BrandDetailItem | { channels?: BrandSocialChannel[] } | null | undefined }) {
  // Aggregate stats across all connected channels
  const stats = useMemo(() => {
    let totalFollowers = 0;
    let totalUploads = 0;
    let totalViews = 0;

    if (brand && brand.channels) {
      brand.channels.forEach((channel: BrandSocialChannel) => {
        if (channel.isConnected) {
          totalFollowers += (channel.subscriberCount || 0) + (channel.followerCount || 0);
          
          if (channel.publishes && Array.isArray(channel.publishes)) {
            totalUploads += channel.publishes.length;
            totalViews += channel.publishes.reduce((acc: number, pub: SocialChannelPublish) => acc + (pub.viewCount || 0), 0);
          }
        }
      });
    }

    return { totalFollowers, totalUploads, totalViews };
  }, [brand]);

  if (!brand || !brand.channels || brand.channels.length === 0) {
    return null; // Don't show anything if there are no channels to track
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex items-center gap-4 shadow-inner">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-muted">Total Audience</span>
          <p className="text-2xl font-black text-foreground">{stats.totalFollowers.toLocaleString()}</p>
        </div>
      </div>

      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex items-center gap-4 shadow-inner">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
          <PlaySquare className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-muted">Total Published</span>
          <p className="text-2xl font-black text-foreground">{stats.totalUploads.toLocaleString()}</p>
        </div>
      </div>

      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex items-center gap-4 shadow-inner">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-muted">Cross-Platform Views</span>
          <p className="text-2xl font-black text-foreground">{stats.totalViews.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
