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
  if (process.env.NODE_ENV === 'production' && (ttsServerUrl.includes('localhost') || ttsServerUrl.includes('127.0.0.1'))) {
    return NextResponse.json(
      { error: 'Direct localhost podcast rendering is disabled in production. Use the local worker queue.', remoteWorkerRequired: true },
      { status: 503 }
    );
  }
  
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
