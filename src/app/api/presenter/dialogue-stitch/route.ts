import { NextResponse } from 'next/server'

interface SpeakerTurn {
  speaker: string;
  text: string;
  voiceFilename?: string;
  acousticEnv?: string;
}

const DEFAULT_SPEAKER_VOICE_MAP: Record<string, string> = {
  anchor: 'female_anchor_rioplatense_5s.wav',
  host: 'female_anchor_rioplatense_5s.wav',
  reporter: 'male_anchor_rioplatense_5s.wav',
  field: 'male_anchor_rioplatense_5s.wav',
  guest: 'mariana_clean_5s.wav',
  expert: 'mariana_clean_5s.wav',
  analyst: 'male_anchor_rioplatense_5s.wav',
};

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      scriptText,
      turns,
      language = 'es',
      engine = 'f5_tts',
    } = body

    let dialogueTurns: SpeakerTurn[] = []

    if (Array.isArray(turns) && turns.length > 0) {
      dialogueTurns = turns
    } else if (scriptText && typeof scriptText === 'string') {
      const lines = scriptText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      for (const line of lines) {
        const match = line.match(/^([A-Za-z0-9_\s]+):\s*(.*)$/)
        if (match) {
          const spkKey = match[1].toLowerCase().trim()
          dialogueTurns.push({
            speaker: match[1].trim(),
            text: match[2].trim(),
            voiceFilename: DEFAULT_SPEAKER_VOICE_MAP[spkKey] || 'female_anchor_rioplatense_5s.wav',
            acousticEnv: spkKey.includes('reporter') || spkKey.includes('field') ? 'field_reporter' : (spkKey.includes('guest') ? 'phone_patch' : 'studio_desk'),
          })
        } else {
          dialogueTurns.push({
            speaker: 'Presenter',
            text: line,
            voiceFilename: 'female_anchor_rioplatense_5s.wav',
            acousticEnv: 'studio_desk',
          })
        }
      }
    }

    if (dialogueTurns.length === 0) {
      return NextResponse.json({ error: 'No dialogue turns or script text provided' }, { status: 400 })
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    const sampleRate = 24000

    // Concurrently synthesize all turns
    const turnResults = await Promise.all(
      dialogueTurns.map(async (turn) => {
        const refVoice = turn.voiceFilename || DEFAULT_SPEAKER_VOICE_MAP[turn.speaker.toLowerCase()] || 'female_anchor_rioplatense_5s.wav'
        try {
          const res = await fetch(`${ttsServerUrl}/tts/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: turn.text,
              engine,
              language,
              reference_audio_filename: refVoice,
              clean_reference: true,
            }),
          })
          if (!res.ok) return null
          const fullBuf = Buffer.from(await res.arrayBuffer())
          return {
            turn,
            refVoice,
            headerWav: fullBuf.subarray(0, 44),
            pcmData: fullBuf.subarray(44),
          }
        } catch {
          return null
        }
      })
    )

    const audioBuffers: Buffer[] = []
    const turnMarkers: Array<{ speaker: string; text: string; durationSec: number; voice: string }> = []
    let headerWav: Buffer | null = null

    // Assemble in exact sequence
    const successfulTurns = turnResults.filter((r): r is NonNullable<typeof r> => r !== null)
    for (let i = 0; i < successfulTurns.length; i++) {
      const { turn, refVoice, headerWav: itemHeader, pcmData } = successfulTurns[i]
      if (!headerWav) headerWav = itemHeader

      audioBuffers.push(pcmData)
      const turnDuration = Math.round((pcmData.length / (sampleRate * 2)) * 10) / 10

      turnMarkers.push({
        speaker: turn.speaker,
        text: turn.text,
        durationSec: turnDuration,
        voice: refVoice,
      })

      if (i < successfulTurns.length - 1) {
        const pauseBytes = Math.floor(sampleRate * 0.25) * 2
        const pauseBuffer = Buffer.alloc(pauseBytes)
        audioBuffers.push(pauseBuffer)
      }
    }

    if (audioBuffers.length === 0 || !headerWav) {
      throw new Error('Failed to synthesize any dialogue turns')
    }

    const fullPcm = Buffer.concat(audioBuffers)
    const finalHeader = Buffer.from(headerWav)
    finalHeader.writeUInt32LE(fullPcm.length + 36, 4)
    finalHeader.writeUInt32LE(fullPcm.length, 40)

    const finalMasterWav = Buffer.concat([finalHeader, fullPcm])
    const totalDurationSec = Math.round((fullPcm.length / (sampleRate * 2)) * 10) / 10

    return new Response(finalMasterWav, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-Dialogue-Turns': dialogueTurns.length.toString(),
        'X-Total-Duration': totalDurationSec.toString(),
        'X-Turn-Markers': JSON.stringify(turnMarkers),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
