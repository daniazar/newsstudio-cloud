/**
 * Shared types & UI constants for the 3D Product Turntable mode.
 *
 * Mirrors the HTTP contract of the Object3D-Server orchestrator
 * (`vendor/Object3D-Server/API.md`, port 8020) and the `Product3DAsset`
 * Prisma model. Safe to import from both client and server code.
 */

export type Turntable3DQuality = 'standard' | 'premium' | 'ultra' | 'draft'

export type Turntable3DBackground = 'transparent' | 'white' | 'studio_dark' | 'studio_light'

export type Turntable3DCameraPreset =
  | 'hero_parallax'
  | 'product_three_quarter'
  | 'product_front'
  | 'product_low_angle'
  | 'product_high_angle'
  | 'product_closeup'

export type Product3DAssetStatus = 'PENDING' | 'RECONSTRUCTING' | 'RENDERING' | 'READY' | 'FAILED'

export type Turntable3DStep =
  | 'queued'
  | 'bg_removal'
  | 'reconstruction'
  | 'normalization'
  | 'preview'
  | 'turntable_render'
  | 'encode'
  | 'upload'
  | 'done'

export interface Turntable3DEngineInfo {
  name: string
  label: string
  status: 'online' | 'offline' | 'disabled'
  textured: boolean
  min_vram_gb: number
  licence: string
  gated: boolean
}

export interface Turntable3DQualityRoute {
  engine: string
  estimated_seconds: number
  available: boolean
  fallback?: string
  reason?: string
}

export interface Turntable3DEnginesResponse {
  online: boolean
  error?: string
  engines: Turntable3DEngineInfo[]
  quality_routing: Partial<Record<Turntable3DQuality, Turntable3DQualityRoute>>
  vram_total_gb?: number
  gpu_name?: string
}

export interface Product3DAssetDTO {
  id: string
  campaignId: string
  status: Product3DAssetStatus
  engine: string
  quality: Turntable3DQuality
  background: Turntable3DBackground
  cameraPreset: Turntable3DCameraPreset
  frames: number
  fps: number
  width: number
  height: number
  meshUrl: string | null
  turntableUrl: string | null
  turntableMp4Url: string | null
  previewUrl: string | null
  contactSheetUrl: string | null
  inferenceMs: number | null
  vertexCount: number | null
  textureSize: string | null
  errorLog: string | null
  createdAt: string
  updatedAt: string
  job: {
    id: string
    status: string
    currentStep: string | null
    doneSteps: number
    totalSteps: number
  } | null
}

// ─── UI constants ────────────────────────────────────────────────────────────

export interface Turntable3DQualityTier {
  value: Turntable3DQuality
  label: string
  description: string
  /** Default engine the server routes this tier to (may fall back). */
  engine: string
  /** Rough reconstruction estimate (seconds) on a 10–16 GB GPU, excl. turntable render. */
  estimatedSeconds: number
}

export const TURNTABLE_3D_QUALITY_TIERS: readonly Turntable3DQualityTier[] = [
  {
    value: 'draft',
    label: 'Fast Preview (TRELLIS 2)',
    description: 'Fast preview mesh with 2K UV textures',
    engine: 'trellis2',
    estimatedSeconds: 30,
  },
  {
    value: 'standard',
    label: 'Standard (TRELLIS 2)',
    description: 'Watertight 4B DiT mesh with 2K UV tangent normal & roughness PBR maps',
    engine: 'trellis2',
    estimatedSeconds: 35,
  },
  {
    value: 'premium',
    label: 'Premium (Hunyuan3D-2.1)',
    description: 'Stage 2 PBR multi-view diffusion paint (Albedo, Metallic, Roughness) in compact 1.2 MB GLB',
    engine: 'hunyuan3d2',
    estimatedSeconds: 160,
  },
  {
    value: 'ultra',
    label: 'Ultra (Pixal3D 4K)',
    description: 'SIGGRAPH \'26 pixel-aligned DINOv3 + NAF with ultra-sharp 4096×4096 textures & micro-knit fabric',
    engine: 'pixal3d',
    estimatedSeconds: 150,
  },
] as const

export const TURNTABLE_3D_BACKGROUNDS: readonly { value: Turntable3DBackground; label: string }[] = [
  { value: 'transparent', label: 'Transparent (alpha)' },
  { value: 'white', label: 'Pure White' },
  { value: 'studio_dark', label: 'Studio Dark' },
  { value: 'studio_light', label: 'Studio Light' },
] as const

export const TURNTABLE_3D_CAMERA_PRESETS: readonly { value: Turntable3DCameraPreset; label: string }[] = [
  { value: 'hero_parallax', label: '30° Hero Parallax Sweep (Recommended: Zero Blind Side)' },
  { value: 'product_three_quarter', label: '360° Three-Quarter' },
  { value: 'product_front', label: '360° Front' },
  { value: 'product_low_angle', label: '360° Low Angle (Hero)' },
  { value: 'product_high_angle', label: '360° High Angle' },
  { value: 'product_closeup', label: '360° Close-Up' },
] as const

export const TURNTABLE_3D_STEPS: readonly { value: Turntable3DStep; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'bg_removal', label: 'Removing background' },
  { value: 'reconstruction', label: 'Reconstructing 3D mesh' },
  { value: 'normalization', label: 'Normalizing mesh' },
  { value: 'preview', label: 'Rendering preview' },
  { value: 'turntable_render', label: 'Rendering turntable' },
  { value: 'encode', label: 'Encoding video' },
  { value: 'upload', label: 'Uploading assets' },
  { value: 'done', label: 'Done' },
] as const

/** Turntable render defaults (PRD FR-03). */
export const TURNTABLE_3D_DEFAULTS = {
  quality: 'standard' as Turntable3DQuality,
  background: 'transparent' as Turntable3DBackground,
  cameraPreset: 'product_three_quarter' as Turntable3DCameraPreset,
  frames: 120,
  fps: 30,
  width: 1080,
  height: 1080,
} as const

/** Estimated turntable render + encode time (seconds) added on top of reconstruction. */
export const TURNTABLE_3D_RENDER_ESTIMATE_SECONDS = 20

export const TURNTABLE_3D_QUALITIES: readonly Turntable3DQuality[] = ['draft', 'standard', 'premium']
export const TURNTABLE_3D_BACKGROUND_VALUES: readonly Turntable3DBackground[] = [
  'transparent',
  'white',
  'studio_dark',
  'studio_light',
]
export const TURNTABLE_3D_CAMERA_PRESET_VALUES: readonly Turntable3DCameraPreset[] = [
  'hero_parallax',
  'product_three_quarter',
  'product_front',
  'product_low_angle',
  'product_high_angle',
  'product_closeup',
]
