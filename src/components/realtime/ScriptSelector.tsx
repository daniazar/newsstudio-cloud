import React from "react";
import { PREGENERATED_SCRIPTS } from "./types";

interface ScriptSelectorProps {
  activeTab: "pregen" | "custom";
  onSelectTab: (tab: "pregen" | "custom") => void;
  selectedScriptId: string;
  onSelectScriptId: (id: string) => void;
  customText: string;
  onChangeCustomText: (text: string) => void;
  customEngine: string;
  onChangeCustomEngine: (engine: string) => void;
  customLanguage: string;
  onChangeCustomLanguage: (lang: string) => void;
  disabled?: boolean;
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  activeTab,
  onSelectTab,
  selectedScriptId,
  onSelectScriptId,
  customText,
  onChangeCustomText,
  customEngine,
  onChangeCustomEngine,
  customLanguage,
  onChangeCustomLanguage,
  disabled,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs font-semibold">
        <button
          onClick={() => onSelectTab("pregen")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            activeTab === "pregen"
              ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📻 Pregenerated Text
        </button>
        <button
          onClick={() => onSelectTab("custom")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            activeTab === "custom"
              ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ✍️ Custom Live TTS
        </button>
      </div>

      {activeTab === "pregen" ? (
        <div className="space-y-1.5">
          <div className="flex flex-col gap-1.5">
            {PREGENERATED_SCRIPTS.map((script) => (
              <button
                key={script.id}
                disabled={disabled}
                onClick={() => onSelectScriptId(script.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedScriptId === script.id
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-100 shadow-[0_0_10px_rgba(0,240,255,0.12)]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-0.5">
                  <span className="text-gray-100">{script.title}</span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{script.durationSec}s</span>
                </div>
                <p className="text-[10px] leading-relaxed line-clamp-2 text-gray-300 font-sans">
                  &quot;{script.text}&quot;
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Engine & Language Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                TTS Engine
              </label>
              <select
                value={customEngine}
                onChange={(e) => onChangeCustomEngine(e.target.value)}
                disabled={disabled}
                className="w-full bg-white/5 border border-white/15 rounded-lg p-1.5 text-[11px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="omnivoice" className="bg-[#0b0e17] text-white">⚡ OmniVoice (Qwen Backbone)</option>
                <option value="kokoro" className="bg-[#0b0e17] text-white">🚀 Kokoro 82M (Sub-Second)</option>
                <option value="f5_tts" className="bg-[#0b0e17] text-white">🎙️ F5-TTS (Flow-Matching)</option>
                <option value="piper" className="bg-[#0b0e17] text-white">⚡ Piper ONNX (Instant)</option>
                <option value="webspeech" className="bg-[#0b0e17] text-white">🌐 Web Speech (Browser Native)</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                Language
              </label>
              <select
                value={customLanguage}
                onChange={(e) => onChangeCustomLanguage(e.target.value)}
                disabled={disabled}
                className="w-full bg-white/5 border border-white/15 rounded-lg p-1.5 text-[11px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="es" className="bg-[#0b0e17] text-white">🇪🇸 Spanish (es / LATAM)</option>
                <option value="en" className="bg-[#0b0e17] text-white">🇺🇸 English (en / US)</option>
              </select>
            </div>
          </div>

          {/* Quick Prompts including 2-minute specials */}
          <div>
            <label className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
              Plantillas Rápidas (Quick Prompts)
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  onChangeCustomLanguage("es");
                  onChangeCustomText(PREGENERATED_SCRIPTS[0].text);
                }}
                className="text-[9px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 hover:bg-purple-900 border border-purple-500/30 cursor-pointer transition-colors font-bold"
              >
                ⏱️ Especial 2 Minutos (ES)
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomLanguage("en");
                  onChangeCustomText(PREGENERATED_SCRIPTS[1].text);
                }}
                className="text-[9px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 hover:bg-purple-900 border border-purple-500/30 cursor-pointer transition-colors font-bold"
              >
                ⏱️ 2-Min Special (EN)
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomLanguage("es");
                  onChangeCustomText("¡Último momento! Importantes avances en inteligencia artificial impulsan una jornada histórica.");
                }}
                className="text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-950/60 hover:text-cyan-300 border border-white/10 text-gray-300 cursor-pointer transition-colors"
              >
                📢 Urgente
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomLanguage("es");
                  onChangeCustomText("Mercados Globales: Los sectores de tecnología y semiconductores registran fuertes alzas en Wall Street.");
                }}
                className="text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-950/60 hover:text-cyan-300 border border-white/10 text-gray-300 cursor-pointer transition-colors"
              >
                📈 Finanzas
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase tracking-wider text-gray-400">
              Texto del Guión
            </label>
            <textarea
              value={customText}
              onChange={(e) => onChangeCustomText(e.target.value)}
              placeholder="Escribe o pega cualquier texto aquí para generar la voz y sincronizar labios en tiempo real..."
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
