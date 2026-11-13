/**
 * src/lib/ecommerce/personaPromptHelper.ts
 *
 * Persona & Selected Attire Prompt Formulator for E-Commerce Video & Photo Generation.
 * Injects the active NewsStudio persona (Ruby, Blaze, Mateo, Sofia, etc.) and their
 * current selected wardrobe into scene diffusion prompts, ensuring the persona is actively
 * demonstrating, walking on, holding, or showcasing the product in the environment.
 */

import { RUBY_WARDROBE_POSES } from "@/lib/realtime/rubyWardrobePresets";
import { getPersonaById } from "@/lib/tts/personas";
import { detectLanguage,filterPromptForSafety,stripSilentContract } from "./promptSafetyFilter";

export { detectLanguage,stripSilentContract };

export interface PersonaScenePromptDetails {
  personaName: string;
  personaDescription: string;
  attireDescription: string;
  actionClause: string;
  fullPersonaPromptClause: string;
  structuredPrompt?: string;
  templateId?: string;
  templateLabel?: string;
  dialogueText?: string;
}

export interface PersonaPromptOptions {
  personaId?: string;
  attireId?: string;
  productName: string;
  typology?: string;
  mode?: "video" | "photo";
  actionVariant?: string;
  templateIndex?: number;
  dialogue?: string;
  language?: string;
  allowSpeaking?: boolean;
  hasWardrobeRef?: boolean;
  hasProductRef?: boolean;
  performanceClause?: string;
  performanceMood?: string;
}

export interface SettingActionTemplate {
  id: string;
  label: string;
  cameraMovement: string;
  environmentDesc: string;
  actions: {
    time0_25: string;
    time25_55: string;
    time55_80: string;
  };
  photoStagingDesc?: string;
  defaultMoodId?: string;
  defaultPerformance?: string;
}

export interface PerformanceMood {
  id: string;
  label: string;
  emoji: string;
  description: string;
  clause: string;
}

/**
 * 6 curated audio performance & vocal delivery mood modifiers.
 * Instructs the video/audio diffusion models on emotional tone, pacing, cadence, and facial enthusiasm.
 */
export const PERFORMANCE_MOODS: PerformanceMood[] = [
  {
    id: "energetic",
    label: "Energetic & Fast",
    emoji: "⚡",
    description: "Fast-paced, vibrant commercial delivery with crisp articulation and high excitement",
    clause: "energetic, upbeat, fast-paced commercial delivery with bright enthusiasm and crisp diction",
  },
  {
    id: "warm_authoritative",
    label: "Calm & Authoritative",
    emoji: "💎",
    description: "Poised, relaxed cadence, speaking slowly with reassuring architectural authority",
    clause: "warm, calm, poised, speaking slowly with reassuring architectural authority and gentle cadence",
  },
  {
    id: "happy_playful",
    label: "Happy & Radiant",
    emoji: "🌟",
    description: "Joyful, cheerful delivery with a spontaneous delighted smile and bright vocal inflection",
    clause: "happy, radiant, cheerful delivery with a spontaneous delighted smile and expressive vocal inflection",
  },
  {
    id: "intimate_whisper",
    label: "Intimate & Secret",
    emoji: "🤫",
    description: "Close-mic soft-spoken delivery, sharing an insider design secret with intriguing warmth",
    clause: "intimate, close-mic soft-spoken delivery, sharing an insider design secret with intriguing warmth",
  },
  {
    id: "dramatic_passion",
    label: "Dramatic & Passionate",
    emoji: "🚀",
    description: "Bold vocal emphasis, compelling conviction, and dynamic cinematic presence",
    clause: "dramatic, passionate, high-conviction delivery with bold vocal emphasis and compelling presence",
  },
  {
    id: "emotional_touching",
    label: "Emotional & Heartfelt",
    emoji: "🥺",
    description: "Deeply moving, heartfelt emotional delivery with tender cadence and authentic warmth",
    clause: "deeply moving, vulnerable, heartfelt emotional delivery with sincere touching cadence",
  },
];

export function getPerformanceMood(moodId?: string): PerformanceMood | undefined {
  if (!moodId) return undefined;
  return PERFORMANCE_MOODS.find((m) => m.id.toLowerCase() === moodId.toLowerCase());
}

export function getPerformanceMoodClause(moodId?: string, customClause?: string): string {
  if (customClause && customClause.trim()) return customClause.trim();
  const mood = getPerformanceMood(moodId);
  return mood ? mood.clause : PERFORMANCE_MOODS[0].clause;
}

export interface SceneDialogueOption {
  id: string;
  label: string;
  text: string;
}

export interface ReconcilePromptOptions {
  productName: string;
  dialogue?: string;
  language?: string;
  allowSpeaking?: boolean;
  settingKey?: string;
  templateIndex?: number;
  rerollTemplate?: boolean;
  performanceClause?: string;
  performanceMood?: string;
}

/**
 * 6 curated action & staging templates per environment setting.
 * Guarantees rich variety, realistic physical interaction with Reference Image #2,
 * and eliminates repetitive clone prompts across scenes.
 */
