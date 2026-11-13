export interface PlatePreset {
  id: string;
  name: string;
  url: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __stageEngine?: unknown;
    __engine?: unknown;
    __renderSingleFrame?: (frameIdx: number, subframeFactor: number) => void;
    __compositor?: unknown;
    __webglCompositor?: unknown;
    __codebookService?: unknown;
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
