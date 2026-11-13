import { useState, useCallback } from "react";
import { AdPresenterConfig } from "@/lib/types/ecommerce";

export function useProductPresenterOrchestrator(
  initialPresenterConfig: AdPresenterConfig = { enabled: true, personaId: "marcus", position: "circle_pip", layoutMode: "circle_pip", scale: 1.0 }
) {
  const [presenterConfig, setPresenterConfig] = useState<AdPresenterConfig>(initialPresenterConfig);
  const [isGeneratingLipSync, setIsGeneratingLipSync] = useState<boolean>(false);
  const [isGeneratingAllPresenters, setIsGeneratingAllPresenters] = useState<boolean>(false);

  const updatePresenterConfig = useCallback(
    (updater: Partial<AdPresenterConfig> | ((prev: AdPresenterConfig) => AdPresenterConfig)) => {
      setPresenterConfig((prev) =>
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
      );
    },
    []
  );

  return {
    presenterConfig,
    setPresenterConfig,
    updatePresenterConfig,
    isGeneratingLipSync,
    setIsGeneratingLipSync,
    isGeneratingAllPresenters,
    setIsGeneratingAllPresenters,
  };
}