export const SETTING_ACTION_TEMPLATES: Record<string, SettingActionTemplate[]> = {
  showroom: [
    {
      id: "showroom_wall_extract",
      label: "1/6: Wall Plank Extract & Grain Touch",
      cameraMovement:
        "Smooth floating cinematic tracking glide at eye level moving parallel along the showroom exhibition wall, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Upscale architectural design showroom featuring floor-to-ceiling exhibition walls displaying mounted gallery samples of curated flooring planks, wall textures, and warm directional spotlights",
      actions: {
        time0_25:
          "Presenter stands poised beside the architectural exhibition wall, gazing appreciatively at the mounted displays",
        time25_55:
          "Presenter smoothly slides out an authentic sample plank of the product, running fingertips along the realistic wood grain texture and beveled edge to feel its craftsmanship",
        time55_80:
          "Presenter turns gracefully toward the camera, holding the sample plank angled to catch the warm spotlights with a delighted, confident smile",
      },
      photoStagingDesc:
        "Presenter standing poised beside the wall-mounted gallery display of the product in an architectural design showroom, holding a sample plank angled toward soft gallery spotlights to reveal its authentic texture",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking slowly with reassuring architectural authority and gentle cadence",
    },
    {
      id: "showroom_click_joint",
      label: "2/6: Precision Click-Lock Joint Assembly",
      cameraMovement:
        "Slow 3D macro dolly push focusing smoothly down toward the presentation table, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Bright high-end interior design studio staging area with sleek marble-topped consultation island and warm ambient architectural cove lighting",
      actions: {
        time0_25:
          "Presenter stands poised behind the consultation island with two interlocking planks of the product laid out",
        time25_55:
          "Presenter aligns the precision tongue-and-groove joint of the planks, smoothly snapping them together with a clean, effortless click to showcase the seamless DIY installation",
        time55_80:
          "Presenter looks up directly into the camera lens with an enthusiastic smile, demonstrating the completely gap-free seamless joint with her fingertips",
      },
      photoStagingDesc:
        "Presenter seated at a sleek marble studio consultation table, hands resting elegantly beside two seamlessly joined planks of the product, highlighting the precision click-lock edge",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat, fast-paced commercial delivery with bright enthusiasm and crisp diction",
    },
    {
      id: "showroom_glare_reflection",
      label: "3/6: Low-Angle Natural Light & Glare Test",
      cameraMovement:
        "Low-angle cinematic tracking glide rising steadily from floor level toward waist height, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Modern illuminated showroom gallery featuring expansive floor bays bathed in directional warm ambient spotlights and natural window light",
      actions: {
        time0_25:
          "Presenter walks smoothly into the bay, observing the subtle matte reflections and authentic embossed texture under the gallery spotlights",
        time25_55:
          "Presenter crouches down gracefully, tilting an authentic plank against the light to demonstrate the anti-glare scratch-resistant protective topcoat",
        time55_80:
          "Presenter rises gracefully and addresses the camera with a poised, authoritative demeanor",
      },
      photoStagingDesc:
        "Presenter posed gracefully in a low-angle perspective beside a pristine installed bay of the product, soft directional side-light highlighting the matte texture and depth",
      defaultMoodId: "intimate_whisper",
      defaultPerformance:
        "intimate, close-mic soft-spoken delivery, sharing an insider design secret with intriguing warmth",
    },
    {
      id: "showroom_scratch_wear",
      label: "4/6: Surface Durability & Scratch Resistance Test",
      cameraMovement:
        "Close-range cinematic arc orbit circling smoothly around the presenter's hands, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Upscale architectural material testing studio with clean minimalist workstations and neutral balanced commercial keylights",
      actions: {
        time0_25:
          "Presenter introduces the product sample plank resting on a testing workbench with confident professional posture",
        time25_55:
          "Presenter runs a firm fingertip and coin edge across the protective wear layer to demonstrate its scratch and abrasion resistance, showing the pristine unblemished surface",
        time55_80:
          "Presenter turns the plank toward the lens and addresses the viewer with an impressed, confident expression",
      },
      photoStagingDesc:
        "Presenter standing confidently behind a modern material test station, holding the product plank forward to show its flawless scratch-resistant finish",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat commercial delivery with confident clarity and emphatic gestures",
    },
    {
      id: "showroom_palette_swatch",
      label: "5/6: Architectural Swatch & Texture Comparison",
      cameraMovement:
        "Smooth continuous slider glide moving horizontally across the showroom color consultation gallery, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Modern interior design showroom featuring an illuminated exhibition wall of large architectural paint swatches, texture tiles, and complementary floorboards",
      actions: {
        time0_25:
          "Presenter walks up to an illuminated showroom gallery wall of architectural swatches and flooring displays",
        time25_55:
          "Presenter holds a designer color swatch card and compares it against the product sample plank and wall texture with an appreciative, discerning expression",
        time55_80:
          "Presenter turns toward the camera with a satisfied nod, showcasing the versatile harmony of the palette",
      },
      photoStagingDesc:
        "Presenter standing beside a gallery wall of large architectural paint swatches and complementary flooring displays, holding a color swatch card with an appreciative warm smile",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking with discerning interior designer taste and sophisticated charm",
    },
    {
      id: "showroom_space_transition",
      label: "6/6: Open Space Walk-Through & Step Test",
      cameraMovement:
        "Dynamic steady forward tracking shot moving alongside the presenter as she walks, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Expansive double-height architectural showroom suite featuring open staging bays, floor-to-ceiling glass partitions, and warm Scandinavian accents",
      actions: {
        time0_25:
          "Presenter steps confidently across the transition zone onto the installed product flooring with fluid, graceful strides",
        time25_55:
          "Presenter pauses mid-stride, turning slightly to feel the solid underfoot acoustic stability and comfortable tread of the surface",
        time55_80:
          "Presenter turns fully to camera with an inviting gesture toward the surrounding expanse, smiling warmly",
      },
      photoStagingDesc:
        "Presenter captured mid-stride walking gracefully across the installed product in an expansive architectural showroom, radiant confident posture",
      defaultMoodId: "dramatic_passion",
      defaultPerformance:
        "dramatic, passionate, high-conviction delivery with bold vocal emphasis and compelling presence",
    },
  ],
  living_room: [
    {
      id: "living_sunlit_glide",
      label: "1/6: Sunlit Floor Glide & Texture Touch",
      cameraMovement:
        "Smooth floating aerial glide moving steadily forward across the floor, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Expansive sun-drenched modern luxury living room with floor-to-ceiling windows, natural morning sunlight streaming in, and the product seamlessly installed throughout",
      actions: {
        time0_25:
          "Presenter walks gracefully across the installed product floorboards toward the center of the sunlit room",
        time25_55:
          "Presenter kneels down gracefully and gently runs her fingertips over the smooth natural wood grain texture with a satisfied smile",
        time55_80:
          "Presenter rises smoothly and gestures warmly toward the expansive room, speaking directly to camera",
      },
      photoStagingDesc:
        "Presenter sitting comfortably and relaxed on a plush contemporary minimalist sofa in an expansive sunlit living room with the installed product, holding an authentic sample plank",
      defaultMoodId: "happy_playful",
      defaultPerformance:
        "happy, radiant, cheerful delivery with a spontaneous delighted smile and expressive vocal inflection",
    },
    {
      id: "living_sofa_lounge",
      label: "2/6: Sofa Lounge & Sample Plank Showcase",
      cameraMovement:
        "Slow cinematic 3D dolly push-in tracking smoothly toward the designer lounge seating, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Contemporary minimalist living room with plush cream sofa, linen textures, soft morning window light, and the product installed seamlessly across the floor",
      actions: {
        time0_25:
          "Presenter sits comfortably on the sofa, resting an authentic sample plank of the product across her lap",
        time25_55:
          "Presenter lifts the sample plank into both hands, tilting it to showcase its authentic beveled edge and rich wood grain in the natural light",
        time55_80:
          "Presenter smiles warmly into the camera lens, presenting the plank with inviting personal enthusiasm",
      },
      photoStagingDesc:
        "Presenter seated gracefully in a modern designer armchair holding a sample plank of the product, warm soft morning light highlighting the floor grain and textures",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking slowly with reassuring architectural authority and gentle cadence",
    },
    {
      id: "living_step_sound",
      label: "3/6: Barefoot Step & Sound Dampening Check",
      cameraMovement:
        "Medium tracking glide panning smoothly from feet level up to eye level, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Quiet, serene high-end residential apartment with minimalist decor, soft acoustic curtains, and installed product floor",
      actions: {
        time0_25:
          "Presenter walks gracefully barefoot across the installed product floor, feeling the warm pleasant surface underfoot",
        time25_55:
          "Presenter pauses to demonstrate the superior acoustic sound-dampening qualities and solid feel underfoot with gentle rhythmic steps",
        time55_80:
          "Presenter turns toward camera with a calm, reassured smile, speaking with friendly conversational authority",
      },
      photoStagingDesc:
        "Presenter standing barefoot on the installed product floor in a serene living space, warm relaxed natural posture",
      defaultMoodId: "intimate_whisper",
      defaultPerformance:
        "intimate, close-mic soft-spoken delivery, sharing an insider design secret with intriguing warmth",
    },
    {
      id: "living_furniture_harmony",
      label: "4/6: Living Room Flow & Furniture Harmony",
      cameraMovement:
        "Cinematic wide arc orbit moving gently around the living room coffee table and sofa arrangement, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Designer Scandinavian living room with modern oak coffee table, designer ceramics, woven rugs, and seamless product flooring",
      actions: {
        time0_25:
          "Presenter stands gracefully behind the living room seating area, framing the cohesive design harmony of the room",
        time25_55:
          "Presenter walks gently around the coffee table, lightly touching the furniture while pointing out how the product floor anchors the entire interior",
        time55_80:
          "Presenter looks directly into camera with an engaging smile and confident nod of approval",
      },
      photoStagingDesc:
        "Presenter standing beside a designer living room arrangement, installed product floorboards glowing under warm morning sunbeams",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking with discerning interior designer taste and sophisticated charm",
    },
    {
      id: "living_family_durability",
      label: "5/6: Family Living Durability & Spill Wipe",
      cameraMovement:
        "Gentle downward push-in leveling out to a relaxed low angle, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Warm inviting family living room with bright daylight, contemporary home decor, and waterproof product flooring",
      actions: {
        time0_25:
          "Presenter steps into frame holding a soft cloth, looking down at a minor simulated water splash on the floor",
        time25_55:
          "Presenter effortlessly wipes the surface clean with a single smooth swipe, demonstrating the 100% waterproof sealed core with zero swelling",
        time55_80:
          "Presenter rises with an effortless, delighted smile and speaks directly to camera about stress-free daily living",
      },
      photoStagingDesc:
        "Presenter kneeling gracefully on the pristine product floor holding a clean cloth, warm reassuring smile",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat commercial delivery highlighting stress-free living with confident clarity",
    },
    {
      id: "living_evening_ambiance",
      label: "6/6: Evening Warm Glow & Depth Reveal",
      cameraMovement:
        "Smooth continuous 3D orbital camera motion circling gracefully through the space, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Twilight living room interior with warm architectural cove lighting, floor lamps casting amber highlights, and floorboards with deep rich tones",
      actions: {
        time0_25:
          "Presenter stands poised in the warm twilight ambiance, holding a sample plank catching the warm ambient glow",
        time25_55:
          "Presenter rotates the sample plank slowly to reveal the rich color depth and authentic grain variation in cozy evening light",
        time55_80:
          "Presenter addresses the camera with a sophisticated, warm demeanor, delivering the closing recommendation",
      },
      photoStagingDesc:
        "Presenter posed in an elegant evening living room with warm amber lighting reflecting across the installed product floor",
      defaultMoodId: "intimate_whisper",
      defaultPerformance:
        "intimate, close-mic soft-spoken delivery, sharing an insider design secret with intriguing warmth",
    },
  ],
  kitchen: [
    {
      id: "kitchen_water_wipe",
      label: "1/6: Water Resistance & Quick Wipe Demo",
      cameraMovement:
        "Smooth descending camera push leveling out at countertop level, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Contemporary luxury kitchen with marble waterfall island, matte cabinetry, recessed LED accents, and waterproof product flooring",
      actions: {
        time0_25:
          "Presenter stands poised beside the kitchen island, showcasing the pristine floor surface in high-traffic cooking zones",
        time25_55:
          "Presenter casually wipes away a simulated liquid spill with a paper towel, smiling at how the impermeable surface repels moisture completely",
        time55_80:
          "Presenter stands tall, gesturing toward the spotless floor and speaking directly to camera with reassuring confidence",
      },
      photoStagingDesc:
        "Presenter standing gracefully in an ultra-modern kitchen with matte cabinetry, installed product flooring gleaming under warm recessed LEDs",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat commercial delivery with confident clarity and bright tempo",
    },
    {
      id: "kitchen_island_walk",
      label: "2/6: Kitchen Island Walk-Around & Staging",
      cameraMovement:
        "Cinematic smooth tracking shot gliding around the curve of the kitchen island, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Open-concept gourmet kitchen with architectural brass fixtures, stone surfaces, and seamless product flooring extending throughout",
      actions: {
        time0_25:
          "Presenter walks smoothly along the kitchen island, with fluid confident strides highlighting the open layout",
        time25_55:
          "Presenter pauses at the corner of the island, resting one hand lightly on the counter while glancing down appreciatively at the floor",
        time55_80:
          "Presenter turns to camera with a bright engaging expression, inviting viewers into the space",
      },
      photoStagingDesc:
        "Presenter leaning lightly against a marble kitchen island, product flooring seamlessly anchoring the gourmet culinary space",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking slowly with reassuring architectural authority and gentle cadence",
    },
    {
      id: "kitchen_counter_match",
      label: "3/6: Cabinetry & Countertop Color Match",
      cameraMovement:
        "Slow macro push-in panning from cabinet baseboards down to the floor joint, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Upscale modern kitchen showcasing harmonious material palettes, natural wood veneers, and the product installed flush",
      actions: {
        time0_25:
          "Presenter holds an authentic sample plank of the product against the cabinet baseboard to demonstrate color harmony",
        time25_55:
          "Presenter tilts the plank to compare its warm grain against the stone countertops and cabinetry finishes",
        time55_80:
          "Presenter looks up with a satisfied, enthusiastic expression, speaking directly to camera about effortless interior styling",
      },
      photoStagingDesc:
        "Presenter seated gracefully on a kitchen barstool holding a product sample plank, soft morning light illuminating the matching cabinetry and floor",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking with discerning culinary and interior design taste",
    },
    {
      id: "kitchen_drop_impact",
      label: "4/6: Everyday Drop & Impact Resilience",
      cameraMovement:
        "Dynamic low-angle slow-motion push-in focused on the floor plane, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Bright sunlit residential kitchen with stainless steel appliances, ceramic cookware, and ultra-durable product flooring",
      actions: {
        time0_25:
          "Presenter demonstrates everyday kitchen durability while preparing food at the preparation station",
        time25_55:
          "Presenter simulates an accidental utensil drop, pointing out the zero-dent, impact-resistant surface with an impressed nod",
        time55_80:
          "Presenter addresses the camera with a confident smile, highlighting long-term family peace of mind",
      },
      photoStagingDesc:
        "Presenter posed confidently in a bright kitchen setting, showcasing the pristine impact-tested product floor",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat, fast-paced commercial delivery with bold conviction and reassurance",
    },
    {
      id: "kitchen_undercabinet_glow",
      label: "5/6: Under-Cabinet Lighting Grain Pop",
      cameraMovement:
        "Continuous 3D arc orbit gliding gently past under-cabinet illumination, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Modern luxury kitchen with warm LED kickplate strip lighting casting a golden wash across the product flooring",
      actions: {
        time0_25:
          "Presenter stands poised as warm kickplate lighting illuminates the floorboards, revealing the deep embossed grain",
        time25_55:
          "Presenter walks smoothly along the lit perimeter, showcasing how the floor finish reacts warmly to modern architectural lighting",
        time55_80:
          "Presenter turns toward camera with a sophisticated smile, delivering the commercial highlight",
      },
      photoStagingDesc:
        "Presenter standing in an evening kitchen with glowing kickplate lights reflecting warmly across the installed product floorboards",
      defaultMoodId: "happy_playful",
      defaultPerformance:
        "happy, radiant, cheerful delivery with a spontaneous delighted smile and bright evening warmth",
    },
    {
      id: "kitchen_open_concept_flow",
      label: "6/6: Kitchen-to-Dining Seamless Flow",
      cameraMovement:
        "Wide continuous floating glide traveling smoothly from the kitchen into the adjacent dining room, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Expansive open-concept architectural residence where the product flooring flows seamlessly between kitchen and dining spaces without transition thresholds",
      actions: {
        time0_25:
          "Presenter walks smoothly from the kitchen island into the bright dining area across the uninterrupted flooring",
        time25_55:
          "Presenter pauses at the center of the expansive space, gesturing expansively at the continuous threshold-free installation",
        time55_80:
          "Presenter turns to camera with a delighted, authoritative smile, explaining the spatial expansion benefit",
      },
      photoStagingDesc:
        "Presenter standing at the threshold-free junction between kitchen and dining room, expansive product flooring stretching out seamlessly",
      defaultMoodId: "dramatic_passion",
      defaultPerformance:
        "dramatic, passionate, high-conviction delivery with charismatic flair and inviting warmth",
    },
  ],
  general: [
    {
      id: "general_hands_on",
      label: "1/6: Hands-On Detail Inspection",
      cameraMovement:
        "Slow cinematic 3D dolly push-in toward the presenter, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Expansive contemporary architectural showroom with clean lines, soft diffuse keylights, and minimalist staging plinths",
      actions: {
        time0_25:
          "Presenter stands poised and elegant beside the staging plinth, introducing the product with welcoming gestures",
        time25_55:
          "Presenter gently handles and presents the product, turning it to highlight its premium craftsmanship, tactile finish, and refined contours",
        time55_80:
          "Presenter turns to camera with an appreciative, confident smile, speaking with authoritative commercial charisma",
      },
      photoStagingDesc:
        "Presenter standing poised beside the elegantly staged product in an architectural showroom, warm friendly smile",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat, fast-paced commercial delivery with bright enthusiasm and crisp diction",
    },
    {
      id: "general_ergonomic_demo",
      label: "2/6: Ergonomic Use & Interactive Demo",
      cameraMovement:
        "Dynamic 3D arc orbit circling smoothly around the presenter, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "High-end modern lifestyle interior with designer furniture, natural ambient daylight, and polished minimalist surfaces",
      actions: {
        time0_25:
          "Presenter approaches the staging area with energetic, fluid motion and natural posture",
        time25_55:
          "Presenter demonstrates the intuitive ease of use and effortless functionality of the product with precision hand movements",
        time55_80:
          "Presenter looks up directly into the camera lens with a delighted, enthusiastic expression",
      },
      photoStagingDesc:
        "Presenter demonstrating the product with natural poise in a sunlit modern interior, relaxed confident demeanor",
      defaultMoodId: "happy_playful",
      defaultPerformance:
        "happy, radiant, cheerful delivery with a spontaneous delighted smile and bright vocal inflection",
    },
    {
      id: "general_unboxing_reveal",
      label: "3/6: Unboxing & Craftsmanship Reveal",
      cameraMovement:
        "Gentle downward boom shot descending smoothly to tabletop level, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Upscale design consultation studio with sleek oak conference desk, soft studio softboxes, and neutral backdrop",
      actions: {
        time0_25:
          "Presenter stands behind the presentation table, framing the pristine unboxed product with focused anticipation",
        time25_55:
          "Presenter lifts the product with both hands, presenting its sleek proportions and authentic materials to the keylight",
        time55_80:
          "Presenter addresses the viewer with an authoritative, impressed nod and engaging smile",
      },
      photoStagingDesc:
        "Presenter seated at an executive studio table holding the product forward, clean catalog lighting highlighting premium details",
      defaultMoodId: "warm_authoritative",
      defaultPerformance:
        "warm, calm, poised, speaking slowly with reassuring architectural authority and gentle cadence",
    },
    {
      id: "general_lifestyle_integration",
      label: "4/6: Lifestyle Integration & Daily Use",
      cameraMovement:
        "Smooth lateral slider glide moving alongside the presenter, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Bright sunlit open-plan architectural residence with panoramic windows and tasteful modern interior decor",
      actions: {
        time0_25:
          "Presenter interacts naturally with the product as part of a seamless daily routine in the beautiful space",
        time25_55:
          "Presenter pauses to showcase how effortlessly the product integrates into modern high-standard lifestyles",
        time55_80:
          "Presenter smiles warmly into the camera, sharing a genuine endorsement with authentic presence",
      },
      photoStagingDesc:
        "Presenter captured in an authentic lifestyle moment with the product, natural morning light casting soft reflections",
      defaultMoodId: "happy_playful",
      defaultPerformance:
        "happy, radiant, cheerful delivery with a spontaneous delighted smile and expressive vocal inflection",
    },
    {
      id: "general_feature_walkthrough",
      label: "5/6: Feature Walkthrough & Direct Address",
      cameraMovement:
        "Cinematic slow push-in maintaining crisp focus on the presenter's face and the product, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "State-of-the-art commercial studio set with soft architectural backlighting and subtle depth of field",
      actions: {
        time0_25:
          "Presenter establishes direct eye contact with the camera, speaking with clear diction and compelling enthusiasm",
        time25_55:
          "Presenter points out specific hallmark features on the product, emphasizing durability, design, and exceptional value",
        time55_80:
          "Presenter concludes with a confident closing gesture, inviting the viewer to take action",
      },
      photoStagingDesc:
        "Presenter holding the product angled toward camera in a commercial broadcast studio setting, sharp focus and radiant expression",
      defaultMoodId: "energetic",
      defaultPerformance:
        "energetic, upbeat commercial delivery with clear technical precision and compelling enthusiasm",
    },
    {
      id: "general_transformation_reveal",
      label: "6/6: Space Transformation & Dramatic Reveal",
      cameraMovement:
        "Expansive 3D dolly pull-back sweeping from close-up to wide environmental view, pure unobstructed camera POV without rigs or drones",
      environmentDesc:
        "Stunning architectural penthouse suite with dramatic panoramic city views through floor-to-ceiling glass",
      actions: {
        time0_25:
          "Presenter begins close to the product, highlighting its singular craftsmanship and aesthetic impact",
        time25_55:
          "Presenter steps back smoothly as the camera reveals the full breathtaking environment enhanced by the product",
        time55_80:
          "Presenter turns to camera with a radiant, triumphant smile, delivering the final brand statement",
      },
      photoStagingDesc:
        "Presenter posed majestically in an expansive penthouse setting with the product featured prominently, dramatic ambient lighting",
      defaultMoodId: "dramatic_passion",
      defaultPerformance:
        "dramatic, passionate, high-conviction delivery with bold vocal emphasis and compelling presence",
    },
  ],
};

