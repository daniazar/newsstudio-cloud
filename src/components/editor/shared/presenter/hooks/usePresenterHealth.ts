/**
 * src/components/editor/shared/presenter/hooks/usePresenterHealth.ts
 *
 * Health check hook for ComfyUI, SadTalker, and MuseTalk inference servers.
 */

import { useState, useCallback, useEffect } from "react";
import { ModelSize, PresenterStudioPanelProps } from "../types";

export function usePresenterHealth(
  comfyServer: PresenterStudioPanelProps["comfyServer"],
  sadtalkerServer: PresenterStudioPanelProps["sadtalkerServer"]
) {
  const {
    comfyOnline,
    isCheckingHealth: isCheckingComfy,
    checkHealth: checkComfy,
    startServer: startComfy,
    stopServer: stopComfy,
  } = comfyServer;

  const {
    sadtalkerOnline,
    isCheckingHealth: isCheckingSad,
    checkHealth: checkSad,
    startServer: startSad,
    stopServer: stopSad,
  } = sadtalkerServer;

  const [musetalkOnline, setMusetalkOnline] = useState<boolean | null>(null);
  const [isCheckingMuse, setIsCheckingMuse] = useState<boolean>(false);

  const checkMuse = useCallback(async () => {
    setIsCheckingMuse(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setMusetalkOnline(data.services?.musetalk?.status === "online");
      } else {
        setMusetalkOnline(false);
      }
    } catch {
      setMusetalkOnline(false);
    } finally {
      setIsCheckingMuse(false);
    }
  }, []);

  useEffect(() => {
    checkMuse();
  }, [checkMuse]);

  const isModelServerOnline = useCallback(
    (model: ModelSize): boolean => {
      if (model === "musetalk" || model === "ditto") return !!musetalkOnline;
      if (model === "sadtalker") return !!sadtalkerOnline;
      return !!comfyOnline;
    },
    [musetalkOnline, sadtalkerOnline, comfyOnline]
  );

  return {
    comfyOnline,
    isCheckingComfy,
    checkComfy,
    startComfy,
    stopComfy,
    sadtalkerOnline,
    isCheckingSad,
    checkSad,
    startSad,
    stopSad,
    musetalkOnline,
    isCheckingMuse,
    checkMuse,
    isModelServerOnline,
  };
}
