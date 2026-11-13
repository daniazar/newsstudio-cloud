/**
 * src/lib/ai/perspectivePrismEngine.ts
 *
 * "Perspective Prism" — 5-Way Algorithmic Narrative Deconstruction Engine.
 * 
 * Deconstructs any breaking event across 5 distinct philosophical & psychological lenses:
 *   1. Accelerationist (Velocity & Computational Power)
 *   2. Populist/Labor (Monopoly Power & Worker Protection)
 *   3. Realpolitik/Defense (Sovereign Power & Geopolitics)
 *   4. Longtermist/Ecological (50-Year Planetary Horizon)
 *   5. Neutral Steel-Man Arbiter (Objective Common Core)
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  type PrismLensType,
  type PrismPerspective,
  type PerspectivePrismReport,
  PRISM_LENS_CONFIG,
} from "@/lib/types/perspectivePrismTypes";
import dotenv from "dotenv";

dotenv.config();

export type { PrismLensType, PrismPerspective, PerspectivePrismReport };
export { PRISM_LENS_CONFIG };

export const PrismPerspectiveSchema = z.object({
  lens: z.enum([
    "accelerationist",
    "populist_labor",
    "realpolitik_security",
    "longtermist_ecology",
    "neutral_arbiter",
  ]).catch("neutral_arbiter"),
  title: z.string().default("Perspective Analysis"),
  coreThesis: z.string().default("Core argument analysis."),
  spokenScript: z.string().default("Here is the perspective breakdown."),
  framingTriggers: z.array(z.string()).default([]),
});

export const PerspectivePrismOutputSchema = z.object({
  eventTopic: z.string().optional(),
  summary: z.string().optional(),
  perspectives: z.array(PrismPerspectiveSchema).default([]),
  steelMannedSynthesis: z.string().optional(),
});

export const PRISM_SYSTEM_PROMPT = `You are the Lead Epistemic Cognitive Scientist for NewsStudio.

## Task:
Deconstruct the provided breaking news story across 5 distinct ideological lenses simultaneously.
Ensure each perspective presents the STRONGEST POSSIBLE, steel-manned empirical argument without strawmanning.

Lenses:
1. accelerationist: Focus on innovation speed, economic scale, engineering breakthroughs.
2. populist_labor: Focus on corporate concentration, wealth capture, displacement risks.
3. realpolitik_security: Focus on national defense balance, strategic leverage, export sovereignty.
4. longtermist_ecology: Focus on grid strain, planetary resources, 50-year structural stability.
5. neutral_arbiter: Objective factual bedrock reconciling verified data points.

## Output Format:
Return ONLY valid JSON matching this exact structure:
{
  "eventTopic": "Main topic",
  "summary": "Objective event overview",
  "perspectives": [
    {
      "lens": "accelerationist",
      "title": "Velocity & Technological Transformation",
      "coreThesis": "Stifling this capability delays critical civilizational productivity gains.",
      "spokenScript": "[excited] This breakthrough marks a definitive leap forward. [sfx:whoosh] By unlocking generational compute efficiency, we accelerate advancements across medicine, materials, and infrastructure.",
      "framingTriggers": ["Productivity Growth", "Computational Scale", "Global Velocity"]
    },
    {
      "lens": "populist_labor",
      "title": "Corporate Concentration & Labor Leverage",
      "coreThesis": "Unregulated consolidation concentrates critical infrastructure under private monopoly control.",
      "spokenScript": "[authoritative] Behind the glowing press releases lies unprecedented corporate capture. [sfx:sub_drop] Three firms now dictate access to essential technological rails.",
      "framingTriggers": ["Monopoly Power", "Worker Displacement", "Public Accountability"]
    },
    {
      "lens": "realpolitik_security",
      "title": "Sovereign Defense & Strategic Leverage",
      "coreThesis": "Technological supremacy is the fundamental currency of national sovereignty.",
      "spokenScript": "[authoritative] This is not merely an enterprise development; it is a decisive national security lever. [sfx:breaking_alert] Sovereign autonomy requires domestic supply dominance.",
      "framingTriggers": ["Supply Chain Sovereignty", "Strategic Deterrence", "Defense Leverage"]
    },
    {
      "lens": "longtermist_ecology",
      "title": "50-Year Planetary & Energy Horizon",
      "coreThesis": "Exponential deployment must be reconciled with finite physical energy grids.",
      "spokenScript": "[pensive] We must evaluate the planetary energetic cost. [sfx:ding] A twenty-gigawatt surge requires structural grid modernization over decades.",
      "framingTriggers": ["Energy Transition", "50-Year Stability", "Systemic Resilience"]
    },
    {
      "lens": "neutral_arbiter",
      "title": "Empirical Synthesis & Ground Truth",
      "coreThesis": "The verified reality requires balancing immediate adoption against structural oversight.",
      "spokenScript": "[analytical] Stripping away the rhetorical extremes, the audited data demonstrates undeniable efficiency gains paired with real regulatory friction points.",
      "framingTriggers": ["Audited Facts", "Structural Synthesis", "Objective Baseline"]
    }
  ],
  "steelMannedSynthesis": "The optimal societal trajectory reconciles technological acceleration with rigorous sovereignty and grid sustainability."
}`;

export async function runPerspectivePrism(topic: string): Promise<PerspectivePrismReport> {
  try {
    const userPrompt = `DECONSTRUCT EVENT INTO 5 PERSPECTIVE PRISM LENSES:\n\n${topic}`;

    const { object: parsed } = await generateLlmObject({
      schema: PerspectivePrismOutputSchema,
      schemaName: "PerspectivePrismReport",
      system: PRISM_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      tier: "reasoning",
    });

    return {
      eventTopic: parsed.eventTopic || topic,
      summary: parsed.summary || "Perspective Prism 5-way deconstruction analysis.",
      perspectives: (parsed.perspectives || []).map((p) => {
        const conf = PRISM_LENS_CONFIG[p.lens] || PRISM_LENS_CONFIG.neutral_arbiter;
        return {
          ...p,
          assignedPersonaId: conf.personaId,
          assignedPersonaName: conf.personaName,
          avatarUrl: conf.avatarUrl,
          themeColor: conf.themeColor,
        };
      }),
      steelMannedSynthesis: parsed.steelMannedSynthesis || "Integrated epistemic synthesis completed.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ PerspectivePrism generation failed:", msg);
    return generateFallbackPrism(topic);
  }
}

export function generateFallbackPrism(topic: string): PerspectivePrismReport {
  const lenses: PrismLensType[] = [
    "accelerationist",
    "populist_labor",
    "realpolitik_security",
    "longtermist_ecology",
    "neutral_arbiter",
  ];

  return {
    eventTopic: topic,
    summary: `Multifaceted 5-lens narrative deconstruction of "${topic}".`,
    perspectives: lenses.map((lens) => {
      const conf = PRISM_LENS_CONFIG[lens];
      return {
        lens,
        title: conf.name,
        assignedPersonaId: conf.personaId,
        assignedPersonaName: conf.personaName,
        avatarUrl: conf.avatarUrl,
        themeColor: conf.themeColor,
        coreThesis: `Core perspective thesis for ${conf.name} regarding ${topic}.`,
        spokenScript: `[authoritative] Examining ${topic} through the lens of ${conf.name}: verified structural momentum requires rigorous evaluation of underlying empirical variables. [sfx:whoosh]`,
        framingTriggers: ["Empirical Analysis", "Systemic Impact", conf.name],
      };
    }),
    steelMannedSynthesis: "Rigorous objective truth emerges from the intersection of all five analytical lenses.",
  };
}