/**
 * Resolves the primary environment setting key from actionVariant, typology, or prompt keywords
 */
export function resolveSettingKey(
  actionVariant?: string,
  typology?: string,
  rawPrompt?: string
): "showroom" | "living_room" | "kitchen" | "general" {
  const signal = `${actionVariant || ""} ${typology || ""} ${rawPrompt || ""}`.toLowerCase();
  if (signal.includes("kitchen") || signal.includes("island") || signal.includes("countertop")) {
    return "kitchen";
  }
  if (
    signal.includes("showroom") ||
    signal.includes("gallery") ||
    signal.includes("wall_mounted") ||
    signal.includes("paint_swatches") ||
    signal.includes("sample board") ||
    signal.includes("exhibition")
  ) {
    return "showroom";
  }
  if (
    signal.includes("living_room") ||
    signal.includes("living") ||
    signal.includes("sofa") ||
    signal.includes("sunroom") ||
    signal.includes("scandinavian") ||
    signal.includes("floor") ||
    signal.includes("piso")
  ) {
    return "living_room";
  }
  if (typology === "surface_material") {
    return "showroom";
  }
  return "general";
}

/**
 * Returns all 6 action templates for a given setting key
 */
export function getSettingActionTemplates(settingKey?: string): SettingActionTemplate[] {
  const key = settingKey && SETTING_ACTION_TEMPLATES[settingKey] ? settingKey : "showroom";
  return SETTING_ACTION_TEMPLATES[key] || SETTING_ACTION_TEMPLATES.showroom;
}

