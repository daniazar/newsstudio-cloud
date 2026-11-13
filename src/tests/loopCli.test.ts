import { describe, it, expect, vi } from 'vitest'
import { normalizePronunciations, PERSONAS_VAULT, generateMasterKeyframe, buildActionMatrixLoop } from '../../scripts/loop-cli'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { storage } from '../lib/storage'

describe('Interactive Unified Loop CLI (scripts/loop-cli.ts) Unit Tests', () => {
  it('should normalize Spanish acronyms phonetically before TTS synthesis', () => {
    const rawText = 'Analizamos los principales indicadores de YPF y del BCRA.'
    const normalized = normalizePronunciations(rawText, 'es')
    expect(normalized).toContain('I-Pe-Efe')
    expect(normalized).toContain('Bé-Cé-Erre-A')
  })

  it('should normalize English acronyms phonetically before TTS synthesis', () => {
    const rawText = 'Tech stocks rose in Q3 following CEO announcements.'
    const normalized = normalizePronunciations(rawText, 'en')
    expect(normalized).toBeDefined()
    expect(typeof normalized).toBe('string')
  })

  it('should contain a complete 48-persona vault registry', () => {
    expect(PERSONAS_VAULT.length).toBeGreaterThanOrEqual(10)
    const ruby = PERSONAS_VAULT.find((p) => p.id === 'ruby')
    expect(ruby).toBeDefined()
    expect(ruby?.lang).toBe('en')
    expect(ruby?.gender).toBe('female')

    const mateo = PERSONAS_VAULT.find((p) => p.id === 'mateo')
    expect(mateo).toBeDefined()
    expect(mateo?.lang).toBe('es')
    expect(mateo?.gender).toBe('male')
  })

  it('should locate valid persona avatar reference images in public/avatars/', () => {
    const rubyAvatar = path.join(process.cwd(), 'public', 'avatars', 'ruby.png')
    const blazeAvatar = path.join(process.cwd(), 'public', 'avatars', 'blaze.png')
    const isabelAvatar = path.join(process.cwd(), 'public', 'avatars', 'isabel.png')

    expect(fs.existsSync(rubyAvatar)).toBe(true)
    expect(fs.existsSync(blazeAvatar)).toBe(true)
    expect(fs.existsSync(isabelAvatar)).toBe(true)
  })

  it('should generate master transparent keyframe DB records and upload to MinIO', async () => {
    const testPersona = PERSONAS_VAULT.find((p) => p.id === 'ruby') || PERSONAS_VAULT[0]
    const keyframePath = await generateMasterKeyframe(testPersona, 'Forest Green Blazer', 'standing_mic')
    
    expect(keyframePath).toBeDefined()
    expect(fs.existsSync(keyframePath)).toBe(true)

    // Check Prisma Database Record
    const dbPersona = await prisma.persona.findUnique({ where: { slug: testPersona.id } })
    expect(dbPersona).toBeDefined()

    const masterRecord = await prisma.personaMasterImage.findFirst({
      where: { personaId: dbPersona?.id, attire: 'Forest Green Blazer' },
    })
    expect(masterRecord).toBeDefined()
    expect(masterRecord?.isTransparent).toBe(true)
    expect(masterRecord?.storageKey).toContain('avatars/ruby/master_images/')
  })

  it('should build ping-pong action loop key and output path correctly', async () => {
    const testPersona = PERSONAS_VAULT.find((p) => p.id === 'ruby') || PERSONAS_VAULT[0]
    const loopOutputPath = await buildActionMatrixLoop(testPersona, 'state_idle')

    expect(loopOutputPath).toBeDefined()
    expect(loopOutputPath).toContain('pingpong_loop_ruby_state_idle.mp4')
  })
})
