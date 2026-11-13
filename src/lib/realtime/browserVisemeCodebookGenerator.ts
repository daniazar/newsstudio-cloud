/**
 * src/lib/realtime/browserVisemeCodebookGenerator.ts
 *
 * Backwards-compatible barrel re-exporting the Progressive Dual-Tier Photo-to-256-Viseme
 * baker suite from `@newsstudio/viseme-core/baker`:
 * - Tier 1a (<150 ms): `BrowserVisemeCodebookGenerator`
 * - Tier 1b (~2s): `AvatarCodebookBaker` (256 visemes + 4-channel normal/wetness atlas)
 * - Tier 2 (Optional HD): `NeuralCodebookUpgradeClient`
 */

export * from "../../../vendor/viseme-compositor-core/packages/core/baker/browserVisemeCodebookGenerator";
export {
  AvatarCodebookBaker,
  loadCanonicalMasterAtlas,
} from "../../../vendor/viseme-compositor-core/packages/core/baker/AvatarCodebookBaker";
export {
  NeuralCodebookUpgradeClient,
  type NeuralBackendHealthStatus,
  type NeuralUpgradeOptions,
} from "../../../vendor/viseme-compositor-core/packages/core/baker/NeuralCodebookUpgradeClient";
export type {
  ArticulationTrack,
  AvatarBakerOptions,
  BakedAtlasGrid,
  BakedCodebookBlobUrls,
  BakedCodebookBundle,
  BakedCodebookTier,
  BakedPlateLandmark,
  BakedVisemeCodebookJson,
  BakedVisemeEntry,
  BakerPhase,
  BakerProgressEvent,
  CanonicalAnchor,
  DetectedFaceGeometry,
  InMemoryVisemeCodebook,
} from "../../../vendor/viseme-compositor-core/packages/core/baker/types";
