/**
 * src/tests/newsPreProductionModal.test.tsx
 *
 * Verifies the NewsStudio Pre-Production Control Room Modal component.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  NewsPreProductionModal,
  StoryModalData,
} from "@/components/newsroom/NewsPreProductionModal";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock ToastContainer
vi.mock("@/components/global/ToastContainer", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("NewsPreProductionModal Component", () => {
  const mockUnscriptedStory: StoryModalData = {
    id: "story-101",
    title: "SpaceX Starship Completes Booster Test",
    description: "SpaceX successfully fired 33 Raptor engines in south Texas.",
    status: "INGESTED",
    pubDate: "2026-09-25T14:00:00Z",
    link: "https://example.com/spacex-booster",
    feed: { id: "feed-1", name: "TechCrunch Wire" },
    category: "AEROSPACE",
    articleImageUrls: JSON.stringify([
      "https://example.com/starship-pad.jpg",
      "https://example.com/starship-engines.jpg",
    ]),
    script: null,
  };

  const mockScriptedStory: StoryModalData = {
    id: "story-202",
    title: "Quantum Chip Reaches Historic Landmark",
    status: "SCRIPTED",
    link: "https://example.com/quantum",
    feed: { id: "feed-2", name: "MIT Tech Review" },
    category: "QUANTUM",
    script: {
      id: "script-202",
      headline: "AVANCES CUÁNTICOS SIN PRECEDENTES",
      segments: [
        {
          index: 0,
          text: "¡Atención! Un equipo de científicos logró el primer procesador cuántico comercial.",
          spokenText: "¡Atención! Un equipo de científicos logró el primer procesador cuántico comercial.",
          assetPath: "/studio_environments/studio_plate_standup_skyline_9x16.jpg",
          personaId: "ruby",
          sceneStrategy: "chroma_broll",
          keyword: "quantum chip",
          imagePrompt: "Photorealistic quantum computer core gleaming in lab",
          duration: 6,
        },
        {
          index: 1,
          text: "La nueva arquitectura reduce las tasas de decoherencia en un noventa por ciento.",
          spokenText: "La nueva arquitectura reduce las tasas de decoherencia en un noventa por ciento.",
          assetPath: "https://example.com/quantum-chip.jpg",
          personaId: "ruby",
          sceneStrategy: "transparent_anchor",
          keyword: "silicon qubit",
          duration: 8,
        },
      ],
    },
  };

  it("returns null when isOpen is false or story is null", () => {
    const htmlClosed = renderToString(
      <NewsPreProductionModal
        isOpen={false}
        onClose={vi.fn()}
        story={mockUnscriptedStory}
      />
    );
    expect(htmlClosed).toBe("");

    const htmlNullStory = renderToString(
      <NewsPreProductionModal
        isOpen={true}
        onClose={vi.fn()}
        story={null}
      />
    );
    expect(htmlNullStory).toBe("");
  });

  it("renders Stage 1 (Broadcast Brief) with story overview, harvested assets, archetypes, and CTA", () => {
    const html = renderToString(
      <NewsPreProductionModal
        isOpen={true}
        onClose={vi.fn()}
        story={mockUnscriptedStory}
      />
    );

    // Verify Header & Subtitle
    expect(html).toContain("Pre-Production Control Room");
    expect(html).toContain("AI Broadcast Storyboard Synthesizer");
    expect(html).toContain("SpaceX Starship Completes Booster Test");
    expect(html).toContain("1. Broadcast Brief");

    // Verify Story Details & Harvested Assets
    expect(html).toContain("TechCrunch Wire");
    expect(html).toContain("AEROSPACE");
    expect(html).toContain("Available Story Assets (AI Will Curate &amp; Map to Scenes)");
    expect(html).toContain("Hero Photo");
    expect(html).toContain("Context");

    // Verify all 6 Broadcast Archetypes
    expect(html).toContain("Breaking News Flash");
    expect(html).toContain("Deep Dive &amp; Analysis");
    expect(html).toContain("Primetime Anchor Brief");
    expect(html).toContain("Debate &amp; Perspectives");
    expect(html).toContain("Viral Social Byte");
    expect(html).toContain("Financial &amp; Market Ticker");

    // Verify Channels & Dialects
    expect(html).toContain("YouTube Broadcast (16:9 Landscape)");
    expect(html).toContain("TikTok &amp; Reels (9:16 Vertical)");
    expect(html).toContain("Spanish (Español Latinoamericano / Rioplatense)");
    expect(html).toContain("English (US Broadcast / Global)");

    // Verify Persona Selection
    expect(html).toContain("Lead Anchor Persona");
    expect(html).toContain("Auto-Select (Gemini Matches Persona to Story Tone)");

    // Verify Editorial Direction & Suggestion Chips
    expect(html).toContain("Custom Editorial Direction (Optional)");
    expect(html).toContain("Emphasize breaking urgency and live developing facts");
    expect(html).toContain("Maintain neutral, balanced journalistic objectivity");

    // Verify CTA Button
    expect(html).toContain("Synthesize Bespoke Storyboard with Gemini →");
  });

  it("renders Stage 3 (Storyboard Review) when story already has a script", () => {
    const html = renderToString(
      <NewsPreProductionModal
        isOpen={true}
        onClose={vi.fn()}
        story={mockScriptedStory}
      />
    );

    // Verify Step 3 is highlighted
    expect(html).toContain("3. Storyboard Review");
    expect(html).toContain("Bespoke Storyboard Ready for Review");

    // Verify Decision Cards
    expect(html).toContain("Curated Anchor Persona");
    expect(html).toContain("Broadcast Format");
    expect(html).toContain("Live Wire Ticker");
    expect(html).toContain("AVANCES CUÁNTICOS SIN PRECEDENTES");

    // Verify Multi-Scene Narrative Breakdown
    expect(html).toContain("Multi-Scene Broadcast Narrative");
    expect(html).toContain("Scene 1: Opening Hook &amp; Intro");
    expect(html).toContain("¡Atención! Un equipo de científicos logró el primer procesador cuántico comercial.");
    expect(html).toContain("Scene 2: Core Facts &amp; Context");
    expect(html).toContain("La nueva arquitectura reduce las tasas de decoherencia en un noventa por ciento.");

    // Verify Action Buttons
    expect(html).toContain("Approve &amp; Send to Production");
    expect(html).toContain("Approve &amp; Open in Studio Editor");
    expect(html).toContain("Back to Brief");
  });
});