/**
 * Gets a specific setting action template by index (modulo wrapped)
 */
export function getSettingActionTemplate(
  settingKey?: string,
  index: number = 0
): SettingActionTemplate {
  const list = getSettingActionTemplates(settingKey);
  const safeIdx = ((index % list.length) + list.length) % list.length;
  return list[safeIdx];
}

/**
 * Generates 6 distinct commercial dialogue options tailored to the product in the specified language.
 * Clean, natural, single-sentence spoken lines designed to prevent audio synthesis failures.
 */
export function getSceneDialogueVariations(
  productName: string,
  language: string = "Spanish"
): SceneDialogueOption[] {
  const langLower = (language || "").toLowerCase().trim();
  const isPortuguese =
    langLower.includes("portuguese") ||
    langLower === "pt" ||
    langLower.startsWith("pt-");
  const isSpanish =
    !isPortuguese &&
    (!language ||
      langLower.includes("spanish") ||
      langLower.includes("español") ||
      langLower === "es" ||
      langLower.startsWith("es-"));

  if (isSpanish) {
    return [
      {
        id: "curiosity_hook",
        label: "Curiosity Hook",
        text: `¿Buscás renovar tus ambientes sin meterte en obras interminables? Mirá lo que es ${productName}.`,
      },
      {
        id: "click_ease",
        label: "Click System Ease",
        text: `Con el innovador sistema Click de ${productName}, lo instalás vos mismo en una tarde y cambiás tu espacio.`,
      },
      {
        id: "sensory_texture",
        label: "Sensory Woodgrain",
        text: `Sentí la textura de la veta natural y la calidez que ${productName} le aporta a cada rincón de tu hogar.`,
      },
      {
        id: "transformation",
        label: "Space Transformation",
        text: `Mirá la luminosidad y modernidad que ${productName} le da al ambiente: una transformación instantánea.`,
      },
      {
        id: "architect_quality",
        label: "Architectural Quality",
        text: `Con ${productName} tenés resistencia total al agua, al tránsito diario y a los rayones con calidad arquitectónica.`,
      },
      {
        id: "compelling_cta",
        label: "Compelling CTA",
        text: `Elegí ${productName} con calidad garantizada para renovar tu hogar y disfrutá de un cambio extraordinario hoy mismo.`,
      },
    ];
  }

  if (isPortuguese) {
    return [
      {
        id: "curiosity_hook",
        label: "Curiosity Hook",
        text: `Quer transformar seus ambientes sem quebra-quebra? Conheça ${productName}.`,
      },
      {
        id: "click_ease",
        label: "Click System Ease",
        text: `Com o sistema de encaixe fácil, você mesmo instala e renova seu espaço em poucas horas.`,
      },
      {
        id: "sensory_texture",
        label: "Sensory Woodgrain",
        text: `Sinta a textura natural e a sofisticação que combinam perfeitamente com o seu estilo de vida.`,
      },
      {
        id: "transformation",
        label: "Space Transformation",
        text: `Veja como a iluminação e o visual do ambiente mudam completamente com essa instalação.`,
      },
      {
        id: "architect_quality",
        label: "Architectural Quality",
        text: `Alta resistência à água, riscos e tráfego intenso com padrão de acabamento arquitetônico.`,
      },
      {
        id: "compelling_cta",
        label: "Compelling CTA",
        text: `Garanta a máxima qualidade para o seu projeto e renove seus ambientes com toda confiança hoje mesmo.`,
      },
    ];
  }

  // Default: English
  return [
    {
      id: "curiosity_hook",
      label: "Curiosity Hook",
      text: `Looking to completely elevate your living space without messy renovations? Look at ${productName}.`,
    },
    {
      id: "click_ease",
      label: "Click System Ease",
      text: `With the precision click-lock system, you can install it yourself in a single afternoon with zero mess.`,
    },
    {
      id: "sensory_texture",
      label: "Sensory Woodgrain",
      text: `Feel the authentic natural grain and refined texture that brings timeless warmth to every corner.`,
    },
    {
      id: "transformation",
      label: "Space Transformation",
      text: `See the dramatic transformation: instant brightness, modern warmth, and architectural sophistication.`,
    },
    {
      id: "architect_quality",
      label: "Architectural Quality",
      text: `Engineered with commercial-grade scratch and water resistance for effortless daily living.`,
    },
    {
      id: "compelling_cta",
      label: "Compelling CTA",
      text: `Choose guaranteed architectural craftsmanship and transform your home with confidence today.`,
    },
  ];
}

/**
 * Builds an ultra-structured, timestamp-choreographed Google Veo video prompt.
 * Strictly separates:
 * [Environment]: Architectural setting & lighting
 * [Persona]: Wardrobe and traits matching Reference Image #1
 * [Camera]: Precise cinematography motion
 * [Action]: Timestamp-accurate beats (0-2.5s, 2.5-5.5s, 5.5-8.0s) interacting with Reference Image #2
 * [Dialogue]: Spoken dialogue clause in target language or clean closed-mouth contract
 */
