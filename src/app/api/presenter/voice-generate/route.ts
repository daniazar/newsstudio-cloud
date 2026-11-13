import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      personaId,
      text,
      engine,
      language = 'es',
      gender = 'female',
      pitchShift = 0.0,
      speedFactor,
      instructText,
      referenceAudioFilename,
      referenceAudioPath,
      cleanReference = true,
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    
    // Default engine resolution if not specified
    const targetEngine = engine || (language.startsWith('es') ? 'f5_tts' : 'xtts_v2')

    const effectiveReference = 
      referenceAudioFilename || 
      referenceAudioPath || 
      (personaId ? `${personaId}.wav` : (gender === 'male' ? 'male_anchor_rioplatense_5s.wav' : 'female_anchor_rioplatense_5s.wav'))

    const payload = {
      text,
      engine: targetEngine,
      persona_id: personaId,
      pitch_shift: pitchShift,
      speed_factor: speedFactor,
      instruct_text: instructText,
      language,
      reference_audio_filename: effectiveReference,
      clean_reference: cleanReference,
    }

    const startTime = Date.now()
    const res = await fetch(`${ttsServerUrl}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `TTS Synthesis failed: ${errText}` }, { status: res.status })
    }

    const audioBuffer = await res.arrayBuffer()
    const responseHeaders = new Headers({
      'Content-Type': 'audio/wav',
      'X-News-Engine': res.headers.get('X-News-Engine') || targetEngine,
      'X-News-Model': res.headers.get('X-News-Model') || targetEngine,
      'X-TTS-Is-Fallback': res.headers.get('X-TTS-Is-Fallback') || 'false',
      'X-News-Excitement-Score': res.headers.get('X-News-Excitement-Score') || '0.35',
      'X-News-Pacing-Speed': res.headers.get('X-News-Pacing-Speed') || '1.0',
      'X-Latency-Ms': latencyMs.toString(),
    })

    return new Response(audioBuffer, {
      headers: responseHeaders,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

