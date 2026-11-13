import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      voiceFilename = 'f5_tts_es_30s.wav',
      musicId = 'breaking_stinger',
      duckingDb = -14,
    } = body

    const voicesDir = path.join(process.cwd(), 'output', 'voice_tests_30s')
    const presetsDir = path.join(process.cwd(), 'public', 'presets', 'samples')

    const voicePath = path.join(voicesDir, voiceFilename)
    const musicPath = path.join(presetsDir, 'api_acestep_stinger_verified.wav')

    if (!fs.existsSync(voicePath)) {
      return NextResponse.json({ error: `Voice file not found: ${voiceFilename}` }, { status: 404 })
    }

    const voiceBuf = fs.readFileSync(voicePath)
    const musicBuf = fs.existsSync(musicPath) ? fs.readFileSync(musicPath) : null

    if (!musicBuf) {
      return new Response(voiceBuf, {
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      })
    }

    const voicePcm = voiceBuf.subarray(44)
    const musicPcm = musicBuf.subarray(44)
    const header = voiceBuf.subarray(0, 44)

    const duckFactor = Math.pow(10, duckingDb / 20)
    const outLen = Math.max(voicePcm.length, musicPcm.length)
    const mixedPcm = Buffer.alloc(outLen)

    for (let i = 0; i < outLen; i += 2) {
      const vSample = i < voicePcm.length ? voicePcm.readInt16LE(i) : 0
      const isVoiceActive = Math.abs(vSample) > 500

      let mSample = 0
      if (musicPcm.length > 0) {
        const mIndex = (i % musicPcm.length)
        mSample = musicPcm.readInt16LE(mIndex)
      }

      const effectiveMusicVolume = isVoiceActive ? (mSample * duckFactor) : (mSample * 0.7)
      const mixed = Math.round(vSample + effectiveMusicVolume)
      const clamped = Math.max(-32768, Math.min(32767, mixed))
      mixedPcm.writeInt16LE(clamped, i)
    }

    // Ensure byte-perfect RIFF WAV header length compliance
    const finalHeader = Buffer.from(header)
    finalHeader.writeUInt32LE(mixedPcm.length + 36, 4) // ChunkSize: Total file size - 8
    finalHeader.writeUInt32LE(mixedPcm.length, 40)      // Subchunk2Size: Data byte length

    const finalWav = Buffer.concat([finalHeader, mixedPcm])
    return new Response(finalWav, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Mixed-Ducking-Db': duckingDb.toString(),
        'X-Music-Id': musicId,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