export function buildStructuredVideoPrompt(options: {
  productName: string;
  personaName?: string;
  personaTraits?: string;
  attireDesc?: string;
  settingKey?: string;
  templateIndex?: number;
  cameraMovement?: string;
  dialogue?: string;
  language?: string;
  allowSpeaking?: boolean;
  performanceClause?: string;
  performanceMood?: string;
}): string {
  const prodName = options.productName || "the product";
  const sKey = resolveSettingKey(options.settingKey, undefined);
  const template = getSettingActionTemplate(sKey, options.templateIndex ?? 0);

  const personaTraits =
    options.personaTraits ||
    "charismatic elegant female presenter with long wavy auburn hair and radiant confident expression";
  const attireDesc =
    options.attireDesc || "an elegant tailored burgundy velvet evening dress";

  const camera = options.cameraMovement || template.cameraMovement;

  const action0_25 = template.actions.time0_25.replace(/the product/gi, prodName);
  const action25_55 = `${template.actions.time25_55.replace(
    /the product/gi,
    prodName
  )}, while the presenter showcases and interacts with the exact product shown in the second reference image (${prodName}), faithfully reproducing the authentic finish, texture, and details of the product reference photo`;
  const action55_80 = template.actions.time55_80.replace(/the product/gi, prodName);

  const shouldSpeak = options.allowSpeaking !== false;
  let dialogueClause = "";

  if (shouldSpeak) {
    const rawDialogue = (options.dialogue || "")
      .replace(/\[sfx:[^\]]+\]/gi, "")
      .replace(/["“”]/g, "'")
      .trim();
    const cleanDialogue = rawDialogue.replace(/^'+|'+$/g, "").trim();
    const resolvedLang =
      options.language && options.language !== "auto"
        ? options.language
        : cleanDialogue
        ? detectLanguage(cleanDialogue)
        : "Spanish";

    const speechText =
      cleanDialogue ||
      getSceneDialogueVariations(prodName, resolvedLang)[(options.templateIndex || 0) % 6]?.text ||
      `Descubrí la máxima calidad y elegancia de ${prodName}.`;

    const perfClause =
      options.performanceClause?.trim() ||
      (options.performanceMood ? getPerformanceMoodClause(options.performanceMood) : undefined) ||
      template.defaultPerformance ||
      "energetic, upbeat, fast-paced commercial delivery with bright enthusiasm and crisp diction";

    dialogueClause = `the presenter is speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in ${resolvedLang}: "${speechText}". Performance delivery: ${perfClause}. Crisp broadcast vocal audio synchronized with realistic mouth articulation and natural room acoustic presence`;
  } else {
    dialogueClause =
      "silent on-camera presenter with closed mouth, poised serene facial expression, persona remaining silent with closed mouth, spoken narration with voiceover, voiceover narration only, clean ambient room acoustics, absolutely no on-camera talking or lip movement";
  }

  const prompt = `[Environment]: ${template.environmentDesc}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame, 8k photorealistic commercial quality, 30fps.

[Persona]: featuring a ${personaTraits}, dressed in ${attireDesc}. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.

[Camera]: ${camera}.

[Action]:
- 0.0s - 2.5s: ${action0_25}.
- 2.5s - 5.5s: ${action25_55}.
- 5.5s - 8.0s: ${action55_80}.

[Dialogue]: ${dialogueClause}`;

  return filterPromptForSafety(prompt, { allowSpeaking: shouldSpeak });
}

/**
 * Builds a structured commercial photo studio prompt for Gemini / Imagen 3 (without timestamps).
 * Strictly organizes environment, persona & wardrobe, product staging, lighting, and composition.
 */
export function buildStructuredPhotoPrompt(options: {
  productName: string;
  personaName?: string;
  personaTraits?: string;
  attireDesc?: string;
  settingKey?: string;
  templateIndex?: number;
  environmentDesc?: string;
  lightingModifier?: string;
  typology?: string;
}): string {
  const prodName = options.productName || "the product";
  const sKey = resolveSettingKey(options.settingKey, options.typology);
  const template = getSettingActionTemplate(sKey, options.templateIndex ?? 0);

  const personaTraits =
    options.personaTraits ||
    "charismatic elegant female presenter with long wavy auburn hair and radiant confident expression";
  const attireDesc =
    options.attireDesc || "an elegant tailored burgundy velvet evening dress";

  const env = options.environmentDesc || template.environmentDesc;
  const isDiscrete = options.typology === "discrete_object";
  const stagingDesc = isDiscrete
    ? `resting on a matte black desk setup, studio softbox lighting, crisp metallic highlights, macro depth of field`
    : template.photoStagingDesc
    ? template.photoStagingDesc.replace(/the product/gi, prodName)
    : `standing poised and presenting ${prodName} to showcase its realistic texture, beveled edge, and fine craftsmanship`;

  const lighting =
    options.lightingModifier ||
    "Commercial 3-point softbox studio lighting, neutral white balanced, subtle specular reflections, 8k luxury catalog look";

  const styleClause = isDiscrete
    ? "Clean minimalist studio photography, Hasselblad medium format perspective, razor-sharp textures, 8k resolution, professional commercial studio photography"
    : "High-end commercial architectural catalog photography, Hasselblad medium format perspective, razor-sharp textures, 8k resolution, professional commercial studio photography";

  const prompt = `[Environment]: ${env}.

[Persona & Wardrobe]: featuring a ${personaTraits}, dressed in ${attireDesc}. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.

[Product Staging]: ${stagingDesc}, while the presenter showcases and interacts with the exact product shown in the second reference image (${prodName}), faithfully reproducing the authentic finish, grain, and physical details of the product reference photo.

[Lighting & Atmosphere]: ${lighting}, rich depth and natural soft shadows.

[Composition & Style]: ${styleClause}.`;

  return filterPromptForSafety(prompt);
}

/**
 * Known curated visual profiles for primary NewsStudio personas.
 * Descriptions focus strictly on physical traits, styling, and attire rather than
 * proper personal names, ensuring 100% compliance with Google Veo/Imagen safety policies.
 */
const CURATED_PERSONA_TRAITS: Record<string, { name: string; traits: string; defaultAttire: string }> = {
  ruby: {
    name: "Ruby Vance",
    traits: "charismatic elegant female presenter with long wavy auburn hair and radiant confident expression",
    defaultAttire: "an elegant tailored burgundy velvet evening dress",
  },
  ruby_vance: {
    name: "Ruby Vance",
    traits: "charismatic elegant female presenter with long wavy auburn hair and radiant confident expression",
    defaultAttire: "an elegant tailored burgundy velvet evening dress",
  },
  blaze: {
    name: "Blaze Wilder",
    traits: "edgy magnetic female presenter with modern dark styled hair and bold athletic confidence",
    defaultAttire: "a fitted black moto leather jacket with silver zipper accents over a sleek black top",
  },
  blaze_wilder: {
    name: "Blaze Wilder",
    traits: "edgy magnetic female presenter with modern dark styled hair and bold athletic confidence",
    defaultAttire: "a fitted black moto leather jacket with silver zipper accents over a sleek black top",
  },
  mateo: {
    name: "Mateo Rossi",
    traits: "sharp sophisticated male presenter with clean grooming and authoritative charisma",
    defaultAttire: "a bespoke navy Italian wool blazer with crisp dress shirt and tailored trousers",
  },
  sofia: {
    name: "Sofia Mendez",
    traits: "warm approachable female presenter with flowing brunette hair and friendly engaging smile",
    defaultAttire: "an elegant tailored cream silk blouse with tailored trousers",
  },
  storm: {
    name: "Storm Harrison",
    traits: "commanding athletic female presenter with sharp gaze and energetic broadcast presence",
    defaultAttire: "a modern tactical techwear dark navy blazer with minimalist silver details",
  },
};

/**
 * Resolves descriptive text for an attire ID or slug
 */
function resolveAttireDescription(attireId?: string, fallback: string = "a chic contemporary designer studio outfit"): string {
  if (!attireId) return fallback;
  const lower = attireId.toLowerCase();

  if (
    lower.includes("burgundy") ||
    lower.includes("corset") ||
    lower.includes("m1") ||
    lower.includes("m2") ||
    lower.includes("m3") ||
    lower.includes("m4") ||
    lower.includes("m5") ||
    lower.includes("loop")
  ) {
    return "an elegant tailored burgundy velvet evening dress";
  }
  if (lower.includes("leather") || lower.includes("biker")) {
    return "a fitted black moto leather biker jacket with silver zipper accents";
  }
  if (lower.includes("silver") || lower.includes("blazer")) {
    return "a chic metallic silver cropped blazer and high-waisted black trousers";
  }
  if (lower.includes("cobalt") || lower.includes("08a")) {
    return "a cobalt blue tailored evening dress";
  }
  if (lower.includes("emerald") || lower.includes("satin")) {
    if (lower.includes("keyhole") || lower.includes("12a")) {
      return "an emerald green liquid satin keyhole evening gown";
    }
    return "an emerald green liquid satin cowl dress with subtle gold accents";
  }
  if (lower.includes("scarlet") || lower.includes("02a")) {
    return "a scarlet red evening jacket with fitted trousers";
  }
  if (lower.includes("champagne") || lower.includes("03a")) {
    return "a champagne satin halter gown";
  }
  if (lower.includes("ivory") || lower.includes("09a")) {
    return "an ivory white silk tailored evening dress";
  }
  if (lower.includes("sapphire") || lower.includes("11a")) {
    return "a sapphire blue gala evening gown";
  }
  if (lower.includes("navy") || lower.includes("suit") || lower.includes("10a")) {
    return "a bespoke navy Italian wool blazer with crisp dress shirt";
  }
  if (lower.includes("cream") || lower.includes("silk")) {
    return "an elegant cream silk blouse with tailored trousers";
  }
  if (lower.includes("cyberpunk")) {
    return "a futuristic dark leather jacket with neon purple lining and accents";
  }

  // Clean slug
  const cleaned = attireId.replace(/^ruby_|^blaze_|^mateo_|^sofia_/, "").replace(/_/g, " ");
  return `a stylish ${cleaned}`;
}

/**
 * Detects if a diffusion prompt already contains persona description or action clauses.
 * Used to avoid displaying legacy generic prompts that lack persona integration on page load.
 */
export function hasPersonaInPrompt(prompt?: string | null): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  const lower = prompt.toLowerCase();
  return (
    lower.includes("presenter") ||
    lower.includes("featuring a") ||
    lower.includes("bodice") ||
    lower.includes("corset") ||
    lower.includes("blazer") ||
    lower.includes("jacket") ||
    lower.includes("ruby") ||
    lower.includes("blaze") ||
    lower.includes("mateo") ||
    lower.includes("sofia") ||
    lower.includes("storm") ||
    lower.includes("walking gracefully") ||
    lower.includes("kneeling down") ||
    lower.includes("fingertips") ||
    lower.includes("modeling and presenting") ||
    lower.includes("holding and presenting") ||
    lower.includes("standing gracefully") ||
    lower.includes("speaking on camera") ||
    lower.includes("lip synchronization") ||
    lower.includes("delivering the dialogue") ||
    lower.includes("reference image") ||
    lower.includes("closed mouth") ||
    lower.includes("not speaking") ||
    lower.includes("not talking") ||
    lower.includes("silent on-camera") ||
    lower.includes("spoken narration with voiceover") ||
    lower.includes("spoken narration") ||
    lower.includes("voiceover narration") ||
    lower.includes("sample plank") ||
    lower.includes("showroom") ||
    lower.includes("auburn hair") ||
    lower.includes("brunette hair") ||
    lower.includes("[persona]:") ||
    lower.includes("[persona & wardrobe]:") ||
    lower.includes("[action]:") ||
    lower.includes("[dialogue]:")
  );
}

