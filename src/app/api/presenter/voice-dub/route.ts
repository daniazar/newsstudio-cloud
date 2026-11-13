import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      text,
      sourceLanguage = 'es',
      targetLanguage = 'en',
      personaId = 'ruby',
    } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    
    const res = await fetch(`${ttsServerUrl}/api/tts/voice-dub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        persona_id: personaId,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Voice dubbing failed: ${errText}` }, { status: res.status })
    }

    const audioBuf = await res.arrayBuffer()
    return new Response(audioBuf, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-Dubbed-Source-Lang': sourceLanguage,
        'X-Dubbed-Target-Lang': targetLanguage,
      },
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
