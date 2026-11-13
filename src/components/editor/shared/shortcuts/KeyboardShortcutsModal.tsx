"use client";

import { Command,X } from "lucide-react";
import React,{ useEffect } from "react";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Command className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Video Ad Studio Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-zinc-400">
                Accelerate your commercial editing with pro NLE hotkeys
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Section 1: Playback & Scrubbing */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Transport & Playhead Scrubbing
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Play / Pause</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-emerald-400 font-mono text-[11px]">
                    Space
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Toggle live Remotion preview</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Shuttle 2s</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-emerald-400 font-mono text-[11px]">
                    J / K / L
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Rewind / Pause / Fast-forward</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Step Frame</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-emerald-400 font-mono text-[11px]">
                    ← / →
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">1 frame (Shift for 10 frames)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Jump Scene</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-emerald-400 font-mono text-[11px]">
                    ↑ / ↓
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Previous / next scene</p>
              </div>
            </div>
          </div>

          {/* Section 2: Timeline & Scene Operations */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Timeline & Scene Editing
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Split Scene</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-cyan-400 font-mono text-[11px]">
                    S
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Slice scene & text at playhead</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Delete Scene</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-red-400 font-mono text-[11px]">
                    Delete
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Remove active scene</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Undo</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-amber-400 font-mono text-[11px]">
                    Ctrl + Z
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Revert last timeline/script edit</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Redo</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-amber-400 font-mono text-[11px]">
                    Ctrl + Y
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Re-apply reverted edit</p>
              </div>
            </div>
          </div>

          {/* Section 3: Help & Modals */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Help & Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Cheat Sheet</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-purple-400 font-mono text-[11px]">
                    ?
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Toggle this shortcuts cheat sheet</p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-200 flex items-center justify-between">
                  <span>Close / Dismiss</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-zinc-700 text-zinc-300 font-mono text-[11px]">
                    Esc
                  </kbd>
                </div>
                <p className="text-[10px] text-zinc-400">Close open modal or dialog</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors shadow-lg shadow-emerald-950/40"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
