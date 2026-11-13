/**
 * Pipeline Worker Credit Pricing Constants
 * Adjust these values to tune the cost per second of generated content.
 */

export const PRICING = {
  /** Credits per second of generated TTS audio */
  COST_PER_TTS_SEC: 0.1,
  
  /** Credits per second of generated avatar/lip-sync video */
  COST_PER_VIDEO_SEC: 1.0,
  
  /** Credits per second of final rendered video */
  COST_PER_RENDER_SEC: 0.5,
};
