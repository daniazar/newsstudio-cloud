/**
 * src/lib/ai/roundupSynthesizer.ts
 *
 * Thematic Clustering & Multi-Anchor Television News Roundup Synthesizer.
 * 
 * 1. Thematic Clustering: Groups ingested RSS articles into topic clusters (Tech, Markets, AI, Crypto, World).
 * 2. Multi-Anchor Script Synthesis: Generates unified 90s–120s multi-scene broadcast scripts (6–8 scenes).
 * 3. Dynamic Anchor Switching: Alternates dialogue between Lead Anchor (Ruby) and Co-Anchor/Field Analyst (Blaze).
 * 4. Broadcast Directives: Injects FSM tags ([BREAKING], [DATA], [EXPLAIN], [CONCLUSION]), camera angles (cam1_wide, cam2_left, cam3_closeup), and lower-third ticker headlines.
 */

import { PERSONAS, Persona, getPersonaById } from "../tts/personas";
import { IngestedArticle, computeArticleHash } from "./autonomousIngest";
import { prisma } from "../prisma";

export interface StoryCluster {
  id: string;
  category: "tech" | "ai" | "markets" | "crypto" | "world" | "entertainment" | "science";
  headline: string;
  articles: IngestedArticle[];
  keywords: string[];
  importanceScore: number;
}

export { clusterArticlesSemantically, clusterArticlesByTheme } from "./semanticDeduplicator";

export interface RoundupSegment {
  order: number;
  personaId: string;
  personaName: string;
  cameraAngle: "cam1_wide" | "cam2_left" | "cam3_closeup";
  emotion: string;
  fsmCue: "[BREAKING]" | "[DATA]" | "[EXPLAIN]" | "[CONCLUSION]" | "[SUMMARY]" | "[FOCUS]";
  dialogue: string;
  tickerHeadline: string;
  brollKeywords: string[];
  estimatedDurationSec: number;
  sourceStoryTitle?: string;
}

export interface SynthesizedRoundupBroadcast {
  headline: string;
  category: string;
  leadAnchorId: string;
  coAnchorId: string;
  totalDurationSec: number;
  clusters: StoryCluster[];
  segments: RoundupSegment[];
  summary: string;
  createdAt: string;
}

export interface SynthesizerOptions {
  leadPersonaId?: string;
  coPersonaId?: string;
  minClusterSize?: number;
  maxClusterSize?: number;
  targetDurationSec?: number; // default: 90 - 120s
}

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";

export const RoundupSegmentOutputSchema = z.object({
  order: z.number().optional(),
  personaId: z.string().optional(),
  personaName: z.string().optional(),
  cameraAngle: z.enum(["cam1_wide", "cam2_left", "cam3_closeup"]).catch("cam1_wide").optional(),
  emotion: z.string().optional(),
  fsmCue: z.enum(["[BREAKING]", "[DATA]", "[EXPLAIN]", "[CONCLUSION]", "[SUMMARY]", "[FOCUS]"]).catch("[DATA]").optional(),
  dialogue: z.string().default(""),
  tickerHeadline: z.string().optional(),
  brollKeywords: z.array(z.string()).optional(),
  estimatedDurationSec: z.number().optional(),
});

export const RoundupBroadcastOutputSchema = z.object({
  headline: z.string().optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  segments: z.array(RoundupSegmentOutputSchema).default([]),
});

/**
 * Synthesizes a unified 90s–120s multi-anchor news roundup broadcast script.
 */
