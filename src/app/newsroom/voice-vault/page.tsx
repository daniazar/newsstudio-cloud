'use client'

import React, { useState } from 'react'

interface Persona {
  id: string
  name: string
  lang: string
  gender: 'female' | 'male'
  role: string
}

const PERSONAS: Persona[] = [
  // Spanish Female
  { id: 'isabel', name: 'Isabel', lang: 'es', gender: 'female', role: 'Lead Anchor' },
  { id: 'constanza', name: 'Constanza', lang: 'es', gender: 'female', role: 'Columnist' },
  { id: 'valentina', name: 'Valentina', lang: 'es', gender: 'female', role: 'Reporter' },
  { id: 'lucia', name: 'Lucía', lang: 'es', gender: 'female', role: 'Reporter' },
  { id: 'sofia', name: 'Sofía', lang: 'es', gender: 'female', role: 'Analyst' },

  // Spanish Male
  { id: 'mateo', name: 'Mateo', lang: 'es', gender: 'male', role: 'Lead Anchor' },
  { id: 'facundo', name: 'Facundo', lang: 'es', gender: 'male', role: 'Reporter' },
  { id: 'gonzalo', name: 'Gonzalo', lang: 'es', gender: 'male', role: 'Analyst' },
  { id: 'bautista', name: 'Bautista', lang: 'es', gender: 'male', role: 'Reporter' },
  { id: 'diego', name: 'Diego', lang: 'es', gender: 'male', role: 'Reporter' },

  // English Female
  { id: 'ruby', name: 'Ruby', lang: 'en', gender: 'female', role: 'Lead Anchor' },
  { id: 'storm', name: 'Storm', lang: 'en', gender: 'female', role: 'Reporter' },
  { id: 'luna', name: 'Luna', lang: 'en', gender: 'female', role: 'Reporter' },
  { id: 'blaze', name: 'Blaze', lang: 'en', gender: 'female', role: 'Columnist' },

  // English Male
  { id: 'aris', name: 'Dr. Aris', lang: 'en', gender: 'male', role: 'Lead Anchor' },
  { id: 'atlas', name: 'Atlas', lang: 'en', gender: 'male', role: 'Analyst' },
  { id: 'hawk', name: 'Hawk', lang: 'en', gender: 'male', role: 'Reporter' },
  { id: 'volt', name: 'Volt', lang: 'en', gender: 'male', role: 'Expert' },
]

export default function VoiceVaultPage() {
  const [selectedLang, setSelectedLang] = useState<string>('all')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [customText, setCustomText] = useState<string>('')
  const [activePersona, setActivePersona] = useState<Persona | null>(PERSONAS[0])
  const [loading, setLoading] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const filteredPersonas = PERSONAS.filter((p) => {
    const lMatch = selectedLang === 'all' || p.lang === selectedLang
    const gMatch = selectedGender === 'all' || p.gender === selectedGender
    return lMatch && gMatch
  })

  const handleGenerateVoice = async () => {
    if (!activePersona) return
    setLoading(true)
    setStatusMsg('Synthesizing speech & normalizing text...')
    setAudioUrl(null)

    try {
      const res = await fetch('/api/presenter/voice-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: activePersona.id,
          text: customText || (activePersona.lang === 'es' ? 'Atención: información de último momento en vivo desde Buenos Aires.' : 'Breaking news: High-level emergency negotiations have just resumed.'),
          language: activePersona.lang,
          gender: activePersona.gender,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate voice')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setStatusMsg(`✅ Speech synthesized successfully! (Excitement Score: ${res.headers.get('X-News-Excitement-Score') || '0.35'})`)
    } catch (err: unknown) {
      setStatusMsg(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedNewVoice = async () => {
    if (!activePersona) return
    setLoading(true)
    setStatusMsg('Generating new reference audio & pre-caching Super-Embedding...')

    try {
      const res = await fetch('/api/presenter/voice-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: activePersona.id,
          language: activePersona.lang,
          gender: activePersona.gender,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatusMsg(`✅ ${data.message}`)
    } catch (err: unknown) {
      setStatusMsg(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">🎙️ Persona Voice Vault & Generator</h1>
          <p className="text-slate-400 mt-1">
            Filter personas by language and gender, test real-time speech synthesis, or re-generate reference voice embeddings.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="es">Spanish (es)</option>
              <option value="en">English (en)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Gender
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Genders</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Persona List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 max-h-[500px] overflow-y-auto">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Matched Personas ({filteredPersonas.length})
            </h2>
            {filteredPersonas.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  activePersona?.id === p.id
                    ? 'bg-blue-600/30 border border-blue-500 text-white'
                    : 'bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 uppercase font-semibold text-slate-300">
                    {p.lang}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 capitalize font-semibold text-slate-300">
                    {p.gender}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Generator Controls */}
          <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            {activePersona ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{activePersona.name}</h2>
                    <p className="text-xs text-slate-400">
                      ID: {activePersona.id} | {activePersona.role} | {activePersona.lang.toUpperCase()} | {activePersona.gender}
                    </p>
                  </div>
                  <button
                    onClick={handleSeedNewVoice}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    🔄 Re-Generate Base Voice
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Script / News Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder={
                      activePersona.lang === 'es'
                        ? 'Ejemplo: Atención: YPF reporta $10.5M en ingresos para el Q3 tras los anuncios de la AFIP.'
                        : 'Example: Breaking news: Tech stocks rose by $45M in Q3 according to the CEO of AI Corp.'
                    }
                    className="w-full bg-slate-800 text-white rounded-lg p-3 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleGenerateVoice}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? '⏳ Synthesizing...' : '▶️ Generate Voice Sample'}
                  </button>
                </div>

                {statusMsg && (
                  <div className="p-3 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">
                    {statusMsg}
                  </div>
                )}

                {audioUrl && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-2">
                    <span className="text-xs font-semibold text-blue-400">Audio Preview:</span>
                    <audio controls src={audioUrl} className="w-full" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                Select a persona to generate speech samples.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
