import { useState, useCallback } from "react";
import { AudioMode } from "@/lib/types/ecommerce";

export function useEcommerceStudioAudio() {
  const [audioMode, setAudioMode] = useState<AudioMode>("voiceover_tts");
  const [voicePersonaId, setVoicePersonaId] = useState<string>("marcus");
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<string>("upbeat_electro");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [isPlayingAudition, setIsPlayingAudition] = useState<boolean>(false);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState<boolean>(false);

  const toggleAuditionMusic = useCallback(() => {
    setIsPlayingAudition((prev) => !prev);
  }, []);

  return {
    audioMode,
    setAudioMode,
    voicePersonaId,
    setVoicePersonaId,
    selectedMusicTrack,
    setSelectedMusicTrack,
    speechSpeed,
    setSpeechSpeed,
    pitchShift,
    setPitchShift,
    isPlayingAudition,
    setIsPlayingAudition,
    isSynthesizingVoice,
    setIsSynthesizingVoice,
    toggleAuditionMusic,
  };
}
