/**
 * src/lib/animation/inlineAnimationParser.ts
 *
 * Real-time Inline Script Animation Tag Parser.
 * Detects on-the-fly animation tags in teleprompter scripts and calculates
 * exact word-level frame offsets for 60fps/30fps Remotion rendering.
 *
 * Supported Tags:
 * 1. [stat: +84% | "Market Share" | color=emerald]
 * 2. [counter: 98400 | prefix=$ | suffix=USD | dur=1.5s]
 * 3. [entity: "Jensen Huang" | "CEO, NVIDIA" | icon=🟢]
 * 4. [alert: "FLASH CRASH" | red]
 * 5. [badge: "VERIFIED SOURCE" | cyan]
 * 6. [fx: fire | money | rocket | confetti | scan]
 */

export type AnimationType = "stat" | "counter" | "entity" | "alert" | "badge" | "fx";

export interface StatAnimationData {
  type: "stat";
  value: string;         // e.g. "+84%", "-12.5%", "138.50"
  label?: string;        // e.g. "Market Share", "YoY Growth"
  color?: string;        // e.g. "emerald", "red", "cyan", "amber", "purple"
  isPositive?: boolean;
}

export interface CounterAnimationData {
  type: "counter";
  targetValue: number;   // e.g. 98400, 138.5
  prefix?: string;       // e.g. "$", "€"
  suffix?: string;       // e.g. "B", "%", "pts"
  durationSeconds?: number; // default: 1.5s
  label?: string;
  color?: string;
}

export interface EntityAnimationData {
  type: "entity";
  name: string;          // e.g. "Jensen Huang"
  role?: string;         // e.g. "CEO, NVIDIA"
  icon?: string;         // e.g. "🟢", "💼", "🏛️"
  avatarUrl?: string;
  color?: string;
}

export interface AlertAnimationData {
  type: "alert";
  title: string;         // e.g. "BREAKING NEWS", "MARKET ALERT"
  subtitle?: string;
  severity?: "breaking" | "warning" | "info" | "urgent";
  color?: string;        // default: "#ef4444"
}

export interface BadgeAnimationData {
  type: "badge";
  text: string;          // e.g. "VERIFIED SOURCE", "EXCLUSIVITY"
  color?: string;        // default: "#06b6d4"
  icon?: string;         // default: "✓"
}

export interface FxAnimationData {
  type: "fx";
  effect: "fire" | "money" | "rocket" | "confetti" | "cyber_scan" | "glitch";
  intensity?: "low" | "medium" | "high";
  durationSeconds?: number;
}

export type AnimationData =
  | StatAnimationData
  | CounterAnimationData
  | EntityAnimationData
  | AlertAnimationData
  | BadgeAnimationData
  | FxAnimationData;

export interface AnimationCue {
  id: string;
  type: AnimationType;
  startFrame: number;
  durationFrames: number;
  wordIndex: number;
  data: AnimationData;
}

export interface InlineAnimationParseResult {
  rawText: string;
  cleanText: string;
  cues: AnimationCue[];
  totalEstimatedDurationSeconds: number;
}

export interface InlineAnimationParserOptions {
  wpm?: number;          // Words per minute (default: 150)
  fps?: number;          // Frames per second (default: 30)
  speedFactor?: number;  // Presenter speed multiplier (default: 1.0)
}

/**
 * Strips all inline animation tags from script text so TTS engines never speak them.
 */
export function stripAnimationTags(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove [stat:...], [counter:...], [entity:...], [alert:...], [badge:...], [fx:...]
  cleaned = cleaned.replace(/\[(stat|counter|entity|alert|badge|fx):\s*[^\]]+\]/gi, " ");

  // 2. Clean extra whitespace
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1");
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Parses inline animation tags from script text and calculates exact frame timing.
 */