/**
 * Formulates realistic, high-engagement action description of the persona interacting with the product
 */
function resolvePersonaAction(
  typology: string = "surface_material",
  productName: string,
  mode: "video" | "photo" = "video",
  actionVariant?: string,
  dialogueContext?: {
    dialogue?: string;
    language?: string;
    allowSpeaking?: boolean;
    hasWardrobeRef?: boolean;
    hasProductRef?: boolean;
  }
): string {
  if (mode === "photo") {
    switch (typology) {
      case "surface_material":
        if (actionVariant === "showroom_wall" || actionVariant === "showroom") {
          return `standing poised and elegant in an upscale architectural design showroom beside the wall-mounted gallery display of ${productName}, admiring the sample planks and textured paint finishes on the exhibition wall with a delighted confident smile`;
        }
        if (actionVariant === "showroom_paint") {
          return `standing beside a gallery wall of large architectural paint and flooring swatches in an interior design showroom, holding a color swatch card with an appreciative warm smile`;
        }
        return `sitting comfortably and relaxed on a plush contemporary minimalist sofa in an expansive sunlit living room with the installed ${productName} seamlessly flowing across the floor, seated holding an authentic sample plank of the ${productName} in her hands to showcase its realistic natural wood grain texture, beveled micro-grooves, and precision click-lock edge, poised serene posture, warm engaging expression, natural morning sunlight streaming through large windows casting soft warm reflections and gentle shadows across the floorboards`;
      case "apparel_wearable":
        return `posed gracefully in a high-end editorial catalog portrait, seated or standing poised in natural light, showcasing the exquisite cut, drape, and texture of the outfit with effortless elegance`;
      case "sensory_consumable":
        return `seated gracefully at a sunlit marble vanity, holding ${productName} with authentic delight, serene radiant smile, soft luxury catalog lighting`;
      case "digital_saas":
        return `seated at an executive minimalist desk in a bright architectural office with ${productName} on a sleek curved display, relaxed confident demeanor`;
      case "hardware_gadget":
      case "appliances":
        return `seated comfortably beside ${productName} on a clean modern kitchen island or living room table, admiring its craftsmanship with warm engaging smile`;
      default:
        return `seated gracefully in an expansive modern architectural showroom with ${productName} elegantly staged, relaxed poised posture, warm friendly smile`;
    }
  }

  // Base physical action per typology
  let baseAction = `standing gracefully beside ${productName} in an expansive modern architectural showroom, presenting and showcasing its craftsmanship with warm engaging hand gestures and a delighted smile`;
  switch (typology) {
    case "surface_material":
      if (actionVariant === "showroom_wall" || actionVariant === "showroom") {
        baseAction = `walking gracefully through an upscale architectural design showroom towards the curated wall display of ${productName}, gently reaching out her hand to inspect and slide out an authentic sample plank of the flooring mounted on the exhibition wall, running her fingertips over the realistic wood grain texture and beveled edge with an admiring, impressed expression`;
      } else if (actionVariant === "showroom_paint") {
        baseAction = `walking up to an illuminated showroom gallery wall of large architectural paint swatches and complementary flooring displays, holding a sample finish card and comparing it against the wall texture and floorboard display with an appreciative, discerning expression`;
      } else {
        baseAction = `walking gracefully barefoot across the installed ${productName} in an expansive sunlit architectural room, gently kneeling down to run her fingertips over the smooth natural wood grain with a satisfied smile, admiring the seamless craftsmanship and texture`;
      }
      break;
    case "apparel_wearable":
      baseAction = `modeling and presenting ${productName} with fluid natural motion under clean commercial lighting, turning smoothly to showcase the tailored fit, premium fabric drape, and exquisite stitching`;
      break;
    case "sensory_consumable":
      baseAction = `holding and presenting ${productName} with authentic delight in a luxury sunlit bathroom vanity, gently demonstrating the packaging and admiring its premium quality`;
      break;
    case "digital_saas":
      baseAction = `presenting ${productName} on a futuristic curved glass display in a high-tech studio, gesturing enthusiastically at the real-time data visualizer`;
      break;
    case "hardware_gadget":
    case "appliances":
      baseAction = `interacting naturally with ${productName} on a clean modern countertop, demonstrating its intuitive design and premium build quality with engaging hand gestures`;
      break;
  }

  const isSpeakingMode =
    dialogueContext?.allowSpeaking !== false &&
    (dialogueContext?.allowSpeaking === true || Boolean(dialogueContext?.dialogue));

  const referenceClause = `the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image, while the presenter showcases and interacts with the exact product shown in the second reference image (${productName}), faithfully reproducing the authentic finish, texture, and details of the product reference photo`;

  if (isSpeakingMode) {
    const rawDialogue = (dialogueContext?.dialogue || "")
      .replace(/\[sfx:[^\]]+\]/gi, "")
      .replace(/["“”]/g, "'")
      .trim();

    const cleanDialogue = rawDialogue.replace(/^'+|'+$/g, "").trim();
    const resolvedLanguage =
      dialogueContext?.language && dialogueContext?.language !== "auto"
        ? dialogueContext.language
        : cleanDialogue
        ? detectLanguage(cleanDialogue)
        : "Spanish";

    const speakingClause = cleanDialogue
      ? `the presenter is speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in ${resolvedLanguage}: "${cleanDialogue}". Crisp broadcast vocal audio synchronized with realistic mouth articulation and natural room acoustic presence`
      : `the presenter is speaking on camera with clear diction and natural lip synchronization in ${resolvedLanguage}, delivering engaging commercial presentation with realistic mouth articulation and broadcast vocal audio`;

    return `${baseAction}, ${referenceClause}, ${speakingClause}`;
  }

  // Fallback / legacy non-speaking contract
  const nonSpeakingAudioContract =
    "silent on-camera presenter with closed mouth, poised serene facial expression, persona not speaking or talking on camera, spoken narration with voiceover (spoken narration with voiceover only, off-camera voiceover narration), clean ambient environment acoustic sound effects only without spoken dialogue (primed for broadcast voiceover narration), absolutely no on-camera talking or lip movement";

  return `${baseAction}, ${referenceClause}, ${nonSpeakingAudioContract}`;
}

/**
 * Reconciles any diffusion prompt (structured, preset, storyboarded, or user-edited) with:
 * 1. Image reference #1 (persona wardrobe reference photo in first reference image)
 * 2. Image reference #2 (product reference photo with product title)
 * 3. On-camera dialogue in specified language (when allowSpeaking is true)
 * 4. Stripping all legacy closed-mouth/silent conditioning when allowSpeaking is true
 * 5. Adding clean closed-mouth contract when allowSpeaking is false
 * 6. Swapping action template when templateIndex is supplied
 * Guarantees zero duplicate clauses and preserves user-edited sections in structured prompts.
 */
export function reconcilePromptWithSceneDialogueAndReferences(
  rawPrompt: string,
  options: ReconcilePromptOptions
): string {
  if (!rawPrompt || typeof rawPrompt !== "string") return "";

  const allowSpeaking = options.allowSpeaking !== false;
  const prodName = options.productName || "the product";

  // Check if prompt is in structured format
  const isStructured =
    rawPrompt.includes("[Environment]:") ||
    rawPrompt.includes("[Action]:") ||
    rawPrompt.includes("[Dialogue]:");

  let dialogueToUse = options.dialogue;
  if (dialogueToUse === undefined && isStructured) {
    const match = rawPrompt.match(/\[Dialogue\]:\s*([\s\S]*?)(?=\n\[|$)/i);
    if (match) {
      const dialogueLine = match[1].trim();
      const quoteMatch = dialogueLine.match(/["“']([^"”']+)["”']/);
      if (quoteMatch) {
        dialogueToUse = quoteMatch[1];
      }
    }
  }

  const rawDialogue = (dialogueToUse || "")
    .replace(/\[sfx:[^\]]+\]/gi, "")
    .replace(/["“”]/g, "'")
    .trim();
  const cleanDialogue = rawDialogue.replace(/^'+|'+$/g, "").trim();
  const resolvedLang =
    options.language && options.language !== "auto"
      ? options.language
      : cleanDialogue
      ? detectLanguage(cleanDialogue)
      : "Spanish";

  // Extract existing Performance delivery if not provided
  let existingPerformance: string | undefined = undefined;
  const perfMatch = rawPrompt.match(/Performance(?:\s+delivery)?:\s*([^.\n]+)(?:\.|$)/i);
  if (perfMatch) {
    existingPerformance = perfMatch[1].trim();
  }

  const sKeyForTemplate = resolveSettingKey(options.settingKey, undefined, rawPrompt);
  const activeTemplate = getSettingActionTemplate(sKeyForTemplate, options.templateIndex ?? 0);

  const effectivePerformance =
    options.performanceClause !== undefined && options.performanceClause.trim() !== ""
      ? options.performanceClause.trim()
      : options.performanceMood
      ? getPerformanceMoodClause(options.performanceMood)
      : options.rerollTemplate && activeTemplate.defaultPerformance
      ? activeTemplate.defaultPerformance
      : existingPerformance ||
        activeTemplate.defaultPerformance ||
        "energetic, upbeat, fast-paced commercial delivery with bright enthusiasm and crisp diction";

  const speakingClause = cleanDialogue
    ? `the presenter is speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in ${resolvedLang}: "${cleanDialogue}". Performance delivery: ${effectivePerformance}. Crisp broadcast vocal audio synchronized with realistic mouth articulation and natural room acoustic presence`
    : `the presenter is speaking on camera with clear diction and natural lip synchronization in ${resolvedLang}. Performance delivery: ${effectivePerformance}. Delivering engaging commercial presentation with realistic mouth articulation and broadcast vocal audio`;

  const nonSpeakingContract =
    "silent on-camera presenter with closed mouth, poised serene facial expression, persona remaining silent with closed mouth, spoken narration with voiceover, voiceover narration only, clean ambient room acoustics, absolutely no on-camera talking or lip movement";

  if (isStructured) {
    let p = rawPrompt;

    // 1. If a template switch was explicitly requested, swap [Camera] and [Action]
    if (options.templateIndex !== undefined || options.rerollTemplate) {
      const sKey = resolveSettingKey(options.settingKey, undefined, rawPrompt);
      const template = getSettingActionTemplate(sKey, options.templateIndex ?? 0);

      const action0_25 = template.actions.time0_25.replace(/the product/gi, prodName);
      const action25_55 = `${template.actions.time25_55.replace(
        /the product/gi,
        prodName
      )}, while the presenter showcases and interacts with the exact product shown in the second reference image (${prodName}), faithfully reproducing the authentic finish, texture, and details of the product reference photo`;
      const action55_80 = template.actions.time55_80.replace(/the product/gi, prodName);

      const newActionSection = `[Action]:\n- 0.0s - 2.5s: ${action0_25}.\n- 2.5s - 5.5s: ${action25_55}.\n- 5.5s - 8.0s: ${action55_80}.`;
      const newCameraSection = `[Camera]: ${template.cameraMovement}.`;

      p = p.replace(/\[Camera\]:[\s\S]*?(?=\n\[|$)/i, `${newCameraSection}\n\n`);
      p = p.replace(/\[Action\]:[\s\S]*?(?=\n\[|$)/i, `${newActionSection}\n\n`);
    }

    // 2. Reconcile [Dialogue] section
    const newDialogueSection = `[Dialogue]: ${allowSpeaking ? speakingClause : nonSpeakingContract}`;
    if (p.includes("[Dialogue]:")) {
      p = p.replace(/\[Dialogue\]:[\s\S]*$/i, newDialogueSection);
    } else {
      p = `${p.trim()}\n\n${newDialogueSection}`;
    }

    // Ensure persona wardrobe ref is in [Persona] and product ref is in [Action]
    if (!p.includes("first reference image")) {
      p = p.replace(
        /(\[Persona\]:[\s\S]*?)(?=\n\[|$)/i,
        `$1. the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.`
      );
    }
    if (!p.includes("second reference image")) {
      p = p.replace(
        /(\[Action\]:[\s\S]*?)(?=\n\[|$)/i,
        `$1 while the presenter showcases and interacts with the exact product shown in the second reference image (${prodName}), faithfully reproducing the authentic finish, texture, and details of the product reference photo.`
      );
    }

    return filterPromptForSafety(p, { allowSpeaking });
  }

  // Handle unstructured / legacy prompts
  let p = stripSilentContract(rawPrompt);

  // Clean out any previous reference and speaking clauses to prevent duplicate accumulation
  p = p.replace(/\bthe presenter's wardrobe and styling strictly match[^\.,;]+(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\b(?:while\s+)?the presenter (?:showcases and interacts|is showcasing and interacting) with the exact product shown in the second reference image\s*\([^)]*\),\s*faithfully reproducing[^\.,;]+(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\b(?:while\s+)?the presenter (?:showcases and interacts|is showcasing and interacting) with the exact product shown in the second reference image[^\.,;]+(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bfaithfully reproducing the authentic finish[^\.,;]+(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bthe presenter is speaking on camera with clear diction[\s\S]*?natural room acoustic presence(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bthe presenter is speaking on camera with clear diction[\s\S]*?broadcast vocal audio(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bthe presenter is speaking on camera[^\.,;]*(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bdelivering (?:the dialogue|engaging commercial presentation)[^\.,;]*(?:\.|\,)?/gi, "").trim();
  p = p.replace(/\bPerformance(?:\s+delivery)?:\s*[^.]+\./gi, "").trim();
  p = p.replace(/\bCrisp broadcast vocal audio synchronized[^\.,;]*(?:\.|\,)?/gi, "").trim();
  p = p.replace(/[,.\s]+$/, "").trim();

  const wardrobeClause =
    "the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image";
  const productClause = `while the presenter showcases and interacts with the exact product shown in the second reference image (${prodName}), faithfully reproducing the authentic finish, texture, and details of the product reference photo`;
  const referenceClause = `${wardrobeClause}, ${productClause}`;

  if (allowSpeaking) {
    p = `${p}, ${referenceClause}, ${speakingClause}`;
    return filterPromptForSafety(p, { allowSpeaking: true });
  } else {
    p = `${p}, ${referenceClause}, ${nonSpeakingContract}`;
    return filterPromptForSafety(p, { allowSpeaking: false });
  }
}

/**
 * Main prompt generator: builds complete persona clauses for Veo video and Imagen 3 photo prompts
 */
export function getPersonaPromptDetails(options: PersonaPromptOptions): PersonaScenePromptDetails {
  const cleanId = (options.personaId || "ruby").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const baseId = cleanId.replace(/_vance|_wilder|_rossi|_mendez/, "");

  const curated = CURATED_PERSONA_TRAITS[cleanId] || CURATED_PERSONA_TRAITS[baseId];

  let pName = curated?.name || "Ruby Vance";
  let pTraits = curated?.traits || "charismatic presenter with long auburn hair and radiant demeanor";
  let defaultAttire = curated?.defaultAttire || "an elegant tailored burgundy velvet evening dress";

  // Fallback to system persona registry if custom persona
  if (!curated) {
    const sysPersona = getPersonaById(cleanId) || getPersonaById(baseId);
    if (sysPersona) {
      pName = sysPersona.name;
      pTraits = sysPersona.traits?.hair
        ? `charismatic presenter with ${sysPersona.traits.hair} and ${sysPersona.traits.skinTone || "natural"} skin tone`
        : "charismatic professional presenter";
      defaultAttire = sysPersona.traits?.defaultAttire || defaultAttire;
    }
  }

  // Use selected attire override if provided
  const attireDesc = resolveAttireDescription(options.attireId, defaultAttire);

  const shouldAllowSpeaking = options.allowSpeaking ?? Boolean(options.dialogue);

  const actionClause = resolvePersonaAction(
    options.typology,
    options.productName,
    options.mode,
    options.actionVariant,
    {
      dialogue: options.dialogue,
      language: options.language,
      allowSpeaking: shouldAllowSpeaking,
      hasWardrobeRef: options.hasWardrobeRef,
      hasProductRef: options.hasProductRef,
    }
  );

  // Exclude human proper names (e.g. "Ruby Vance") to prevent triggering Google prominent-people policies
  const rawClause = `featuring a ${pTraits}, dressed in ${attireDesc}, ${actionClause}`;
  const fullPersonaPromptClause = filterPromptForSafety(rawClause, {
    allowSpeaking: shouldAllowSpeaking,
  });

  const settingKey = resolveSettingKey(options.actionVariant, options.typology);
  const template = getSettingActionTemplate(settingKey, options.templateIndex ?? 0);

  const structuredPrompt =
    options.mode === "photo"
      ? buildStructuredPhotoPrompt({
          productName: options.productName,
          personaTraits: pTraits,
          attireDesc,
          settingKey,
          templateIndex: options.templateIndex,
          typology: options.typology,
        })
      : buildStructuredVideoPrompt({
          productName: options.productName,
          personaTraits: pTraits,
          attireDesc,
          settingKey,
          templateIndex: options.templateIndex,
          dialogue: options.dialogue,
          language: options.language,
          allowSpeaking: shouldAllowSpeaking,
          performanceClause: options.performanceClause,
          performanceMood: options.performanceMood,
        });

  return {
    personaName: pName,
    personaDescription: pTraits,
    attireDescription: attireDesc,
    actionClause,
    fullPersonaPromptClause,
    structuredPrompt,
    templateId: template.id,
    templateLabel: template.label,
    dialogueText: options.dialogue,
  };
}

/**
 * Resolves the primary reference image URL for the active persona in their selected wardrobe.
 * Passing this image FIRST ensures Google Veo and Imagen 3 faithfully maintain character facial
 * continuity, hairstyle, and the exact chosen attire (e.g. burgundy velvet corset, leather jacket, blazer).
 */
/**
 * Resolves the primary reference image URL for the active persona in their selected wardrobe.
 * Passing this image FIRST ensures Google Veo and Imagen 3 faithfully maintain character facial
 * continuity, hairstyle, and the exact chosen attire (e.g. burgundy velvet corset, leather jacket, blazer).
 */
export function resolvePersonaAttireImageUrl(options: {
  personaId?: string;
  attireId?: string;
  actionLoopId?: string;
  videoUrl?: string;
  avatarSrc?: string;
}): string {
  const { personaId = "ruby", attireId, actionLoopId, videoUrl, avatarSrc } = options;

  const pLower = (personaId || "ruby").toLowerCase();
  const aLower = (attireId || "").toLowerCase();
  const loopLower = (actionLoopId || "").toLowerCase();
  const vidLower = (videoUrl || "").toLowerCase();
  const srcLower = (avatarSrc || "").toLowerCase();

  // Combine all attire signals
  const attireSignal = `${aLower} ${loopLower} ${vidLower} ${srcLower}`.trim();

  // 1. Direct ID match in RUBY_WARDROBE_POSES
  if (attireId && attireId !== "face_only") {
    const directMatch = RUBY_WARDROBE_POSES.find(
      (p) => p.id === attireId || p.id.toLowerCase() === aLower
    );
    if (directMatch?.src && directMatch.id !== "ruby_avatar_portrait") {
      return directMatch.src;
    }
  }

  // 2. Keyword / Pattern checks across attireId, actionLoopId, videoUrl, avatarSrc:

  // A. Burgundy Velvet Corset Suite (Ruby Vance Master Outfit)
  if (
    attireSignal.includes("burgundy") ||
    attireSignal.includes("corset") ||
    attireSignal.includes("m1_loop") ||
    attireSignal.includes("m2_loop") ||
    attireSignal.includes("m3_loop") ||
    attireSignal.includes("m4_loop") ||
    attireSignal.includes("m5_loop") ||
    attireSignal.includes("hair_adjust") ||
    attireSignal.includes("dynamic_v1")
  ) {
    if (attireSignal.includes("m2")) {
      return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_02_M2_chroma_raised_right.jpg";
    }
    if (attireSignal.includes("m3")) {
      return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_03_M3_chroma_open_two_hands.jpg";
    }
    if (attireSignal.includes("m4")) {
      return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_04_M4_chroma_separated_arms.jpg";
    }
    if (attireSignal.includes("m5")) {
      return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_05_M5_chroma_turn_side.jpg";
    }
    // Foundational standing M1 base pose
    return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg";
  }

  // B. Cobalt Blue Sweetheart
  if (attireSignal.includes("cobalt") || attireSignal.includes("08a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg";
  }

  // C. Emerald Silk Cowl / Keyhole
  if (attireSignal.includes("emerald")) {
    if (attireSignal.includes("keyhole") || attireSignal.includes("12a")) {
      return "/avatars/master_ruby_archive/chroma_master_poses/ruby_12a_emerald_keyhole_default_clasped.jpg";
    }
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_01a_emerald_cowl_default_clasped.jpg";
  }

  // D. Scarlet Corset
  if (attireSignal.includes("scarlet") || attireSignal.includes("02a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_02a_scarlet_corset_default_clasped.jpg";
  }

  // E. Champagne Halter
  if (attireSignal.includes("champagne") || attireSignal.includes("03a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_03a_champagne_halter_default_clasped.jpg";
  }

  // F. Ivory White Silk
  if (attireSignal.includes("ivory") || attireSignal.includes("09a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_09a_ivory_sweetheart_default_clasped.jpg";
  }

  // G. Sapphire Blue Gala
  if (attireSignal.includes("sapphire") || attireSignal.includes("11a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_11a_sapphire_corset_default_clasped.jpg";
  }

  // H. Midnight Black
  if (attireSignal.includes("black")) {
    if (attireSignal.includes("keyhole") || attireSignal.includes("14a")) {
      return "/avatars/master_ruby_archive/chroma_master_poses/ruby_14a_black_keyhole_default_clasped.jpg";
    }
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_04a_black_corset_default_clasped.jpg";
  }

  // I. Bronze Metallic
  if (attireSignal.includes("bronze") || attireSignal.includes("05a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_05a_bronze_metallic_default_clasped.jpg";
  }

  // J. Crimson Vest / Haute Couture
  if (attireSignal.includes("crimson") || attireSignal.includes("06a") || attireSignal.includes("13a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_06a_crimson_vest_default_clasped.jpg";
  }

  // K. Navy Jumpsuit / Suit
  if (attireSignal.includes("navy") || attireSignal.includes("10a")) {
    return "/avatars/master_ruby_archive/chroma_master_poses/ruby_10a_navy_jumpsuit_default_clasped.jpg";
  }

  // L. Mateo Rossi Wardrobe
  if (pLower.includes("mateo") || attireSignal.includes("mateo")) {
    return "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_01_M1_stand_base.jpg";
  }

  // M. Blaze Wilder Wardrobe (Silver Blazer / Moto Leather)
  if (
    pLower.includes("blaze") ||
    attireSignal.includes("blaze") ||
    attireSignal.includes("silver") ||
    attireSignal.includes("leather")
  ) {
    return "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_01_M1_stand_base.jpg";
  }

  // 3. If explicit wardrobe image was provided in avatarSrc (and not a generic headshot)
  const isGenericHeadshot =
    srcLower.endsWith("/ruby.png") ||
    srcLower.endsWith("/sofia.png") ||
    srcLower.endsWith("/mateo.png") ||
    srcLower.endsWith("/blaze.png") ||
    srcLower === "face_only";

  if (avatarSrc && typeof avatarSrc === "string" && !isGenericHeadshot) {
    const trimmed = avatarSrc.trim();
    if (
      !trimmed.endsWith(".mp4") &&
      !trimmed.endsWith(".webm") &&
      !trimmed.endsWith(".mov") &&
      !trimmed.endsWith(".mkv")
    ) {
      return trimmed;
    }
  }

  // 4. Fallback to persona signature wardrobe or headshot
  if (pLower.includes("ruby")) {
    return "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg";
  }
  if (pLower.includes("sofia")) {
    return "/avatars/sofia_body_ref.png";
  }

  const vaultPersona = getPersonaById(pLower);
  if (vaultPersona?.avatarUrl) {
    return vaultPersona.avatarUrl;
  }

  return `/avatars/${pLower}.png`;
}

/**
 * Assembles reference images for Veo video or Imagen 3 photo generation:
 * Guarantees that the persona attire image is strictly FIRST (index 0),
 * followed by the product photos (indices 1..N).
 */
export function buildConditionedReferenceUrls(options: {
  personaImageUrl?: string | null;
  productMediaUrls?: (string | undefined | null)[];
  maxImages?: number;
  hasCharacter?: boolean;
}): string[] {
  const { personaImageUrl, productMediaUrls = [], hasCharacter = false } = options;
  const maxImages = options.maxImages !== undefined ? options.maxImages : (hasCharacter ? 2 : 3);
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (rawUrl?: string | null) => {
    if (!rawUrl || typeof rawUrl !== "string") return;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return;
    if (
      trimmed.endsWith(".mp4") ||
      trimmed.endsWith(".webm") ||
      trimmed.endsWith(".mov") ||
      trimmed.endsWith(".mkv")
    ) {
      return;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      urls.push(trimmed);
    }
  };

  // 1. Persona reference image FIRST
  if (personaImageUrl) {
    add(personaImageUrl);
  }

  // 2. Product photos SECOND
  const productUrls: string[] = [];
  for (const raw of productMediaUrls) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") continue;
    if (
      trimmed.endsWith(".mp4") ||
      trimmed.endsWith(".webm") ||
      trimmed.endsWith(".mov") ||
      trimmed.endsWith(".mkv")
    ) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      urls.push(trimmed);
      productUrls.push(trimmed);
    }
  }

  // 3. When hasCharacter is FALSE and exactly 1 product image was provided,
  // duplicate the product image so multi-angle conditioning receives >= 2 product views
  // (Total: [persona, product, product]).
  // When hasCharacter is TRUE, strictly keep [persona, product] so total with character is 3 ingredients.
  if (!hasCharacter) {
    if (personaImageUrl && productUrls.length === 1 && urls.length < maxImages) {
      urls.push(productUrls[0]);
    } else if (!personaImageUrl && productUrls.length === 1 && urls.length < maxImages) {
      urls.push(productUrls[0]);
    }
  }

  return urls.slice(0, maxImages);
}

