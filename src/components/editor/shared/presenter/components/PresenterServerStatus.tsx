/**
 * src/components/editor/shared/presenter/components/PresenterServerStatus.tsx
 *
 * Microservice health badges and server management controls
 * for MuseTalk (8007), SadTalker (legacy), and ComfyUI (8188).
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ModelSize } from "../types";

interface PresenterServerStatusProps {
  selectedModel: ModelSize;
  musetalkOnline: boolean | null;
  isCheckingMuse: boolean;
  checkMuse: () => Promise<void>;
  sadtalkerOnline: boolean | null;
  isCheckingSad: boolean;
  checkSad: () => Promise<void>;
  startSad: () => Promise<void>;
  stopSad: () => Promise<void>;
  comfyOnline: boolean | null;
  isCheckingComfy: boolean;
  checkComfy: () => Promise<void>;
  startComfy: () => Promise<void>;
  stopComfy: () => Promise<void>;
}

export function PresenterServerStatus({
  selectedModel,
  musetalkOnline,
  isCheckingMuse,
  checkMuse,
  sadtalkerOnline,
  isCheckingSad,
  checkSad,
  startSad,
  stopSad,
  comfyOnline,
  isCheckingComfy,
  checkComfy,
  startComfy,
  stopComfy,
}: PresenterServerStatusProps) {
  const [isFlushing, setIsFlushing] = useState(false);

  if (selectedModel === "musetalk" || selectedModel === "ditto") {
    return (
      <div
        className={`p-4 rounded-xl border space-y-3 ${
          musetalkOnline === true
            ? "bg-emerald-500/5 border-emerald-500/30"
            : musetalkOnline === false
            ? "bg-red-500/5 border-red-500/30"
            : "bg-surface-raised border-border"
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2"
            title={
              musetalkOnline
                ? `TalkingHead (${selectedModel === "ditto" ? "Ditto" : "MuseTalk"}) Real-Time Lip-Sync Server is running on port 8010.`
                : "TalkingHead Server is offline. Start it with: docker start modern-talkinghead-server"
            }
          >
            <div
              className={`w-2 h-2 rounded-full ${
                musetalkOnline === true
                  ? "bg-emerald-400 animate-pulse"
                  : musetalkOnline === false
                  ? "bg-red-500 animate-pulse"
                  : "bg-muted/30 animate-pulse"
              }`}
            />
            <span className="text-xs font-bold text-foreground">
              {musetalkOnline === null
                ? "Checking TalkingHead..."
                : musetalkOnline
                ? `TalkingHead / ${selectedModel === "ditto" ? "Ditto" : "MuseTalk"} Online (Port 8010)`
                : `TalkingHead / ${selectedModel === "ditto" ? "Ditto" : "MuseTalk"} Offline (Port 8010)`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {musetalkOnline && (
              <button
                onClick={async () => {
                  setIsFlushing(true);
                  try {
                    await fetch("/api/admin/services/control", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ serviceId: "talkinghead_vram" }),
                    });
                    await checkMuse();
                  } finally {
                    setIsFlushing(false);
                  }
                }}
                disabled={isFlushing}
                className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
                title="Flush avatar cache and PyTorch VRAM without stopping the server"
              >
                {isFlushing ? "Flushing..." : "🧹 Flush VRAM"}
              </button>
            )}
            <button
              onClick={checkMuse}
              disabled={isCheckingMuse}
              className="text-[9px] text-muted hover:text-accent transition-colors cursor-pointer"
            >
              {isCheckingMuse ? "Checking..." : "↺ refresh"}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          ⚡ Ultra-fast 40 FPS real-time lip-sync using pre-cached green-screen action loops for
          borderless transparent corner anchor compositing.
        </p>
      </div>
    );
  }

  if (selectedModel === "sadtalker") {
    return (
      <div
        className={`p-4 rounded-xl border space-y-3 ${
          sadtalkerOnline === true
            ? "bg-purple-500/5 border-purple-500/30"
            : sadtalkerOnline === false
            ? "bg-red-500/5 border-red-500/30"
            : "bg-surface-raised border-border"
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2"
            title={
              sadtalkerOnline
                ? "SadTalker is running. Ready to generate."
                : "SadTalker is not running. Click Start to launch the API server."
            }
          >
            <div
              className={`w-2 h-2 rounded-full ${
                sadtalkerOnline === true
                  ? "bg-purple-500"
                  : sadtalkerOnline === false
                  ? "bg-red-500 animate-pulse"
                  : "bg-muted/30 animate-pulse"
              }`}
            />
            <span className="text-xs font-bold">
              {sadtalkerOnline === null
                ? "Checking SadTalker..."
                : sadtalkerOnline
                ? "SadTalker Online"
                : "SadTalker Offline"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkSad}
              disabled={isCheckingSad}
              className="text-[9px] text-muted hover:text-accent transition-colors cursor-pointer"
            >
              {isCheckingSad ? "Checking..." : "↺ refresh"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sadtalkerOnline ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 w-full"
              onClick={stopSad}
              disabled={isCheckingSad}
            >
              Stop SadTalker Server
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/30 w-full"
              onClick={startSad}
              disabled={isCheckingSad}
            >
              🚀 Start SadTalker Server
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ComfyUI (1.3b, 14b, ltx, eros, sulphur)
  return (
    <div
      className={`p-4 rounded-xl border space-y-3 ${
        comfyOnline === true
          ? "bg-green-500/5 border-green-500/30"
          : comfyOnline === false
          ? "bg-red-500/5 border-red-500/30"
          : "bg-surface-raised border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2"
          title={
            comfyOnline
              ? "ComfyUI is running. Ready to generate."
              : "ComfyUI is not running. Start it with: cd ~/ComfyUI && source venv/bin/activate && python main.py --port 8188"
          }
        >
          <div
            className={`w-2 h-2 rounded-full ${
              comfyOnline === true
                ? "bg-green-500"
                : comfyOnline === false
                ? "bg-red-500 animate-pulse"
                : "bg-muted/30 animate-pulse"
            }`}
          />
          <span className="text-xs font-bold">
            {comfyOnline === null
              ? "Checking ComfyUI..."
              : comfyOnline
              ? "ComfyUI Online"
              : "ComfyUI Offline"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkComfy}
            disabled={isCheckingComfy}
            className="text-[9px] text-muted hover:text-accent transition-colors cursor-pointer"
          >
            {isCheckingComfy ? "Checking..." : "↺ refresh"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {comfyOnline ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 w-full"
            onClick={stopComfy}
            disabled={isCheckingComfy}
          >
            Stop ComfyUI Server
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/30 w-full"
            onClick={startComfy}
            disabled={isCheckingComfy}
          >
            🚀 Start ComfyUI Server
          </Button>
        )}
      </div>
    </div>
  );
}
