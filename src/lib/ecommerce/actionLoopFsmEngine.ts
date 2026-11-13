/**
 * src/lib/ecommerce/actionLoopFsmEngine.ts
 *
 * Full-Mesh Finite State Machine (FSM) Action Loop Engine for Ruby Burgundy (37-Clip Suite).
 * Supports randomized starting clip selection, 75%/25% Markov transitions, anti-fatigue decay,
 * and continuous multi-clip slicing across commercial scenes.
 */

export type ActionLoopPose = "M1" | "M2" | "M3" | "M4" | "M5";

export interface ActionLoopClipMeta {
  id: string;
  type: "loop" | "dynamic_loop" | "transition";
  startPose: ActionLoopPose;
  endPose: ActionLoopPose;
  file: string;
  totalFrames: number;
  durationSec: number;
  fps: number;
}

export interface ChainedLoopClip {
  clipId: string;
  type: "loop" | "dynamic_loop" | "transition";
  startPose: string;
  endPose: string;
  durationFrames: number;
  videoUrl: string;
  globalStartFrame: number;
  globalEndFrame: number;
  label: string;
}

export interface SceneClipSlice {
  clipId: string;
  videoUrl: string;
  localStartFrame: number;
  sliceDurationFrames: number;
  audioStartFrame: number;
  audioDurationFrames: number;
}

/**
 * Full verified catalog of all 37 clips in public/assets/action_loops/veo/ruby_burgundy/
 */
