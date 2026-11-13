/**
 * src/lib/ai/researchRadarEngine.ts
 *
 * Multimodal Deep Research & Fact-Check Radar Engine.
 * Analyzes raw research papers, earnings releases, transcripts, or statements:
 * - Decomposes claims into factual propositions
 * - Evaluates Truth Score, Sensationalism Index, and Bias Balance
 * - Synthesizes verified broadcast scripts with citation badges
 */

import { z } from "zod";
import { generateLlmObject, type AnyLanguageModel } from "@/lib/llm/aiSdkGateway";
import { createEditorialTools } from "@/lib/ai/editorialTools";
import { prisma } from "@/lib/prisma";
import {
  type VerifiedClaim,
  type ExtractedDataMetric,
  type ResearchRadarReport,
  generateFallbackRadarReport,
} from "./researchRadarTypes";

export interface AnalyzeResearchDocumentOptions {
  companyId?: string | null;
  enableTools?: boolean;
  customModel?: AnyLanguageModel;
}

export {
  type VerifiedClaim,
  type ExtractedDataMetric,
  type ResearchRadarReport,
  generateFallbackRadarReport,
};

export const VerifiedClaimSchema = z.object({
  id: z.string().default("claim_1"),
  claimText: z.string().default("Verified statement"),
  verdict: z.enum(["verified", "disputed", "unsubstantiated"]).catch("verified"),
  confidenceScore: z.number().default(0.9),
  sourceCitation: z.string().default("Source Document"),
  explanation: z.string().default("Verified proposition"),
});

export const ExtractedDataMetricSchema = z.object({
  label: z.string().default("Metric"),
  value: z.string().default("0"),
  context: z.string().default(""),
});

export const ResearchRadarScriptSegmentSchema = z.object({
  index: z.number().default(1),
  text: z.string().default("Spoken broadcast text."),
  citationBadge: z.string().default("VERIFIED [Direct Document]"),
});

export const ResearchRadarReportSchema = z.object({
  title: z.string().default("Research Investigation Report"),
  truthScore: z.number().default(85),
  sensationalismIndex: z.number().default(20),
  objectivityScore: z.number().default(85),
  overallVerdict: z.enum(["HIGHLY_CREDIBLE", "MIXED_ACCURACY", "UNVERIFIED_SENSATIONAL"]).catch("HIGHLY_CREDIBLE"),
  executiveSummary: z.string().default("Factual investigation summary"),
  claims: z.array(VerifiedClaimSchema).default([]),
  metrics: z.array(ExtractedDataMetricSchema).default([]),
  suggestedScript: z.object({
    headline: z.string().default("Verified Report"),
    segments: z.array(ResearchRadarScriptSegmentSchema).default([]),
  }).default({
    headline: "Verified Report",
    segments: [],
  }),
  toolsUsed: z.array(z.string()).optional(),
});

export const RESEARCH_RADAR_SYSTEM_PROMPT = `You are a Chief Fact-Checking Officer and Executive Investigative Producer for a global broadcast news network.

## Task
Analyze the provided research paper, earnings release, interview transcript, or breaking statement with rigorous journalistic skepticism.

## Autonomous Editorial Tools
You have access to 3 autonomous editorial tools to assist your investigation:
- searchIngestedWireArticles: Cross-reference and corroborate claims against past wire reports and news archives.
- lookupPronunciationGlossary: Look up phonetic pronunciation for technical proper nouns, tickers, and acronyms.
- verifyStockBrollKeywords: Check broadcast visual keyword suitability for B-roll footage.

## Analysis Instructions
1. **Extract 3 to 6 key factual claims** and verify their internal logical consistency and plausibility.
2. **Calculate metrics (0-100):**
   - truthScore: Factual soundness (0-100).
   - sensationalismIndex: Hype, clickbait, or fear-mongering level (0-100).
   - objectivityScore: Neutrality vs. promotional bias (0-100).
3. **Extract key quantitative metrics** (numbers, percentages, dollar amounts).
4. **Draft an objective 3-segment broadcast news script** that clearly cites verified facts.

## Return ONLY Valid JSON
{
  "title": "Document Title or Investigation Header",
  "truthScore": 92,
  "sensationalismIndex": 18,
  "objectivityScore": 88,
  "overallVerdict": "HIGHLY_CREDIBLE",
  "executiveSummary": "Concise 2-sentence summary of the factual reality...",
  "claims": [
    {
      "id": "c1",
      "claimText": "Enterprise revenue increased by 84% year-over-year.",
      "verdict": "verified",
      "confidenceScore": 0.96,
      "sourceCitation": "SEC 10-Q Financial Filing, Page 14",
      "explanation": "Corroborated by quarterly balance sheet statement."
    }
  ],
  "metrics": [
    { "label": "Enterprise Capex", "value": "$30.0B", "context": "Single-day allocation" }
  ],
  "suggestedScript": {
    "headline": "Verified Report: Enterprise Revenue Surges 84%",
    "segments": [
      {
        "index": 0,
        "text": "[urgent] Verified financial records confirm enterprise revenue surged eighty-four percent year-over-year.",
        "citationBadge": "SEC 10-Q Filing • Confidence: 96%"
      },
      {
        "index": 1,
        "text": "[serious] Hyperscale cloud providers committed over thirty billion dollars in hardware allocations.",
        "citationBadge": "Audit Statement • Verified"
      },
      {
        "index": 2,
        "text": "[calm] Analysts project sustainable growth through twenty twenty-seven.",
        "citationBadge": "Consensus Estimate"
      }
    ]
  }
}`;

