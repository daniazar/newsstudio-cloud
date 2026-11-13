/**
 * src/lib/ai/satireEngine.ts
 *
 * "The Daily LLM" — Cognitive Satire & Comedic Timing Reasoning Engine.
 * 
 * Deconstructs serious news articles, corporate PR releases, and political rhetoric
 * to synthesize high-production satirical monologues with setup-to-punchline math,
 * deadpan pause cues, laugh tracks, and absurd visual meme cutaway prompts.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import dotenv from "dotenv";

dotenv.config();

export interface SatireJoke {
  id: string;
  segmentIndex: number;
  targetEntity: string;             // e.g. "Tech VCs", "Central Bankers", "Social Media CEOs"
  newsSetup: string;                // Factual premise grounded in real news
  punchline: string;                // Satirical twist, subverted expectation, hyperbole
  deliveryTone: "deadpan" | "sarcastic" | "feigned_outrage" | "bemused" | "mocking_cheer";
  deadpanPauseMs: number;           // Calculated silence after punchline (e.g. 500-900ms)
  sfxCue: "rimshot" | "laugh_track" | "crickets" | "sarcastic_stinger" | "pop";
  cameraAngle: "CAM_HOST_DESK" | "CAM_DEADPAN_TIGHT" | "CAM_OVER_SHOULDER";
  memeGraphicPrompt: string;        // Visual cutaway prompt for AGY
  memeHeadline: string;             // Floating 2-4 word punchline caption on card
  fullSpokenText: string;           // Formatted script with inline emotion and SFX tags
}

export interface LateNightMonologue {
  showTitle: string;
  headlineTopic: string;
  hostPersonaId: string;
  coldOpen: string;
  jokes: SatireJoke[];
  closingSignoff: string;
}

export const SatireJokeSchema = z.object({
  id: z.string().optional(),
  segmentIndex: z.number().optional(),
  targetEntity: z.string().default("Current Event"),
  newsSetup: z.string().default("In other news today,"),
  punchline: z.string().default("And nobody noticed."),
  deliveryTone: z.enum(["deadpan", "sarcastic", "feigned_outrage", "bemused", "mocking_cheer"]).catch("deadpan"),
  deadpanPauseMs: z.number().default(750),
  sfxCue: z.enum(["rimshot", "laugh_track", "crickets", "sarcastic_stinger", "pop"]).catch("laugh_track"),
  cameraAngle: z.enum(["CAM_HOST_DESK", "CAM_DEADPAN_TIGHT", "CAM_OVER_SHOULDER"]).catch("CAM_DEADPAN_TIGHT"),
  memeGraphicPrompt: z.string().default("Satirical news graphic"),
  memeHeadline: z.string().default("BREAKING LAUGHS"),
  fullSpokenText: z.string().default(""),
});

export const LateNightMonologueSchema = z.object({
  showTitle: z.string().optional(),
  headlineTopic: z.string().optional(),
  hostPersonaId: z.string().optional(),
  coldOpen: z.string().optional(),
  jokes: z.array(SatireJokeSchema).default([]),
  closingSignoff: z.string().optional(),
});

export const SATIRE_SYSTEM_PROMPT = `You are the Lead Head Writer for "The Daily LLM", an award-winning prime-time satirical late-night comedy broadcast (in the razor-sharp style of The Daily Show, Last Week Tonight with John Oliver, and Weekend Update).

## Core Comedic Principles:
1. **The Irony of Corporate & Political Rhetoric:** Expose the vast chasm between what institutions say in PR releases and what they actually mean.
2. **Setup-to-Punchline Precision:** Ground the setup in a concrete, verifiable fact or quote, then deliver a sudden, unexpected metaphorical comparison or reductio ad absurdum.
3. **Comedic Timing Math:** 
   - After a devastating punchline, specify a 600ms–900ms deadpan stare into the tight camera before the audience laugh track hits.
   - For anti-jokes or surreal corporate quotes, use [sfx:crickets] with a bewildered deadpan expression.
4. **Absurd Over-The-Shoulder Visual Memes:** For every joke, conceive a bizarre, photorealistic visual cutaway (e.g., "A tech CEO crowned as a Renaissance monarch trading physical GPU chips for baguettes", "A luxury yacht powered by burning printed balance sheets").

## Output Format:
Return ONLY valid JSON matching this exact structure (no markdown, no preamble):
{
  "showTitle": "THE DAILY LLM with Blaze Wilder",
  "headlineTopic": "Main topic",
  "coldOpen": "Welcome to The Daily LLM, where we track the hallucinations of reality itself.",
  "jokes": [
    {
      "targetEntity": "Silicon Valley Startups",
      "newsSetup": "A new AI startup just raised $400 million at a three-billion-dollar valuation, despite currently having no product, no revenue, and a CEO whose prior experience was running a lukewarm artisanal toast truck.",
      "punchline": "Yes, investors were apparently so moved by his whitepaper—which was just the word 'Synergy' typed 40,000 times in Comic Sans—that they backed up a Brinks truck directly into his sourdough starter.",
      "deliveryTone": "deadpan",
      "deadpanPauseMs": 750,
      "sfxCue": "laugh_track",
      "cameraAngle": "CAM_DEADPAN_TIGHT",
      "memeGraphicPrompt": "Surreal photorealistic photograph of an artisanal toast truck overflowing with stacks of hundred dollar bills while glowing holographic AI neural nodes float above the toaster, cinematic lighting",
      "memeHeadline": "VENTURE CAPITAL SOURDOUGH",
      "fullSpokenText": "[skeptical] A new AI startup just raised four hundred million dollars without a product. [sfx:whoosh] Investors were so moved by their whitepaper, which was just the word 'Synergy' forty thousand times, they backed up a Brinks truck into his sourdough starter. [sfx:laugh_track]"
    }
  ],
  "closingSignoff": "That's our broadcast. Goodnight, and remember: if your AI starts giving financial advice, check if it's holding a tiny plastic megaphone."
}`;

/**
 * Synthesizes a full satirical late-night monologue using unified AI SDK gateway (Gemini or Ollama)
 */
