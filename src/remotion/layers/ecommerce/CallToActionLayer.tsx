import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TargetDistributionChannel } from "@/lib/types/ecommerce";
import { getContrastingTextColor } from "@/lib/ecommerce/colorUtils";

export interface CallToActionProps {
  ctaText?: string;
  targetChannel?: TargetDistributionChannel;
  startFrame?: number;
  accentColor?: string;
}

export const CallToActionLayer: React.FC<CallToActionProps> = ({
  ctaText = "SHOP NOW • TAP BELOW",
  targetChannel = "tiktok_shop",
  startFrame = 0,
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 12, stiffness: 140 },
  });

  const timeSec = Math.max(0, frame - startFrame) / fps;
  const pulse = 1 + Math.sin(timeSec * Math.PI * 2) * 0.03;

  const isAmazon = targetChannel === "amazon_listing";
  const btnBg = isAmazon ? "#f59e0b" : accentColor;
  const textColor = isAmazon ? "#09090b" : getContrastingTextColor(btnBg);

  return (
    <div
      style={{
        transform: `scale(${entrance * pulse})`,
        backgroundColor: btnBg,
        color: textColor,
        fontWeight: 900,
        fontSize: 24,
        letterSpacing: 1,
        textTransform: "uppercase",
        padding: "18px 44px",
        borderRadius: 50,
        boxShadow: `0 8px 30px ${btnBg}66`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        pointerEvents: "none",
        zIndex: 45,
      }}
    >
      <span>{ctaText}</span>
      <span style={{ fontSize: 28 }}>➔</span>
    </div>
  );
};
