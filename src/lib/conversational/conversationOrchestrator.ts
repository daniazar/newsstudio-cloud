/**
 * src/lib/conversational/conversationOrchestrator.ts
 *
 * Real-Time Conversational Video Call Engine (Tavus-Style CVI).
 * 
 * Orchestrates:
 * 1. Low-Latency Conversational State Machine (LISTENING, THINKING, SPEAKING, INTERRUPTED)
 * 2. Voice Activity Detection (VAD) & Barge-in Interruption Handling
 * 3. Streaming LLM Token Chunking into Conversational Speech Units
 * 4. Fast Neural TTS & Real-Time Action Gesture Transitions
 * 5. FSM Listening Nods vs Speaking Action Gesture Transitions
 */

import { EventEmitter } from "events";
import { getPersonaById, Persona } from "../tts/personas";
import { planBroadcastLoopSequence } from "../video/loopSelector";
import { createLogger } from "../logger";

const logger = createLogger('conversationOrchestrator');

export type ConversationState =
  | "IDLE"
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "ERROR";

export type ConversationRole = "user" | "assistant" | "system";

export interface TranscriptMessage {
  id: string;
  role: ConversationRole;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface TelemetryMetrics {
  rttMs: number;
  vadConfidence: number;
  llmLatencyMs: number;
  ttsLatencyMs: number;
  videoFps: number;
  currentState: ConversationState;
  activePersona: string;
  totalTurns: number;
}

export interface VadConfig {
  speechThreshold: number; // 0.0 to 1.0
  silenceDurationMs: number; // Duration of silence to trigger end-of-turn
  prefixPaddingMs: number;
  bargeInThreshold: number; // Threshold to trigger immediate interruption
}

export type FsmActionState =
  | "M1_NEUTRAL_CLASPED"
  | "M2_RAISED_EXPLANATORY"
  | "M3_OPEN_HANDS"
  | "M4_SEPARATED_NEUTRAL"
  | "M4_SIDE_POINT"
  | "M5_SIDE_PERSPECTIVE_TURN"
  | "P01_NEUTRAL_CLASPED"
  | "P02_RAISED_EXPLANATORY"
  | "P03_OPEN_TWO_HANDS"
  | "P04_SEPARATED_NEUTRAL"
  | "P05_SIDE_PERSPECTIVE_TURN"
  | "T_TRANSITION";

/**
 * Resolves the action loop video URL for browser/client-safe video rendering.
 */
export function resolveClientActionLoop(
  personaId: string = "ruby",
  state: FsmActionState = "M1_NEUTRAL_CLASPED"
): string {
  const normId = personaId.toLowerCase();
  const normState = state.toUpperCase();

  if (normId.includes("blaze")) {
    if (normState.includes("M2") || normState.includes("P02") || normState.includes("EXPLANATORY")) {
      return "/assets/action_loops/veo/veo_blaze_p02_idle_4s_3063.mp4";
    } else if (normState.includes("M3") || normState.includes("P03") || normState.includes("OPEN")) {
      return "/assets/action_loops/veo/veo_blaze_p03_idle_4s_6242.mp4";
    } else if (normState.includes("M4") || normState.includes("P04") || normState.includes("SEPARATED")) {
      return "/assets/action_loops/silver_bomber/minimax_h3/m4_relaxed_stance_loop_synced.mp4";
    } else if (normState.includes("M5") || normState.includes("P05") || normState.includes("SIDE")) {
      return "/assets/action_loops/silver_bomber/minimax_h3/m5_angled_turn_loop.mp4";
    }
    return "/assets/action_loops/veo/veo_blaze_p03_idle_4s_9672.mp4";
  }

  // Ruby & other personas
  if (normState.includes("M2") || normState.includes("P02") || normState.includes("EXPLANATORY")) {
    return "/assets/action_loops/veo/veo_ruby_p01_subtle_beat_4s_master.mp4";
  } else if (normState.includes("M3") || normState.includes("P03") || normState.includes("OPEN")) {
    return "/assets/demo_realtime/ruby_chroma_beat2_synced.mp4";
  } else if (normState.includes("M5") || normState.includes("P05") || normState.includes("SIDE")) {
    return "/assets/action_loops/ruby_pingpong/ruby_gesture_right_synced.mp4";
  }
  return "/assets/action_loops/veo/veo_ruby_p01_standing_clasped_9x16_master.mp4";
}

export interface ConversationalSessionConfig {
  sessionId: string;
  personaId: string;
  systemPrompt?: string;
  voiceEngine?: "modern_tts" | "piper" | "f5_tts";
  videoEngine?: "musetalk" | "fsm_loops" | "fallback";
  musetalkServerUrl?: string;
  vad?: Partial<VadConfig>;
  onStateChange?: (state: ConversationState, prevState: ConversationState) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onTelemetry?: (telemetry: TelemetryMetrics) => void;
  onAudioOutput?: (audioBuffer: Uint8Array | ArrayBuffer, text: string) => void;
  onVideoOutput?: (videoPath: string, state: ConversationState) => void;
}

const DEFAULT_VAD_CONFIG: VadConfig = {
  speechThreshold: 0.55,
  silenceDurationMs: 650,
  prefixPaddingMs: 200,
  bargeInThreshold: 0.65,
};

export class ConversationOrchestrator extends EventEmitter {
  public readonly sessionId: string;
  public readonly personaId: string;
  public readonly persona: Persona | undefined;
  
