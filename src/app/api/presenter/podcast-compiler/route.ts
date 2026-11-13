import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      title = 'Daily News Broadcast Podcast',
      tracks = [],
    } = body

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: 'At least one audio track is required to compile a podcast' }, { status: 400 })
    }

    const presetsDir = path.join(process.cwd(), 'public', 'presets', 'samples')
    const stingerPath = path.join(presetsDir, 'api_acestep_stinger_verified.wav')
    const stingerBuf = fs.existsSync(stingerPath) ? fs.readFileSync(stingerPath) : null

    const pcmChunks: Buffer[] = []
    const sampleRate = 24000
    let headerWav: Buffer | null = null

    // 1. Intro Stinger
    if (stingerBuf) {
      if (!headerWav) headerWav = stingerBuf.subarray(0, 44)
      pcmChunks.push(stingerBuf.subarray(44, Math.min(stingerBuf.length, 44 + (sampleRate * 2 * 3)))) // 3s intro stinger
    }

    // 2. Story Audio Tracks with Transition Bumpers
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      let trackPcm: Buffer | null = null

      if (track.audioBase64) {
        const fullBuf = Buffer.from(track.audioBase64, 'base64')
        if (!headerWav) headerWav = fullBuf.subarray(0, 44)
        trackPcm = fullBuf.subarray(44)
      } else if (track.audioUrl && track.audioUrl.startsWith('data:audio')) {
        const base64Data = track.audioUrl.split(',')[1]
        const fullBuf = Buffer.from(base64Data, 'base64')
        if (!headerWav) headerWav = fullBuf.subarray(0, 44)
        trackPcm = fullBuf.subarray(44)
      }

      if (trackPcm) {
        pcmChunks.push(trackPcm)

        // Musical bumper pause between stories
        if (i < tracks.length - 1) {
          const pauseBytes = Math.floor(sampleRate * 1.0) * 2 // 1.0s transition
          pcmChunks.push(Buffer.alloc(pauseBytes))
        }
      }
    }

    // 3. Outro Stinger
    if (stingerBuf) {
      pcmChunks.push(stingerBuf.subarray(44, Math.min(stingerBuf.length, 44 + (sampleRate * 2 * 2)))) // 2s outro stinger
    }

    if (pcmChunks.length === 0 || !headerWav) {
      throw new Error('Could not read audio data from provided tracks')
    }

    const fullPcm = Buffer.concat(pcmChunks)
    const finalHeader = Buffer.from(headerWav)
    finalHeader.writeUInt32LE(fullPcm.length + 36, 4)
    finalHeader.writeUInt32LE(fullPcm.length, 40)

    const finalPodcastWav = Buffer.concat([finalHeader, fullPcm])
    const durationSec = Math.round((fullPcm.length / (sampleRate * 2)) * 10) / 10

    return new Response(new Uint8Array(finalPodcastWav), {
      headers: {
        'Content-Type': 'audio/wav',
        'X-Podcast-Title': encodeURIComponent(title),
        'X-Podcast-Duration': durationSec.toString(),
        'X-Podcast-Tracks': tracks.length.toString(),
      },
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Podcast compilation failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
