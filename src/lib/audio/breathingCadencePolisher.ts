/**
 * NewsStudio Procedural Breathing & Cadence Polisher
 * Analyzes news scripts and injects natural human breathing pauses, cadence punctuation, and rhythm breaks.
 */

export interface BreathingPolishResult {
  formattedText: string;
  breathsAdded: number;
  pausesAdded: number;
}

export function polishBreathingAndCadence(
  text: string,
  options: { language?: string; aggressive?: boolean } = {}
): BreathingPolishResult {
  if (!text || text.trim().length === 0) {
    return { formattedText: "", breathsAdded: 0, pausesAdded: 0 };
  }

  const { language = "es" } = options;
  let result = text.trim();
  let breathsAdded = 0;
  let pausesAdded = 0;

  // 1. Natural transition words rhythm breaks (Spanish & English)
  const transitionsEs = [
    "Mientras tanto",
    "Por otra parte",
    "En otro orden de cosas",
    "Asimismo",
    "Sin embargo",
    "Por último",
    "En las últimas horas",
    "De acuerdo con",
  ];

  const transitionsEn = [
    "Meanwhile",
    "In other developments",
    "Furthermore",
    "However",
    "In the latest updates",
    "According to",
    "Turning to international markets",
  ];

  const transitions = language.startsWith("es") ? transitionsEs : transitionsEn;

  for (const trans of transitions) {
    const regex = new RegExp(`(?<=[.!?])\\s+(${trans})`, "gi");
    if (regex.test(result)) {
      result = result.replace(regex, (match, p1) => {
        breathsAdded++;
        return ` ... ${p1}`;
      });
    }
  }

  // 2. Break up very long sentences with em-dash dramatic breathing pauses
  const sentences = result.split(/(?<=[.!?])\s+/);
  const polishedSentences = sentences.map((sentence) => {
    const words = sentence.split(/\s+/);
    if (words.length > 22 && !sentence.includes("—") && !sentence.includes("...")) {
      const midpoint = Math.floor(words.length / 2);
      const commaIdx = words.findIndex((w, idx) => idx > midpoint - 4 && idx < midpoint + 4 && w.endsWith(","));
      if (commaIdx !== -1) {
        words[commaIdx] = words[commaIdx].replace(",", " — ");
        pausesAdded++;
      } else {
        words.splice(midpoint, 0, "—");
        pausesAdded++;
      }
      return words.join(" ");
    }
    return sentence;
  });

  result = polishedSentences.join(" ");
  result = result.replace(/\.{4,}/g, "...").replace(/\s{2,}/g, " ").trim();

  return {
    formattedText: result,
    breathsAdded,
    pausesAdded,
  };
}
