import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/apiHandler';
import { RateLimitTiers } from '@/lib/security/rateLimit';

export const POST = withTenantAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const { title = 'NewsStudio Express Podcast', scenes = [] } = body;

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return NextResponse.json({ error: 'Scenes array is required' }, { status: 400 });
  }

  const ttsServerUrl = process.env.MODERN_TTS_SERVER_URL || 'http://localhost:8005';
  
  // Call python podcast renderer endpoint
  const res = await fetch(`${ttsServerUrl}/api/tts/render-podcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, scenes }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Podcast render failed: ${errText}` }, { status: res.status });
  }

  const audioBuf = await res.arrayBuffer();
  return new Response(audioBuf, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_podcast.wav"`,
    },
  });
}, { rateLimit: RateLimitTiers.AI_EXPENSIVE });
