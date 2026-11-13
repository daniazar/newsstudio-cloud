"use client";

import { useToast } from "@/components/global/ToastContainer";
import { FileAudio,Loader2,Mic,Square,UploadCloud,X } from "lucide-react";
import React,{ useCallback,useEffect,useRef,useState } from "react";

interface VoiceRecorderProps {
  onSave: (blob: Blob, label: string) => Promise<void>;
  isUploading: boolean;
}

export function VoiceRecorder({ onSave, isUploading }: VoiceRecorderProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [label, setLabel] = useState("");
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const setAudioUrlSafe = useCallback((newBlob: Blob | null) => {
    setAudioUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return newBlob ? URL.createObjectURL(newBlob) : null;
    });
  }, []);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" }); // MediaRecorder usually produces webm or ogg
        setAudioBlob(blob);
        setAudioUrlSafe(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast("Microphone Access Error", "Could not access microphone. Please check permissions.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setAudioUrlSafe(file);
      // Auto-fill label if empty
      if (!label) {
        setLabel(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    const finalLabel = label.trim() || "Custom Voice Reference";
    await onSave(audioBlob, finalLabel);
    // Reset after successful save
    handleClear();
  };

  const handleClear = () => {
    setAudioBlob(null);
    setAudioUrlSafe(null);
    setLabel("");
    setRecordingTime(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-border/50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-foreground">🎙️ Add Voice Reference</h4>
        
        {/* Mode Toggle */}
        <div className="flex bg-background border border-border rounded-lg overflow-hidden p-0.5">
          <button
            onClick={() => { setMode("record"); handleClear(); }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${mode === "record" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            Record
          </button>
          <button
            onClick={() => { setMode("upload"); handleClear(); }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${mode === "upload" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            Upload
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Label Input */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-muted uppercase">Voice Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Studio Quality 1, Phone Call, etc."
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none text-foreground"
          />
        </div>

        {/* Input Area */}
        {!audioBlob ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 rounded-xl bg-background/50 transition-colors">
            {mode === "record" ? (
              <div className="flex flex-col items-center gap-3">
                {isRecording ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
                      <button onClick={stopRecording} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <span className="text-sm font-mono text-red-500 font-bold">{formatTime(recordingTime)}</span>
                    <p className="text-[10px] text-muted text-center max-w-[200px]">Recording in progress. Speak clearly.</p>
                  </>
                ) : (
                  <>
                    <button onClick={startRecording} className="w-16 h-16 rounded-full bg-accent-muted text-accent border border-accent/20 flex items-center justify-center shadow hover:scale-105 transition-transform">
                      <Mic className="w-6 h-6" />
                    </button>
                    <p className="text-[10px] text-muted text-center max-w-[200px]">Click to start recording from your microphone (10-30s recommended).</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*,video/mp4"
                  className="hidden"
                  id="voice-upload"
                />
                <label
                  htmlFor="voice-upload"
                  className="px-6 py-3 rounded-xl bg-accent-muted text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors cursor-pointer flex items-center gap-2 font-bold text-xs"
                >
                  <UploadCloud className="w-4 h-4" /> Browse Files
                </label>
                <p className="text-[10px] text-muted text-center">Supports WAV, MP3, MP4, WebM.</p>
              </div>
            )}
          </div>
        ) : (
          /* Preview Area */
          <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent">
                <FileAudio className="w-5 h-5" />
                <span className="text-xs font-bold font-mono">Audio Ready</span>
              </div>
              <button onClick={handleClear} className="p-1 text-muted hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <audio controls src={audioUrl!} className="w-full h-8" />
            
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-wider hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                "Save Reference Voice"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
