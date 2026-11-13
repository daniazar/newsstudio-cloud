import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { storage } from '@/lib/storage'
import fs from 'node:fs'
import path from 'node:path'

interface CustomPersonaResult {
  id: string;
  name: string;
  role: string;
  language: string;
  gender: string;
  voices?: Array<{ audioPath: string }>;
}

export async function GET() {
  try {
    const t = await requireTenant()
    if (!t.ok) return t.response
    const { orgId } = t.tenant

    const voicesDir = path.join(process.cwd(), 'public', 'presets', 'voices')
    const presetFiles: Array<{ id: string; name: string; url: string; isPreset: boolean }> = []

    if (fs.existsSync(voicesDir)) {
      const files = fs.readdirSync(voicesDir).filter((f) => f.endsWith('.wav') || f.endsWith('.mp3'))
      for (const f of files) {
        const id = f.replace(/\.(wav|mp3)$/i, '')
        const name = id
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())

        presetFiles.push({
          id,
          name,
          url: `/presets/voices/${f}`,
          isPreset: true,
        })
      }
    }

    // Fetch custom cloned personas scoped to tenant or system personas
    let customPersonas: CustomPersonaResult[] = []
    try {
      customPersonas = await prisma.persona.findMany({
        where: {
          OR: [
            { companyId: orgId },
            { isSystemPersona: true },
          ],
        },
        include: {
          voices: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch {
      // Prisma might be offline or empty
    }

    return NextResponse.json({
      success: true,
      presets: presetFiles,
      personas: customPersonas.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        language: p.language,
        gender: p.gender,
        audioPath: p.voices?.[0]?.audioPath ? `/presets/${p.voices[0].audioPath}` : null,
      })),
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to list voices';
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const t = await requireTenant()
    if (!t.ok) return t.response
    const { orgId } = t.tenant

    const formData = await req.formData()
    const name = (formData.get('name') as string) || 'Cloned Presenter'
    const language = (formData.get('language') as string) || 'es'
    const gender = (formData.get('gender') as string) || 'female'
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file upload is required' }, { status: 400 })
    }

    const personaId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `voice_${Date.now()}`
    const audioBytes = Buffer.from(await audioFile.arrayBuffer())
    const audioPathStr = `voices/${personaId}.wav`
    const embeddingPathStr = `embeddings/${personaId}.pt`

    // Upload audio buffer to storage provider (MinIO / Azure / Local)
    try {
      await storage.upload(audioPathStr, audioBytes, "audio/wav")
    } catch (uploadErr) {
      console.warn(`[Voice Clone] Failed to upload audio to storage:`, uploadErr)
    }

    // Optional local cache for local dev
    if (process.env.NODE_ENV !== 'production') {
      try {
        const voicesDir = path.join(process.cwd(), 'public', 'presets', 'voices')
        fs.mkdirSync(voicesDir, { recursive: true })
        fs.writeFileSync(path.join(voicesDir, `${personaId}.wav`), audioBytes)
      } catch {}
    }

    // Call modern-tts-server to compute 512-D Super-Embedding tensor (.pt) if online
    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    try {
      await fetch(`${ttsServerUrl}/api/tts/extract-embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId }),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // Non-blocking embedding extraction
    }

    // Create or update Persona in database scoped to tenant
    const persona = await prisma.persona.upsert({
      where: { id: personaId },
      update: { name, language, gender },
      create: {
        id: personaId,
        slug: personaId,
        companyId: orgId,
        name,
        role: 'Presenter',
        language,
        gender,
      },
    })

    await prisma.personaVoice.upsert({
      where: { id: `${personaId}-voice` },
      update: { audioPath: audioPathStr, embeddingPath: embeddingPathStr, language },
      create: {
        id: `${personaId}-voice`,
        companyId: orgId,
        personaId: persona.id,
        label: `${name} Cloned Voice`,
        audioPath: audioPathStr,
        storageKey: audioPathStr,
        embeddingPath: embeddingPathStr,
        embeddingStorageKey: embeddingPathStr,
        language,
        isDefault: true,
      },
    })

    return NextResponse.json({
      success: true,
      personaId: persona.id,
      name: persona.name,
      audioPath: `/presets/voices/${personaId}.wav`,
      embeddingPath: embeddingPathStr,
      message: `Voice successfully cloned and registered for persona ${name}.`,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