export function parseInlineAnimationTags(
  text: string,
  options: InlineAnimationParserOptions = {}
): InlineAnimationParseResult {
  if (!text || typeof text !== "string") {
    return {
      rawText: "",
      cleanText: "",
      cues: [],
      totalEstimatedDurationSeconds: 0,
    };
  }

  const wpm = options.wpm || 150;
  const fps = options.fps || 30;
  const speedFactor = options.speedFactor || 1.0;
  const effectiveWps = (wpm / 60) * speedFactor;

  // Match [stat:...], [counter:...], [entity:...], [alert:...], [badge:...], [fx:...]
  const tagRegex = /\[(stat|counter|entity|alert|badge|fx):\s*([^\]]+)\]/gi;

  const rawText = text;
  const cues: AnimationCue[] = [];

  let cleanTextAccumulator = "";
  let lastIndex = 0;
  let runningWordsBeforeTag = 0;
  let cueCounter = 0;

  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawText)) !== null) {
    const preTagText = rawText.slice(lastIndex, match.index);
    cleanTextAccumulator += preTagText;

    // Count words leading up to this tag
    const preWords = preTagText.trim().split(/\s+/).filter(Boolean);
    runningWordsBeforeTag += preWords.length;

    const tagType = match[1].toLowerCase() as AnimationType;
    const tagContent = match[2].trim();

    const cueData = parseTagContent(tagType, tagContent);

    if (cueData) {
      cueCounter++;
      // Time in seconds from start based on spoken word position
      const timeSeconds = runningWordsBeforeTag / effectiveWps;
      const startFrame = Math.round(timeSeconds * fps);
      const durSec =
        "durationSeconds" in cueData && typeof cueData.durationSeconds === "number"
          ? cueData.durationSeconds
          : 3.5;
      const durationFrames = Math.round(durSec * fps);

      cues.push({
        id: `anim_cue_${cueCounter}_${tagType}`,
        type: tagType,
        startFrame,
        durationFrames,
        wordIndex: runningWordsBeforeTag,
        data: cueData,
      });
    }

    lastIndex = tagRegex.lastIndex;
  }

  cleanTextAccumulator += rawText.slice(lastIndex);
  const cleanText = cleanTextAccumulator.replace(/\s+/g, " ").trim();

  const totalWords = cleanText.split(/\s+/).filter(Boolean).length;
  const totalEstimatedDurationSeconds = totalWords / effectiveWps;

  return {
    rawText,
    cleanText,
    cues,
    totalEstimatedDurationSeconds,
  };
}

function splitTagParameters(content: string): string[] {
  if (content.includes("|")) {
    return content.split("|").map((p) => p.trim().replace(/^["']|["']$/g, ""));
  }
  const matches = content.match(/(?:[^\s,"]+|"[^"]*"|'[^']*')+/g) || [];
  return matches.map((p) => p.trim().replace(/^["']|["']$/g, ""));
}

/**
 * Parses the raw inner parameters of an animation tag.
 */
function parseTagContent(type: AnimationType, content: string): AnimationData | null {
  const parts = splitTagParameters(content);

  switch (type) {
    case "stat": {
      // e.g. "+84% | 'Market Share' | emerald"
      const value = parts[0] || "+0.0%";
      const label = parts[1] || undefined;
      const color = parts[2]?.replace(/^color=/, "") || (value.startsWith("-") ? "red" : "emerald");
      const isPositive = !value.startsWith("-");
      return {
        type: "stat",
        value,
        label,
        color,
        isPositive,
      };
    }

    case "counter": {
      // e.g. "98400 | prefix=$ | suffix=B | dur=1.5s"
      const targetValue = parseFloat(parts[0].replace(/[^0-9.-]/g, "")) || 100;
      let prefix: string | undefined;
      let suffix: string | undefined;
      let durationSeconds = 1.5;
      let label: string | undefined;

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith("prefix=")) prefix = p.replace("prefix=", "");
        else if (p.startsWith("suffix=")) suffix = p.replace("suffix=", "");
        else if (p.startsWith("dur=")) durationSeconds = parseFloat(p.replace("dur=", "").replace("s", "")) || 1.5;
        else if (!label) label = p;
      }

      return {
        type: "counter",
        targetValue,
        prefix,
        suffix,
        durationSeconds,
        label,
      };
    }

    case "entity": {
      // e.g. "'Jensen Huang' | 'CEO, NVIDIA' | icon=🟢"
      const name = parts[0] || "Featured Entity";
      const role = parts[1] || undefined;
      let icon = "🟢";
      let color: string | undefined;

      for (let i = 2; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith("icon=")) icon = p.replace("icon=", "");
        else if (p.startsWith("color=")) color = p.replace("color=", "");
      }

      return {
        type: "entity",
        name,
        role,
        icon,
        color,
      };
    }

    case "alert": {
      // e.g. "'FLASH CRASH' | red"
      const title = parts[0] || "BREAKING ALERT";
      const subtitle = parts[1] || undefined;
      const color = parts[2] || "#ef4444";
      return {
        type: "alert",
        title,
        subtitle,
        severity: "breaking",
        color,
      };
    }

    case "badge": {
      // e.g. "'VERIFIED SOURCE' | cyan"
      const text = parts[0] || "VERIFIED";
      const color = parts[1] || "#06b6d4";
      const icon = parts[2] || "✓";
      return {
        type: "badge",
        text,
        color,
        icon,
      };
    }

    case "fx": {
      // e.g. "fire", "money", "rocket", "confetti"
      const rawEffect = (parts[0] || "fire").toLowerCase().trim();
      const validEffects = ["fire", "money", "rocket", "confetti", "cyber_scan", "glitch"] as const;
      const effect = validEffects.find((e) => e === rawEffect) || "fire";
      return {
        type: "fx",
        effect,
        intensity: "high",
        durationSeconds: 2.5,
      };
    }

    default:
      return null;
  }
}
