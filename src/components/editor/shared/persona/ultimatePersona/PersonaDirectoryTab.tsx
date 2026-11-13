/**
 * src/components/editor/shared/persona/ultimatePersona/PersonaDirectoryTab.tsx
 *
 * Search bar, gender/language filter controls, 48-persona cards grid,
 * and audio sample audition button for each anchor.
 */

import React from "react";
import Image from "next/image";
import { Search, Volume2, CheckCircle2 } from "lucide-react";
import { Persona } from "@/lib/tts/personas";
import { GenderFilter } from "./types";

export interface PersonaDirectoryTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  genderFilter: GenderFilter;
  setGenderFilter: (filter: GenderFilter) => void;
  languageFilter: string;
  setLanguageFilter: (filter: string) => void;
  filteredPersonas: Persona[];
  recentPersonas?: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (personaId: string, persona: Persona) => void;
  handleAuditionVoice: (e: React.MouseEvent, persona: Persona) => void;
  isPlaying: boolean;
  activeUrl: string | null;
  compact?: boolean;
}

export const PersonaDirectoryTab: React.FC<PersonaDirectoryTabProps> = ({
  searchQuery,
  setSearchQuery,
  genderFilter,
  setGenderFilter,
  languageFilter,
  setLanguageFilter,
  filteredPersonas,
  recentPersonas = [],
  selectedPersonaId,
  onSelectPersona,
  handleAuditionVoice,
  isPlaying,
  activeUrl,
  compact = false,
}) => {
  return (
    <div className={`${compact ? "p-3 space-y-3" : "p-4 space-y-4"}`}>
      {/* Filters & Search */}
      <div className={`flex ${compact ? "flex-col gap-2" : "flex-col sm:flex-row gap-2"}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={compact ? "Search anchors..." : "Search anchors by name, title, accent..."}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(["all", "female", "male"] as const).map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => setGenderFilter(gender)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 cursor-pointer ${
                genderFilter === gender
                  ? "bg-emerald-500 text-black shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {gender}
            </button>
          ))}

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900/60 text-zinc-300 border border-zinc-800 focus:outline-none focus:border-emerald-500/50 cursor-pointer shrink-0"
          >
            <option value="all">All Languages</option>
            <option value="es">Spanish (ES)</option>
            <option value="en">English (EN)</option>
            <option value="fr">French (FR)</option>
            <option value="pt">Portuguese (PT)</option>
            <option value="de">German (DE)</option>
            <option value="it">Italian (IT)</option>
          </select>
        </div>
      </div>

      {/* Quick-Access Recent Anchors Strip */}
      {recentPersonas.length > 0 && !searchQuery && (
        <div className="space-y-1.5 pb-1 border-b border-zinc-800/80">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold px-0.5">
            <span>Recent Anchors</span>
            <span className="text-[9px] text-zinc-500 font-mono">Quick Switch</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentPersonas.map((rp) => {
              const isSelected = rp.id === selectedPersonaId;
              const rawAvatar = rp.avatarUrl || "/avatars/ruby.png";
              const thumbUrl = rawAvatar.startsWith("/avatars/") && !rawAvatar.startsWith("/avatars/thumbs/")
                ? rawAvatar.replace(/^\/avatars\//, "/avatars/thumbs/").replace(/\.[^.]+$/, ".webp")
                : rawAvatar;

              return (
                <button
                  key={rp.id}
                  type="button"
                  onClick={() => onSelectPersona(rp.id, rp)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-left transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/40"
                      : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="relative h-6 w-6 rounded-md overflow-hidden bg-black shrink-0 border border-zinc-800">
                    <Image
                      src={thumbUrl}
                      alt={rp.name}
                      fill
                      sizes="24px"
                      className="object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as unknown as HTMLImageElement;
                        if (target && target.src !== rawAvatar) {
                          target.src = rawAvatar;
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0 pr-1">
                    <div className="text-[11px] font-bold text-zinc-200 truncate">{rp.name}</div>
                    <div className="text-[8px] font-mono text-zinc-500 uppercase">{rp.language}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Personas Grid */}
      <div
        className={`grid max-h-[380px] overflow-y-auto pr-1 ${
          compact
            ? "grid-cols-3 sm:grid-cols-4 gap-1.5"
            : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2"
        }`}
      >
        {filteredPersonas.map((persona) => {
          const isSelected = persona.id === selectedPersonaId;
          const sampleFile = persona.voiceFile || `${persona.id}.wav`;
          const audioUrl = sampleFile.startsWith("/") ? sampleFile : `/audio/samples/${sampleFile}`;
          const isThisPlaying = isPlaying && activeUrl === audioUrl;

          // Resolve compact WebP thumbnail path (fallback to standard avatarUrl)
          const rawAvatar = persona.avatarUrl || "/avatars/ruby.png";
          const thumbUrl = rawAvatar.startsWith("/avatars/") && !rawAvatar.startsWith("/avatars/thumbs/")
            ? rawAvatar.replace(/^\/avatars\//, "/avatars/thumbs/").replace(/\.[^.]+$/, ".webp")
            : rawAvatar;

          return (
            <div
              key={persona.id}
              onClick={() => onSelectPersona(persona.id, persona)}
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "100px 140px",
              }}
              className={`group relative flex flex-col rounded-lg border transition-all cursor-pointer p-1.5 ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/50"
                  : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
              }`}
            >
              {/* Avatar Image */}
              <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-950 mb-1 border border-zinc-800/80">
                <Image
                  src={thumbUrl}
                  alt={persona.name}
                  fill
                  sizes="(max-width: 640px) 90px, 120px"
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback to original full image if thumb is missing
                    const target = e.currentTarget as unknown as HTMLImageElement;
                    if (target && target.src !== rawAvatar) {
                      target.src = rawAvatar;
                    }
                  }}
                />

                {/* Language/Country Pill */}
                <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs px-1 py-0.2 rounded text-[7px] font-mono text-zinc-300 border border-white/10 uppercase font-bold">
                  {persona.language}
                </div>

                {/* Audition Voice Button */}
                <button
                  type="button"
                  onClick={(e) => handleAuditionVoice(e, persona)}
                  className={`absolute bottom-1 right-1 p-1 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                    isThisPlaying
                      ? "bg-emerald-500 text-black animate-pulse"
                      : "bg-black/70 text-zinc-300 hover:bg-emerald-500 hover:text-black border border-white/10"
                  }`}
                  title={isThisPlaying ? "Stop Voice Sample" : "Audition Voice Sample"}
                >
                  <Volume2 className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* Persona Info */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-[11px] font-bold text-zinc-100 group-hover:text-emerald-400 truncate">
                      {persona.name}
                    </h4>
                    {isSelected && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 truncate mt-0.5 leading-tight">{persona.title}</p>
                </div>

                <div className="mt-1 flex items-center justify-between text-[8px] text-zinc-500 border-t border-zinc-800/60 pt-1 font-mono">
                  <span className="capitalize">{persona.gender}</span>
                  <span className="text-zinc-400 truncate max-w-[55px]">
                    {persona.traits?.defaultAttire ? "Custom" : "Standard"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
