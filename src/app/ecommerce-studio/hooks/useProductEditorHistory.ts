import { useState, useCallback, useRef } from "react";
import { AdScript } from "@/lib/types/ecommerce";

export interface EditorHistorySnapshot {
  script: AdScript;
  timestamp: number;
}

export function useProductEditorHistory(initialScript: AdScript | null) {
  const [script, setScriptState] = useState<AdScript | null>(initialScript);
  const [undoStack, setUndoStack] = useState<EditorHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorHistorySnapshot[]>([]);
  const scriptRef = useRef<AdScript | null>(initialScript);

  const takeSnapshot = useCallback((): EditorHistorySnapshot | null => {
    if (!scriptRef.current) return null;
    return {
      script: JSON.parse(JSON.stringify(scriptRef.current)),
      timestamp: Date.now(),
    };
  }, []);

  const setScript = useCallback((newScript: AdScript | null) => {
    scriptRef.current = newScript;
    setScriptState(newScript);
  }, []);

  const pushScriptState = useCallback(
    (newScript: AdScript) => {
      const snap = takeSnapshot();
      if (snap) {
        setUndoStack((prev) => [...prev.slice(-30), snap]);
        setRedoStack([]);
      }
      setScript(newScript);
    },
    [takeSnapshot, setScript]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return null;
    const currentSnap = takeSnapshot();
    const prevSnap = undoStack[undoStack.length - 1];

    setUndoStack((prev) => prev.slice(0, -1));
    if (currentSnap) {
      setRedoStack((prev) => [currentSnap, ...prev]);
    }

    setScript(prevSnap.script);
    return prevSnap.script;
  }, [undoStack, takeSnapshot, setScript]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return null;
    const currentSnap = takeSnapshot();
    const nextSnap = redoStack[0];

    setRedoStack((prev) => prev.slice(1));
    if (currentSnap) {
      setUndoStack((prev) => [...prev, currentSnap]);
    }

    setScript(nextSnap.script);
    return nextSnap.script;
  }, [redoStack, takeSnapshot, setScript]);

  return {
    script,
    setScript,
    scriptRef,
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    pushScriptState,
    handleUndo,
    handleRedo,
  };
}
