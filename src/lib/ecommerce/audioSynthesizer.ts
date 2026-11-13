/**
 * src/lib/ecommerce/audioSynthesizer.ts
 *
 * Commercial Audio & Voiceover Synthesis Helper for Ruby E-Commerce Studio.
 * Handles voiceover script assembly, duration estimation, commercial voice personas,
 * and curated royalty-free marketing music tracks.
 */

import { AdScene } from "@/lib/types/ecommerce";

export interface CommercialVoicePersona {
  id: string;
  name: string;
  gender: "female" | "male";
  archetype: string;
  description: string;
  recommendedSpeed: number;
  badge: string;
}

export const COMMERCIAL_VOICE_PERSONAS: CommercialVoicePersona[] = [
  {
    id: "ruby",
    name: "Ruby",
    gender: "female",
    archetype: "Flagship Broadcaster",
    description: "NewsStudio flagship anchor with world-class presence. Outstanding for global brand launches and marquee campaigns.",
    recommendedSpeed: 1.0,
    badge: "Flagship Lead",
  },
  {
    id: "sofia",
    name: "Sofia",
    gender: "female",
    archetype: "Commercial Authority",
    description: "Clear, crisp, highly articulate commercial broadcaster tone. Best for luxury, furniture, and premium surfaces.",
    recommendedSpeed: 1.0,
    badge: "Top Authority",
  },
  {
    id: "camila",
    name: "Camila (Elena)",
    gender: "female",
    archetype: "UGC Creator",
    description: "Warm, authentic, conversational friend next door. Ideal for TikTok Shop, skincare, apparel, and unboxing reviews.",
    recommendedSpeed: 1.05,
    badge: "High Viral CTR",
  },
  {
    id: "mateo",
    name: "Mateo (Bryce)",
    gender: "male",
    archetype: "Tech & Precision",
    description: "Deep, resonant, authoritative baritone. Perfect for electronics, gadgets, automotive, and durability specs.",
    recommendedSpeed: 0.98,
    badge: "High Trust",
  },
  {
    id: "diego",
    name: "Diego (Ryan)",
    gender: "male",
    archetype: "Hype & Flash Deals",
    description: "Brisk, dynamic, high-energy pace with punchy cadence. Built for flash sales, discount scarcity, and urgency hooks.",
    recommendedSpeed: 1.12,
    badge: "Flash Sale",
  },
  {
    id: "blaze",
    name: "Blaze",
    gender: "male",
    archetype: "Senior Anchor",
    description: "Direct, confident, investigative presence. Exceptional for problem/solution ads and comparison reviews.",
    recommendedSpeed: 1.0,
    badge: "Senior Anchor",
  },
  {
    id: "isabel",
    name: "Isabel",
    gender: "female",
    archetype: "Tech Correspondent",
    description: "Sharp, energetic tech specialist. Perfect for SaaS walkthroughs, product unboxings, and hardware teardowns.",
    recommendedSpeed: 1.02,
    badge: "Specialist",
  },
  {
    id: "austin",
    name: "Austin",
    gender: "male",
    archetype: "Rugged & Direct",
    description: "Grounded, authentic working professional tone. Best for tools, home improvement, and outdoor equipment.",
    recommendedSpeed: 0.95,
    badge: "Durability",
  },
];

export interface CommercialMusicTrack {
  id: string;
  name: string;
  mood: string;
  bpm: number;
  audioUrl: string;
  description: string;
}

export const COMMERCIAL_MUSIC_TRACKS: CommercialMusicTrack[] = [
  {
    id: "energetic_upbeat",
    name: "Energetic Upbeat",
    mood: "UGC Hype & Dynamic",
    bpm: 124,
    audioUrl: "/music/energetic_upbeat.mp3",
    description: "Punchy percussion with modern pop synth swells. Drives high engagement on TikTok & Instagram Reels.",
  },
  {
    id: "chill_luxury",
    name: "Chill Luxury",
    mood: "Minimalist & Aesthetic",
    bpm: 98,
    audioUrl: "/music/chill_luxury.mp3",
    description: "Warm acoustic plucks with subtle lo-fi vinyl beats. Ideal for home decor, hardwood flooring, and beauty.",
  },
  {
    id: "tech_modern",
    name: "Modern Electronic",
    mood: "Futuristic & Clean",
    bpm: 118,
    audioUrl: "/music/tech_modern.mp3",
    description: "Deep bassline with crisp digital arpeggios. Highlights engineering precision, gadgets, and software.",
  },
  {
    id: "inspiring_corporate",
    name: "Inspiring Growth",
    mood: "Corporate & Trust",
    bpm: 105,
    audioUrl: "/music/inspiring_corporate.mp3",
    description: "Uplifting piano melody and steady kick. Best for service providers, warranties, and commercial B2B.",
  },
];

/**
 * Concatenates scene voiceover scripts into a unified speech prompt.
 * Inserts breathing pauses between scenes to avoid unnatural machine run-ons.
 */
export function assembleVoiceoverPrompt(scenes: AdScene[]): string {
  if (!scenes || scenes.length === 0) return "";

  const sceneScripts = scenes
    .map((s) => s.voiceoverScript?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));

  if (sceneScripts.length === 0) return "";

  // Join scenes with a cadence pause (em-dash or ellipsis) for natural neural prosody
  return sceneScripts.join(" ... ");
}

/**
 * Estimates voiceover speech duration in seconds given text and words per minute (WPM).
 * Automatically ignores inline emotion tags like [emotion:urgent] and [sfx:whoosh].
 */
export function estimateVoiceoverDuration(text: string, wpm = 145): number {
  if (!text || !text.trim()) return 0;

  // Strip [emotion:...] and [sfx:...] tags from word count calculation
  const cleanText = text
    .replace(/\[emotion:[a-z0-9_-]+\]/gi, "")
    .replace(/\[sfx:[a-z0-9_-]+\]/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return 0;

  const words = cleanText.split(" ").filter((w) => w.length > 0);
  const durationSeconds = (words.length / wpm) * 60;

  return Math.round(durationSeconds * 10) / 10;
}
