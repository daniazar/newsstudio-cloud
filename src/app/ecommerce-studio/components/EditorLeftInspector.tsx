import React, { useState } from "react";
import { InspectorTab, INSPECTOR_TABS } from "@/app/ecommerce-studio/constants/studioConstants";
import { AdScene, AdPresenterConfig, ProductSpec } from "@/lib/types/ecommerce";
import { EditorSceneInspector } from "./EditorSceneInspector";
import { EditorAnchorInspector } from "./EditorAnchorInspector";
import { EditorAudioInspector } from "./EditorAudioInspector";
import { EditorStyleInspector } from "./EditorStyleInspector";
import { EditorSpecsInspector } from "./EditorSpecsInspector";
import { Clapperboard, UserCheck, Volume2, Palette, Sliders } from "lucide-react";

export interface EditorLeftInspectorProps {
  currentScene: AdScene | null;
  onUpdateScene: (field: keyof AdScene, value: unknown) => void;
  presenterConfig: AdPresenterConfig;
  onUpdatePresenterConfig: (updater: Partial<AdPresenterConfig>) => void;
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  selectedVoiceModel: string;
  setSelectedVoiceModel: (model: string) => void;
  speechSpeed: number;
  setSpeechSpeed: (speed: number) => void;
  selectedMusicTrack: string;
  setSelectedMusicTrack: (track: string) => void;
  backgroundMusicVolume: number;
  setBackgroundMusicVolume: (vol: number) => void;
  product?: ProductSpec | null;
  onUpdateProduct?: (updater: Partial<ProductSpec>) => void;
}

export const EditorLeftInspector: React.FC<EditorLeftInspectorProps> = (props) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>("scene");

  return (
    <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      {/* Inspector Tabs */}
      <div className="flex items-center border-b border-zinc-800 p-1 bg-zinc-950">
        {INSPECTOR_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-[11px] font-semibold transition-all rounded-md flex flex-col items-center gap-1 ${
                isSelected
                  ? "bg-zinc-800 text-cyan-400 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.id === "scene" && <Clapperboard className="w-3.5 h-3.5" />}
              {tab.id === "anchor" && <UserCheck className="w-3.5 h-3.5" />}
              {tab.id === "audio" && <Volume2 className="w-3.5 h-3.5" />}
              {tab.id === "style" && <Palette className="w-3.5 h-3.5" />}
              {tab.id === "specs" && <Sliders className="w-3.5 h-3.5" />}
              {tab.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Tab Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "scene" && (
          <EditorSceneInspector
            currentScene={props.currentScene}
            onUpdateScene={props.onUpdateScene}
          />
        )}

        {activeTab === "anchor" && (
          <EditorAnchorInspector
            presenterConfig={props.presenterConfig}
            onUpdatePresenterConfig={props.onUpdatePresenterConfig}
          />
        )}

        {activeTab === "audio" && (
          <EditorAudioInspector
            selectedEngine={props.selectedEngine}
            setSelectedEngine={props.setSelectedEngine}
            selectedVoiceModel={props.selectedVoiceModel}
            setSelectedVoiceModel={props.setSelectedVoiceModel}
            speechSpeed={props.speechSpeed}
            setSpeechSpeed={props.setSpeechSpeed}
            selectedMusicTrack={props.selectedMusicTrack}
            setSelectedMusicTrack={props.setSelectedMusicTrack}
            backgroundMusicVolume={props.backgroundMusicVolume}
            setBackgroundMusicVolume={props.setBackgroundMusicVolume}
          />
        )}

        {activeTab === "style" && <EditorStyleInspector />}

        {activeTab === "specs" && (
          <EditorSpecsInspector
            product={props.product}
            onUpdateProduct={props.onUpdateProduct}
          />
        )}
      </div>
    </div>
  );
};
