/**
 * Voice settings for Ruby.
 * Using a local TTS engine (e.g., Fish Speech or Kokoro).
 */

export const VOICE_SETTINGS = {
  provider: "local",
  // A consistent seed or model path ensures the exact same voice characteristics every time.
  modelId: "ruby_v1_base", 
  seed: 42,
  
  // Mapping the LLM's logical emotions to actual SSML or prompt tags
  emotionTags: {
    neutral: "",
    excited: "<pro>excited</pro>", // Replace with actual TTS engine specific tag
    serious: "<pro>serious</pro>",
    urgent: "<pro>urgent</pro>",
  }
};
