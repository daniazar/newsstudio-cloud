/**
 * src/components/editor/shared/hooks/useUndoRedo.ts
 *
 * Generic Undo/Redo State History Stack.
 * Provides undo, redo, and snapshot history with max depth safeguards.
 */

import { useState, useCallback } from "react";

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
}

export function useUndoRedo<T>(initialState: T, maxDepth = 40): UseUndoRedoReturn<T> {
  const [state, setCurrentState] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const setState = useCallback(
    (action: T | ((prev: T) => T)) => {
      setCurrentState((currentState) => {
        const nextState = typeof action === "function" ? (action as (prev: T) => T)(currentState) : action;
        if (nextState === currentState) return currentState;

        setPast((prevPast) => {
          const updated = [...prevPast, currentState];
          if (updated.length > maxDepth) {
            return updated.slice(updated.length - maxDepth);
          }
          return updated;
        });

        setFuture([]); // Clear future on new action
        return nextState;
      });
    },
    [maxDepth]
  );

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previousState = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setCurrentState((curr) => {
        setFuture((prevFuture) => [curr, ...prevFuture]);
        return previousState;
      });

      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const nextState = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setCurrentState((curr) => {
        setPast((prevPast) => [...prevPast, curr]);
        return nextState;
      });

      return newFuture;
    });
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    historySize: past.length,
  };
}
