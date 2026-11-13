// src/components/editor/TimelineEditor.tsx

import React, { useState } from "react";
import { Sparkles, Trash2, Plus, Clock } from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";

interface Keyframe {
  time: number;
  action: string;
}

interface TimelineEditorProps {
  value: string; // E.g. "At 0s: reads teleprompter. At 2s: shuffles notes."
  onChange: (newValue: string) => void;
  scriptText?: string;
}

function parseKeyframes(value: string): Keyframe[] {
  if (!value) {
    return [];
  }

  const regex = /At\s+(\d+)s:\s*(.*?)(?=\s*At\s+\d+s:|$)/gi;
  const matches: Keyframe[] = [];
  let match;

  while ((match = regex.exec(value)) !== null) {
    matches.push({
      time: parseInt(match[1], 10),
      action: match[2].trim().replace(/,\s*$/, "").replace(/\.\s*$/, ""),
    });
  }

  // Sort keyframes chronologically
  matches.sort((a, b) => a.time - b.time);

  // Ensure At 0s keyframe exists
  if (matches.length === 0 || matches[0].time !== 0) {
    matches.unshift({
      time: 0,
      action: "looking directly into the camera, opening speech with a warm professional smile",
    });
  }

  return matches;
}

export function TimelineEditor({ value, onChange, scriptText = "" }: TimelineEditorProps) {
  const { toast } = useToast();
  const [prevValue, setPrevValue] = useState(value);
  const [keyframes, setKeyframes] = useState<Keyframe[]>(() => parseKeyframes(value));
  const [newTime, setNewTime] = useState<number>(1);
  const [newAction, setNewAction] = useState<string>("");

  if (value !== prevValue) {
    setPrevValue(value);
    setKeyframes(parseKeyframes(value));
  }

  // Compile keyframes back to string on change
  const triggerChange = (updated: Keyframe[]) => {
    updated.sort((a, b) => a.time - b.time);
    const compiled = updated
      .map(k => `At ${k.time}s: ${k.action.trim()}.`)
      .join(" ");
    onChange(compiled);
  };

  const handleUpdateAction = (index: number, action: string) => {
    const updated = [...keyframes];
    updated[index].action = action;
    setKeyframes(updated);
    triggerChange(updated);
  };

  const handleAddKeyframe = () => {
    if (keyframes.some(k => k.time === newTime)) {
      toast("Keyframe Exists", `Keyframe at ${newTime}s already exists!`, "warning");
      return;
    }
    const updated = [...keyframes, { time: newTime, action: newAction || "performs gesture" }];
    setKeyframes(updated);
    setNewAction("");
    triggerChange(updated);
  };

  const handleDeleteKeyframe = (index: number) => {
    if (keyframes[index].time === 0) return; // Prevent deleting 0s starting keyframe
    const updated = keyframes.filter((_, i) => i !== index);
    setKeyframes(updated);
    triggerChange(updated);
  };

  const handleAutoGenerate = () => {
    if (!scriptText) return;
    const clauses = scriptText.split(/[.,;!]/).map(c => c.trim()).filter(c => c.length > 5);
    const generated: Keyframe[] = [
      { time: 0, action: "looking directly into the camera, opening speech with a warm professional smile" }
    ];

    if (clauses.length >= 2) {
      generated.push({ time: 2, action: `gestures naturally with hands, emphasizing points like "${clauses[1].slice(0, 30)}..."` });
    }
    if (clauses.length >= 3) {
      generated.push({ time: 4, action: `shifts gaze slightly, continuing speech about "${clauses[2].slice(0, 30)}..." with expressive gestures` });
    } else {
      generated.push({ time: 4, action: "nods gently, wrapping up statement" });
    }

    setKeyframes(generated);
    triggerChange(generated);
  };

  return (
    <div className="space-y-5 p-5 rounded-2xl border border-border/80 bg-surface/5">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Video Action Timeline Editor</h4>
        </div>
        {scriptText && (
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Generate Timeline
          </button>
        )}
      </div>

      {/* Visual Timeline Track */}
      <div className="relative py-6 px-2 rounded-xl bg-background/40 border border-border/40 overflow-x-auto min-w-0">
        <div className="absolute top-[40px] left-10 right-10 h-1 bg-border/60 rounded-full" />
        <div className="flex justify-between items-center gap-8 px-8 min-w-[500px]">
          {keyframes.map((k, i) => (
            <div key={i} className="flex flex-col items-center gap-2 relative z-10 shrink-0 select-none">
              <span className="text-[10px] text-muted font-bold">{k.time}s</span>
              <div className="w-5 h-5 rounded-full bg-surface border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[8px] text-muted font-semibold max-w-[80px] text-center truncate mt-0.5">
                {k.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe List Inputs */}
      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
        {keyframes.map((k, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 hover:bg-background/80 transition-colors">
            <div className="flex items-center gap-1.5 min-w-[65px] select-none text-[10px] font-bold text-accent">
              <span>⏱️</span> {k.time}s
            </div>
            <input
              type="text"
              value={k.action}
              onChange={(e) => handleUpdateAction(i, e.target.value)}
              placeholder="E.g., points to display screen, nods head"
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {k.time !== 0 && (
              <button
                type="button"
                onClick={() => handleDeleteKeyframe(i)}
                className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error active:scale-95 transition-all cursor-pointer"
                title="Remove Keyframe"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Keyframe Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2 select-none">
          <span className="text-xs text-muted font-semibold">At</span>
          <input
            type="number"
            min="1"
            max="120"
            value={newTime}
            onChange={(e) => setNewTime(Math.max(1, parseInt(e.target.value, 10)))}
            className="w-16 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-center outline-none focus:border-accent"
          />
          <span className="text-xs text-muted font-semibold">seconds:</span>
        </div>
        <input
          type="text"
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          placeholder="Describe action (e.g. raises hands, gestures)"
          className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={handleAddKeyframe}
          disabled={!newAction}
          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Add Step
        </button>
      </div>
    </div>
  );
}
