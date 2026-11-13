"use client";

import React from "react";
import { Badge } from "./Badge";
import { StoryStatus, VideoStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "error" | "info" | "accent" | "ruby"; dot?: boolean }
> = {
  // Story statuses
  [StoryStatus.INGESTED]: { label: "Ingested", variant: "default" },
  [StoryStatus.SCRAPING]: { label: "Scraping", variant: "info", dot: true },
  [StoryStatus.SCRAPED]: { label: "Scraped", variant: "info" },
  [StoryStatus.SCRIPTING]: { label: "Scripting", variant: "accent", dot: true },
  [StoryStatus.SCRIPTED]: { label: "Scripted", variant: "accent" },
  [StoryStatus.IN_PRODUCTION]: { label: "In Production", variant: "warning", dot: true },
  [StoryStatus.ASSETS_READY]: { label: "Assets Ready", variant: "info" },
  [StoryStatus.RENDERING]: { label: "Rendering 4K", variant: "ruby", dot: true },
  [StoryStatus.COMPLETED]: { label: "Complete", variant: "success" },
  [StoryStatus.FAILED]: { label: "Failed", variant: "error" },

  // Video statuses
  [VideoStatus.PENDING]: { label: "Pending", variant: "default" },
  [VideoStatus.AWAITING_VOICE]: { label: "Awaiting Voice", variant: "info", dot: true },
  [VideoStatus.AWAITING_VIDEO]: { label: "Awaiting Video", variant: "info", dot: true },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "default" as const,
    dot: false,
  };

  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
};