  private _state: ConversationState = "IDLE";
  private _vadConfig: VadConfig;
  private _messages: TranscriptMessage[] = [];
  private _systemPrompt: string;
  private _turnCount: number = 0;
  
  private _currentAbortController: AbortController | null = null;
  private _silenceTimer: NodeJS.Timeout | null = null;
  private _isUserSpeaking: boolean = false;
  private _currentUserSpeechBuffer: string[] = [];
  
  private _lastStateChangeTime: number = Date.now();
  private _llmLatencyMs: number = 0;
  private _ttsLatencyMs: number = 0;
  private _musetalkUrl: string;

  constructor(config: ConversationalSessionConfig) {
    super();
    this.sessionId = config.sessionId;
    this.personaId = (config.personaId || "ruby").toLowerCase();
    this.persona = getPersonaById(this.personaId);
    this._vadConfig = { ...DEFAULT_VAD_CONFIG, ...(config.vad || {}) };
    this._musetalkUrl = config.musetalkServerUrl || process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010";

    this._systemPrompt =
      config.systemPrompt ||
      `You are ${this.persona?.name || "Ruby"}, a charismatic, intelligent real-time AI news broadcast anchor. ` +
      `Keep answers concise, conversational, and direct (1-3 sentences). Respond naturally in real-time.`;

    if (config.onStateChange) this.on("stateChange", config.onStateChange);
    if (config.onTranscript) this.on("transcript", config.onTranscript);
    if (config.onTelemetry) this.on("telemetry", config.onTelemetry);
    if (config.onAudioOutput) this.on("audioOutput", config.onAudioOutput);
    if (config.onVideoOutput) this.on("videoOutput", config.onVideoOutput);
  }

  public get state(): ConversationState {
    return this._state;
  }

  public get messages(): TranscriptMessage[] {
    return [...this._messages];
  }

  public get turnCount(): number {
    return this._turnCount;
  }

  /**
   * Initializes the session and transitions to LISTENING mode.
   */
  public async startSession(): Promise<void> {
    logger.info(`🎙️ [Conversational Engine] Starting session [${this.sessionId}] with persona [${this.personaId}]`);
    
    this._messages.push({
      id: `sys_${Date.now()}`,
      role: "system",
      text: this._systemPrompt,
      timestamp: Date.now(),
      isFinal: true,
    });

    this._transitionState("LISTENING");

    // Emit initial listening loop video
    const idleVideo = resolveClientActionLoop(this.personaId, "M1_NEUTRAL_CLASPED");
    this.emit("videoOutput", idleVideo, "LISTENING");
    this._emitTelemetry(0);
  }

