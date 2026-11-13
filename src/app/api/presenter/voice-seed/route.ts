import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { personaId, scriptText, language = 'es', gender = 'female' } = body

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    if (process.env.NODE_ENV === 'production' && (ttsServerUrl.includes('localhost') || ttsServerUrl.includes('127.0.0.1'))) {
      return NextResponse.json(
        { error: 'Direct localhost voice seeding is disabled in production. Use the local worker queue.', remoteWorkerRequired: true },
        { status: 503 }
      )
    }
    
    // Seed new voice reference file
    const defaultScript = language === 'es' 
      ? 'Buenas noches. Les presentamos un informe exclusivo en vivo desde el centro de noticias.' 
      : 'Good evening. Tonight, we bring you an exclusive broadcast from our studio headline desk.'

    const targetEngine = language === 'es' ? (gender === 'female' ? 'piper' : 'f5_tts') : 'xtts_v2'

    const ttsRes = await fetch(`${ttsServerUrl}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: scriptText || defaultScript,
        engine: targetEngine,
        persona_id: personaId,
        language,
        reference_audio_filename: `${gender === 'male' ? 'male_anchor_rioplatense_5s' : 'female_anchor_rioplatense_5s'}.wav`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      return NextResponse.json({ error: `Voice seeding failed: ${errText}` }, { status: ttsRes.status })
    }

    const audioBuffer = await ttsRes.arrayBuffer()
    const audioBytes = Buffer.from(audioBuffer)

    // Persist to unified storage layer
    const storageKey = `presets/voices/${personaId}.wav`;
    try {
      await storage.upload(storageKey, audioBytes, 'audio/wav');
    } catch (uploadErr) {
      console.warn(`[Voice Seed] Storage upload warning:`, uploadErr);
    }

    // Optional local cache for local development only
    if (process.env.NODE_ENV !== 'production') {
      try {
        const voicesDir = path.join(process.cwd(), 'public', 'presets', 'voices');
        fs.mkdirSync(voicesDir, { recursive: true });
        fs.writeFileSync(path.join(voicesDir, `${personaId}.wav`), audioBytes);
      } catch {}
    }

    const audioPath = `voices/${personaId}.wav`
    const embeddingPath = `embeddings/${personaId}.pt`

    // Upsert database record if persona exists
    const persona = await prisma.persona.findUnique({ where: { id: personaId } })
    if (persona) {
      await prisma.personaVoice.upsert({
        where: { id: `${personaId}-voice` },
        update: {
          audioPath,
          embeddingPath,
          language,
        },
        create: {
          id: `${personaId}-voice`,
          companyId: persona.companyId,
          personaId: persona.id,
          label: `${persona.name} Voice`,
          audioPath,
          storageKey: audioPath,
          embeddingPath,
          embeddingStorageKey: embeddingPath,
          language,
          isDefault: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      personaId,
      audioPath,
      embeddingPath,
      message: `Voice reference and Super-Embedding generated successfully for ${personaId}.`,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
