import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { resolveLoopVideoUrl } from "@/components/editor/utils/loopResolver";
import { transformSegmentsToCompositionProps } from "@/components/editor/utils/compositionAdapter";
import { EditorLeftSidebar } from "@/components/editor/EditorLeftSidebar";

describe("Story Video Editor Refactor — Loop Resolver, Composition Adapter & Sub-Components", () => {
  describe("resolveLoopVideoUrl", () => {
    it("returns undefined for empty or face_only loop IDs", () => {
      expect(resolveLoopVideoUrl(undefined, "ruby")).toBeUndefined();
      expect(resolveLoopVideoUrl("", "ruby")).toBeUndefined();
      expect(resolveLoopVideoUrl("face_only", "ruby")).toBeUndefined();
    });

    it("passes through direct asset paths and HTTP URLs untouched", () => {
      expect(resolveLoopVideoUrl("/assets/custom/clip.mp4", "ruby")).toBe("/assets/custom/clip.mp4");
      expect(resolveLoopVideoUrl("https://cdn.example.com/loop.mp4", "ruby")).toBe("https://cdn.example.com/loop.mp4");
    });

    it("resolves Ruby master suite presets accurately", () => {
      expect(resolveLoopVideoUrl("ruby_idle", "ruby")).toBe(
        "/assets/action_loops/ruby_master_suite/ruby_idle.mp4"
      );
      expect(resolveLoopVideoUrl("breaking_alert", "ruby")).toBe(
        "/assets/action_loops/ruby_master_suite/ruby_breaking_alert.mp4"
      );
      expect(resolveLoopVideoUrl("intro_welcome", "ruby")).toBe(
        "/assets/action_loops/ruby_master_suite/ruby_intro_welcome.mp4"
      );
      expect(resolveLoopVideoUrl("emphasis_nod", "ruby")).toBe(
        "/assets/action_loops/ruby_master_suite/ruby_emphasis_nod.mp4"
      );
    });

    it("resolves persona-specific Veo action loop paths", () => {
      const url = resolveLoopVideoUrl("M1_neutral", "diego");
      expect(url).toContain("/assets/action_loops/veo/");
      expect(url?.endsWith(".mp4")).toBe(true);
    });
  });

  describe("transformSegmentsToCompositionProps", () => {
    it("transforms raw story segments into frame-accurate Remotion CompositionProps", () => {
      const props = transformSegmentsToCompositionProps({
        aspectRatio: "horizontal",
        scriptSegments: [
          {
            id: "seg-0",
            index: 0,
            startTime: 0,
            endTime: 4.5,
            text: "Breaking news from the studio.",
            imagePrompt: "",
            assetPath: "/assets/broll/tech.mp4",
            assetType: "video",
            mediaSettings: JSON.stringify({
              actionLoop: "M2_explain",
              cameraCue: "cam1_wide",
            }),
            stickers: JSON.stringify(["🔥"]),
            personaId: "ruby",
          },
        ],
        story: {
          id: "story-1",
          status: "ready",
          title: "AI Breakthrough",
          language: "en",
          video: {
            id: "vid-1",
            status: "ready",
            aspectRatio: "16:9",
            bgMusicVolume: 0.25,
            captionStyle: "beast",
          },
          feed: {
            name: "Tech News",
            groups: [
              {
                brands: [
                  {
                    primaryColor: "#06b6d4",
                    secondaryColor: "#10b981",
                  },
                ],
              },
            ],
          },
        },
        globalBgEnabled: true,
        showSafeZones: false,
        showTickerTape: true,
        sfxEnabled: true,
        studioSetId: "minimal_studio",
        clonedPersonas: [],
        audioTimestamp: 123456,
        sceneBlobMap: {},
        batchBlobMap: {},
        showPresenter: true,
        showCaptions: true,
        showHeadline: true,
        showCitationBadge: true,
        showBrandLogo: true,
        showBackdrop: true,
        showIntro: true,
        showOutro: true,
        brandLogoOffsetX: 10,
        brandLogoOffsetY: 20,
        brandLogoScale: 1.1,
        badgeOffsetX: 0,
        badgeOffsetY: 0,
        tickerTapeOffsetY: 0,
        presenterConfig: {
          personaId: "ruby",
          scale: 1.0,
          layoutMode: "full_screen",
          offsetX: 0,
          offsetY: 0,
        },
        fps: 30,
      });

      expect(props.aspectRatio).toBe("horizontal");
      expect(props.segments).toHaveLength(1);
      expect(props.segments[0].startFrame).toBe(0);
      expect(props.segments[0].endFrame).toBe(135);
      expect(props.segments[0].actionLoop).toBe("M2_explain");
      expect(props.segments[0].stickers).toEqual(["🔥"]);
      expect(props.brandPrimaryColor).toBe("#06b6d4");
      expect(props.brandLogoScale).toBe(1.1);
    });
  });

  describe("EditorLeftSidebar Sub-Component", () => {
    it("renders sidebar navigation tabs cleanly", () => {
      const html = renderToString(
        <EditorLeftSidebar
          activeTab="timeline"
          setActiveTab={() => {}}
        />
      );
      expect(html).toContain("Timeline");
      expect(html).toContain("Layers");
      expect(html).toContain("Presenter Studio");
      expect(html).toContain("Visuals B-Roll");
      expect(html).toContain("Audio &amp; Voice");
    });
  });
});
