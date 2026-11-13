"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { PersonaItem, PersonaLoopOption, FALLBACK_PERSONAS, buildFullCanvasTrackPrompt } from "../types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWardrobePersonas(urlPersonaId?: string | null) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(urlPersonaId || "ruby");
  const [prevUrlPersona, setPrevUrlPersona] = useState<string | null>(urlPersonaId || null);

  if (urlPersonaId && urlPersonaId !== prevUrlPersona) {
    setPrevUrlPersona(urlPersonaId);
    setSelectedPersonaId(urlPersonaId);
  }

  const { data: personasData } = useSWR<{ personas?: PersonaItem[]; data?: PersonaItem[] }>(
    "/api/personas?limit=100&lite=true",
    fetcher
  );

  const personas: PersonaItem[] = useMemo(() => {
    const dbList: PersonaItem[] = (personasData?.personas || personasData?.data || []).map(
      (p: { id: string; slug?: string; name: string; role?: string; title?: string; avatars?: { imageUrl?: string }[]; avatarUrl?: string; gender?: string }) => ({
        id: p.slug || p.id,
        name: p.name,
        title: p.role || p.title || "News Anchor",
        avatarUrl: p.avatars?.[0]?.imageUrl || p.avatarUrl || `/avatars/${p.slug || p.id}.png`,
        gender: p.gender || "neutral",
      })
    );
    const seen = new Set<string>();
    const combined: PersonaItem[] = [];
    for (const p of [...FALLBACK_PERSONAS, ...dbList]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        combined.push(p);
      }
    }
    return combined;
  }, [personasData]);

  const currentPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const [loops, setLoops] = useState<PersonaLoopOption[]>([]);
  const [selectedLoop, setSelectedLoop] = useState<PersonaLoopOption | null>(null);
  const [sourceGarment, setSourceGarment] = useState<string>("burgundy dress");
  const [trackPrompt, setTrackPrompt] = useState<string>(buildFullCanvasTrackPrompt("", "burgundy dress"));

  useEffect(() => {
    let active = true;
    fetch(`/api/wardrobe/loops?personaId=${encodeURIComponent(selectedPersonaId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.loops?.length) {
          setLoops(data.loops);
          const firstLoop = data.loops[0];
          setSelectedLoop(firstLoop);
          setSourceGarment(firstLoop.sourceGarment || "burgundy dress");
          setTrackPrompt(firstLoop.defaultTrackPrompt || buildFullCanvasTrackPrompt("", firstLoop.sourceGarment));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedPersonaId]);

  const handleLoopSelect = (loop: PersonaLoopOption, targetOutfitSamPrompt?: string) => {
    setSelectedLoop(loop);
    setSourceGarment(loop.sourceGarment);
    setTrackPrompt(loop.defaultTrackPrompt || buildFullCanvasTrackPrompt(targetOutfitSamPrompt, loop.sourceGarment));
  };

  return {
    personas,
    currentPersona,
    selectedPersonaId,
    setSelectedPersonaId,
    loops,
    selectedLoop,
    setSelectedLoop,
    sourceGarment,
    setSourceGarment,
    trackPrompt,
    setTrackPrompt,
    handleLoopSelect,
  };
}
