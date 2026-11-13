import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

export async function POST(req: Request) {
  try {
    const t = await requireTenant()
    if (!t.ok) return t.response
    const { orgId } = t.tenant

    const body = await req.json()
    const {
      title = 'Broadcast Audio Story',
      scriptText,
      audioUrl,
      personaName = 'Anchor',
      language = 'es',
    } = body

    if (!scriptText || scriptText.trim().length === 0) {
      return NextResponse.json({ error: 'Script text is required for pipeline export' }, { status: 400 })
    }

    // 1. Resolve RssFeed for tenant
    let feed = await prisma.rssFeed.findFirst({
      where: { companyId: orgId },
    })
    if (!feed) {
      feed = await prisma.rssFeed.create({
        data: {
          name: 'Voice Studio Broadcast Feed',
          url: `https://newsstudio.local/feed-${orgId}-${Date.now()}.xml`,
          companyId: orgId,
        },
      })
    }

    // 2. Create Story container
    const storyGuid = `voice_${Date.now()}`
    const story = await prisma.story.create({
      data: {
        companyId: orgId,
        feedId: feed.id,
        title: title.substring(0, 120),
        description: scriptText.substring(0, 240),
        fullContent: scriptText,
        link: `voice://${storyGuid}`,
        guid: storyGuid,
        status: 'SCRIPTED',
      },
    })

    // 4. Create Script and Segment
    const script = await prisma.script.create({
      data: {
        storyId: story.id,
        headline: title,
        rawJson: JSON.stringify({ headline: title, scriptText, language }),
      },
    })

    await prisma.segment.create({
      data: {
        scriptId: script.id,
        index: 1,
        startTime: 0,
        endTime: Math.max(15, Math.round(scriptText.trim().split(/\s+/).length / 2.3)),
        text: scriptText,
        imagePrompt: 'High-resolution broadcast news anchor presenting breaking story',
        audioPath: audioUrl || null,
        personaId: personaName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      },
    })

    return NextResponse.json({
      success: true,
      storyId: story.id,
      editorUrl: `/editor/${story.id}`,
      message: 'Successfully exported audio to newsroom story pipeline!',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to export story' }, { status: 500 })
  }
}
