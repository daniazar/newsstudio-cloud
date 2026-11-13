import {
  resolvePersonaVeoPrefix,
  getClipMetaById,
} from "@/lib/ecommerce/actionLoopFsmEngine";

/**
 * Resolves the action loop video URL for a given loopId and personaId.
 */
export function resolveLoopVideoUrl(loopId?: string, personaId: string = "ruby"): string | undefined {
  if (!loopId || loopId === "face_only") return undefined;
  if (loopId.startsWith("/assets/") || loopId.startsWith("http")) return loopId;

  const persona = personaId.toLowerCase();
  const dirName = resolvePersonaVeoPrefix(persona);
  const clip = getClipMetaById(loopId, persona);
  if (clip) {
    return `/assets/action_loops/veo/${dirName}/${clip.file}`;
  }
  if (loopId.includes("ruby_idle") || loopId === "idle") {
    return "/assets/action_loops/ruby_master_suite/ruby_idle.mp4";
  }
  if (loopId.includes("breaking")) {
    return "/assets/action_loops/ruby_master_suite/ruby_breaking_alert.mp4";
  }
  if (loopId.includes("welcome")) {
    return "/assets/action_loops/ruby_master_suite/ruby_intro_welcome.mp4";
  }
  if (loopId.includes("nod")) {
    return "/assets/action_loops/ruby_master_suite/ruby_emphasis_nod.mp4";
  }
  const filename = loopId.endsWith(".mp4") ? loopId : `${loopId}.mp4`;
  return `/assets/action_loops/veo/${dirName}/${filename}`;
}
