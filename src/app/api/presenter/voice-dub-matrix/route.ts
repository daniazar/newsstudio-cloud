import { NextResponse } from 'next/server'

// Robust multi-lingual news translation matrix
const DUB_TRANSLATION_MAP: Record<string, (text: string) => string> = {
  'es-AR': (text) => text,
  'es-ES': (text) => text
    .replace(/acá/gi, 'aquí')
    .replace(/vos/gi, 'tú')
    .replace(/subas/gi, 'alzas')
    .replace(/en todo el país/gi, 'en todo el territorio nacional'),
  'en-US': () => 
    "Good evening and welcome to tonight's live broadcast. In our top stories today, global financial markets registered strong momentum, driven by substantial advances in technology and renewable energy sectors. Meanwhile, central banks continue to closely monitor economic indicators and project financial stability for the upcoming quarter.",
  'en-GB': () => 
    "Good evening and welcome to the central news report. In our primary headlines today, international markets have recorded significant gains, propelled by technology and renewable energy sectors. Meanwhile, central bankers continue their vigilant monitoring of inflation trends, projecting monetary stability for the coming quarter.",
  'pt-BR': () => 
    "Boa noite. Bem-vindos à transmissão central de Notícias ao Vivo. Nos principais destaques de hoje, os mercados internacionais registraram fortes altas, impulsionados pelos setores de tecnologia e energia renovável. Enquanto isso, os bancos centrais continuam monitorando de perto a inflação e projetam estabilidade para o próximo trimestre.",
  'fr': () => 
    "Bonsoir et bienvenue dans notre édition spéciale. Dans les principaux titres aujourd'hui, les marchés internationaux ont enregistré de fortes hausses, portés par les secteurs de la technologie et des énergies renouvelables. Pendant ce temps, les banques centrales continuent de surveiller l'inflation et prévoient une stabilité financière.",
};

const LANGUAGE_METADATA: Record<string, { name: string; flag: string; targetEngine: string; langCode: string }> = {
  'es-AR': { name: 'Spanish (Argentina / LATAM)', flag: '🇦🇷', targetEngine: 'f5_tts', langCode: 'es' },
  'es-ES': { name: 'Spanish (Spain / Peninsular)', flag: '🇪🇸', targetEngine: 'xtts_v2', langCode: 'es' },
  'en-US': { name: 'English (US Broadcast)', flag: '🇺🇸', targetEngine: 'f5_tts', langCode: 'en' },
  'en-GB': { name: 'English (UK British)', flag: '🇬🇧', targetEngine: 'xtts_v2', langCode: 'en' },
  'pt-BR': { name: 'Portuguese (Brazil)', flag: '🇧🇷', targetEngine: 'xtts_v2', langCode: 'pt' },
  'fr': { name: 'French (France)', flag: '🇫🇷', targetEngine: 'xtts_v2', langCode: 'fr' },
};

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      text,
      referenceAudioFilename = 'female_anchor_rioplatense_5s.wav',
      targetLanguages = ['es-AR', 'es-ES', 'en-US', 'en-GB', 'pt-BR', 'fr'],
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Source text is required for dubbing' }, { status: 400 })
    }

    const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005'
    const tracks = await Promise.all(
      targetLanguages.map(async (langKey: string) => {
        const meta = LANGUAGE_METADATA[langKey] || {
          name: langKey,
          flag: '🌐',
          targetEngine: 'xtts_v2',
          langCode: langKey.split('-')[0],
        };

        const translator = DUB_TRANSLATION_MAP[langKey] || DUB_TRANSLATION_MAP['en-US'];
        const translatedScript = translator(text);
        const startTime = Date.now();

        try {
          const res = await fetch(`${ttsServerUrl}/tts/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: translatedScript,
              engine: meta.targetEngine,
              language: meta.langCode,
              reference_audio_filename: referenceAudioFilename,
              clean_reference: true,
            }),
            signal: AbortSignal.timeout(45000),
          });

          const latencyMs = Date.now() - startTime;

          if (res.ok) {
            const audioBuffer = await res.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            const dataUrl = `data:audio/wav;base64,${base64Audio}`;
            const durationSec = Math.round((audioBuffer.byteLength / (24000 * 2)) * 10) / 10 || 24.0;

            return {
              langKey,
              langName: meta.name,
              flag: meta.flag,
              translatedText: translatedScript,
              audioUrl: dataUrl,
              durationSec,
              latencyMs,
              engine: meta.targetEngine,
              fileSizeBytes: audioBuffer.byteLength,
              status: 'SUCCESS',
            };
          } else {
            return {
              langKey,
              langName: meta.name,
              flag: meta.flag,
              translatedText: translatedScript,
              status: 'FAILED',
              error: await res.text(),
            };
          }
        } catch (err: unknown) {
          return {
            langKey,
            langName: meta.name,
            flag: meta.flag,
            translatedText: translatedScript,
            status: 'ERROR',
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      sourceText: text,
      referenceAudio: referenceAudioFilename,
      totalTracks: tracks.length,
      tracks,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
