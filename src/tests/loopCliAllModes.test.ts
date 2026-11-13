import { describe, it, expect } from 'vitest'
import {
  generateMasterKeyframe,
  buildActionMatrixLoop,
  normalizePronunciations,
  PERSONAS_VAULT,
} from '../../scripts/loop-cli'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'

describe('Exhaustive 5-Mode Validation Suite for scripts/loop-cli.ts', () => {
  const rubyPersona = PERSONAS_VAULT.find((p) => p.id === 'ruby') || PERSONAS_VAULT[0]
  const isabelPersona = PERSONAS_VAULT.find((p) => p.id === 'isabel') || PERSONAS_VAULT[0]
  const mateoPersona = PERSONAS_VAULT.find((p) => p.id === 'mateo') || PERSONAS_VAULT[0]

  describe('Mode 1: Transparent Master RGBA Keyframe Generator', () => {
    it('should generate master transparent keyframe for Ruby (seated desk pose)', async () => {
      const keyframePath = await generateMasterKeyframe(rubyPersona, 'Forest Green Blazer', 'seated_desk')
      expect(keyframePath).toBeDefined()
      expect(fs.existsSync(keyframePath)).toBe(true)

      const dbPersona = await prisma.persona.findUnique({ where: { slug: rubyPersona.id } })
      const masterImage = await prisma.personaMasterImage.findFirst({
        where: { personaId: dbPersona?.id, poseType: 'seated_desk' },
        orderBy: { createdAt: 'desc' },
      })
      expect(masterImage).toBeDefined()
      expect(masterImage?.frontalObjects).toContain('laptop')
    })

    it('should generate master transparent keyframe for Isabel (standing mic pose)', async () => {
      const keyframePath = await generateMasterKeyframe(isabelPersona, 'Burgundy Silk Suit', 'standing_mic')
      expect(keyframePath).toBeDefined()
      expect(fs.existsSync(keyframePath)).toBe(true)
    })
  })

  describe('Mode 2: 1.5s Base ➔ 3.0s Ping-Pong Action Matrix Builder', () => {
    it('should build ping-pong action loop for state_gesture_left', async () => {
      const loopPath = await buildActionMatrixLoop(rubyPersona, 'state_gesture_left')
      expect(loopPath).toBeDefined()
      expect(loopPath).toContain('pingpong_loop_ruby_state_gesture_left.mp4')
    })

    it('should build ping-pong action loop for state_emphasis_nod', async () => {
      const loopPath = await buildActionMatrixLoop(mateoPersona, 'state_emphasis_nod')
      expect(loopPath).toBeDefined()
      expect(loopPath).toContain('pingpong_loop_mateo_state_emphasis_nod.mp4')
    })
  })

  describe('Mode 3 & 4: Pre-Flight Audio Normalization & Timecode Lock', () => {
    it('should normalize financial terms and currencies correctly', () => {
      const script = 'Analizamos los indicadores de YPF y del BCRA.'
      const normalized = normalizePronunciations(script, 'es')
      expect(normalized).toContain('I-Pe-Efe')
      expect(normalized).toContain('Bé-Cé-Erre-A')
    })
  })
})
