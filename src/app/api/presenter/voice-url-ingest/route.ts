import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { storage } from '@/lib/storage'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      audioUrl,
      personaName = 'Web Cloned Voice',
      gender: _gender = 'female',
      language: _language = 'es',
    } = body

    if (!audioUrl || !audioUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Valid HTTP/HTTPS audio URL is required' }, { status: 400 })
    }

    const response = await fetch(audioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })

    if (!response.ok) {
      throw new Error(`Failed to download audio from URL (HTTP ${response.status})`)
    }

    const audioArrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(audioArrayBuffer)

    const safeName = personaName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const filename = `url_${safeName}_${Date.now()}.wav`
    const storageKey = `presets/voices/${filename}`

    let uploadedUrl = `/presets/voices/${filename}`
    try {
      uploadedUrl = await storage.upload(storageKey, buffer, 'audio/wav')
    } catch {
      uploadedUrl = storage.getUrl(storageKey)
    }

    // Optional local cache for local development
    if (process.env.NODE_ENV !== 'production') {
      try {
        const voicesDir = path.join(process.cwd(), 'public', 'presets', 'voices')
        if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir, { recursive: true })
        fs.writeFileSync(path.join(voicesDir, filename), buffer)
      } catch {}
    }

    return NextResponse.json({
      success: true,
      filename,
      relativeUrl: uploadedUrl,
      personaName,
      fileSizeBytes: buffer.length,
      message: 'Audio successfully downloaded and registered for zero-shot cloning!',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to ingest audio URL' }, { status: 500 })
  }
}
