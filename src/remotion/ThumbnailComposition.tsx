import React from "react";
import { AbsoluteFill } from "remotion";
import { CompositionProps } from "../lib/types";
import { RobustImg } from "./components/RobustImg";
import { resolveSrc } from "./utils/resolveSrc";

export const ThumbnailComposition: React.FC<CompositionProps> = ({
  segments,
  aspectRatio,
}) => {
  
  // Use the first segment's text for the thumbnail headline
  const headline = segments.length > 0 ? segments[0].text.split(".")[0] : "Breaking News";
  
  const isVertical = aspectRatio === "vertical";

  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#000",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden"
    }}>
      {/* Background with Glow */}
      <AbsoluteFill style={{
        background: "radial-gradient(circle at center, #10b981 0%, #064e3b 100%)",
        opacity: 0.8
      }} />

      {/* Decorative Grids */}
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{
        padding: "60px",
        textAlign: "center",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "40px"
      }}>
        {/* News Badge */}
        <div style={{
          backgroundColor: "#10b981",
          color: "white",
          padding: "10px 30px",
          borderRadius: "100px",
          fontSize: "24px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          boxShadow: "0 0 40px rgba(16, 185, 129, 0.5)"
        }}>
          Breaking News
        </div>

        {/* Main Headline */}
        <h1 style={{
          color: "white",
          fontSize: isVertical ? "120px" : "80px",
          fontWeight: 900,
          lineHeight: 1.1,
          margin: 0,
          textShadow: "0 10px 50px rgba(0,0,0,0.5)",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif"
        }}>
          {headline}
        </h1>

        {/* Call to Action */}
        <div style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: "28px",
          fontWeight: 600,
          borderTop: "2px solid rgba(255,255,255,0.2)",
          paddingTop: "20px"
        }}>
          Watch the full report →
        </div>
      </div>

      {/* Ruby Avatar Placeholder for Thumbnail */}
      <div style={{
        position: "absolute",
        bottom: "-50px",
        right: isVertical ? "center" : "50px",
        width: "500px",
        height: "500px",
        background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end"
      }}>
        <RobustImg 
          src={resolveSrc("/placeholder_ruby.png")} 
          style={{ width: "100%", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))" }} 
          alt="Ruby"
        />
      </div>
    </AbsoluteFill>
  );
};
