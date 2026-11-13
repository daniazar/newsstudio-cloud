import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  estimateSceneDurationFromScript,
  normalizeSpokenText,
  calibrateSceneDurations,
  calculateTotalDuration,
} from "@/lib/ecommerce/sceneSyncUtils";
import {
  applyLayoutTemplateToCanvas,
  resetLayerPositions,
  calculateGizmoTransforms,
} from "@/lib/ecommerce/layoutUtils";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { SAMPLE_FLOORING } from "@/lib/ecommerce/sampleProducts";
import { EditorHeaderToolbar } from "@/app/ecommerce-studio/components/EditorHeaderToolbar";
import { EditorBottomTimeline } from "@/app/ecommerce-studio/components/EditorBottomTimeline";
import { EditorSceneInspector } from "@/app/ecommerce-studio/components/EditorSceneInspector";
import { EditorSpecsInspector } from "@/app/ecommerce-studio/components/EditorSpecsInspector";

describe("E-Commerce Product Video Editor Refactor — Pure Helpers & Modular Sub-Components", () => {
  const sampleScript = compileAdScript({
    productSpec: SAMPLE_FLOORING,
    archetype: "viral_ugc",
    targetChannel: "tiktok_shop",
  });

  describe("sceneSyncUtils", () => {
    it("estimates scene duration from word count with minimum floor", () => {
      const emptyEst = estimateSceneDurationFromScript("", 150, 30);
      expect(emptyEst.durationSeconds).toBe(3.0);
      expect(emptyEst.durationFrames).toBe(90);

      const longScript =
        "Experience waterproof European white oak engineered hardwood designed for active homes with pets and children today.";
      const est = estimateSceneDurationFromScript(longScript, 150, 30);
      expect(est.durationSeconds).toBeGreaterThan(5.0);
      expect(est.durationFrames).toBe(Math.round(est.durationSeconds * 30));
    });

    it("normalizes spoken text symbols into phonetic words", () => {
      const normalized = normalizeSpokenText("Save 25% & get $50 off @ #1 store!");
      expect(normalized).toContain("percent");
      expect(normalized).toContain("and");
      expect(normalized).toContain("dollars");
      expect(normalized).toContain("at");
      expect(normalized).toContain("number");
    });

    it("calibrates scene durations and computes total campaign duration", () => {
      const calibrated = calibrateSceneDurations(sampleScript.scenes, 30);
      expect(calibrated.length).toBe(sampleScript.scenes.length);
      const totals = calculateTotalDuration(calibrated, 30);
      expect(totals.totalFrames).toBeGreaterThan(0);
      expect(totals.totalSeconds).toBeGreaterThan(0);
    });
  });

  describe("layoutUtils", () => {
    it("applies layout templates and resets layer offsets cleanly", () => {
      const applied = applyLayoutTemplateToCanvas(undefined, "tiktok_ugc_native");
      expect(applied).toBeDefined();

      const resetCaption = resetLayerPositions(applied, "caption");
      expect(resetCaption.caption.offsetX).toBe(0);
      expect(resetCaption.caption.offsetY).toBe(0);
      expect(resetCaption.caption.scale).toBe(1);
    });

    it("calculates CSS transform string for gizmo coordinates", () => {
      const gizmo = calculateGizmoTransforms(15, -20, 1.25);
      expect(gizmo.transform).toBe("translate(15px, -20px) scale(1.25)");
      expect(gizmo.x).toBe(15);
      expect(gizmo.y).toBe(-20);
      expect(gizmo.scale).toBe(1.25);
    });
  });

  describe("Editor Sub-Components", () => {
    it("renders EditorHeaderToolbar with product title, store name, and aspect ratio controls", () => {
      const html = renderToString(
        <EditorHeaderToolbar
          productTitle="Scandinavian White Oak"
          storeName="lumina"
          canUndo={true}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
          aspectRatio="9:16"
          setAspectRatio={() => {}}
          onSave={() => {}}
          onRender={() => {}}
        />
      );
      expect(html).toContain("Scandinavian White Oak");
      expect(html).toContain("lumina");
      expect(html).toContain("9:16");
    });

    it("renders EditorBottomTimeline with all script scenes", () => {
      const html = renderToString(
        <EditorBottomTimeline
          script={sampleScript}
          selectedSceneIndex={0}
          onSelectScene={() => {}}
          onAddScene={() => {}}
          onDeleteScene={() => {}}
        />
      );
      expect(html).toContain("Scene #");
      expect(html).toContain("Tired of Outdated, Scuffed Floors?");
      expect(html).toContain("Timeline (");
    });

    it("renders EditorSceneInspector and EditorSpecsInspector cleanly", () => {
      const sceneHtml = renderToString(
        <EditorSceneInspector
          currentScene={sampleScript.scenes[0]}
          onUpdateScene={() => {}}
        />
      );
      expect(sceneHtml).toContain("Headline Text");
      expect(sceneHtml).toContain("Voiceover Script");

      const specsHtml = renderToString(
        <EditorSpecsInspector
          product={SAMPLE_FLOORING}
          onUpdateProduct={() => {}}
        />
      );
      expect(specsHtml).toContain("Scandinavian White Oak");
    });
  });
});
