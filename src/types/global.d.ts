import { LiveAnchorStageEngine } from "@/lib/realtime/liveAnchorStageEngine";
import { WebGLVisemeCompositor } from "@/lib/realtime/webglVisemeCompositor";
import { VisemeCodebookService } from "@/lib/realtime/visemeCodebook";
export interface PlatePreset {
  id: string;
  name: string;
  url: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __stageEngine?: LiveAnchorStageEngine | null;
    __engine?: LiveAnchorStageEngine | null;
    __renderSingleFrame?: (frameIdx: number, subframeFactor: number) => void;
    __compositor?: WebGLVisemeCompositor | null;
    __webglCompositor?: WebGLVisemeCompositor | null;
    __codebookService?: VisemeCodebookService | null;
    __loadCodebook?: (type: "ditto" | "ditto_fullface" | "musetalk" | "none") => Promise<string | undefined | void>;
    __setManualClusterId?: (cid: number) => void;
    __setHeadYaw?: (yaw: number) => void;
    __setManualPose?: (pose: unknown) => void;
    __setBlinkRight?: (val: number) => void;
    __setBlinkLeft?: (val: number) => void;
    __PLATE_PRESETS?: PlatePreset[];
    __preloadRubyAngleBank?: () => Promise<void>;
    __redrawCurrentFrame?: () => void;
    __activePlateId?: string;
    __selectPlate?: (preset: PlatePreset) => void;
    __lastTargetLandmark?: unknown;
  }
}

export {};
