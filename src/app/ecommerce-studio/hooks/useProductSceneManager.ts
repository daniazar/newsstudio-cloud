import { applyLayoutTemplateToCanvas } from "@/lib/ecommerce/layoutUtils";
import { AdScene,AdScript } from "@/lib/types/ecommerce";
import { useCallback,useState } from "react";

export function useProductSceneManager(
  script: AdScript | null,
  pushScriptState: (newScript: AdScript) => void
) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);

  const currentScene = script?.scenes?.[selectedSceneIndex] || null;

  const handleUpdateCurrentScene = useCallback(
    (field: keyof AdScene, value: unknown) => {
      if (!script || !script.scenes || selectedSceneIndex < 0 || selectedSceneIndex >= script.scenes.length) {
        return;
      }
      const updatedScenes = script.scenes.map((scene, idx) => {
        if (idx !== selectedSceneIndex) return scene;
        return { ...scene, [field]: value };
      });
      pushScriptState({ ...script, scenes: updatedScenes });
    },
    [script, selectedSceneIndex, pushScriptState]
  );

  const handleAddScene = useCallback(() => {
    if (!script) return;
    const scenes = script.scenes || [];
    const newIndex = scenes.length;
    const newScene: AdScene = {
      id: `scene_${Date.now()}`,
      sceneIndex: newIndex,
      startFrame: scenes.reduce((acc, s) => acc + s.durationFrames, 0),
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook",
      headline: "New Scene Headline",
      visualActionPrompt: "Show product highlight",
      primaryMediaUrl: scenes[0]?.primaryMediaUrl || "",
      voiceoverScript: "Discover why everyone loves this product.",
    };
    pushScriptState({ ...script, scenes: [...scenes, newScene] });
    setSelectedSceneIndex(newIndex);
  }, [script, pushScriptState]);

  const handleDeleteScene = useCallback(
    (indexToDelete: number) => {
      if (!script || !script.scenes || script.scenes.length <= 1) return;
      const updatedScenes = script.scenes
        .filter((_, idx) => idx !== indexToDelete)
        .map((scene, idx) => ({ ...scene, sceneIndex: idx }));
      pushScriptState({ ...script, scenes: updatedScenes });
      setSelectedSceneIndex((prev) => Math.min(prev, updatedScenes.length - 1));
    },
    [script, pushScriptState]
  );

  const handleReorderScenes = useCallback(
    (newOrder: AdScene[]) => {
      if (!script) return;
      const reindexed = newOrder.map((scene, idx) => ({ ...scene, sceneIndex: idx }));
      pushScriptState({ ...script, scenes: reindexed });
    },
    [script, pushScriptState]
  );

  const handleAssignMediaToScene = useCallback(
    (mediaUrl: string, sceneIndex?: number) => {
      if (!script || !script.scenes) return;
      const targetIdx = typeof sceneIndex === "number" ? sceneIndex : selectedSceneIndex;
      const updated = script.scenes.map((scene, idx) => {
        if (idx !== targetIdx) return scene;
        return { ...scene, primaryMediaUrl: mediaUrl };
      });
      pushScriptState({ ...script, scenes: updated });
    },
    [script, selectedSceneIndex, pushScriptState]
  );

  const handleApplyLayoutTemplate = useCallback(
    (templateId: string, sceneIndex?: number) => {
      if (!script || !script.scenes) return;
      const targetIdx = typeof sceneIndex === "number" ? sceneIndex : selectedSceneIndex;
      const updated = script.scenes.map((scene, idx) => {
        if (idx !== targetIdx) return scene;
        const currentConfig = (scene as AdScene & { layoutConfig?: import("@/lib/ecommerce/layoutTemplates").AdCanvasLayoutConfig }).layoutConfig;
        return {
          ...scene,
          layoutConfig: applyLayoutTemplateToCanvas(currentConfig, templateId),
        };
      });
      pushScriptState({ ...script, scenes: updated });
    },
    [script, selectedSceneIndex, pushScriptState]
  );

  return {
    selectedSceneIndex,
    setSelectedSceneIndex,
    currentScene,
    handleUpdateCurrentScene,
    handleAddScene,
    handleDeleteScene,
    handleReorderScenes,
    handleAssignMediaToScene,
    handleApplyLayoutTemplate,
  };
}
