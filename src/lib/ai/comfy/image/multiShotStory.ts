import { comfyLog } from "../api";

export type ShotType = "WIDE_ESTABLISHING" | "MEDIUM" | "CLOSE_UP" | "OVER_SHOULDER" | "TWO_SHOT" | "INSERT";

export interface ShotSpec {
  shotIndex: number;
  shotType: ShotType;
  shotName: string;
  promptText: string;
  cameraAngle: string;
  focalLength: string;
  poseKey?: string;
  gazeTarget?: string;
  expressionName?: string;
  reuseEnvironmentLatent: boolean;
}

export interface MultiShotStorySeries {
  narrativePrompt: string;
  storyId: string;
  shotCount: number;
  shots: ShotSpec[];
}

/**
 * Task OB-5 & Part 19: Generates a cinematographic shot list sequence for a visual story.
 * Each shot features distinct camera framing, focal length, pose, and facial expression
 * while locking the Stage 1 & 2 background room plate for 100% visual environment continuity.
 */
export function generateMultiShotStoryList(narrativePrompt: string, storyId: string = "episode_01"): MultiShotStorySeries {
  const cinematographicShots: Array<{
    type: ShotType;
    name: string;
    cameraAngle: string;
    focalLength: string;
    descriptor: string;
    pose: string;
    gaze: string;
    expr: string;
  }> = [
    {
      type: "WIDE_ESTABLISHING",
      name: "Wide Establishing Studio Shot",
      cameraAngle: "wide eye level, 24mm lens",
      focalLength: "24mm wide angle",
      descriptor: "wide establishing shot of futuristic news broadcast studio, showing full anchor desk, video walls, glowing LED lower thirds, and high ceiling architecture",
      pose: "pose_standing_anchor",
      gaze: "direct_teleprompter",
      expr: "confident_chuckle"
    },
    {
      type: "MEDIUM",
      name: "Medium Anchor Desk Shot",
      cameraAngle: "medium 3/4 portrait, 50mm lens",
      focalLength: "50mm prime portrait",
      descriptor: "medium 3/4 portrait shot of lead news anchor seated at broadcast desk delivering breaking headline report",
      pose: "pose_sitting_desk",
      gaze: "direct_teleprompter",
      expr: "genuine_smile"
    },
    {
      type: "CLOSE_UP",
      name: "Tight Facial Reaction Shot",
      cameraAngle: "tight facial close-up, 85mm lens",
      focalLength: "85mm tight telephoto",
      descriptor: "dramatic tight 85mm close-up reaction shot of lead news anchor's face, intense emotional focus, sharp eye detail",
      pose: "pose_thoughtful_hand",
      gaze: "direct_teleprompter",
      expr: "focused_intense"
    },
    {
      type: "OVER_SHOULDER",
      name: "Over-The-Shoulder Monitor Shot",
      cameraAngle: "over-the-shoulder perspective, 35mm lens",
      focalLength: "35mm perspective",
      descriptor: "over the shoulder perspective shot looking past lead anchor's shoulder toward glowing news wall graphics and live telemetry charts",
      pose: "pose_pointing_chart",
      gaze: "glancing_co_anchor",
      expr: "surprised_eyebrows"
    },
    {
      type: "TWO_SHOT",
      name: "Co-Anchor Dialogue Two-Shot",
      cameraAngle: "medium two-shot, 40mm lens",
      focalLength: "40mm cinema prime",
      descriptor: "medium two-shot of lead news anchor and co-anchor seated together at broadcast desk engaged in live debate",
      pose: "pose_sitting_desk",
      gaze: "glancing_co_anchor",
      expr: "thoughtful_raised"
    },
    {
      type: "INSERT",
      name: "Detail Insert Prop Shot",
      cameraAngle: "macro detail insert shot, 100mm macro",
      focalLength: "100mm macro",
      descriptor: "macro detail insert shot of anchor's hands holding confidential briefing folder on broadcast desk, teleprompter text reflection",
      pose: "pose_sitting_desk",
      gaze: "looking_down_papers",
      expr: "serious_concern"
    }
  ];

  const shots: ShotSpec[] = cinematographicShots.map((cs, idx) => ({
    shotIndex: idx + 1,
    shotType: cs.type,
    shotName: cs.name,
    promptText: `${narrativePrompt}, ${cs.descriptor}`,
    cameraAngle: cs.cameraAngle,
    focalLength: cs.focalLength,
    poseKey: cs.pose,
    gazeTarget: cs.gaze,
    expressionName: cs.expr,
    reuseEnvironmentLatent: idx > 0
  }));

  comfyLog(`[MultiShotStory] 🎬 Generated ${shots.length}-shot visual narrative sequence for Story ID [${storyId}]: "${narrativePrompt}"`);

  return {
    narrativePrompt,
    storyId,
    shotCount: shots.length,
    shots
  };
}