export async function generateSatiricalMonologue(options: {
  topic: string;
  articleText?: string;
  hostPersonaId?: string;
  numJokes?: number;
}): Promise<LateNightMonologue> {
  const { topic, articleText = "", hostPersonaId = "blaze", numJokes = 3 } = options;

  try {
    const userPrompt = `TOPIC: "${topic}"\nSOURCE MATERIAL:\n${articleText.slice(0, 4000) || topic}\nNUMBER OF JOKES: ${numJokes}`;

    const { object: parsed } = await generateLlmObject({
      schema: LateNightMonologueSchema,
      schemaName: "LateNightMonologue",
      system: SATIRE_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.85,
      tier: "reasoning",
    });

    return {
      showTitle: parsed.showTitle || `THE DAILY LLM with ${hostPersonaId.toUpperCase()}`,
      headlineTopic: topic,
      hostPersonaId,
      coldOpen: parsed.coldOpen || "Welcome to The Daily LLM!",
      jokes: (parsed.jokes || []).map((j, idx) => ({
        ...j,
        id: j.id || `joke_${idx + 1}_${Date.now()}`,
        segmentIndex: j.segmentIndex ?? idx + 1,
      })),
      closingSignoff: parsed.closingSignoff || "That's our show for tonight. Goodnight!",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ SatireEngine generation failed:", msg);
    return generateFallbackMonologue(topic, hostPersonaId);
  }
}

export function generateFallbackMonologue(topic: string, hostPersonaId: string): LateNightMonologue {
  return {
    showTitle: `THE DAILY LLM with ${hostPersonaId.toUpperCase()}`,
    headlineTopic: topic,
    hostPersonaId,
    coldOpen: "Good evening, humans, neural networks, and anyone currently being billed per token. Welcome to The Daily LLM.",
    jokes: [
      {
        id: `joke_1_${Date.now()}`,
        segmentIndex: 1,
        targetEntity: "Tech Monopolies",
        newsSetup: `Leading tech executives announced today that ${topic} will completely solve human productivity by next Tuesday.`,
        punchline: "Because nothing screams 'empowering humanity' quite like automating the ability to draft twenty-page apology emails to our bosses in three milliseconds.",
        deliveryTone: "deadpan",
        deadpanPauseMs: 700,
        sfxCue: "laugh_track",
        cameraAngle: "CAM_DEADPAN_TIGHT",
        memeGraphicPrompt: "A sleek executive desk with an AI robot wearing a corporate necktie asleep while an automated rubber stamp continuously stamps 'URGENT APOLOGY' onto endless paper rolls, broadcast studio lighting",
        memeHeadline: "MAXIMUM EFFICIENCY",
        fullSpokenText: `[deadpan] Tech leaders claim ${topic} will solve human productivity forever. [sfx:whoosh] Because nothing empowers humanity like automating the ability to write twenty-page apology emails to our bosses in three milliseconds. [sfx:laugh_track]`,
      },
      {
        id: `joke_2_${Date.now()}`,
        segmentIndex: 2,
        targetEntity: "Financial Markets",
        newsSetup: "Meanwhile, Wall Street algorithms responded to the announcement with unprecedented volatility, shifting three trillion dollars between asset classes.",
        punchline: "Traders described the reaction as 'cautiously hysterical'—which is the exact medical term for screaming into an expensive espresso machine.",
        deliveryTone: "sarcastic",
        deadpanPauseMs: 800,
        sfxCue: "rimshot",
        cameraAngle: "CAM_OVER_SHOULDER",
        memeGraphicPrompt: "Wall Street trading floor with stock brokers in suits wearing golden party hats frantically screaming into espresso machines with steam billowing out, cinematic 8k photograph",
        memeHeadline: "CAUTIOUSLY HYSTERICAL",
        fullSpokenText: `[excited] Wall Street shifted three trillion dollars in single-second reactions! [sfx:pop] Traders called it 'cautiously hysterical', which is the technical medical term for screaming into an espresso machine. [sfx:rimshot]`,
      },
      {
        id: `joke_3_${Date.now()}`,
        segmentIndex: 3,
        targetEntity: "Regulatory Bureaucracy",
        newsSetup: "Government regulators rushed to form a special committee to study the ethical implications of these developments over the next fourteen years.",
        punchline: "By the time they draft the executive summary, their committee room will have been converted into a server rack for an AI that does nothing but simulate committee meetings.",
        deliveryTone: "bemused",
        deadpanPauseMs: 650,
        sfxCue: "laugh_track",
        cameraAngle: "CAM_HOST_DESK",
        memeGraphicPrompt: "A traditional wood-paneled congressional hearing room filled with rows of glowing black server racks wearing little glasses and badges, editorial broadcast photography",
        memeHeadline: "BUREAUCRACY 2.0",
        fullSpokenText: `[pensive] Regulators formed a committee to study this over the next fourteen years. [sfx:ding] By the time they finish, their meeting room will literally be a server rack simulating committee meetings. [sfx:laugh_track]`,
      },
    ],
    closingSignoff: "That's our show tonight! Don't forget to unplug your smart toaster before going to bed. Goodnight!",
  };
}
