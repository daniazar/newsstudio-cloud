/**
 * scripts/veo-cli/actionStateCatalog.ts
 *
 * Master Action Pose State Catalog for 4-Second Dynamic Loops across all 6 Broadcast Scenario Domains.
 * Includes explicit domain classification, prop dependencies, and bridge base declarations for posture transitions.
 * All motions maintain closed lips for downstream MuseTalk lip-sync synthesis.
 */

import { ActionPoseState, BroadcastDomainType } from "./types";
import path from "path";

export const ACTION_POSE_STATES: Record<string, ActionPoseState> = {
  // =========================================================================
  // DOMAIN 3: CHROMA WALL STANDING (Clean Green/Blue Screen — Zero Furniture)
  // =========================================================================
  P01_NEUTRAL_CLASPED: {
    id: "P01_NEUTRAL_CLASPED",
    label: "P01: Neutral Clasped Hands (Domain 3 Master Base)",
    poseCode: "P01",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    isBridgeBase: true,
    description: "Standing presenter with hands clasped neatly in front of waist, poised stance, forward gaze.",
    motionPrompt:
      "Standing upright with hands clasped gracefully in front of her waist against the flat chroma background with no desk or furniture. She maintains her clasped hands stance throughout. Subtle natural chest breathing rhythm, calm poised posture, gentle closed-lip pleasant smile exactly matching the photo, zero mouth movement, zero talking, single soft natural eye blink at 2.0s, completely stable standing posture returning to the exact starting frame coordinates by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P02_RAISED_EXPLANATORY: {
    id: "P02_RAISED_EXPLANATORY",
    label: "P02: Raised Right Hand (Domain 3 Dynamic Explanatory)",
    poseCode: "P02",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Fluidly articulates raised right hand in an open-palm explanatory gesture, closed-lip engaging smile.",
    motionPrompt:
      "Standing in place with closed lips and warm engaging demeanor against flat chroma backdrop. Fluidly animates her raised right hand in natural, dynamic conversational open-palm gestures with expressive finger and wrist articulation emphasizing points, then gracefully guides her hand and arm smoothly back into the EXACT starting position, elevation, and finger placement of the reference photo by 4.0s. Mouth remains closed throughout with zero talking. Single soft blink at 2.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08b_cobalt_sweetheart_dynamic_raised_hand.jpg",
    handsPosition: "raised_right_hand",
    recommendedCamera: "cam1",
  },

  P03_OPEN_TWO_HANDS: {
    id: "P03_OPEN_TWO_HANDS",
    label: "P03: Open Two Hands (Domain 3 Welcoming Overview)",
    poseCode: "P03",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Both hands open outward in a welcoming presentation gesture, closed-lip smile.",
    motionPrompt:
      "Standing in place with closed lips and warm welcoming demeanor against flat chroma backdrop. Fluidly animates both hands outward in balanced, expressive presentation gestures emphasizing key ideas, then gracefully and smoothly guides both hands back into the EXACT starting position, angle, and coordinates of the reference image by 4.0s. Closed mouth throughout with zero talking. Single gentle blink at 2.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08c_cobalt_sweetheart_dynamic_open_hands.jpg",
    handsPosition: "open_two_hands",
    recommendedCamera: "cam1",
  },

  P04_SEPARATED_NEUTRAL: {
    id: "P04_SEPARATED_NEUTRAL",
    label: "P04: Separated Arms Neutral (Domain 3 Relaxed Stance)",
    poseCode: "P04",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Standing presenter with arms relaxed and separated naturally at sides, calm poised stance.",
    motionPrompt:
      "Standing upright with arms resting naturally separated at sides against flat chroma backdrop with no desk or furniture. She maintains her relaxed arm posture throughout with subtle natural chest breathing rhythm, calm poised posture, gentle closed-lip pleasant smile matching the reference image, zero talking, zero mouth movement, single soft natural eye blink at 2.0s, completely stable standing posture returning to the exact starting frame coordinates by 4.0s.",
    sampleImagePath: "public/avatars/master_blaze_archive/domain_chroma_wall_standing_leather_crop_jacket/blaze_chroma_wall_standing_leather_crop_jacket_04_M4_chroma_separated_arms.jpg",
    handsPosition: "separated_sides",
    recommendedCamera: "cam1",
  },

  P05_SIDE_PERSPECTIVE_TURN: {
    id: "P05_SIDE_PERSPECTIVE_TURN",
    label: "P05: Side Perspective Turn (Domain 3 3/4 Turn Stance)",
    poseCode: "P05",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Standing presenter turned slightly in a dynamic 3/4 side perspective stance.",
    motionPrompt:
      "Standing poised in a subtle 3/4 side perspective stance against flat chroma backdrop with no desk. Direct engaging gaze toward camera, gentle closed-lip pleasant smile matching the reference photo, zero talking, zero mouth opening, subtle natural breathing rhythm, single soft natural eye blink at 2.0s, completely stable posture returning to the exact starting frame coordinates by 4.0s.",
    sampleImagePath: "public/avatars/master_blaze_archive/domain_chroma_wall_standing_leather_crop_jacket/blaze_chroma_wall_standing_leather_crop_jacket_05_M5_chroma_turn_side.jpg",
    handsPosition: "side_turn_hands",
    recommendedCamera: "cam1",
  },

  P04_CONFIDENT_NOD_EMPHASIS: {
    id: "P04_CONFIDENT_NOD_EMPHASIS",
    label: "P04: Affirmative Head Nod (Domain 3 Statement Emphasis)",
    poseCode: "P04",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Firm, warm affirmative head nod with subtle engaged smile and steady eye contact.",
    motionPrompt:
      "Standing poised with hands clasped at waist against the green screen with no desk. Gives a firm, warm affirmative head nod with a subtle engaged closed-lip smile and locked eye contact with the camera, followed by a gentle relaxed breathing cycle, settling smoothly by 4.0s. Closed mouth throughout.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P05_ANALYTICAL_HEAD_TILT: {
    id: "P05_ANALYTICAL_HEAD_TILT",
    label: "P05: Analytical Head Tilt (Domain 3 Active Listening)",
    poseCode: "P05",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Tilts head slightly with an attentive, intelligent expression and bright eye contact.",
    motionPrompt:
      "Standing poised with hands clasped at waist, closed lips against green screen. Tilts head slightly 10 degrees with an engaged, insightful expression and bright direct eye contact, subtle appreciative closed-lip smile, gentle breathing, returning smoothly to center by 4.0s. Mouth remains closed.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P06_CHEST_HAND_SINCERITY: {
    id: "P06_CHEST_HAND_SINCERITY",
    label: "P06: Chest Hand Touch (Domain 3 Heartfelt Empathy)",
    poseCode: "P06",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Right hand gently touches upper chest in a sincere, empathetic connection gesture.",
    motionPrompt:
      "Standing in place with closed lips against green backdrop with no furniture. Right hand rises gently to touch near upper chest in a sincere, empathetic gesture, while left hand remains steady at waist. Warm reassuring closed-lip expression, subtle breathing, smoothly lowering hand back to clasp at waist by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "chest_touch",
    recommendedCamera: "cam1",
  },

  P07_LEFT_HAND_EXPLANATORY: {
    id: "P07_LEFT_HAND_EXPLANATORY",
    label: "P07: Left Hand Explanatory (Domain 3 Presentation Sweep)",
    poseCode: "P07",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Fluidly raises left hand in an open explanatory sweep, head tracking naturally.",
    motionPrompt:
      "Standing in place with closed lips against chroma screen. Raises left hand in an open-palm dynamic explanatory sweep to the left, head turning subtly to accompany the movement, warm focused expression, smoothly returning hand to waist clasp by 4.0s. Single gentle eye blink.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "raised_left_hand",
    recommendedCamera: "cam1",
  },

  P08_BALANCING_COMPARISON: {
    id: "P08_BALANCING_COMPARISON",
    label: "P08: Two-Hand Balancing (Domain 3 Weighing Options)",
    poseCode: "P08",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Both hands rise and alternate subtly like comparing two perspectives.",
    motionPrompt:
      "Standing in place with closed lips against green screen with no desk. Both hands rise to chest level and gently weigh/balance alternately like comparing two perspectives, shoulders engaged naturally, with a thoughtful closed-lip smile, before smoothly settling back to waist clasp by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "balancing_hands",
    recommendedCamera: "cam1",
  },

  P09_WARM_SIGNOFF_SMILE: {
    id: "P09_WARM_SIGNOFF_SMILE",
    label: "P09: Warm Sign-off Smile (Domain 3 Closing Outro)",
    poseCode: "P09",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Expression blooms into a warm closed-lip smile with a gracious parting head nod.",
    motionPrompt:
      "Standing poised with hands clasped at waist against green screen. Expression blooms into a bright, genuine closed-lip warm smile, accompanied by a polite gracious parting head nod, gentle breathing, holding poised posture through 4.0s. Closed lips throughout.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P10_AUTHORITATIVE_FOCUS: {
    id: "P10_AUTHORITATIVE_FOCUS",
    label: "P10: Authoritative Direct Gaze (Domain 3 Breaking News)",
    poseCode: "P10",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Intense, locked eye contact with composed authoritative posture.",
    motionPrompt:
      "Standing in upright commanding posture, hands clasped firmly at waist against green screen with zero furniture. Intense locked eye contact with the camera lens, composed and authoritative expression with closed lips, subtle deep chest breathing rhythm, single crisp blink at 2.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P11_RELAXED_BREATH_SETTLE: {
    id: "P11_RELAXED_BREATH_SETTLE",
    label: "P11: Relaxed Breathing Settle (Domain 3 Natural Pause)",
    poseCode: "P11",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Subtle relaxed breath with natural shoulder release and calm friendly look.",
    motionPrompt:
      "Standing poised with hands clasped at waist against green screen. Takes a subtle, relaxed natural breath with gentle shoulder release on the exhale, gentle eye blink at 1.5s, calm friendly expression with closed lips throughout, settling steadily by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P12_DYNAMIC_SWEEP_EMPHASIS: {
    id: "P12_DYNAMIC_SWEEP_EMPHASIS",
    label: "P12: Dynamic Sweep Emphasis (Domain 3 Transition Beat)",
    poseCode: "P12",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Confident sweeping hand gesture emphasizing a major topic transition.",
    motionPrompt:
      "Standing in place with closed lips against green screen with no desk. Right hand sweeps smoothly in a confident arc across mid-torso to emphasize a major topic transition, head tracking gracefully with an engaging closed-lip expression, settling back to center waist clasp by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "sweep_right_hand",
    recommendedCamera: "cam1",
  },

  P13_LOOK_DOWN_NOTES: {
    id: "P13_LOOK_DOWN_NOTES",
    label: "P13: Teleprompter / Script Glance (Domain 3 Factual Check)",
    poseCode: "P13",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Smooth downward micro-glance checking teleprompter then returning directly to lens.",
    motionPrompt:
      "Standing poised with hands clasped at waist against green screen. Glances smoothly down for 0.4 seconds to check teleprompter notes, then smoothly returns confident direct eye contact up to the camera lens with a subtle nod and calm closed-lip expression, settling by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P14_GESTURE_RIGHT_SIDEBAR: {
    id: "P14_GESTURE_RIGHT_SIDEBAR",
    label: "P14: Gesture Right / Screen Reference (Domain 3 Panel Look)",
    poseCode: "P14",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Smooth head turn to right glance towards virtual graphics screen, returning to camera.",
    motionPrompt:
      "Standing in place with closed lips against green screen. Smoothly turns head 20 degrees to the right to acknowledge a virtual graphic screen with an engaging receptive expression, holding for 1.5 seconds before smoothly returning direct gaze forward to the camera lens by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  P15_ANALYTICAL_INVESTIGATION: {
    id: "P15_ANALYTICAL_INVESTIGATION",
    label: "P15: Analytical Deep Dive (Domain 3 Investigative Focus)",
    poseCode: "P15",
    domain: "chroma_wall_standing",
    prohibitsDesk: true,
    description: "Composed analytical posture with subtle reflective micro-glance and focused presence.",
    motionPrompt:
      "Standing poised with hands clasped firmly at waist against green screen with no furniture. Deep analytical focused expression with subtle reflective micro-glance, steady open eye gaze, composed posture, subtle deep chest breathing rhythm, returning to locked camera focus by 4.0s.",
    sampleImagePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg",
    handsPosition: "clasped_center",
    recommendedCamera: "cam1",
  },

  // =========================================================================
  // DOMAIN 1: SEATED BROADCAST DESK (Studio Newsroom Set with Laptop & Props)
  // =========================================================================
  D1_P01_DESK_CLASPED_BASE: {
    id: "D1_P01_DESK_CLASPED_BASE",
    label: "D1-P01: Seated Desk Clasped (Domain 1 Bridge Base)",
    poseCode: "D1_P01",
    domain: "seated_broadcast_desk",
    requiresDesk: true,
    isBridgeBase: true, // M_desk_sit_base
    description: "Seated upright behind modern broadcast desk with hands resting clasped neatly on desk.",
    motionPrompt:
      "Seated upright behind the modern newsroom broadcast glass desk with hands resting neatly clasped in front of the silver laptop. Subtle natural breathing rhythm, composed anchor posture, pleasant closed-lip smile, single gentle blink at 2.0s.",
    handsPosition: "resting_on_desk",
    recommendedCamera: "cam1",
  },

  D1_P02_DESK_LAPTOP_TYPING: {
    id: "D1_P02_DESK_LAPTOP_TYPING",
    label: "D1-P02: Laptop Keyboard Reference (Domain 1 Data Check)",
    poseCode: "D1_P02",
    domain: "seated_broadcast_desk",
    requiresDesk: true,
    requiredProps: ["laptop"],
    description: "Right hand resting on laptop keyboard, quick natural glance to screen, returning to lens.",
    motionPrompt:
      "Seated at broadcast desk. Right hand rests lightly on the open laptop keyboard, subtle 0.4-second downward glance to reference data on screen, smoothly returning direct confident eye contact to camera lens, natural breathing.",
    handsPosition: "typing_keyboard",
    recommendedCamera: "cam2",
  },

  D1_P03_DESK_SCRIPT_REVIEW: {
    id: "D1_P03_DESK_SCRIPT_REVIEW",
    label: "D1-P03: Script Papers Review (Domain 1 Notes Check)",
    poseCode: "D1_P03",
    domain: "seated_broadcast_desk",
    requiresDesk: true,
    requiredProps: ["papers"],
    description: "Hands holding paper script on desk, quick glance down to verify notes, returning to lens.",
    motionPrompt:
      "Seated at broadcast desk. Hands resting on printed news script papers on desk, subtle 0.4s downward glance checking facts, returning smoothly to direct camera gaze with an authoritative nod, closed mouth throughout.",
    handsPosition: "holding_script",
    recommendedCamera: "cam1",
  },

  D1_P04_DESK_EXPLANATORY: {
    id: "D1_P04_DESK_EXPLANATORY",
    label: "D1-P04: Seated Explanatory Gesture (Domain 1 Active Speech)",
    poseCode: "D1_P04",
    domain: "seated_broadcast_desk",
    requiresDesk: true,
    description: "Right hand lifts from desk surface in an open explanatory gesture, returning to desk.",
    motionPrompt:
      "Seated behind broadcast desk with closed lips. Right hand lifts smoothly from desk surface in an open conversational explanatory gesture, head tracking naturally with engaging delivery, left hand steady on desk, returning hand to desk surface by 4.0s.",
    handsPosition: "raised_from_desk",
    recommendedCamera: "cam2",
  },

  // =========================================================================
  // DOMAIN 2: STANDING BROADCAST DESK / PODIUM (Studio Set beside Desk)
  // =========================================================================
  D2_P01_STAND_DESK_BASE: {
    id: "D2_P01_STAND_DESK_BASE",
    label: "D2-P01: Standing Beside Desk (Domain 2 Bridge Base)",
    poseCode: "D2_P01",
    domain: "standing_broadcast_desk",
    requiresDesk: true,
    isBridgeBase: true, // M_desk_stand_base
    description: "Standing upright beside broadcast desk with hands resting lightly on desk corner.",
    motionPrompt:
      "Standing upright beside the newsroom broadcast desk in studio set, hands resting lightly and comfortably on the desk corner. Poised authoritative posture, subtle natural breathing rhythm, gentle closed-lip smile, single soft blink at 2.0s.",
    handsPosition: "resting_on_desk_corner",
    recommendedCamera: "cam1",
  },

  D2_P02_PODIUM_TABLET_TAP: {
    id: "D2_P02_PODIUM_TABLET_TAP",
    label: "D2-P02: Podium Tablet Tap (Domain 2 Interactive Screen)",
    poseCode: "D2_P02",
    domain: "standing_broadcast_desk",
    requiresDesk: true,
    requiredProps: ["tablet"],
    description: "Standing at podium, right hand taps digital tablet, returning gaze to lens.",
    motionPrompt:
      "Standing at studio podium. Right hand taps digital tablet screen to advance news graphic, smooth 0.3s glance down to tablet, returning direct eye contact up to camera with engaging smile, left hand resting steady on podium.",
    handsPosition: "tapping_tablet",
    recommendedCamera: "cam2",
  },

  // =========================================================================
  // DOMAIN 4: CHROMA WALL SEATED AT DESK (Chroma Desk for 3D Virtual Set)
  // =========================================================================
  D4_P01_CHROMA_DESK_BASE: {
    id: "D4_P01_CHROMA_DESK_BASE",
    label: "D4-P01: Chroma Desk Clasped (Domain 4 Master Base)",
    poseCode: "D4_P01",
    domain: "chroma_wall_seated_desk",
    requiresDesk: true,
    isBridgeBase: true,
    description: "Seated behind green chroma desk with hands clasped neatly on desk surface.",
    motionPrompt:
      "Seated behind green chroma desk against green screen with hands clasped neatly on desk surface. Subtle natural breathing rhythm, calm poised posture, pleasant closed-lip smile, single gentle blink at 2.0s.",
    handsPosition: "resting_on_desk",
    recommendedCamera: "cam1",
  },

  // =========================================================================
  // DOMAIN 5 & 6: INTERVIEW LOUNGE (Standing & Seated Sofa)
  // =========================================================================
  D5_P01_LOUNGE_STAND_BASE: {
    id: "D5_P01_LOUNGE_STAND_BASE",
    label: "D5-P01: Lounge Standing Mic (Domain 5 Bridge Base)",
    poseCode: "D5_P01",
    domain: "interview_lounge_standing",
    requiredProps: ["microphone"],
    isBridgeBase: true, // M_lounge_stand_base
    description: "Standing in modern interview lounge holding wireless microphone.",
    motionPrompt:
      "Standing in modern architectural interview lounge holding silver wireless microphone near chest in right hand. Relaxed conversational posture, warm engaging closed-lip smile, subtle breathing, left hand resting naturally at side.",
    handsPosition: "holding_microphone",
    recommendedCamera: "cam1",
  },

  D6_P01_SOFA_SIT_BASE: {
    id: "D6_P01_SOFA_SIT_BASE",
    label: "D6-P01: Lounge Sofa Armchair (Domain 6 Bridge Base)",
    poseCode: "D6_P01",
    domain: "interview_lounge_seated_sofa",
    isBridgeBase: true, // M_sofa_sit_base
    description: "Seated relaxed in single sofa armchair with arms resting on armrests.",
    motionPrompt:
      "Seated upright and relaxed in modern single sofa armchair in interview lounge set. Arms resting comfortably on sofa armrests, relaxed shoulders, conversational friendly expression with closed lips, subtle breathing.",
    handsPosition: "resting_on_armrests",
    recommendedCamera: "cam1",
  },

  D6_P02_SOFA_CASUAL_EXPLAIN: {
    id: "D6_P02_SOFA_CASUAL_EXPLAIN",
    label: "D6-P02: Sofa Casual Gesture (Domain 6 Conversational)",
    poseCode: "D6_P02",
    domain: "interview_lounge_seated_sofa",
    description: "Right hand lifts naturally from armrest in casual conversational gesture.",
    motionPrompt:
      "Seated in sofa armchair. Right hand lifts naturally from armrest in an open conversational delivery gesture, head tilted slightly in active engagement, left arm steady on armrest, returning hand to armrest by 4.0s.",
    handsPosition: "raised_from_armrest",
    recommendedCamera: "cam1",
  },
};

export function resolvePoseImagePath(pose: ActionPoseState, workspaceRoot: string = process.cwd()): string | null {
  if (pose.sampleImagePath) {
    const full = path.resolve(workspaceRoot, pose.sampleImagePath);
    return full;
  }
  return null;
}

export function getPosesByDomain(domain: BroadcastDomainType): ActionPoseState[] {
  return Object.values(ACTION_POSE_STATES).filter((pose) => pose.domain === domain);
}
