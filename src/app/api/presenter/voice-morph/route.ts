import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { storage } from '@/lib/storage'

/**
 * Resolve a voice reference WAV for morphing.
 *
 * Priority order:
 *  1. Download from storage (cloud-compatible, works in all environments)
 *  2. Read from local public/presets/voices/ (dev only fallback)
 *  3. Return null — TTS server will use its built-in default
 */
async function resolveVoiceBuffer(vName: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const clean = vName.replace(/^\/presets\/voices\//, '').replace(/^voices\//, '')
  const filename = clean.endsWith('.wav') ? clean : `${clean}.wav`
  const storageKey = `presets/voices/${filename}`

  // 1. Try storage (R2 / Azure Blob / MinIO)
  try {
    const url = storage.getUrl(storageKey)
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      return { buffer: buf, filename }
    }
  } catch {
    // Storage not available or key not found — fall through
  }

  // 2. Try local filesystem (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const voicesDir = path.join(process.cwd(), 'public', 'presets', 'voices')
    const full = path.join(voicesDir, filename)
    if (fs.existsSync(full)) {
      return { buffer: fs.readFileSync(full), filename }
    }
    // Fallback to default reference in local dev
    const fallback = path.join(voicesDir, 'female_anchor_rioplatense_5s.wav')
    if (fs.existsSync(fallback)) {
      return { buffer: fs.readFileSync(fallback), filename: 'female_anchor_rioplatense_5s.wav' }
    }
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      voiceA = 'female_anchor_rioplatense_5s.wav',
      voiceB = 'male_anchor_rioplatense_5s.wav',
      morphRatio = 0.5,
      text,
      language = 'es',
      engine = 'f5_tts',
      speedFactor = 1.0,
      pitchShift = 0.0,
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
    }

    const ratio = Math.max(0.0, Math.min(1.0, parseFloat(morphRatio) || 0.5))

    // Resolve voice reference buffers from storage (cloud) or local disk (dev)
    const [refA, refB] = await Promise.all([
      resolveVoiceBuffer(voiceA),
      resolveVoiceBuffer(voiceB),
    ])

    let effectiveReference = refA?.filename || voiceA.replace(/^.*\//, '')

    // Blend PCM samples if both buffers are available
    if (refA && refB) {
      try {
        const morphHash = `morph_${path.basename(refA.filename, '.wav')}_${path.basename(refB.filename, '.wav')}_${Math.round(ratio * 100)}`
        const morphedFilename = `${morphHash}.wav`
        const tmpMorphDir = path.join(os.tmpdir(), 'voice_morph')
        const morphedPath = path.join(tmpMorphDir, morphedFilename)

        if (!fs.existsSync(morphedPath)) {
          const bufA = refA.buffer
          const bufB = refB.buffer

          // Read 16-bit PCM samples after 44-byte WAV header
          const header = bufA.subarray(0, 44)
          const dataA = bufA.subarray(44)
          const dataB = bufB.subarray(44)

          const minLen = Math.min(dataA.length, dataB.length)
          const morphedData = Buffer.alloc(minLen)

          for (let i = 0; i < minLen; i += 2) {
            const sampleA = dataA.readInt16LE(i)
            const sampleB = dataB.readInt16LE(i)
            const blended = Math.round((1 - ratio) * sampleA + ratio * sampleB)
            const clamped = Math.max(-32768, Math.min(32767, blended))
            morphedData.writeInt16LE(clamped, i)
          }

          const outWav = Buffer.concat([header, morphedData])
          fs.mkdirSync(tmpMorphDir, { recursive: true })
          fs.writeFileSync(morphedPath, outWav)

          // Persist blended voice to storage for future reuse
          storage.upload(`presets/voices/${morphedFilename}`, outWav, 'audio/wav').catch(() => {})
        }

        effectiveReference = morphedFilename
      } catch (err) {
        console.warn('[VoiceMorph] Blending failed, falling back to voiceA reference:', err)
      }
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    const startTime = Date.now()

    const res = await fetch(`${ttsServerUrl}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        engine,
        language,
        reference_audio_filename: effectiveReference,
        speed_factor: speedFactor,
        pitch_shift: pitchShift,
        clean_reference: true,
      }),
      signal: AbortSignal.timeout(60000),
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Voice Morph synthesis failed: ${errText}` }, { status: res.status })
    }

    const audioBuffer = await res.arrayBuffer()
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-News-Engine': res.headers.get('X-News-Engine') || engine,
        'X-News-Model': res.headers.get('X-News-Model') || engine,
        'X-Morph-Ratio': ratio.toString(),
        'X-Morphed-Voice': effectiveReference,
        'X-Latency-Ms': latencyMs.toString(),
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
