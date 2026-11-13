"use client";

import React, { useState } from "react";
import {
  Globe2,
  Check,
  X,
  Sparkles,
  Loader2,
  } from "lucide-react";

export interface LocalizationMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDubbingMatrix?: (languages: string[]) => Promise<void>;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  defaultVoice: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "es", name: "Spanish (LatAm/ES)", nativeName: "Español", flag: "🇪🇸", defaultVoice: "es_AR-daniela-high" },
  { code: "en", name: "English (US/UK)", nativeName: "English", flag: "🇺🇸", defaultVoice: "en_US-lessac-high" },
  { code: "pt", name: "Portuguese (Brazil)", nativeName: "Português", flag: "🇧🇷", defaultVoice: "pt_BR-faber-medium" },
  { code: "fr", name: "French (France)", nativeName: "Français", flag: "🇫🇷", defaultVoice: "fr_FR-siwis-medium" },
  { code: "de", name: "German (Germany)", nativeName: "Deutsch", flag: "🇩🇪", defaultVoice: "de_DE-thorsten-high" },
  { code: "it", name: "Italian (Italy)", nativeName: "Italiano", flag: "🇮🇹", defaultVoice: "it_IT-riccardo-medium" },
];

export function LocalizationMatrixModal({
  isOpen,
  onClose,
  onStartDubbingMatrix,
}: LocalizationMatrixModalProps) {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["es", "en", "pt"]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const toggleLanguage = (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter((l) => l !== code));
      }
    } else {
      setSelectedLangs([...selectedLangs, code]);
    }
  };

  const handleStart = async () => {
    if (!onStartDubbingMatrix) return;
    try {
      setIsProcessing(true);
      await onStartDubbingMatrix(selectedLangs);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Globe2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                6-Language Multi-Dubbing Matrix
              </h3>
              <p className="text-[11px] text-zinc-400">
                Simultaneous translation, phoneme realignment, and multilingual render
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Languages Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">
            Target Distribution Languages ({selectedLangs.length} selected)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLangs.includes(lang.code);

              return (
                <div
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{lang.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {lang.defaultVoice}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      isSelected
                        ? "bg-blue-500 text-black border-blue-400"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isProcessing || selectedLangs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-black font-bold text-xs hover:bg-blue-400 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>
              {isProcessing
                ? "Initiating Dubbing Matrix..."
                : `Translate & Dub ${selectedLangs.length} Languages`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
