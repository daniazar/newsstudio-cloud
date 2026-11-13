import React, { useMemo } from "react";
import { Audio, Sequence, interpolate, useCurrentFrame } from "remotion";
import { RemotionSegment } from "../../lib/types";
import { resolveStorageUrl } from "../../lib/storage/storageUtils";

interface SegmentVoiceProps {
  segment: RemotionSegment;
  volume?: number;
}

const SegmentVoice: React.FC<SegmentVoiceProps> = ({ segment, volume = 1.0 }) => {
  const frame = useCurrentFrame();

  const audioUrl = useMemo(() => {
    const raw = segment.audioUrl || segment.audioPath;
    return raw ? resolveStorageUrl(raw) : null;
  }, [segment.audioUrl, segment.audioPath]);

  if (!audioUrl) return null;

  const duration = Math.max(1, segment.endFrame - segment.startFrame);
  // Smooth 2-frame anti-click fade at boundary edges
  const fadeIn = interpolate(frame, [0, 2], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [duration - 2, duration], [1, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalVolume = volume * Math.min(fadeIn, fadeOut);

  return <Audio src={audioUrl} volume={finalVolume} />;
};

export const VoiceLayer: React.FC<{ segments: RemotionSegment[]; masterVolume?: number }> = ({
  segments,
  masterVolume = 1.0,
}) => {
  // Always play master voice track for each segment with an audio asset
  const voiceSegments = segments.filter((s) => !!(s.audioUrl || s.audioPath));

  return (
    <>
      {voiceSegments.map((seg) => (
        <Sequence
          key={seg.index}
          from={seg.startFrame}
          durationInFrames={Math.max(1, Math.round(seg.endFrame - seg.startFrame))}
        >
          <SegmentVoice segment={seg} volume={masterVolume} />
        </Sequence>
      ))}
    </>
  );
};

// Backward-compatible alias
export const ChatterboxVoiceLayer = VoiceLayer;