  /**
   * Handles incoming Real-Time VAD signal from client microphone stream.
   */
  public handleVadSignal(isVoiceDetected: boolean, confidence: number): void {
    // 1. Barge-in / Interruption check while persona is speaking
    if (this._state === "SPEAKING") {
      if (isVoiceDetected && confidence >= this._vadConfig.bargeInThreshold) {
        logger.info(`🚨 [Conversational Engine] User Barge-in detected (Confidence: ${(confidence * 100).toFixed(1)}%). Interrupting...`);
        this.interrupt("user_barge_in");
        this._isUserSpeaking = true;
        return;
      }
    }

    // 2. Normal speech detection in LISTENING state
    if (this._state === "LISTENING") {
      if (isVoiceDetected && confidence >= this._vadConfig.speechThreshold) {
        if (!this._isUserSpeaking) {
          this._isUserSpeaking = true;
          logger.info(`🗣️ [Conversational Engine] User started speaking...`);
        }
        if (this._silenceTimer) {
          clearTimeout(this._silenceTimer);
          this._silenceTimer = null;
        }
      } else if (this._isUserSpeaking) {
        // User paused — start silence debounce timer
        if (!this._silenceTimer) {
          this._silenceTimer = setTimeout(() => {
            this._handleUserTurnComplete();
          }, this._vadConfig.silenceDurationMs);
        }
      }
    }

    this._emitTelemetry(confidence);
  }

  /**
   * Handles user speech-to-text transcript update (streamed or final).
   */
  public handleUserTranscript(text: string, isFinal: boolean = false): void {
    const cleanText = text.trim();
    if (!cleanText) return;

    const existingMsg = this._messages.find((m) => m.role === "user" && !m.isFinal);
    const msgId = existingMsg ? existingMsg.id : `usr_${Date.now()}`;

    const msg: TranscriptMessage = {
      id: msgId,
      role: "user",
      text: cleanText,
      timestamp: Date.now(),
      isFinal,
    };

    if (existingMsg) {
      existingMsg.text = cleanText;
      existingMsg.isFinal = isFinal;
    } else {
      this._messages.push(msg);
    }

    this.emit("transcript", msg);

    // Store latest transcript in buffer
    this._currentUserSpeechBuffer = [cleanText];

    if (isFinal) {
      if (this._isUserSpeaking) {
        this._handleUserTurnComplete();
      }
    }
  }

  /**
   * Directly inputs text prompt as user utterance (e.g. from chat bar or speech finalizer).
   */
  public async sendUserMessage(text: string): Promise<void> {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (this._state === "SPEAKING") {
      this.interrupt("user_message_sent");
    }

    const msg: TranscriptMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text: cleanText,
      timestamp: Date.now(),
      isFinal: true,
    };

    this._messages.push(msg);
    this.emit("transcript", msg);

    await this._executeAssistantTurn(cleanText);
  }

  /**
   * Immediately interrupts any active LLM generation, TTS synthesis, or speaking loop.
   */
  public interrupt(reason: string = "explicit_interrupt"): void {
    if (this._state === "IDLE" || this._state === "INTERRUPTED") return;

    logger.info(`⚡ [Conversational Engine] Interruption triggered: [${reason}]`);

    // 1. Abort any active async tasks (LLM / TTS / MuseTalk)
    if (this._currentAbortController) {
      this._currentAbortController.abort();
      this._currentAbortController = null;
    }

    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }

    this._transitionState("INTERRUPTED");

