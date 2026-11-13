/**
 * NewsStudio Broadcast Script Emotion & Tone Shifter
 * Rewrites news scripts into distinct journalistic tones with matching TTS delivery parameters.
 */

export type BroadcastToneId = "breaking" | "investigative" | "morning" | "latenight" | "viral_hook";

export interface ToneShiftResult {
  rewrittenText: string;
  speedFactor: number;
  pitchShift: number;
  instructText: string;
  toneLabel: string;
  icon: string;
}

export function shiftScriptTone(
  text: string,
  tone: BroadcastToneId,
  language = "es"
): ToneShiftResult {
  const isEs = language.startsWith("es");

  switch (tone) {
    case "breaking":
      return {
        rewrittenText: isEs
          ? `¡Atención! Noticia de último momento: ${text.replace(/^Buenas noches\.\s*/i, "")}`
          : `Breaking News Alert! In our top developing story right now: ${text.replace(/^Good evening\.\s*/i, "")}`,
        speedFactor: 1.15,
        pitchShift: 1.0,
        instructText: "urgent, authoritative breaking news delivery, high energy, crisp enunciation",
        toneLabel: "🚨 Breaking News Alert",
        icon: "🚨",
      };

    case "investigative":
      return {
        rewrittenText: isEs
          ? `Informe Especial de Investigación. Analizamos en profundidad los hechos: ${text}`
          : `Special Investigative Report. Examining the facts behind the headlines: ${text}`,
        speedFactor: 0.90,
        pitchShift: -1.0,
        instructText: "solemn, measured investigative cadence, serious tone, deep breathing pauses",
        toneLabel: "🕵️ Investigative Deep-Dive",
        icon: "🕵️",
      };

    case "morning":
      return {
        rewrittenText: isEs
          ? `¡Muy buenos días a todos! Comenzamos la mañana con las noticias más destacadas: ${text}`
          : `Good morning everyone! Starting your day with the most important updates: ${text}`,
        speedFactor: 1.05,
        pitchShift: 0.5,
        instructText: "warm, friendly morning show cadence, conversational, smiling vocal tone",
        toneLabel: "☕ Morning Banter & Casual",
        icon: "☕",
      };

    case "latenight":
      return {
        rewrittenText: isEs
          ? `En esta edición nocturna de cierre, repasamos los acontecimientos de la jornada: ${text}`
          : `In tonight's late edition wrap-up, reflecting on today's defining events: ${text}`,
        speedFactor: 0.85,
        pitchShift: -1.5,
        instructText: "atmospheric, deep late-night radio presence, slow cadence, resonant chest tone",
        toneLabel: "🌙 Late-Night Moody",
        icon: "🌙",
      };

    case "viral_hook":
      return {
        rewrittenText: isEs
          ? `¿Te enteraste de lo que acaba de pasar? ${text} ¡Seguinos para más detalles!`
          : `Did you see what just happened? ${text} Follow for hourly updates!`,
        speedFactor: 1.20,
        pitchShift: 1.5,
        instructText: "fast energetic social media hook, enthusiastic, captivating first 3 seconds",
        toneLabel: "⚡ Viral Social Media Hook",
        icon: "⚡",
      };

    default:
      return {
        rewrittenText: text,
        speedFactor: 1.0,
        pitchShift: 0.0,
        instructText: "neutral broadcast journalism",
        toneLabel: "🎙️ Standard Broadcast",
        icon: "🎙️",
      };
  }
}
