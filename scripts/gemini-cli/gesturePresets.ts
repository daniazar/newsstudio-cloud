/**
 * scripts/gemini-cli/gesturePresets.ts
 *
 * Physical Arm, Hand & Body Gesture Presets.
 */

import { GesturePreset } from "./types";

export const GESTURE_PRESETS: Record<string, GesturePreset> = {
  desk_hands_clasped: {
    id: "desk_hands_clasped",
    label: "🤝 Seated: Hands Clasped Neatly on Desk",
    prompt: "Both hands clasped neatly together on the glass desk surface in front of the anchor, manicured fingers and gold ring clearly visible, relaxed professional posture.",
    category: "seated",
  },
  desk_one_hand_explanatory: {
    id: "desk_one_hand_explanatory",
    label: "✋ Seated: Left Hand on Desk, Right Hand Explanatory Gesture",
    prompt: "Left hand resting flat on the polished glass desk while right hand is raised in an open-palm explanatory gesture toward the camera as if delivering key facts.",
    category: "seated",
  },
  desk_hands_typing_laptop: {
    id: "desk_hands_typing_laptop",
    label: "💻 Seated: Hands Active Near Laptop Keyboard",
    prompt: "Hands active near the open slim silver laptop keyboard as if referencing digital rundown notes, fingers poised naturally, body leaning slightly forward.",
    category: "seated",
  },
  desk_holding_pen_paper: {
    id: "desk_holding_pen_paper",
    label: "✍️ Seated: Holding Luxury Pen Over Document Stack",
    prompt: "Right hand holding a slim silver broadcast pen poised above the document stack on desk, left hand resting flat on glass surface.",
    category: "seated",
  },
  standing_presentation_palm: {
    id: "standing_presentation_palm",
    label: "🖐️ Standing: Open Presentation Palm Gesture",
    prompt: "Standing upright with right hand extended in an open presentation palm gesture toward the viewer, left arm resting naturally by side, confident balanced stance.",
    category: "standing",
  },
  standing_hand_on_hip: {
    id: "standing_hand_on_hip",
    label: "💃 Standing: Hand on Hip (Confident presenter posture)",
    prompt: "Standing with left hand placed confidently on hip, right hand gesturing subtly, shoulders back in an engaging prime-time stance.",
    category: "standing",
  },
  standing_arms_crossed: {
    id: "standing_arms_crossed",
    label: "🙅 Standing: Arms Crossed Authoritatively",
    prompt: "Standing upright with arms folded comfortably across chest in an authoritative, smart, modern executive broadcast stance.",
    category: "standing",
  },
  standing_holding_tablet: {
    id: "standing_holding_tablet",
    label: "📱 Standing: Holding Digital Tablet in Hand",
    prompt: "Standing holding a sleek slim digital tablet in left hand, right hand referencing the screen, engaging direct broadcast delivery.",
    category: "standing",
  },
  standing_pointing_chart: {
    id: "standing_pointing_chart",
    label: "👉 Standing: Pointing Gesture at Video Wall Chart",
    prompt: "Standing beside the 8K video wall with right hand gesturing toward the financial chart graphics on screen, upper body angled toward camera.",
    category: "standing",
  },
  lounge_conversational_hands: {
    id: "lounge_conversational_hands",
    label: "💬 Lounge: Natural Conversational Hand Gestures",
    prompt: "Seated in the leather armchair with hands animated in a natural, relaxed conversational gesture discussing a topic with a guest.",
    category: "lounge",
  },
  lounge_hands_on_knees: {
    id: "lounge_hands_on_knees",
    label: "🧎 Lounge: Hands Resting Gracefully on Lap",
    prompt: "Seated in the club armchair with hands resting gracefully on knees/lap in a poised, dignified interview posture.",
    category: "lounge",
  },
};
