import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

export interface LivestreamComment {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  badge?: string;
  startFrame: number;
}

export interface LivestreamMobileOverlayProps {
  streamerName?: string;
  streamerHandle?: string;
  streamerAvatar?: string;
  viewerCount?: string;
  pinnedQuestion?: string;
  comments?: LivestreamComment[];
}

const DEFAULT_COMMENTS: LivestreamComment[] = [
  { id: "c1", user: "TechEnthusiast", text: "Ruby is killing this breakdown! 🔥", badge: "⭐ VIP", startFrame: 10 },
  { id: "c2", user: "CryptoTrader_99", text: "Wait, is this confirmed by regulators?! 🤯", startFrame: 25 },
  { id: "c3", user: "Sarah_NYC", text: "Following! Best AI news channel fr fr", badge: "❤️ Sub", startFrame: 45 },
  { id: "c4", user: "GigaChadAI", text: "Huge market implications coming tomorrow 🚀🚀", startFrame: 70 },
  { id: "c5", user: "AlphaSeeker", text: "W anchor, clean visuals 💯", startFrame: 90 },
];

/**
 * LivestreamMobileOverlayLayer
 * Dynamic 9:16 Vertical Smartphone Livestream UI Overlay (TikTok / Shorts / VTuber).
 * Features rising floating heart particles, live chat comment stream, live viewer badge,
 * and pinned viewer questions.
 */
export const LivestreamMobileOverlayLayer: React.FC<LivestreamMobileOverlayProps> = ({
  streamerName = "Ruby Vance",
  streamerHandle = "@ruby_live",
  streamerAvatar = "/avatars/ruby.png",
  viewerCount = "48.6K",
  pinnedQuestion = "📌 PINNED: Will AI replace traditional broadcast studios by 2027?",
  comments = DEFAULT_COMMENTS,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeComments = comments.filter((c) => frame >= c.startFrame);

  // Floating Heart Reaction Particles
  const particles = [
    { id: 1, char: "❤️", xOffset: 20, speed: 1.8, phase: 0 },
    { id: 2, char: "🔥", xOffset: -10, speed: 2.2, phase: 15 },
    { id: 3, char: "⚡", xOffset: 35, speed: 1.5, phase: 30 },
    { id: 4, char: "💖", xOffset: 5, speed: 2.0, phase: 45 },
    { id: 5, char: "🚀", xOffset: 25, speed: 2.5, phase: 60 },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-6 pointer-events-none font-sans select-none">
      {/* Top Mobile Streamer Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
          <RobustImg src={resolveSrc(streamerAvatar)} className="w-10 h-10 rounded-full object-cover border border-white/20" />
          <div className="flex flex-col">
            <span className="text-white font-bold text-xs leading-none">{streamerName}</span>
            <span className="text-white/60 text-[10px]">{streamerHandle}</span>
          </div>
          <span className="ml-2 px-2.5 py-1 rounded-full bg-rose-600 text-white font-bold text-[10px] tracking-wide uppercase">
            Follow
          </span>
        </div>

        {/* Live Viewer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-white font-bold text-xs tracking-wider">{viewerCount}</span>
        </div>
      </div>

      {/* Floating Reaction Particles Rising Up on the Right */}
      <div className="absolute right-6 bottom-32 w-16 h-80 overflow-hidden pointer-events-none">
        {particles.map((p) => {
          const loopFrame = (frame + p.phase * 10) % 90;
          const y = interpolate(loopFrame, [0, 90], [300, -40]);
          const opacity = interpolate(loopFrame, [0, 15, 75, 90], [0, 1, 1, 0]);
          const wobble = Math.sin((loopFrame / 10) * p.speed) * 15 + p.xOffset;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                bottom: 0,
                right: "20px",
                transform: `translate(${wobble}px, -${300 - y}px) scale(${1 + (p.id % 2) * 0.2})`,
                opacity,
              }}
              className="text-2xl drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            >
              {p.char}
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Pinned Question + Live Chat Stream */}
      <div className="flex flex-col gap-3 max-w-[80%] pb-4">
        {/* Pinned Superchat / Viewer Prompt */}
        {pinnedQuestion && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/30 to-amber-950/50 backdrop-blur-md border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-xl">
            {pinnedQuestion}
          </div>
        )}

        {/* Animated Live Chat Feed */}
        <div className="flex flex-col gap-2">
          {activeComments.slice(-4).map((c) => {
            const commentAge = frame - c.startFrame;
            const entrance = spring({
              frame: commentAge,
              fps,
              config: { damping: 14, stiffness: 140 },
            });

            return (
              <div
                key={c.id}
                style={{
                  transform: `translateY(${(1 - entrance) * 20}px)`,
                  opacity: entrance,
                }}
                className="flex items-start gap-2 p-2 px-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-xs"
              >
                <div className="flex items-center gap-1">
                  {c.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {c.badge}
                    </span>
                  )}
                  <span className="font-bold text-white/80 text-[11px]">{c.user}:</span>
                </div>
                <span className="text-white text-[11px] font-medium leading-snug break-words flex-1">
                  {c.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
