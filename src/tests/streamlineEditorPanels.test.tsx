/**
 * src/tests/streamlineEditorPanels.test.tsx
 *
 * Verifies the panel streamline refactor across Scene, Visuals, Voice, and Metadata.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { SceneProductionSettings } from "@/components/editor/shared/sceneDetail/components/SceneProductionSettings";
import { DEFAULT_MEDIA_SETTINGS } from "@/components/editor/shared/sceneDetail/types";
import { GlobalBackdropPicker } from "@/components/editor/shared/backdrop/GlobalBackdropPicker";
import { MetadataPanel, MetadataStory, MetadataSegment } from "@/components/editor/MetadataPanel";
import { SceneDetailPanel } from "@/components/editor/SceneDetailPanel";
import { VisualsStudioPanel } from "@/components/editor/VisualsStudioPanel";
import { VideoBackdropConfig } from "@/lib/types/ecommerce";

describe("Streamlined Editor Panels Verification", () => {
  describe("1. SceneProductionSettings", () => {
    it("renders Override Name, Override Title, and Scene Transitions without stickers, fit, or AI background", () => {
      const mockSetSettings = vi.fn();
      const mockSettingChange = vi.fn();

      const html = renderToString(
        <SceneProductionSettings
          mediaSettings={DEFAULT_MEDIA_SETTINGS}
          setMediaSettings={mockSetSettings}
          onSettingChange={mockSettingChange}
        />
      );

      // Verify retained controls
      expect(html).toContain("Production Settings");
      expect(html).toContain("Override Name");
      expect(html).toContain("Override Title");
      expect(html).toContain("Scene Transition");
      expect(html).toContain("Crossfade");

      // Verify removed controls are NOT present
      expect(html).not.toContain("Image/Video Fit");
      expect(html).not.toContain("Fill Screen (Crop)");
      expect(html).not.toContain("Fit Entire Image");
      expect(html).not.toContain("AI Background");
      expect(html).not.toContain("Social Stickers");
      expect(html).not.toContain("Link in Bio");
    });
  });

  describe("2. GlobalBackdropPicker", () => {
    const mockBackdrop: VideoBackdropConfig = {
      mode: "studio_plate",
      studioBackgroundId: "studio_plate_videowall_standup",
      dimmingPercent: 20,
      blurPx: 0,
      enableCameraPan: true,
    };

    it("respects defaultCollapsed=true on initial render", () => {
      const mockChange = vi.fn();

      const html = renderToString(
        <GlobalBackdropPicker
          backdrop={mockBackdrop}
          onChangeBackdrop={mockChange}
          defaultCollapsed={true}
          hideTuningControls={true}
        />
      );

      // When collapsed, title and badge are visible
      expect(html).toContain("Default Video Backdrop");
      expect(html).toContain("8K Video Wall Stage");
      expect(html).toContain("Expand");

      // Studio environment grid is hidden when collapsed
      expect(html).not.toContain("Studio Sets");
      expect(html).not.toContain("Select Virtual Studio Environment (6)");
    });

    it("renders studio environments when defaultCollapsed=false", () => {
      const mockChange = vi.fn();

      const html = renderToString(
        <GlobalBackdropPicker
          backdrop={mockBackdrop}
          onChangeBackdrop={mockChange}
          defaultCollapsed={false}
          hideTuningControls={true}
        />
      );

      expect(html).toContain("Default Video Backdrop");
      expect(html).toContain("Collapse");
      expect(html).toContain("Studio Sets");
      expect(html).toContain("Select Virtual Studio Environment");
      expect(html).toContain("Penthouse Lounge");
    });

    it("hides Backdrop Lighting & Camera Tuning when hideTuningControls=true", () => {
      const mockChange = vi.fn();

      const html = renderToString(
        <GlobalBackdropPicker
          backdrop={mockBackdrop}
          onChangeBackdrop={mockChange}
          defaultCollapsed={false}
          hideTuningControls={true}
        />
      );

      expect(html).not.toContain("Backdrop Lighting &amp; Camera Tuning");
      expect(html).not.toContain("Ambient Dimming (Contrast Boost)");
      expect(html).not.toContain("Depth-of-Field Blur");
      expect(html).not.toContain("Cinematic Camera Drift (Ken Burns)");
    });
  });

  describe("3. MetadataPanel", () => {
    it("renders headline and metadata without Scene Sequence drag-and-drop section", () => {
      const story: MetadataStory = {
        id: "story-123",
        title: "NASA Awards Major Mars Exploration Contract",
        description: "Breaking news update on Artemis and Mars missions.",
        script: {
          youtubeTitle: "NASA Mars Mission Contract Revealed",
          instagramCaption: "NASA makes historic Mars announcement!",
          instagramHashtags: "#nasa #space #mars",
        },
      };

      const segments: MetadataSegment[] = [
        { index: 0, text: "Scene 1 intro..." },
        { index: 1, text: "Scene 2 details..." },
      ];

      const html = renderToString(<MetadataPanel story={story} segments={segments} />);

      // Verify retained elements
      expect(html).toContain("Story Metadata");
      expect(html).toContain("Headline");
      expect(html).toContain("NASA Awards Major Mars Exploration Contract");
      expect(html).toContain("YouTube Optimization");
      expect(html).toContain("Instagram/TikTok");

      // Verify Scene Sequence is REMOVED
      expect(html).not.toContain("Scene Sequence");
      expect(html).not.toContain("Tip: Drag handles (⣿) to reorder or use arrows.");
    });

    it("matches headline, SEO title, caption, and chapters to video language when video is in Spanish", () => {
      const spanishStory: MetadataStory = {
        id: "story-es-1",
        title: "NASA Signs Lunar Exploration Pact", // Raw English RSS title
        script: {
          headline: "La NASA firma histórico pacto de exploración lunar", // Synthesized Spanish headline
          youtubeTitle: "La NASA firma histórico pacto lunar | Noticias",
          instagramCaption: "La NASA acelera la misión hacia la Luna.",
          instagramHashtags: "#noticias #espacio #luna",
        },
      };

      const spanishSegments: MetadataSegment[] = [
        { index: 0, text: "¡Atención! La NASA acaba de firmar un histórico acuerdo para explorar la Luna..." },
        { index: 1, text: "Los nuevos sistemas de alunizaje permitirán llevar astronautas." },
      ];

      const html = renderToString(<MetadataPanel story={spanishStory} segments={spanishSegments} />);

      // Verify language badge identifies Spanish
      expect(html).toContain("ESPAÑOL (ES-AR)");
      expect(html).toContain("Language Alignment");

      // Verify headline uses the Spanish script headline rather than raw English RSS title
      expect(html).toContain("La NASA firma histórico pacto de exploración lunar");

      // Verify SEO Title and Captions match Spanish
      expect(html).toContain("La NASA firma histórico pacto lunar | Noticias");
      expect(html).toContain("La NASA acelera la misión hacia la Luna.");
      expect(html).toContain("#noticias #espacio #luna");

      // Verify chapters use localized Introducción
      expect(html).toContain("00:00 - Introducción: En Vivo");
    });
  });

  describe("4. SceneDetailPanel", () => {
    it("renders streamlined Scene Strategy and clean Visual Subtitles without timing cards or B-roll controls", () => {
      const mockSegment = {
        index: 0,
        id: "seg-0",
        text: "¡Atención! Blue Origin acaba de ganar un contrato...",
        imagePrompt: "",
        startTime: 0,
        endTime: 5,
        personaId: "ruby",
      };

      const html = renderToString(
        <SceneDetailPanel
          segment={mockSegment}
          totalScenes={3}
          onUpdateText={vi.fn()}
          onUpdateMediaSettings={vi.fn()}
          onRegenerateBRoll={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Verify retained clean controls
      expect(html).toContain("Scene Anchor &amp; Action Loop");
      expect(html).toContain("Camera Rig Angle");
      expect(html).toContain("Visual Subtitles (On-Screen Captions)");
      expect(html).toContain("¡Atención! Blue Origin acaba de ganar un contrato...");
      expect(html).toContain("Production Settings");
      expect(html).toContain("Delete Scene");

      // Verify removed redundant clutter
      expect(html).not.toContain("Scene Settings");
      expect(html).not.toContain("START");
      expect(html).not.toContain("DURATION");
      expect(html).not.toContain("Normalize (OMNI)");
      expect(html).not.toContain("Expand Acronyms");
      expect(html).not.toContain("B-Roll Asset");
      expect(html).not.toContain("Browse Media Studio");
      expect(html).not.toContain("Regenerate B-Roll (Wan 2.2)");
    });
  });

  describe("5. VisualsStudioPanel", () => {
    it("excludes intro and outro bumpers from B-roll scene media matrix and displays only story scenes", () => {
      // Timeline segments containing bumper intro (index -1), story scenes 0, 1, 2, and outro (index -2)
      const mockSegments = [
        {
          id: "intro",
          index: -1,
          text: "INTRO",
          startTime: 0,
          endTime: 3,
          assetPath: "/brand/intro.mp4",
          assetType: "video" as const,
        },
        {
          id: "seg-0",
          index: 0,
          text: "Story scene 1 opening hook in studio set",
          startTime: 3,
          endTime: 8,
          assetPath: null,
          assetType: null,
          keyword: "space rocket",
        },
        {
          id: "seg-1",
          index: 1,
          text: "Story scene 2 b-roll details",
          startTime: 8,
          endTime: 14,
          assetPath: "/assets/rocket.mp4",
          assetType: "video" as const,
          keyword: "launch pad",
        },
        {
          id: "seg-2",
          index: 2,
          text: "Story scene 3 conclusion",
          startTime: 14,
          endTime: 20,
          assetPath: null,
          assetType: null,
          keyword: "control room",
        },
        {
          id: "outro",
          index: -2,
          text: "OUTRO",
          startTime: 20,
          endTime: 23,
          assetPath: "/brand/outro.mp4",
          assetType: "video" as const,
        },
      ];

      const html = renderToString(
        <VisualsStudioPanel
          segments={mockSegments}
          storyId="test-story-1"
          onUpdateAsset={vi.fn()}
          onRegenerateBRoll={vi.fn()}
        />
      );

      // Verify that the Scene Media Matrix counts strictly the 3 story scenes (not 5)
      expect(html).toContain("Scene Media Matrix (3 Scenes)");
      expect(html).toContain("1/3 READY (33%)");
      expect(html).toContain("Scenes 2–3");

      // Verify that Scene 1 (Anchor Studio Set) is rendered properly
      expect(html).toContain("Scene 1");
      expect(html).toContain("Anchor Studio Set");

      // Verify that Story Scenes 2 & 3 are rendered
      expect(html).toContain("Scene 2");
      expect(html).toContain("launch pad");
      expect(html).toContain("Scene 3");
      expect(html).toContain("control room");

      // Verify that Intro and Outro are NOT in the media matrix
      expect(html).not.toContain("Scene 0 (0s - 3s)");
      expect(html).not.toContain("Scene -1");
      expect(html).not.toContain("INTRO - NEEDS B-ROLL");
      expect(html).not.toContain("OUTRO");
    });
  });
});

