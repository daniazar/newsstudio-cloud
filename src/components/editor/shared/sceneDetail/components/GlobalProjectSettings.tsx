/**
 * src/components/editor/shared/sceneDetail/components/GlobalProjectSettings.tsx
 *
 * View rendered when no individual scene is selected in the timeline.
 * Configures global video settings: Slogan, Outro, Caption typography style,
 * and background music audio track & volume.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SLOGANS } from "@/remotion/layers/IntroLayer";
import { OUTROS, VideoSettings, resolveClientSrc } from "../types";

interface GlobalProjectSettingsProps {
  videoSettings?: VideoSettings | null;
  onUpdateVideoSettings?: (data: Record<string, unknown>) => void;
  onOpenMusicGallery: () => void;
}

export function GlobalProjectSettings({
  videoSettings,
  onUpdateVideoSettings,
  onOpenMusicGallery,
}: GlobalProjectSettingsProps) {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    const audioEl = document.getElementById("editor-bg-music") as HTMLAudioElement | null;
    if (audioEl) {
      audioEl.pause();
    }
    setIsMusicPlaying(false);

    return () => {
      const audioElUnmount = document.getElementById("editor-bg-music") as HTMLAudioElement | null;
      if (audioElUnmount) {
        audioElUnmount.pause();
      }
    };
  }, [videoSettings?.bgMusicPath]);

  useEffect(() => {
    const audioEl = document.getElementById("editor-bg-music") as HTMLAudioElement | null;
    if (audioEl) {
      audioEl.volume = videoSettings?.bgMusicVolume ?? 0.2;
    }
  }, [videoSettings?.bgMusicVolume]);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider text-muted">
          Global Project Settings
        </h2>

        <div className="space-y-6">
          {/* Slogan Selector */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Intro Slogan</label>
            <div className="grid grid-cols-1 gap-2">
              {SLOGANS.map((slogan) => (
                <button
                  key={slogan.id}
                  onClick={() => onUpdateVideoSettings?.({ sloganId: slogan.id })}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                    (videoSettings?.sloganId || "ruby-tech") === slogan.id
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{slogan.icon}</span>
                  <span className="flex-1 text-left text-xs font-medium">{slogan.text}</span>
                  {(videoSettings?.sloganId || "ruby-tech") === slogan.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Outro Selector */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Outro Message</label>
            <div className="grid grid-cols-1 gap-2">
              {OUTROS.map((outro) => (
                <button
                  key={outro.id}
                  onClick={() => onUpdateVideoSettings?.({ outroId: outro.id })}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                    (videoSettings?.outroId || "subscribe") === outro.id
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{outro.icon}</span>
                  <span className="flex-1 text-left text-xs font-medium">{outro.text}</span>
                  {(videoSettings?.outroId || "subscribe") === outro.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Styles */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Caption Style</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "beast", name: "The Beast", desc: "Big, yellow, high-energy" },
                { id: "minimal", name: "The Minimalist", desc: "Clean, small, professional" },
                { id: "breaking", name: "The Breaking", desc: "Classic news ticker" },
                { id: "karaoke", name: "Karaoke", desc: "Word-by-word highlighted" },
                { id: "tiktok", name: "TikTok", desc: "Dynamic and bouncy" },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => onUpdateVideoSettings?.({ captionStyle: style.id })}
                  className={`flex flex-col px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                    (videoSettings?.captionStyle || "beast") === style.id
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">{style.name}</span>
                    {(videoSettings?.captionStyle || "beast") === style.id && <span>✓</span>}
                  </div>
                  <span className="text-[10px] opacity-70">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Music Selector */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Background Music</label>
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-border">
              {videoSettings?.bgMusicPath ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-accent">✓</span>
                      <span className="text-xs text-foreground truncate">
                        {videoSettings.bgMusicPath.split("/").pop() || "Custom Track"}
                      </span>
                    </div>

                    <audio
                      id="editor-bg-music"
                      src={resolveClientSrc(videoSettings.bgMusicPath)}
                      loop
                    />
                    <button
                      onClick={() => {
                        const audioEl = document.getElementById(
                          "editor-bg-music"
                        ) as HTMLAudioElement | null;
                        if (audioEl) {
                          if (audioEl.paused) {
                            audioEl
                              .play()
                              .catch((e) => console.error("Error playing music:", e));
                            setIsMusicPlaying(true);
                          } else {
                            audioEl.pause();
                            setIsMusicPlaying(false);
                          }
                        }
                      }}
                      className="text-xs hover:scale-105 active:scale-95 transition-all p-1 rounded hover:bg-white/5 border border-border/40 text-subtle hover:text-foreground cursor-pointer flex items-center justify-center"
                      title={isMusicPlaying ? "Pause preview" : "Play preview"}
                    >
                      {isMusicPlaying ? "⏸️" : "▶️"}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onOpenMusicGallery}
                  >
                    Change Track
                  </Button>
                  <button
                    onClick={() =>
                      onUpdateVideoSettings?.({ bgMusicPath: null, bgMusicVolume: null })
                    }
                    className="text-[10px] text-red-500 hover:underline text-left"
                  >
                    Remove Music
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted">No background music selected.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onOpenMusicGallery}
                  >
                    🎵 Browse Music
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Volume Control */}
          {videoSettings?.bgMusicPath && (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-medium text-muted">Music Volume</label>
                <span className="text-xs font-mono text-accent">
                  {Math.round((videoSettings?.bgMusicVolume ?? 0.2) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={videoSettings?.bgMusicVolume ?? 0.2}
                onChange={(e) =>
                  onUpdateVideoSettings?.({ bgMusicVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-accent cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
