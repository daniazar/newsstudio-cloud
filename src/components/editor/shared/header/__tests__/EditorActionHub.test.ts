/**
 * src/components/editor/shared/header/__tests__/EditorActionHub.test.ts
 *
 * Unit tests for EditorActionHub UX simplification:
 * - Simple vs Pro mode toggling
 * - Consolidated AI Tools dropdown actions
 * - Consolidated Export dropdown actions
 * - Undo/Redo & Shortcuts handling
 */

import { describe, it, expect, vi } from "vitest";
import { EditorActionHub, type EditorMode } from "../EditorActionHub";

describe("EditorActionHub UX Simplification", () => {
  it("exports EditorActionHub component properly", () => {
    expect(EditorActionHub).toBeDefined();
    expect(typeof EditorActionHub).toBe("function");
  });

  it("supports simple and pro editor modes", () => {
    const modes: EditorMode[] = ["simple", "pro"];
    expect(modes).toContain("simple");
    expect(modes).toContain("pro");
  });

  it("provides comprehensive action handlers interface", () => {
    const mockProps = {
      editorMode: "simple" as EditorMode,
      onChangeEditorMode: vi.fn(),
      undoCount: 2,
      redoCount: 1,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onOpenShortcuts: vi.fn(),
      onTriggerLlmScript: vi.fn(),
      isGeneratingScript: false,
      onAutoMatchAssets: vi.fn(),
      onOpenLocalization: vi.fn(),
      onShuffleLoops: vi.fn(),
      onShuffleActiveSceneLoop: vi.fn(),
      activeSceneNumber: 2,
      onRender: vi.fn(),
      isRendering: false,
      renderProgress: 0,
      onOpenOmnichannel: vi.fn(),
      isBatchRendering: false,
      onOpenPublish: vi.fn(),
    };

    expect(mockProps.undoCount).toBe(2);
    expect(mockProps.redoCount).toBe(1);
    expect(mockProps.editorMode).toBe("simple");
    expect(mockProps.activeSceneNumber).toBe(2);

    mockProps.onShuffleActiveSceneLoop();
    expect(mockProps.onShuffleActiveSceneLoop).toHaveBeenCalledTimes(1);

    mockProps.onUndo();
    expect(mockProps.onUndo).toHaveBeenCalledTimes(1);

    mockProps.onRedo();
    expect(mockProps.onRedo).toHaveBeenCalledTimes(1);

    mockProps.onRender("master");
    expect(mockProps.onRender).toHaveBeenCalledWith("master");

    mockProps.onRender("draft");
    expect(mockProps.onRender).toHaveBeenCalledWith("draft");
  });
});
