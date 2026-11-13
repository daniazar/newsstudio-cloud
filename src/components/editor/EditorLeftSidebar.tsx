import React from "react";
import {
  Layers,
  Sparkles,
  Sliders,
  Clapperboard,
  Video,
  Scissors,
  Share2,
  Globe2,
} from "lucide-react";

export interface EditorLeftSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenActionHub?: () => void;
}

export function EditorLeftSidebar({ activeTab, setActiveTab }: EditorLeftSidebarProps) {
  const tools = [
    { id: "timeline", label: "Timeline", icon: Clapperboard },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "presenter", label: "Presenter Studio", icon: Sparkles },
    { id: "visuals", label: "Visuals B-Roll", icon: Video },
    { id: "audio", label: "Audio & Voice", icon: Sliders },
    { id: "trim", label: "Trim & Split", icon: Scissors },
    { id: "export", label: "Export & Publish", icon: Share2 },
    { id: "localize", label: "Localization", icon: Globe2 },
  ];

  return (
    <div className="w-16 border-r border-border/80 bg-surface/80 flex flex-col items-center py-4 gap-4 z-10 shrink-0">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTab === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTab(tool.id)}
            title={tool.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                : "text-muted hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}
