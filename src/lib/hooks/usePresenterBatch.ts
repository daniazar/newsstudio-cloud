import { useCallback,useState } from "react";

export interface PresenterBatchState {
  isGenerating: boolean;
  total: number;
  done: number;
  currentScene: string;
  currentMessage: string;
  generatingIds: Set<string>;
}

export function usePresenterBatch() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [currentScene, setCurrentScene] = useState<string>("");
  const [sceneProgress, setSceneProgress] = useState<number>(0);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generationMessages, setGenerationMessages] = useState<Record<string, string>>({});

  const startBatch = useCallback((count: number) => {
    setIsGenerating(true);
    setTotal(count);
    setDone(0);
    setSceneProgress(0);
  }, []);

  const updateProgress = useCallback((doneCount: number, sceneLabel: string, message: string, progress?: number) => {
    setDone(doneCount);
    setCurrentScene(sceneLabel);
    setCurrentMessage(message);
    if (progress !== undefined) setSceneProgress(progress);
  }, []);

  const finishBatch = useCallback(() => {
    setIsGenerating(false);
    setCurrentScene("");
    setCurrentMessage("");
  }, []);

  return {
    isGenerating,
    total,
    done,
    sceneProgress,
    currentScene,
    currentMessage,
    generatingIds,
    setGeneratingIds,
    generationMessages,
    setGenerationMessages,
    startBatch,
    updateProgress,
    finishBatch
  };
}