/**
 * Performs deep fact-checking and radar analysis on raw text.
 */
export async function analyzeResearchDocument(
  rawText: string,
  sourceUrl?: string,
  options?: AnalyzeResearchDocumentOptions
): Promise<ResearchRadarReport> {
  try {
    const userPrompt = `INVESTIGATE & FACT-CHECK DOCUMENT:\n\n${rawText.slice(0, 8000)}\n\nSource URL: ${
      sourceUrl || "Direct Document Upload"
    }`;

    const editorialTools = createEditorialTools({ companyId: options?.companyId });
    const tools =
      options?.enableTools === false
        ? undefined
        : {
            searchIngestedWireArticles: editorialTools.searchIngestedWireArticles,
            lookupPronunciationGlossary: editorialTools.lookupPronunciationGlossary,
            verifyStockBrollKeywords: editorialTools.verifyStockBrollKeywords,
          };

    const { object: parsed, toolNamesUsed } = await generateLlmObject({
      schema: ResearchRadarReportSchema,
      schemaName: "ResearchRadarReport",
      system: RESEARCH_RADAR_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.2,
      tier: "reasoning",
      tools,
      maxSteps: 4,
      companyId: options?.companyId,
      customModel: options?.customModel,
    });

    const finalToolsUsed = (toolNamesUsed && toolNamesUsed.length > 0) ? toolNamesUsed : parsed.toolsUsed;

    return {
      ...parsed,
      ...(finalToolsUsed && finalToolsUsed.length > 0 ? { toolsUsed: finalToolsUsed } : {}),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[analyzeResearchDocument] LLM offline, using heuristic fallback:", msg);
    return generateFallbackRadarReport(rawText, sourceUrl);
  }
}


/**
 * Exports verified research report directly to a NewsStudio Story & Script.
 */
export async function exportReportToStory(
  companyId: string,
  report: ResearchRadarReport,
  personaId = "ruby"
) {
  let feed = await prisma.rssFeed.findFirst({ where: { companyId } });
  if (!feed) {
    feed = await prisma.rssFeed.create({
      data: {
        companyId,
        name: "Fact-Check Research Desk",
        url: `https://newsstudio.local/research-${Date.now()}.xml`,
      },
    });
  }

  const guid = `research_${Date.now()}`;
  const story = await prisma.story.create({
    data: {
      companyId,
      feedId: feed.id,
      title: report.suggestedScript.headline,
      link: `research://${guid}`,
      guid,
      description: report.executiveSummary,
      fullContent: report.claims.map((c) => `[${c.verdict.toUpperCase()}] ${c.claimText}`).join("\n\n"),
      status: "SCRIPTED",
      approvalStatus: "approved",
    },
  });

  const script = await prisma.script.create({
    data: {
      storyId: story.id,
      headline: report.suggestedScript.headline,
      rawJson: JSON.stringify(report),
      segments: {
        create: report.suggestedScript.segments.map((seg) => ({
          index: seg.index,
          startTime: seg.index * 20,
          endTime: (seg.index + 1) * 20,
          text: seg.text,
          imagePrompt: "Broadcast investigative fact check studio with verified citations",
          personaId,
          mediaSettings: JSON.stringify({ citationBadge: seg.citationBadge }),
        })),
      },
    },
  });

  return { storyId: story.id, scriptId: script.id };
}
