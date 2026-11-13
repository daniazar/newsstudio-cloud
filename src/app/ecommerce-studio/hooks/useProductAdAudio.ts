import { useState, useCallback } from "react";

export function useProductAdAudio() {
  const [selectedEngine, setSelectedEngine] = useState<string>("piper");
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<string>("en_US-lessac-medium");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<string>("upbeat_electro");
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState<number>(0.2);
  const [isCalibratingVoice, setIsCalibratingVoice] = useState<boolean>(false);
  const [playingAuditionUrl, setPlayingAuditionUrl] = useState<string | null>(null);

  const handleToggleAuditionAudio = useCallback((audioUrl: string) => {
    setPlayingAuditionUrl((prev) => (prev === audioUrl ? null : audioUrl));
  }, []);

  return {
    selectedEngine,
    setSelectedEngine,
    selectedVoiceModel,
    setSelectedVoiceModel,
    speechSpeed,
    setSpeechSpeed,
    pitchShift,
    setPitchShift,
    selectedMusicTrack,
    setSelectedMusicTrack,
    backgroundMusicVolume,
    setBackgroundMusicVolume,
    isCalibratingVoice,
    setIsCalibratingVoice,
    playingAuditionUrl,
    setPlayingAuditionUrl,
    handleToggleAuditionAudio,
  };
}
