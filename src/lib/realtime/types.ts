/**
 * Pure TypeScript shared definitions for MuseTalk realtime audio features
 * and avatar packet metadata.
 */

export interface AudioFeatureMeta {
  id: string;
  audioPath: string;
  numFrames: number;
  fps: number;
  durationSec: number;
  featureDim: [number, number]; // [50, 384]
  dtype: "float16";
  bytesPerFrame: number; // 38400
  totalBytes: number;
  silenceMask: boolean[];
  createdAt: string;
}

export interface MuseTalkAvatarGeometry {
  cropBox: [number, number, number, number]; // [x_s, y_s, x_e, y_e]
  relBox: [number, number, number, number]; // [rel_x, rel_y, rel_w, rel_h]
}

export interface MuseTalkAvatarMeta {
  avatarId: string;
  frameCount: number;
  fps: number;
  channels: number;
  latentHeight: number;
  latentWidth: number;
  dtype: string;
  bytesPerFrame: number;
  totalBytes: number;
  binFile: string;
  videoPath?: string;
  bboxShift?: number;
  coords: Array<[number, number, number, number]>;
  geometry: Array<[number, number, number, number, number, number, number, number]>;
  maskCoords?: Array<[number, number, number, number]>;
}