export async function synthesizeMultiAnchorRoundup(
  clusters: StoryCluster[],
  options: SynthesizerOptions = {}
): Promise<SynthesizedRoundupBroadcast> {
  const leadId = options.leadPersonaId || "ruby";
  const coId = options.coPersonaId || "blaze";

  const leadPersona = getPersonaById(leadId) || PERSONAS[0];
  const coPersona = getPersonaById(coId) || PERSONAS[1];

  if (clusters.length === 0) {
    return generateFallbackRoundup(clusters, leadPersona, coPersona);
  }

  try {
    const clusterSummaries = clusters
      .map(
        (c, idx) =>
          `Cluster ${idx + 1} [Category: ${c.category.toUpperCase()}]:\n` +
          `Headline: ${c.headline}\n` +
          `Key Articles: ${c.articles.map((a) => a.title).join(" | ")}\n` +
          `Keywords: ${c.keywords.join(", ")}`
      )
      .join("\n\n");

    const prompt = `
You are the Senior Executive Producer for Ruby NewsStudio.
Synthesize a high-energy, 90-second to 120-second multi-anchor television broadcast news roundup script.

LEAD ANCHOR (Center Studio Desk): ${leadPersona.name} [ID: "${leadPersona.id}"] (${leadPersona.title})
CO-ANCHOR / ANALYST (Satellite Panel): ${coPersona.name} [ID: "${coPersona.id}"] (${coPersona.title})

THEMATIC STORY CLUSTERS TO COVER:
${clusterSummaries}

SCRIPT REQUIREMENTS (Strictly 6 to 8 scenes):
1. Scene 1: BROADCAST INTRO HOOK (Lead Anchor at cam1_wide, [BREAKING] tag, welcoming audience to the roundup).
2. Scenes 2-6: THEMATIC SEGMENTS alternating dynamically between Lead Anchor and Co-Anchor.
   - Lead Anchor introduces major macro events ([BREAKING], [EXPLAIN]).
   - Co-Anchor provides analytical deep dives or market telemetry ([DATA], [FOCUS]).
   - Injected tags must be one of: [BREAKING], [DATA], [EXPLAIN], [CONCLUSION], [SUMMARY], [FOCUS].
   - Camera angles must be strictly: "cam1_wide", "cam2_left", or "cam3_closeup".
   - Each dialogue must be 2-3 sentences of broadcast teleprompter text.
   - Each scene must have a punchy lower-third "tickerHeadline" under 80 characters.
3. Scene 7 or 8: BROADCAST SIGN-OFF & SUMMARY (Lead Anchor at cam1_wide, [CONCLUSION] tag).
`;

    const { object: parsed } = await generateLlmObject({
      schema: RoundupBroadcastOutputSchema,
      schemaName: "RoundupBroadcastScript",
      prompt,
      temperature: 0.2,
    });

    const segments: RoundupSegment[] = (parsed.segments || []).map((seg, idx: number) => ({
      order: idx + 1,
      personaId: seg.personaId || (idx % 2 === 0 ? leadPersona.id : coPersona.id),
      personaName: seg.personaName || (seg.personaId === coPersona.id ? coPersona.name : leadPersona.name),
      cameraAngle: seg.cameraAngle || (idx % 3 === 0 ? "cam1_wide" : idx % 3 === 1 ? "cam2_left" : "cam3_closeup"),
      emotion: seg.emotion || "authoritative_news",
      fsmCue: seg.fsmCue || (idx === 0 ? "[BREAKING]" : idx === (parsed.segments.length - 1) ? "[CONCLUSION]" : "[DATA]"),
      dialogue: seg.dialogue || "",
      tickerHeadline: seg.tickerHeadline || "TOP STORY: CONTINUING COVERAGE",
      brollKeywords: seg.brollKeywords || ["newsroom", "studio"],
      estimatedDurationSec: seg.estimatedDurationSec || Math.max(8, Math.round(String(seg.dialogue || "").split(" ").length / 2.5)),
    }));

    const totalDurationSec = segments.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

    return {
      headline: parsed.headline || `Global News Roundup: Top ${clusters.length} Stories`,
      category: parsed.category || "breaking",
      leadAnchorId: leadPersona.id,
      coAnchorId: coPersona.id,
      totalDurationSec,
      clusters,
      segments,
      summary: parsed.summary || "Complete multi-topic broadcast roundup.",
      createdAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[RoundupSynthesizer] LLM synthesis failed (${msg}). Using fallback synthesizer...`);
    return generateFallbackRoundup(clusters, leadPersona, coPersona);
  }
}

/**
 * Robust programmatic fallback synthesizer generating multi-anchor scripts when offline.
 */
export function generateFallbackRoundup(
  clusters: StoryCluster[],
  leadPersona: Persona = PERSONAS[0],
  coPersona: Persona = PERSONAS[1]
): SynthesizedRoundupBroadcast {
  const segments: RoundupSegment[] = [];

  // 1. Intro Hook
  const primaryTopic = clusters[0]?.headline || "Major Headlines";
  segments.push({
    order: 1,
    personaId: leadPersona.id,
    personaName: leadPersona.name,
    cameraAngle: "cam1_wide",
    emotion: "intense_breaking_news",
    fsmCue: "[BREAKING]",
    dialogue: `Good evening and welcome to the NewsStudio Global Roundup. I'm ${leadPersona.name}. Tonight, our top story: ${primaryTopic}.`,
    tickerHeadline: `ROUNDUP: ${primaryTopic.slice(0, 65).toUpperCase()}`,
    brollKeywords: ["newsroom desk", "breaking news"],
    estimatedDurationSec: 14,
  });

  // 2. Thematic segments for each cluster
  let sceneIndex = 2;
  for (let i = 0; i < Math.min(4, clusters.length); i++) {
    const cluster = clusters[i];
    const isCoAnchor = i % 2 === 1;
    const currentAnchor = isCoAnchor ? coPersona : leadPersona;
    const fsmCue = isCoAnchor ? "[DATA]" : "[EXPLAIN]";
    const angle = isCoAnchor ? "cam2_left" : "cam3_closeup";

    const articleSummary = cluster.articles.map((a) => a.title).slice(0, 2).join(". In related news, ");

    segments.push({
      order: sceneIndex++,
      personaId: currentAnchor.id,
      personaName: currentAnchor.name,
      cameraAngle: angle,
      emotion: isCoAnchor ? "analytical_confident" : "authoritative_news",
      fsmCue,
      dialogue: isCoAnchor
        ? `Turning to our analyst desk, ${articleSummary}. Analysts are closely observing market momentum across this sector.`
        : `Looking at ${cluster.category.toUpperCase()}, ${articleSummary}. We are tracking rapid developments as official reports surface.`,
      tickerHeadline: `${cluster.category.toUpperCase()}: ${cluster.headline.slice(0, 60).toUpperCase()}`,
      brollKeywords: [cluster.category, ...cluster.keywords],
      estimatedDurationSec: 18,
      sourceStoryTitle: cluster.headline,
    });
  }

  // 3. Outro Sign-Off
  segments.push({
    order: sceneIndex,
    personaId: leadPersona.id,
    personaName: leadPersona.name,
    cameraAngle: "cam1_wide",
    emotion: "warm_engaging_smile",
    fsmCue: "[CONCLUSION]",
    dialogue: `That brings you up to speed on tonight's global roundup. For continuing coverage and real-time market data, stay right here on Ruby NewsStudio.`,
    tickerHeadline: `NEWSSTUDIO: FULL BROADCAST COMPLETE • STAY TUNED`,
    brollKeywords: ["studio lights", "skyline"],
    estimatedDurationSec: 14,
  });

  const totalDurationSec = segments.reduce((acc, s) => acc + s.estimatedDurationSec, 0);

  return {
    headline: `NewsStudio Roundup: ${clusters.map((c) => c.category.toUpperCase()).join(" • ")}`,
    category: "breaking",
    leadAnchorId: leadPersona.id,
    coAnchorId: coPersona.id,
    totalDurationSec,
    clusters,
    segments,
    summary: `Comprehensive multi-anchor broadcast covering ${clusters.length} story clusters.`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Persists a synthesized roundup broadcast directly into Prisma DB.
 */
export async function saveRoundupToDatabase(
  roundup: SynthesizedRoundupBroadcast,
  companyId?: string
) {
  let defaultCompany = companyId
    ? await prisma.company.findUnique({ where: { id: companyId } })
    : await prisma.company.findFirst();

  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        id: "default-org",
        name: "NewsStudio Global",
      },
    });
  }

  // Find or create Roundup RSS Feed record
  const roundupFeedUrl = "https://newsstudio.ai/feeds/thematic-roundup";
  let feed = await prisma.rssFeed.findFirst({
    where: { url: roundupFeedUrl },
  });

  if (!feed) {
    feed = await prisma.rssFeed.create({
      data: {
        companyId: defaultCompany.id,
        name: "Thematic Roundup Wire",
        url: roundupFeedUrl,
      },
    });
  }

  const guid = computeArticleHash(roundupFeedUrl, roundup.headline);

  // 1. Create Master Story Record
  const story = await prisma.story.create({
    data: {
      companyId: defaultCompany.id,
      feedId: feed.id,
      title: roundup.headline,
      description: roundup.summary,
      fullContent: roundup.segments.map((s) => `[${s.personaName.toUpperCase()} - ${s.fsmCue}]: ${s.dialogue}`).join("\n\n"),
      link: `roundup://${guid.slice(0, 12)}`,
      guid,
      category: roundup.category,
      status: "APPROVED",
      approvalStatus: "approved",
      pubDate: new Date(),
    },
  });

  // 2. Create Script Record
  const script = await prisma.script.create({
    data: {
      storyId: story.id,
      headline: roundup.headline,
      rawJson: JSON.stringify(roundup),
    },
  });

  // 3. Create Story Segments
  let cumulativeTime = 0;
  const segmentData = roundup.segments.map((seg) => {
    const segDuration = seg.estimatedDurationSec || 12;
    const currentStartTime = cumulativeTime;
    cumulativeTime += segDuration;

    return {
      scriptId: script.id,
      index: seg.order,
      startTime: currentStartTime,
      endTime: currentStartTime + segDuration,
      text: `${seg.fsmCue} ${seg.dialogue}`,
      imagePrompt: `Photorealistic television studio set, ${seg.personaName} presenting news, ${seg.cameraAngle}, cinematic broadcast lighting`,
      personaId: seg.personaId,
      suggestedPersonaId: seg.personaId,
      keyword: seg.brollKeywords.join(", "),
      mediaSettings: JSON.stringify({
        cameraCue: seg.cameraAngle,
        fsmCue: seg.fsmCue,
        sceneStrategy: seg.order === 1 ? "in_environment" : "multi_anchor",
        actionLoop: seg.order % 2 === 0 ? "M2_RAISED_EXPLANATORY" : "M1_NEUTRAL_CLASPED",
      }),
    };
  });

  if (segmentData.length > 0) {
    await prisma.segment.createMany({
      data: segmentData,
    });
  }

  return story;
}