export const RUBY_BURGUNDY_37_CLIPS: ActionLoopClipMeta[] = [
  // 1. Core Loops (M_i -> M_i, v1 & v2)
  { id: "M1_loop_v1", type: "loop", startPose: "M1", endPose: "M1", file: "ruby_burgundy_M1_loop_v1.mp4", totalFrames: 185, durationSec: 7.71, fps: 24 },
  { id: "M1_loop_v2", type: "loop", startPose: "M1", endPose: "M1", file: "ruby_burgundy_M1_loop_v2.mp4", totalFrames: 185, durationSec: 7.71, fps: 24 },
  { id: "M2_loop_v1", type: "loop", startPose: "M2", endPose: "M2", file: "ruby_burgundy_M2_loop_v1.mp4", totalFrames: 185, durationSec: 7.71, fps: 24 },
  { id: "M2_loop_v2", type: "loop", startPose: "M2", endPose: "M2", file: "ruby_burgundy_M2_loop_v2.mp4", totalFrames: 185, durationSec: 7.71, fps: 24 },
  { id: "M3_loop_v1", type: "loop", startPose: "M3", endPose: "M3", file: "ruby_burgundy_M3_loop_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M3_loop_v2", type: "loop", startPose: "M3", endPose: "M3", file: "ruby_burgundy_M3_loop_v2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M4_loop_v1", type: "loop", startPose: "M4", endPose: "M4", file: "ruby_burgundy_M4_loop_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M4_loop_v2", type: "loop", startPose: "M4", endPose: "M4", file: "ruby_burgundy_M4_loop_v2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M5_loop_v1", type: "loop", startPose: "M5", endPose: "M5", file: "ruby_burgundy_M5_loop_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M5_loop_v2", type: "loop", startPose: "M5", endPose: "M5", file: "ruby_burgundy_M5_loop_v2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  // 2. Dynamic Explanatory Loops (M_i -> M_i)
  { id: "M1_dynamic_v1", type: "dynamic_loop", startPose: "M1", endPose: "M1", file: "ruby_burgundy_M1_dynamic_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M2_dynamic_v1", type: "dynamic_loop", startPose: "M2", endPose: "M2", file: "ruby_burgundy_M2_dynamic_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M3_dynamic_v1", type: "dynamic_loop", startPose: "M3", endPose: "M3", file: "ruby_burgundy_M3_dynamic_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M4_dynamic_v1", type: "dynamic_loop", startPose: "M4", endPose: "M4", file: "ruby_burgundy_M4_dynamic_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M5_dynamic_v1", type: "dynamic_loop", startPose: "M5", endPose: "M5", file: "ruby_burgundy_M5_dynamic_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  // 3. Hair Adjust Dynamic Loops (M_i -> M_i)
  { id: "M1_hair_adjust_v1", type: "dynamic_loop", startPose: "M1", endPose: "M1", file: "ruby_burgundy_M1_hair_adjust_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "M4_hair_adjust_v1", type: "dynamic_loop", startPose: "M4", endPose: "M4", file: "ruby_burgundy_M4_hair_adjust_v1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  // 4. Full-Mesh FLF Transitions (M_i -> M_j, 20 total)
  { id: "T1_to_2", type: "transition", startPose: "M1", endPose: "M2", file: "ruby_burgundy_T1_to_2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T1_to_3", type: "transition", startPose: "M1", endPose: "M3", file: "ruby_burgundy_T1_to_3.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T1_to_4", type: "transition", startPose: "M1", endPose: "M4", file: "ruby_burgundy_T1_to_4.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T1_to_5", type: "transition", startPose: "M1", endPose: "M5", file: "ruby_burgundy_T1_to_5.mp4", totalFrames: 184, durationSec: 7.67, fps: 24 },

  { id: "T2_to_1", type: "transition", startPose: "M2", endPose: "M1", file: "ruby_burgundy_T2_to_1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T2_to_3", type: "transition", startPose: "M2", endPose: "M3", file: "ruby_burgundy_T2_to_3.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T2_to_4", type: "transition", startPose: "M2", endPose: "M4", file: "ruby_burgundy_T2_to_4.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T2_to_5", type: "transition", startPose: "M2", endPose: "M5", file: "ruby_burgundy_T2_to_5.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  { id: "T3_to_1", type: "transition", startPose: "M3", endPose: "M1", file: "ruby_burgundy_T3_to_1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T3_to_2", type: "transition", startPose: "M3", endPose: "M2", file: "ruby_burgundy_T3_to_2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T3_to_4", type: "transition", startPose: "M3", endPose: "M4", file: "ruby_burgundy_T3_to_4.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T3_to_5", type: "transition", startPose: "M3", endPose: "M5", file: "ruby_burgundy_T3_to_5.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  { id: "T4_to_1", type: "transition", startPose: "M4", endPose: "M1", file: "ruby_burgundy_T4_to_1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T4_to_2", type: "transition", startPose: "M4", endPose: "M2", file: "ruby_burgundy_T4_to_2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T4_to_3", type: "transition", startPose: "M4", endPose: "M3", file: "ruby_burgundy_T4_to_3.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T4_to_5", type: "transition", startPose: "M4", endPose: "M5", file: "ruby_burgundy_T4_to_5.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },

  { id: "T5_to_1", type: "transition", startPose: "M5", endPose: "M1", file: "ruby_burgundy_T5_to_1.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T5_to_2", type: "transition", startPose: "M5", endPose: "M2", file: "ruby_burgundy_T5_to_2.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T5_to_3", type: "transition", startPose: "M5", endPose: "M3", file: "ruby_burgundy_T5_to_3.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
  { id: "T5_to_4", type: "transition", startPose: "M5", endPose: "M4", file: "ruby_burgundy_T5_to_4.mp4", totalFrames: 192, durationSec: 8.0, fps: 24 },
];

/**
 * Normalizes pose string into "M1".."M5" format.
 */
export function normalizePoseCode(poseStr?: string): "M1" | "M2" | "M3" | "M4" | "M5" {
  if (!poseStr) return "M1";
  const p = poseStr.toUpperCase();
  if (p.includes("M5") || p.includes("P05")) return "M5";
  if (p.includes("M4") || p.includes("P04")) return "M4";
  if (p.includes("M3") || p.includes("P03")) return "M3";
  if (p.includes("M2") || p.includes("P02")) return "M2";
  return "M1";
}

/**
 * Finds a clip meta by ID (case-insensitive, handles ruby_burgundy prefix).
 */
export const PERSONA_VEO_DIR_MAP: Record<string, string> = {
  abigail: "abigail_marigold_tailored_blazer",
  adrian: "adrian_obsidian_executive_suit",
  aris: "aris_navy_tech_blazer",
  atlas: "atlas_crimson_anchor_suit",
  austin: "austin_charcoal_tech_bomber",
  blaze: "blaze_silver_blazer",
  camila: "camila_emerald_crepe_blazer",
  claire: "claire_midnight_trench_dress",
  connor: "connor_white_oxford_dress_shirt",
  diego: "diego_navy_tailored_blazer",
  eli: "eli_slate_oxford_dress_shirt",
  everett: "everett_vintage_donegal_tweed",
  facundo: "facundo_black_crimson_track_jacket",
  fede: "fede_slate_casual_blazer",
  hawk: "hawk_graphite_pinstripe_suit",
  ian: "ian_olive_tactical_blazer",
  isabel: "isabel_emerald_satin_blazer",
  jade: "jade_cream_cashmere_blazer",
  jeremiah: "jeremiah_charcoal_wool_vest",
  kai: "kai_cyber_matte_kimono_blazer",
  layla: "layla_ivory_crepe_powersuit",
  luca: "luca_espresso_moto_jacket",
  lucia: "lucia_terracotta_linen_blazer",
  luna: "luna_plum_velvet_tuxedo",
  marcos: "marcos_slate_pinstripe_vest",
  marina: "marina_cerulean_silk_blouse",
  mateo: "mateo_default_trait",
  miles: "miles_graphite_minimalist_overshirt",
  ruby: "ruby_burgundy",
  sofia: "sofia_sapphire_asymmetric_blazer",
  storm: "storm_storm_field_jacket",
  taylor: "taylor_forest_green_powersuit",
  valentina: "valentina_sapphire_peplum_suit",
  victoria: "victoria_plum_sculpted_blazer",
  volt: "volt_tactical_track_jacket",
};

export function resolvePersonaVeoPrefix(personaId: string = "ruby"): string {
  const norm = personaId.toLowerCase().trim();
  for (const [key, dir] of Object.entries(PERSONA_VEO_DIR_MAP)) {
    if (norm === key || norm.startsWith(key) || norm.includes(key)) {
      return dir;
    }
  }
  return "ruby_burgundy";
}

/**
 * Resolves the 37-clip catalog for a given persona.
 */
export const PERSONAS_WITH_TRANSITIONS = new Set([
  "ruby",
  "mateo",
  "connor",
  "eli",
  "blaze",
]);

/**
 * Resolves the action loop catalog for a given persona.
 * Personas with full 37-clip suites (Ruby, Mateo, Blaze, Connor, Eli) include transitions and dynamics.
 * All other personas (Hawk, Victoria, Diego, etc.) strictly use their verified 10 core loops.
 */
export function getPersona37Clips(personaId: string = "ruby"): ActionLoopClipMeta[] {
  const norm = personaId.toLowerCase().trim();
  const prefix = resolvePersonaVeoPrefix(personaId);
  const isMateo = norm.includes("mateo");
  const hasTransitions = Array.from(PERSONAS_WITH_TRANSITIONS).some((p) => norm.includes(p));

  const coreLoops: ActionLoopClipMeta[] = [
    // 1. Core Loops (10)
    { id: "M1_loop_v1", type: "loop", startPose: "M1", endPose: "M1", file: `${prefix}_M1_loop_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M1_loop_v2", type: "loop", startPose: "M1", endPose: "M1", file: `${prefix}_M1_loop_v2.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M2_loop_v1", type: "loop", startPose: "M2", endPose: "M2", file: `${prefix}_M2_loop_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M2_loop_v2", type: "loop", startPose: "M2", endPose: "M2", file: `${prefix}_M2_loop_v2.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M3_loop_v1", type: "loop", startPose: "M3", endPose: "M3", file: `${prefix}_M3_loop_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M3_loop_v2", type: "loop", startPose: "M3", endPose: "M3", file: `${prefix}_M3_loop_v2.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M4_loop_v1", type: "loop", startPose: "M4", endPose: "M4", file: `${prefix}_M4_loop_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M4_loop_v2", type: "loop", startPose: "M4", endPose: "M4", file: `${prefix}_M4_loop_v2.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M5_loop_v1", type: "loop", startPose: "M5", endPose: "M5", file: `${prefix}_M5_loop_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M5_loop_v2", type: "loop", startPose: "M5", endPose: "M5", file: `${prefix}_M5_loop_v2.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
  ];

  if (!hasTransitions) {
    return coreLoops;
  }

  return [
    ...coreLoops,
    // 2. Dynamic Loops (5)
    { id: "M1_dynamic_v1", type: "dynamic_loop", startPose: "M1", endPose: "M1", file: `${prefix}_M1_dynamic_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M2_dynamic_v1", type: "dynamic_loop", startPose: "M2", endPose: "M2", file: `${prefix}_M2_dynamic_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M3_dynamic_v1", type: "dynamic_loop", startPose: "M3", endPose: "M3", file: `${prefix}_M3_dynamic_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M4_dynamic_v1", type: "dynamic_loop", startPose: "M4", endPose: "M4", file: `${prefix}_M4_dynamic_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
    { id: "M5_dynamic_v1", type: "dynamic_loop", startPose: "M5", endPose: "M5", file: `${prefix}_M5_dynamic_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },

    // 3. Micro-Adjustments (2)
    ...(isMateo
      ? [
          { id: "M1_tie_adjust_v1", type: "dynamic_loop" as const, startPose: "M1" as const, endPose: "M1" as const, file: `${prefix}_M1_tie_adjust_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
          { id: "M4_lapel_adjust_v1", type: "dynamic_loop" as const, startPose: "M4" as const, endPose: "M4" as const, file: `${prefix}_M4_lapel_adjust_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
        ]
      : [
          { id: "M1_hair_adjust_v1", type: "dynamic_loop" as const, startPose: "M1" as const, endPose: "M1" as const, file: `${prefix}_M1_hair_adjust_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
          { id: "M4_hair_adjust_v1", type: "dynamic_loop" as const, startPose: "M4" as const, endPose: "M4" as const, file: `${prefix}_M4_hair_adjust_v1.mp4`, totalFrames: 192, durationSec: 8.0, fps: 24 },
        ]),

    // 4. Transitions (20)
    ...[
      ["1", "2"], ["1", "3"], ["1", "4"], ["1", "5"],
      ["2", "1"], ["2", "3"], ["2", "4"], ["2", "5"],
      ["3", "1"], ["3", "2"], ["3", "4"], ["3", "5"],
      ["4", "1"], ["4", "2"], ["4", "3"], ["4", "5"],
      ["5", "1"], ["5", "2"], ["5", "3"], ["5", "4"],
    ].map(([s, e]) => ({
      id: `T${s}_to_${e}`,
      type: "transition" as const,
      startPose: `M${s}` as ActionLoopPose,
      endPose: `M${e}` as ActionLoopPose,
      file: `${prefix}_T${s}_to_${e}.mp4`,
      totalFrames: 192,
      durationSec: 8.0,
      fps: 24,
    })),
  ];
}

/**
 * Finds a clip meta by ID.
 */
export function getClipMetaById(clipId: string, personaId: string = "ruby"): ActionLoopClipMeta | undefined {
  const prefix = resolvePersonaVeoPrefix(personaId);
  const clean = clipId
    .toLowerCase()
    .replace(new RegExp(`^(${prefix}_|ruby_burgundy_|mateo_default_trait_|blaze_silver_blazer_|hawk_graphite_pinstripe_suit_)`, "i"), "")
    .replace(/\.mp4$/, "");
  const catalog = getPersona37Clips(personaId);
  return catalog.find((c) => c.id.toLowerCase() === clean);
}

/**
 * Generates an unbroken random Markov FSM Action Loop Sequence.
 */
export function generateRandomLoopSequence(
  targetDurationFrames: number,
  options: {
    personaId?: string;
    startingPose?: string;
    startingLoopId?: string;
    finalPose?: string;
    selfLoopProbability?: number;
    availableLoopIds?: string[];
    availableClips?: ActionLoopClipMeta[];
  } = {}
): ChainedLoopClip[] {
  const personaId = options.personaId || "ruby";
  const dirName = resolvePersonaVeoPrefix(personaId);
  let clips = options.availableClips || getPersona37Clips(personaId);

  if (options.availableLoopIds && options.availableLoopIds.length > 0) {
    const loopIdSet = new Set(options.availableLoopIds.map((id) => id.toLowerCase()));
    const filtered = clips.filter((c) =>
      loopIdSet.has(c.id.toLowerCase()) ||
      loopIdSet.has(`${dirName}_${c.id}`.toLowerCase()) ||
      options.availableLoopIds!.some((avail) => avail.toLowerCase().includes(c.id.toLowerCase()))
    );
    if (filtered.length > 0) {
      clips = filtered;
    }
  }

  const hasDedicatedTransitions = clips.some((c) => c.type === "transition");
  const defaultSelfLoopProb = hasDedicatedTransitions ? 0.75 : 0.35;
  const selfLoopProb = options.selfLoopProbability ?? defaultSelfLoopProb;
  const sequence: ChainedLoopClip[] = [];

  // 1. Pick starting clip
  let currentClip: ActionLoopClipMeta;
  if (options.startingLoopId) {
    const found = getClipMetaById(options.startingLoopId, personaId);
    currentClip = found || clips[0];
  } else if (options.startingPose) {
    const pose = normalizePoseCode(options.startingPose);
    const poseClips = clips.filter((c) => c.startPose === pose && c.type !== "transition");
    currentClip = poseClips[Math.floor(Math.random() * poseClips.length)] || clips[0];
  } else {
    // Completely random starting clip among core loops and dynamic loops
    const candidateStarters = clips.filter((c) => c.type === "loop" || c.type === "dynamic_loop");
    currentClip = candidateStarters[Math.floor(Math.random() * candidateStarters.length)] || clips[0];
  }

  let accumulatedFrames = 0;
  let currentPose = currentClip.endPose;

  // Add starting clip
  sequence.push({
    clipId: currentClip.id,
    type: currentClip.type,
    startPose: currentClip.startPose,
    endPose: currentClip.endPose,
    durationFrames: currentClip.totalFrames,
    videoUrl: `/assets/action_loops/veo/${dirName}/${currentClip.file}`,
    globalStartFrame: 0,
    globalEndFrame: currentClip.totalFrames,
    label: `${currentClip.startPose}➔${currentClip.endPose} (${currentClip.id})`,
  });
  accumulatedFrames += currentClip.totalFrames;

  // Track recent clips to prevent immediate repeats (anti-fatigue)
  const recentHistory: string[] = [currentClip.id];

  // 2. Markov FSM Walk until accumulatedFrames >= targetDurationFrames
  while (accumulatedFrames < targetDurationFrames) {
    let nextClip: ActionLoopClipMeta;

    const rand = Math.random();
    const samePoseBeats = clips.filter(
      (c) => c.startPose === currentPose && c.endPose === currentPose
    );
    const transitions = clips.filter(
      (c) => c.startPose === currentPose && c.endPose !== currentPose && c.type === "transition"
    );

    if (transitions.length > 0) {
      if (rand < selfLoopProb) {
        // 75%: Same-pose loop or dynamic beat (apply anti-fatigue)
        const unplayed = samePoseBeats.filter((c) => !recentHistory.slice(-2).includes(c.id));
        const pool = unplayed.length > 0 ? unplayed : samePoseBeats;
        nextClip = pool[Math.floor(Math.random() * pool.length)] || clips[0];
      } else {
        // 25%: FLF Pose Transition
        nextClip = transitions[Math.floor(Math.random() * transitions.length)];
      }
    } else {
      // Persona only has core loops (no dedicated FLF transition videos)
      // Cycle dynamically across available poses to prevent being stuck on one pose
      const otherPoseBeats = clips.filter((c) => c.startPose !== currentPose);
      if (rand < selfLoopProb || otherPoseBeats.length === 0) {
        // Hold current pose with subtle variation if available
        const unplayed = samePoseBeats.filter((c) => !recentHistory.slice(-2).includes(c.id));
        const pool = unplayed.length > 0 ? unplayed : samePoseBeats;
        nextClip = pool[Math.floor(Math.random() * pool.length)] || clips[0];
      } else {
        // Switch to an alternate pose (M1 -> M2, M3, M4, M5) with anti-fatigue
        const unplayedOthers = otherPoseBeats.filter((c) => !recentHistory.slice(-3).includes(c.id));
        const pool = unplayedOthers.length > 0 ? unplayedOthers : otherPoseBeats;
        nextClip = pool[Math.floor(Math.random() * pool.length)] || otherPoseBeats[0];
      }
    }

    const startFrame = accumulatedFrames;
    const endFrame = startFrame + nextClip.totalFrames;

    sequence.push({
      clipId: nextClip.id,
      type: nextClip.type,
      startPose: nextClip.startPose,
      endPose: nextClip.endPose,
      durationFrames: nextClip.totalFrames,
      videoUrl: `/assets/action_loops/veo/${dirName}/${nextClip.file}`,
      globalStartFrame: startFrame,
      globalEndFrame: endFrame,
      label: `${nextClip.startPose}➔${nextClip.endPose} (${nextClip.id})`,
    });

    accumulatedFrames = endFrame;
    currentPose = nextClip.endPose;

    recentHistory.push(nextClip.id);
    if (recentHistory.length > 4) recentHistory.shift();
  }

  // 3. Guaranteed Return Transition to requested final pose (e.g. M1 Home Base)
  if (options.finalPose) {
    const targetFinal = normalizePoseCode(options.finalPose);
    if (currentPose !== targetFinal) {
      const returnTrans = clips.find(
        (c) => c.type === "transition" && c.startPose === currentPose && c.endPose === targetFinal
      );
      if (returnTrans) {
        const startFrame = accumulatedFrames;
        const endFrame = startFrame + returnTrans.totalFrames;
        sequence.push({
          clipId: returnTrans.id,
          type: returnTrans.type,
          startPose: returnTrans.startPose,
          endPose: returnTrans.endPose,
          durationFrames: returnTrans.totalFrames,
          videoUrl: `/assets/action_loops/veo/${dirName}/${returnTrans.file}`,
          globalStartFrame: startFrame,
          globalEndFrame: endFrame,
          label: `${returnTrans.startPose}➔${returnTrans.endPose} (${returnTrans.id})`,
        });
        accumulatedFrames = endFrame;
        currentPose = returnTrans.endPose;
      }
    }
  }

  return sequence;
}

/**
 * Slices a planned loop sequence for a specific scene's global time interval [globalStartFrame, globalStartFrame + durationFrames).
 * If the interval spans across a clip boundary, returns multiple slices with local frame offsets.
 */
export function sliceSequenceForScene(
  sequence: ChainedLoopClip[],
  sceneGlobalStartFrame: number,
  sceneDurationFrames: number
): SceneClipSlice[] {
  if (!sequence || sequence.length === 0 || sceneDurationFrames <= 0) return [];

  const sceneGlobalEnd = sceneGlobalStartFrame + sceneDurationFrames;
  const slices: SceneClipSlice[] = [];

  let audioCursor = 0;

  for (const clip of sequence) {
    // Check if this clip intersects [sceneGlobalStartFrame, sceneGlobalEnd)
    if (clip.globalEndFrame <= sceneGlobalStartFrame) continue;
    if (clip.globalStartFrame >= sceneGlobalEnd) break;

    const overlapStart = Math.max(clip.globalStartFrame, sceneGlobalStartFrame);
    const overlapEnd = Math.min(clip.globalEndFrame, sceneGlobalEnd);
    const overlapDuration = overlapEnd - overlapStart;

    if (overlapDuration <= 0) continue;

    const localStartFrame = overlapStart - clip.globalStartFrame;

    slices.push({
      clipId: clip.clipId,
      videoUrl: clip.videoUrl,
      localStartFrame,
      sliceDurationFrames: overlapDuration,
      audioStartFrame: audioCursor,
      audioDurationFrames: overlapDuration,
    });

    audioCursor += overlapDuration;
  }

  // Fallback if sequence was shorter than requested interval: clamp to last clip
  if (slices.length === 0 && sequence.length > 0) {
    const last = sequence[sequence.length - 1];
    slices.push({
      clipId: last.clipId,
      videoUrl: last.videoUrl,
      localStartFrame: 0,
      sliceDurationFrames: sceneDurationFrames,
      audioStartFrame: 0,
      audioDurationFrames: sceneDurationFrames,
    });
  }

  return slices;
}

/**
 * Parses start and end pose from a clip ID (e.g., "T1_to_2" -> M1, M2; "M3_loop_v1" -> M3, M3).
 */
export function parsePoseFromClipId(clipId?: string): {
  startPose: "M1" | "M2" | "M3" | "M4" | "M5";
  endPose: "M1" | "M2" | "M3" | "M4" | "M5";
} {
  if (!clipId) return { startPose: "M1", endPose: "M1" };
  const lower = clipId.toLowerCase();

  // Check transition T{s}_to_{e}
  const tMatch = lower.match(/t([1-5])_to_([1-5])/);
  if (tMatch) {
    return {
      startPose: `M${tMatch[1]}` as ActionLoopPose,
      endPose: `M${tMatch[2]}` as ActionLoopPose,
    };
  }

  // Check pose M{1-5}
  const mMatch = lower.match(/m([1-5])/);
  if (mMatch) {
    const p = `M${mMatch[1]}` as ActionLoopPose;
    return { startPose: p, endPose: p };
  }

  return { startPose: "M1", endPose: "M1" };
}

/**
 * Extracts entry pose and exit pose for a scene from its slices, presenterConfig, or videoUrl.
 */
export function getScenePoseBounds(
  scene: {
    actionLoopSlices?: Array<{ clipId: string }>;
    presenterConfig?: { selectedActionLoopId?: string; videoUrl?: string } | null;
    presenter?: { selectedActionLoopId?: string; videoUrl?: string } | null;
    presenterVideoUrl?: string;
  },
  personaId: string = "ruby"
): { entryPose: "M1" | "M2" | "M3" | "M4" | "M5"; exitPose: "M1" | "M2" | "M3" | "M4" | "M5" } {
  // If scene has slices, first slice defines entryPose, last slice defines exitPose
  if (scene.actionLoopSlices && scene.actionLoopSlices.length > 0) {
    const firstClipId = scene.actionLoopSlices[0].clipId;
    const lastClipId = scene.actionLoopSlices[scene.actionLoopSlices.length - 1].clipId;

    const firstMeta = getClipMetaById(firstClipId, personaId);
    const lastMeta = getClipMetaById(lastClipId, personaId);

    const entryPose = firstMeta?.startPose || parsePoseFromClipId(firstClipId).startPose;
    const exitPose = lastMeta?.endPose || parsePoseFromClipId(lastClipId).endPose;

    return { entryPose, exitPose };
  }

  // Fallback to selectedActionLoopId or presenterVideoUrl
  const clipId =
    scene.presenterConfig?.selectedActionLoopId ||
    scene.presenter?.selectedActionLoopId ||
    scene.presenterVideoUrl ||
    "M1_loop_v1";

  const meta = getClipMetaById(clipId, personaId);
  if (meta) {
    return { entryPose: meta.startPose, exitPose: meta.endPose };
  }

  const parsed = parsePoseFromClipId(clipId);
  return { entryPose: parsed.startPose, exitPose: parsed.endPose };
}

export interface ContinuityConstraint {
  requiredStartPose?: "M1" | "M2" | "M3" | "M4" | "M5" | null;
  requiredEndPose?: "M1" | "M2" | "M3" | "M4" | "M5" | null;
  currentClipId?: string;
  personaId?: string;
}

/**
 * Returns all clips from the persona's 37-clip catalog that satisfy continuity constraints
 * (startPose matching requiredStartPose, and endPose matching requiredEndPose).
 */
export function getContinuityPreservingLoopCandidates(
  options: ContinuityConstraint
): {
  allMatchingClips: ActionLoopClipMeta[];
  alternativeClips: ActionLoopClipMeta[];
  requiredStartPose: "M1" | "M2" | "M3" | "M4" | "M5" | null;
  requiredEndPose: "M1" | "M2" | "M3" | "M4" | "M5" | null;
} {
  const personaId = options.personaId || "ruby";
  const catalog = getPersona37Clips(personaId);

  const startReq = options.requiredStartPose || null;
  const endReq = options.requiredEndPose || null;

  const allMatchingClips = catalog.filter((clip) => {
    const matchStart = startReq === null || clip.startPose === startReq;
    const matchEnd = endReq === null || clip.endPose === endReq;
    return matchStart && matchEnd;
  });

  const curClean = options.currentClipId
    ? options.currentClipId.toLowerCase().replace(/^(ruby_burgundy_|mateo_default_trait_|blaze_silver_blazer_)/, "").replace(/\.mp4$/, "")
    : null;

  const alternativeClips = curClean
    ? allMatchingClips.filter((c) => c.id.toLowerCase() !== curClean)
    : allMatchingClips;

  return {
    allMatchingClips,
    alternativeClips: alternativeClips.length > 0 ? alternativeClips : allMatchingClips,
    requiredStartPose: startReq,
    requiredEndPose: endReq,
  };
}

export interface ReshuffleSceneResult<T> {
  updatedScenes: (T & {
    actionLoopSlices?: SceneClipSlice[];
    presenterVideoUrl?: string;
  })[];
  selectedClip: ActionLoopClipMeta;
  requiredStartPose: "M1" | "M2" | "M3" | "M4" | "M5" | null;
  requiredEndPose: "M1" | "M2" | "M3" | "M4" | "M5" | null;
  totalCandidateCount: number;
}

/**
 * Reshuffles just the scene at sceneIndex among clips that preserve continuity
 * with sceneIndex - 1 (exit pose) and sceneIndex + 1 (entry pose).
 */
export function reshuffleSceneActionLoop<T extends {
  id?: string;
  durationFrames?: number;
  actionLoopSlices?: SceneClipSlice[];
  presenterConfig?: { selectedActionLoopId?: string } | null;
  presenter?: { selectedActionLoopId?: string } | null;
  presenterVideoUrl?: string;
}>(
  scenes: T[],
  sceneIndex: number,
  personaId: string = "ruby"
): ReshuffleSceneResult<T> | null {
  if (!scenes || sceneIndex < 0 || sceneIndex >= scenes.length) return null;

  const targetScene = scenes[sceneIndex];
  const dirName = resolvePersonaVeoPrefix(personaId);

  // 1. Determine Continuity Constraints
  let requiredStartPose: "M1" | "M2" | "M3" | "M4" | "M5" | null = null;
  let requiredEndPose: "M1" | "M2" | "M3" | "M4" | "M5" | null = null;

  if (sceneIndex > 0) {
    const prevScene = scenes[sceneIndex - 1];
    requiredStartPose = getScenePoseBounds(prevScene, personaId).exitPose;
  }

  if (sceneIndex < scenes.length - 1) {
    const nextScene = scenes[sceneIndex + 1];
    requiredEndPose = getScenePoseBounds(nextScene, personaId).entryPose;
  }

  // 2. Identify Current Clip to avoid picking the same one if alternatives exist
  const currentClipId =
    targetScene.actionLoopSlices?.[0]?.clipId ||
    targetScene.presenterConfig?.selectedActionLoopId ||
    targetScene.presenter?.selectedActionLoopId;

  // 3. Get candidates
  const { allMatchingClips, alternativeClips } = getContinuityPreservingLoopCandidates({
    requiredStartPose,
    requiredEndPose,
    currentClipId,
    personaId,
  });

  if (allMatchingClips.length === 0) {
    return null;
  }

  // Pick randomly from alternatives (or all matches if only 1 option exists)
  const pool = alternativeClips.length > 0 ? alternativeClips : allMatchingClips;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const videoUrl = `/assets/action_loops/veo/${dirName}/${chosen.file}`;
  const sceneDur = targetScene.durationFrames || 90;

  const slices: SceneClipSlice[] = [
    {
      clipId: chosen.id,
      videoUrl,
      localStartFrame: 0,
      sliceDurationFrames: sceneDur,
      audioStartFrame: 0,
      audioDurationFrames: sceneDur,
    },
  ];

  const updatedScenes = scenes.map((s, idx) => {
    if (idx !== sceneIndex) return s;
    return {
      ...s,
      presenterVideoUrl: videoUrl,
      actionLoopSlices: slices,
      lipSyncAudioUrl: undefined,
      lipSyncAudioCacheKey: undefined,
      lipSyncLoopId: undefined,
      lipSyncSlicesSignature: undefined,
      presenterConfig: {
        ...(s.presenterConfig || {}),
        mode: "custom",
        videoUrl,
        selectedActionLoopId: chosen.id,
        actionLoopSlices: slices,
      },
      presenter: {
        ...(s.presenter || {}),
        mode: "custom",
        videoUrl,
        selectedActionLoopId: chosen.id,
        actionLoopSlices: slices,
      },
    };
  });

  return {
    updatedScenes,
    selectedClip: chosen,
    requiredStartPose,
    requiredEndPose,
    totalCandidateCount: allMatchingClips.length,
  };
}

export interface ActionLoopSceneCandidate {
  sceneType?: string;
  customVeoVideoUrl?: string;
  primaryMediaUrl?: string;
  actionLoopSlices?: SceneClipSlice[];
  presenterVideoUrl?: string;
  presenterConfig?: { selectedActionLoopId?: string } | null;
  presenter?: { selectedActionLoopId?: string } | null;
}

/**
 * Checks whether a scene actively participates in presenter action loops.
 */
export function isActionLoopScene(scene?: ActionLoopSceneCandidate | null): boolean {
  if (!scene) return false;
  // Veo hero video scenes don't use presenter action loops
  if (scene.sceneType === "custom_veo_hero" || scene.customVeoVideoUrl) return false;
  if (typeof scene.primaryMediaUrl === "string") {
    const clean = scene.primaryMediaUrl.split("?")[0].toLowerCase();
    if (clean.endsWith(".mp4") || clean.endsWith(".webm")) {
      if (!scene.actionLoopSlices?.length && !scene.presenterVideoUrl) return false;
    }
  }
  return Boolean(
    scene.actionLoopSlices?.length ||
    scene.presenterVideoUrl ||
    scene.presenterConfig?.selectedActionLoopId ||
    scene.presenter?.selectedActionLoopId ||
    (typeof scene.sceneType === "string" && scene.sceneType.includes("presenter"))
  );
}

export interface DiscontinuityInfo {
  sceneIndexA: number;
  sceneIndexB: number;
  sceneNumberA: number;
  sceneNumberB: number;
  exitPoseA: "M1" | "M2" | "M3" | "M4" | "M5";
  entryPoseB: "M1" | "M2" | "M3" | "M4" | "M5";
}

export interface StoryboardContinuityReport {
  totalBoundaries: number;
  seamlessBoundaries: number;
  scorePct: number; // 0-100
  isSeamless: boolean;
  discontinuities: DiscontinuityInfo[];
}

/**
 * Evaluates kinematic posture continuity across all consecutive presenter scenes in a storyboard.
 */
export function calculateStoryboardContinuity(
  scenes: ActionLoopSceneCandidate[],
  personaId: string = "ruby"
): StoryboardContinuityReport {
  if (!Array.isArray(scenes) || scenes.length <= 1) {
    return {
      totalBoundaries: 0,
      seamlessBoundaries: 0,
      scorePct: 100,
      isSeamless: true,
      discontinuities: [],
    };
  }

  // Filter scenes that participate in action loops with their original indices
  const loopScenes: Array<{ scene: ActionLoopSceneCandidate; originalIndex: number }> = [];
  scenes.forEach((scene, index) => {
    if (isActionLoopScene(scene)) {
      loopScenes.push({ scene, originalIndex: index });
    }
  });

  if (loopScenes.length <= 1) {
    return {
      totalBoundaries: 0,
      seamlessBoundaries: 0,
      scorePct: 100,
      isSeamless: true,
      discontinuities: [],
    };
  }

  const discontinuities: DiscontinuityInfo[] = [];
  let seamlessBoundaries = 0;
  const totalBoundaries = loopScenes.length - 1;

  for (let i = 0; i < totalBoundaries; i++) {
    const sceneA = loopScenes[i].scene;
    const sceneB = loopScenes[i + 1].scene;

    const boundsA = getScenePoseBounds(sceneA, personaId);
    const boundsB = getScenePoseBounds(sceneB, personaId);

    if (boundsA.exitPose === boundsB.entryPose) {
      seamlessBoundaries++;
    } else {
      discontinuities.push({
        sceneIndexA: loopScenes[i].originalIndex,
        sceneIndexB: loopScenes[i + 1].originalIndex,
        sceneNumberA: loopScenes[i].originalIndex + 1,
        sceneNumberB: loopScenes[i + 1].originalIndex + 1,
        exitPoseA: boundsA.exitPose,
        entryPoseB: boundsB.entryPose,
      });
    }
  }

  const scorePct = Math.round((seamlessBoundaries / totalBoundaries) * 100);

  return {
    totalBoundaries,
    seamlessBoundaries,
    scorePct,
    isSeamless: discontinuities.length === 0,
    discontinuities,
  };
}

export interface HealContinuityResult<T> {
  healedScenes: T[];
  healedCount: number;
  initialScorePct: number;
  finalScorePct: number;
  discontinuitiesHealed: DiscontinuityInfo[];
}

/**
 * Automatically heals kinematic posture discontinuities across presenter scenes in a storyboard.
 * Replaces mismatched loops with continuity-preserving loops (or transitions) matching the exit pose of the preceding scene.
 */
export function healStoryboardActionLoopContinuity<T extends {
  id?: string;
  durationFrames?: number;
  actionLoopSlices?: SceneClipSlice[];
  presenterConfig?: { selectedActionLoopId?: string } | null;
  presenter?: { selectedActionLoopId?: string } | null;
  presenterVideoUrl?: string;
}>(
  scenes: T[],
  personaId: string = "ruby"
): HealContinuityResult<T> {
  if (!Array.isArray(scenes) || scenes.length <= 1) {
    return {
      healedScenes: scenes,
      healedCount: 0,
      initialScorePct: 100,
      finalScorePct: 100,
      discontinuitiesHealed: [],
    };
  }

  const initialReport = calculateStoryboardContinuity(scenes, personaId);
  if (initialReport.isSeamless) {
    return {
      healedScenes: scenes,
      healedCount: 0,
      initialScorePct: 100,
      finalScorePct: 100,
      discontinuitiesHealed: [],
    };
  }

  const norm = personaId.toLowerCase();
  const isBlaze = norm.includes("blaze");
  const isMateo = norm.includes("mateo");
  const dirName = isBlaze ? "blaze_silver_blazer" : isMateo ? "mateo_default_trait" : "ruby_burgundy";

  const updatedScenes = [...scenes];
  let healedCount = 0;
  const discontinuitiesHealed: DiscontinuityInfo[] = [];

  // Iterate over scenes and heal boundaries
  for (let i = 0; i < updatedScenes.length; i++) {
    const currentScene = updatedScenes[i];
    if (!isActionLoopScene(currentScene)) continue;

    // Find preceding action loop scene
    let prevIndex = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (isActionLoopScene(updatedScenes[j])) {
        prevIndex = j;
        break;
      }
    }

    if (prevIndex === -1) {
      // First action loop scene in storyboard has no predecessor to match
      continue;
    }

    const prevScene = updatedScenes[prevIndex];
    const prevBounds = getScenePoseBounds(prevScene, personaId);
    const curBounds = getScenePoseBounds(currentScene, personaId);

    if (prevBounds.exitPose !== curBounds.entryPose) {
      // Find following action loop scene if any
      let nextIndex = -1;
      for (let k = i + 1; k < updatedScenes.length; k++) {
        if (isActionLoopScene(updatedScenes[k])) {
          nextIndex = k;
          break;
        }
      }

      const requiredStartPose = prevBounds.exitPose;
      const requiredEndPose = nextIndex !== -1 ? getScenePoseBounds(updatedScenes[nextIndex], personaId).entryPose : null;

      const currentClipId =
        currentScene.actionLoopSlices?.[0]?.clipId ||
        currentScene.presenterConfig?.selectedActionLoopId ||
        currentScene.presenter?.selectedActionLoopId;

      // Try candidate search with both start and end constraints
      let { allMatchingClips, alternativeClips } = getContinuityPreservingLoopCandidates({
        requiredStartPose,
        requiredEndPose,
        currentClipId,
        personaId,
      });

      // If no clip matches both, relax end requirement so it only matches requiredStartPose
      if (allMatchingClips.length === 0) {
        const relaxed = getContinuityPreservingLoopCandidates({
          requiredStartPose,
          requiredEndPose: null,
          currentClipId,
          personaId,
        });
        allMatchingClips = relaxed.allMatchingClips;
        alternativeClips = relaxed.alternativeClips;
      }

      if (allMatchingClips.length > 0) {
        // Prefer loops or dynamic loops over transitions if same pose, or transition if needed
        const pool = alternativeClips.length > 0 ? alternativeClips : allMatchingClips;
        const chosen = pool[0]; // Stable deterministic selection for healing

        const videoUrl = `/assets/action_loops/veo/${dirName}/${chosen.file}`;
        const sceneDur = currentScene.durationFrames || 90;

        const slices: SceneClipSlice[] = [
          {
            clipId: chosen.id,
            videoUrl,
            localStartFrame: 0,
            sliceDurationFrames: sceneDur,
            audioStartFrame: 0,
            audioDurationFrames: sceneDur,
          },
        ];

        updatedScenes[i] = {
          ...currentScene,
          presenterVideoUrl: videoUrl,
          actionLoopSlices: slices,
          lipSyncAudioUrl: undefined,
          lipSyncAudioCacheKey: undefined,
          lipSyncLoopId: undefined,
          lipSyncSlicesSignature: undefined,
          presenterConfig: {
            ...(currentScene.presenterConfig || {}),
            mode: "custom",
            videoUrl,
            selectedActionLoopId: chosen.id,
            actionLoopSlices: slices,
          },
          presenter: {
            ...(currentScene.presenter || {}),
            mode: "custom",
            videoUrl,
            selectedActionLoopId: chosen.id,
            actionLoopSlices: slices,
          },
        };

        healedCount++;
        discontinuitiesHealed.push({
          sceneIndexA: prevIndex,
          sceneIndexB: i,
          sceneNumberA: prevIndex + 1,
          sceneNumberB: i + 1,
          exitPoseA: prevBounds.exitPose,
          entryPoseB: curBounds.entryPose,
        });
      }
    }
  }

  const finalReport = calculateStoryboardContinuity(updatedScenes, personaId);

  return {
    healedScenes: updatedScenes,
    healedCount,
    initialScorePct: initialReport.scorePct,
    finalScorePct: finalReport.scorePct,
    discontinuitiesHealed,
  };
}

