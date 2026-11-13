import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { personaId, text, language = 'es' } = body

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    if (process.env.NODE_ENV === 'production' && (ttsServerUrl.includes('localhost') || ttsServerUrl.includes('127.0.0.1'))) {
      return NextResponse.json(
        { error: 'Direct localhost voice preview is disabled in production. Use the local worker queue.', remoteWorkerRequired: true },
        { status: 503 }
      )
    }
    const res = await fetch(`${ttsServerUrl}/api/presenter/voice-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: personaId,
        text: text || (language === 'es' ? 'Hola, bienvenidos a las noticias.' : 'Hello, welcome to the news studio.'),
        language,
        engine: 'piper'
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to generate voice preview' }, { status: res.status })
    }

    const audioBuffer = await res.arrayBuffer()
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-News-Excitement-Score': res.headers.get('X-News-Excitement-Score') || '0.35',
        'X-News-Pacing-Speed': res.headers.get('X-News-Pacing-Speed') || '1.0',
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