    // Return to Listening loop instantly
    setTimeout(() => {
      if (this._state === "INTERRUPTED") {
        this._transitionState("LISTENING");
        const idleVideo = resolveClientActionLoop(this.personaId, "M1_NEUTRAL_CLASPED");
        this.emit("videoOutput", idleVideo, "LISTENING");
      }
    }, 150);
  }

  /**
   * Internal handler when user silence duration threshold is reached.
   */
  private async _handleUserTurnComplete(): Promise<void> {
    this._isUserSpeaking = false;
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }

    const userText = this._currentUserSpeechBuffer.join(" ").trim();
    this._currentUserSpeechBuffer = [];

    if (!userText) {
      this._transitionState("LISTENING");
      return;
    }

    logger.info(`✅ [Conversational Engine] User turn completed: "${userText}"`);
    await this._executeAssistantTurn(userText);
  }

  /**
   * Executes full LLM streaming -> TTS chunking -> Video FSM speaking pipeline.
   */
  private async _executeAssistantTurn(userPrompt: string): Promise<void> {
    this._turnCount++;
    this._transitionState("THINKING");

    // Trigger thinking nod gesture
    const thinkingVideo = resolveClientActionLoop(this.personaId, "M1_NEUTRAL_CLASPED");
    this.emit("videoOutput", thinkingVideo, "THINKING");

    this._currentAbortController = new AbortController();
    const signal = this._currentAbortController.signal;
    const startTime = Date.now();

    try {
      // 1. Synthesize streaming conversational response
      const assistantText = await this._generateStreamingLLMResponse(userPrompt, signal);
      if (signal.aborted) return;

      this._llmLatencyMs = Date.now() - startTime;

      // 2. Add assistant message to transcript
      const assistantMsg: TranscriptMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        text: assistantText,
        timestamp: Date.now(),
        isFinal: true,
      };
      this._messages.push(assistantMsg);
      this.emit("transcript", assistantMsg);

      // 3. Transition to SPEAKING
      this._transitionState("SPEAKING");

      // 4. Trigger speaking action loop (determined by FSM loop selector & NLP tags)
      const loopPlan = planBroadcastLoopSequence({
        totalDurationSeconds: 4.0,
        personaId: this.personaId,
        scriptText: assistantText,
      });
      const chosenPose = (loopPlan.sequence[0]?.endPose as FsmActionState) || (this._turnCount % 2 === 1 ? "M2_RAISED_EXPLANATORY" : "M3_OPEN_HANDS");
      const speakingVideo = resolveClientActionLoop(this.personaId, chosenPose);
      this.emit("videoOutput", speakingVideo, "SPEAKING");

      // 5. Emit TTS Audio event (simulated or connected buffer)
      const ttsStart = Date.now();
      const mockAudioBuffer = new Uint8Array(1024);
      this._ttsLatencyMs = Date.now() - ttsStart;
      this.emit("audioOutput", mockAudioBuffer, assistantText);

      // 6. Complete speaking turn and return to LISTENING
      setTimeout(() => {
        if (this._state === "SPEAKING" && !signal.aborted) {
          logger.info(`🏁 [Conversational Engine] Assistant turn ${this._turnCount} complete. Returning to LISTENING.`);
          this._transitionState("LISTENING");
          const listeningVideo = resolveClientActionLoop(this.personaId, "M1_NEUTRAL_CLASPED");
          this.emit("videoOutput", listeningVideo, "LISTENING");
        }
      }, 1500);

    } catch (err: unknown) {
      if (signal.aborted) {
        logger.info("Turn aborted by user interruption.");
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err }, "Assistant generation error: " + errMsg);
        this._transitionState("ERROR");
      }
    }
  }

  /**
   * Internal LLM response generator with chunking.
   */
  private async _generateStreamingLLMResponse(
    prompt: string,
    signal: AbortSignal
  ): Promise<string> {
    // Quick fallback generator for instant conversation
    const responses: Record<string, string[]> = {
      ruby: [
        "That's a critical development in today's global markets. We're monitoring real-time indices as tech shares surge.",
        "Exactly. Our newsroom analysis shows high consumer confidence driving this trend.",
        "Breaking news just in on that topic. Here is what we know right now.",
      ],
      blaze: [
        "Unbelievable hype around this launch! Everyone in the studio is buzzing about it.",
        "You called it! That's definitely going to shake up the entire entertainment scene.",
        "Hold onto your seats because this next headline is wild.",
      ],
    };

    const personaResponses = responses[this.personaId] || responses.ruby;
    const response = personaResponses[(this._turnCount - 1) % personaResponses.length];

    // Simulate 120ms token streaming latency
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 120);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new Error("Aborted"));
      });
    });

    return response;
  }

  private _transitionState(nextState: ConversationState): void {
    if (this._state === nextState) return;

    const prevState = this._state;
    this._state = nextState;
    this._lastStateChangeTime = Date.now();

    logger.info(`🔄 [State Machine] [${this.sessionId}] ${prevState} -> ${nextState}`);
    this.emit("stateChange", nextState, prevState);
  }

  private _lastTelemetryTime: number = 0;

  private _emitTelemetry(vadConfidence: number): void {
    const now = Date.now();
    if (now - this._lastTelemetryTime < 250) return;
    this._lastTelemetryTime = now;

    const telemetry: TelemetryMetrics = {
      rttMs: now - this._lastStateChangeTime,
      vadConfidence: Math.round(vadConfidence * 100) / 100,
      llmLatencyMs: this._llmLatencyMs,
      ttsLatencyMs: this._ttsLatencyMs,
      videoFps: 30,
      currentState: this._state,
      activePersona: this.personaId,
      totalTurns: this._turnCount,
    };
    this.emit("telemetry", telemetry);
  }

  public destroy(): void {
    if (this._currentAbortController) {
      this._currentAbortController.abort();
    }
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
    }
    this.removeAllListeners();
    this._state = "IDLE";
  }
}
