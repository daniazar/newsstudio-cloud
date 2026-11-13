/**
 * src/lib/realtime/audioVisemeExtractor.ts
 *
 * Real-Time Audio-to-Viseme Extractor for WebGL Neural Mouth Warping.
 * Implements the 15 Standard Oculus Viseme system (OVR/ARKit compatible)
 * with asymmetric attack/decay temporal smoothing and coarticulation blending.
 *
 * Reference: Amoner/lipsync-engine & met4citizen/talkinghead Oculus 15-viseme standard.
 */

import { FormantExtractor } from "./formantExtractor";

export type OculusViseme =
  | "sil" // Silence / Neutral rest (Azure 0)
  | "PP"  // /p/, /b/, /m/ (Bilabial plosive - Azure 21)
  | "FF"  // /f/, /v/ (Labiodental fricative - Azure 18)
  | "TH"  // /th/, /dh/ (Dental fricative - Azure 17)
  | "DD"  // /t/, /d/, /n/ (Alveolar stop - Azure 19)
  | "kk"  // /k/, /g/, /ng/ (Velar stop - Azure 20)
  | "CH"  // /ch/, /j/, /sh/, /zh/ (Postalveolar affricate - Azure 16)
  | "SS"  // /s/, /z/ (Alveolar sibilant - Azure 15)
  | "nn"  // /n/, /ng/ (Nasal)
  | "RR"  // /r/, /er/ (Retroflex liquid - Azure 13, 5)
  | "aa"  // /a/, /ah/ (Open vowel - Azure 1, 2)
  | "E"   // /e/, /eh/ (Mid front vowel - Azure 4)
  | "ih"  // /i/, /ee/ (Close front vowel - Azure 6)
  | "oh"  // /o/, /aw/ (Open-mid back vowel - Azure 3, 8)
  | "ou"; // /u/, /oo/ (Close back rounded vowel - Azure 7)

export type ArticulatoryProfile = "default" | "rioplatense_es" | "french" | "japanese";

export interface VisemeFrame {
  /** Vertical jaw openness (0.0 to 1.0) */
  jawOpen: number;
  /** Horizontal lip spread (-1.0 for rounded /o/, +1.0 for wide /i/, /e/) */
  lipWidth: number;
  /** Lip height expansion (-0.5 for pressed /p,b,m/, +1.0 for open /a/) */
  lipHeight: number;
  /** Lip pucker / rounding (0.0 to 1.0) for /o/, /u/ vowels */
  lipPucker: number;
  /** Upper/lower lip compression for bilabials /p,b,m/ (Azure 21) */
  lipCompression: number;
  /** Labiodental lower lip tuck under upper incisors for /f,v/ (Azure 18) */
  labiodentalTuck: number;
  /** Tongue tip protrusion between teeth for /th,dh/ (Azure 17) */
  tongueTipProtrusion: number;
  /** Tongue tip elevation toward upper incisors/palate for /l/ (Azure 14) and /d,t,n/ (Azure 19) */
  tongueTipElevated: number;
  /** Upper & lower incisors clenched together for /s,z/ (Azure 15) and /sh,ch/ (Azure 16) */
  teethClenched: number;
  /** Raw RMS audio power (0.0 to 1.0) */
  rms: number;
  /** Dominant 15-standard Oculus viseme */
  dominantViseme: OculusViseme;
  /** Official Microsoft Azure Speech Viseme ID (0 to 21) */
  azureVisemeId: number;
  /** Human-readable Azure Viseme description */
  azureVisemeName: string;
  /** Weights of all 15 Oculus visemes (0.0 to 1.0) */
  visemeWeights: Record<OculusViseme, number>;
  /** D3: True if audible low-energy inhalation/exhalation breath audio is detected */
  isAudibleBreath?: boolean;
  /** D3: Normalized breath intensity (0.0 to 1.0) */
  breathIntensity?: number;
  upperLipLift?: number;
  lowerLipDepress?: number;
  eyebrowFurrow?: number;
  eyebrowRaise?: number;
  smileExpression?: number;
}

export const OCULUS_VISEME_KEYS: readonly OculusViseme[] = [
  "sil",
  "PP",
  "FF",
  "TH",
  "DD",
  "kk",
  "CH",
  "SS",
  "nn",
  "RR",
  "aa",
  "E",
  "ih",
  "oh",
  "ou",
];

export const AZURE_VISEME_NAMES: Record<number, string> = {
  0: "Silence (Rest)",
  1: "æ, ə, ʌ (At/Up)",
  2: "ɑ (Car/Father)",
  3: "ɔ (All/Thought)",
  4: "ɛ, ʊ (Bed/Good)",
  5: "ɝ (Bird/Her)",
  6: "j, i, ɪ (See/Yes)",
  7: "w, u (You/To)",
  8: "o (Go/Boat)",
  9: "aʊ (Now/Out)",
  10: "ɔɪ (Boy/Toy)",
  11: "aɪ (My/Buy)",
  12: "h (He/Hat)",
  13: "ɹ (Red/Car)",
  14: "l (Light/All)",
  15: "s, z (So/Zoo)",
  16: "ʃ, tʃ, dʒ (She/Jump)",
  17: "θ, ð (Think/That)",
  18: "f, v (For/Very)",
  19: "d, t, n (Day/Tea)",
  20: "k, g (Cat/Go)",
  21: "p, b, m (Pop/Mom)",
};

export class AudioVisemeExtractor {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  // Smoothed blendshape weights
  private smoothJaw: number = 0;
  private smoothWidth: number = 0;
  private smoothHeight: number = 0;
  private smoothPucker: number = 0;
  private smoothCompression: number = 0;
  private smoothLabiodental: number = 0;
  private smoothTongueProtrusion: number = 0;
  private smoothTongueElevated: number = 0;
  private smoothTeethClenched: number = 0;
  private smoothAzureId: number = 0;
  private articulatoryProfile: ArticulatoryProfile = "default";

  // Jaw Spring-Mass Oscillator (replaces exponential jaw smoothing)
  // Simulates the ~50g jaw mass with muscle stiffness and viscous damping.
  // stiffness=180 N/m, damping=0.72 gives a natural settling time of ~120ms
  // which matches physiological jaw open/close timing for English speech.
  private jawPos: number = 0;   // Current jaw displacement (0.0 to 1.0)
  private jawVel: number = 0;   // Current jaw velocity (units/sec)
  private prevCompression: number = 0; // Previous frame lip compression for plosive kick detection
  private lastExtractTime: number = 0; // Wall-clock timestamp for spring dt calculation

  // 15 Oculus viseme weights
  private weights: Record<OculusViseme, number> = {
    sil: 1.0,
    PP: 0,
    FF: 0,
    TH: 0,
    DD: 0,
    kk: 0,
    CH: 0,
    SS: 0,
    nn: 0,
    RR: 0,
    aa: 0,
    E: 0,
    ih: 0,
    oh: 0,
    ou: 0,
  };

  private rawWeights: Record<OculusViseme, number> = {
    sil: 0,
    PP: 0,
    FF: 0,
    TH: 0,
    DD: 0,
    kk: 0,
    CH: 0,
    SS: 0,
    nn: 0,
    RR: 0,
    aa: 0,
    E: 0,
    ih: 0,
    oh: 0,
    ou: 0,
  };

  private currentFrame: VisemeFrame = {
    jawOpen: 0,
    lipWidth: 0,
    lipHeight: 0,
    lipPucker: 0,
    lipCompression: 0,
    labiodentalTuck: 0,
    tongueTipProtrusion: 0,
    tongueTipElevated: 0,
    teethClenched: 0,
    rms: 0,
    dominantViseme: "sil",
    azureVisemeId: 0,
    azureVisemeName: AZURE_VISEME_NAMES[0],
    visemeWeights: this.weights,
    isAudibleBreath: false,
    breathIntensity: 0,
  };

  // D5: Acoustic Echo / Reverb Decay Gate
  private wasSpeakingState: boolean = false;
  private speechEndTimeMs: number = -1;
  private reverbGateAttenuation: number = 1.0;

  // H3: WebAudio Latency Compensation (AnalyserNode frame buffer delay compensation)
  private webAudioLatencyMs: number = 0;

  // A4: 5-Frame Asymmetric Coarticulation Ring Buffer (Front-loaded phoneme anticipation)
  public static readonly GAUSS_COART_KERNEL = [0.04, 0.12, 0.38, 0.30, 0.16];
  private coartRing: Float32Array[] = [
    new Float32Array(15),
    new Float32Array(15),
    new Float32Array(15),
    new Float32Array(15),
    new Float32Array(15),
  ];
  private coartIdx: number = 0;
  private coartCount: number = 0;
  private blendedWeights: Float32Array = new Float32Array(15);
  private rawVector: Float32Array = new Float32Array(15);

  private readonly sampleRate: number;
  private binSize: number = 48000 / 512;

  // Precomputed Formant Bands
  private speechStartBin: number = 1;
  private speechEndBin: number = 40;
  private invSpeechBinCount: number = 1 / 40;

  private bandF0 = { start: 1, end: 3, invDenom: 1 / (3 * 255) };
  private bandF1 = { start: 3, end: 9, invDenom: 1 / (7 * 255) };
  private bandF2 = { start: 11, end: 25, invDenom: 1 / (15 * 255) };
  private bandF3 = { start: 25, end: 40, invDenom: 1 / (16 * 255) };
  private bandHighSibilant = { start: 42, end: 85, invDenom: 1 / (44 * 255) };
  private bandLowMid = { start: 4, end: 10, invDenom: 1 / (7 * 255) };
  private bandFricativeHigh = { start: 53, end: 106, invDenom: 1 / (54 * 255) };

  // D1: Real-Time LPC Formant Extractor for F1/F2 Vowel Refinement
  private formantExtractor: FormantExtractor;
  private timeDomainBuffer: Float32Array = new Float32Array(256);

  constructor(analyserOrSampleRate?: AnalyserNode | number, sampleRate: number = 48000) {
    let analyserNode: AnalyserNode | undefined;
    if (typeof analyserOrSampleRate === "number") {
      this.sampleRate = analyserOrSampleRate;
    } else {
      analyserNode = analyserOrSampleRate;
      this.sampleRate = sampleRate;
    }
    const fftSize = analyserNode ? analyserNode.fftSize : 512;
    this.binSize = this.sampleRate / fftSize;
    this.formantExtractor = new FormantExtractor(this.sampleRate, 14, 256);

    if (analyserNode) {
      this.attachAnalyser(analyserNode);
    }
  }

  private _initBandRanges(binCount: number): void {
    const calc = (minHz: number, maxHz: number) => {
      const start = Math.max(0, Math.floor(minHz / this.binSize));
      const end = Math.min(binCount - 1, Math.ceil(maxHz / this.binSize));
      const count = end >= start ? (end - start + 1) : 1;
      return { start, end, invDenom: 1.0 / (count * 255) };
    };

    this.speechStartBin = Math.max(1, Math.floor(100 / this.binSize));
    this.speechEndBin = Math.min(binCount - 1, Math.ceil(7500 / this.binSize));
    const speechCount = Math.max(1, this.speechEndBin - this.speechStartBin + 1);
    this.invSpeechBinCount = 1.0 / speechCount;

    this.bandF0 = calc(100, 300);
    this.bandF1 = calc(300, 850);
    this.bandF2 = calc(1100, 2400);
    this.bandF3 = calc(2400, 3800);
    this.bandHighSibilant = calc(4000, 8000);
    this.bandLowMid = calc(400, 900);
    this.bandFricativeHigh = calc(5000, 10000);
  }

  public attachAnalyser(analyserNode: AnalyserNode): void {
    this.analyser = analyserNode;
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.35;
    this.binSize = this.sampleRate / this.analyser.fftSize;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this._initBandRanges(this.analyser.frequencyBinCount);
  }

  public connectAudioElement(audioElement: HTMLMediaElement, audioCtx: AudioContext): AnalyserNode {
    const source = audioCtx.createMediaElementSource(audioElement);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    this.attachAnalyser(analyser);
    return analyser;
  }

  public setArticulatoryProfile(profile: ArticulatoryProfile): void {
    this.articulatoryProfile = profile;
  }

  public getArticulatoryProfile(): ArticulatoryProfile {
    return this.articulatoryProfile;
  }

  public notifySpeechState(isSpeaking: boolean, nowMs?: number): void {
    const now = nowMs !== undefined ? nowMs : (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (this.wasSpeakingState && !isSpeaking) {
      this.speechEndTimeMs = now;
    } else if (isSpeaking) {
      this.speechEndTimeMs = -1;
    }
    this.wasSpeakingState = isSpeaking;
  }

  public setReverbGateAttenuation(attenuation: number): void {
    this.reverbGateAttenuation = Math.max(0.0, Math.min(1.0, attenuation));
  }

  public getReverbGateAttenuation(): number {
    return this.reverbGateAttenuation;
  }

  public setWebAudioLatencyMs(ms: number): void {
    this.webAudioLatencyMs = Math.max(0, Math.min(150, ms));
  }

  public getWebAudioLatencyMs(): number {
    return this.webAudioLatencyMs;
  }

  public extractFrame(): VisemeFrame {
    return this.extractViseme();
  }

  /**
   * Samples the audio frequency spectrum and extracts the 22 Azure Speech Visemes & ARKit blendshapes.
   */
  public extractViseme(): VisemeFrame {
    if (!this.analyser || !this.dataArray) {
      this._decayToRest();
      this.currentFrame.jawOpen = this.smoothJaw;
      this.currentFrame.lipWidth = this.smoothWidth;
      this.currentFrame.lipHeight = this.smoothHeight;
      this.currentFrame.lipPucker = this.smoothPucker;
      this.currentFrame.lipCompression = this.smoothCompression;
      this.currentFrame.labiodentalTuck = this.smoothLabiodental;
      this.currentFrame.tongueTipProtrusion = this.smoothTongueProtrusion;
      this.currentFrame.tongueTipElevated = this.smoothTongueElevated;
      this.currentFrame.teethClenched = this.smoothTeethClenched;
      this.currentFrame.rms = 0;
      this.currentFrame.dominantViseme = "sil";
      this.currentFrame.azureVisemeId = 0;
      this.currentFrame.azureVisemeName = AZURE_VISEME_NAMES[0];
      return this.currentFrame;
    }

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    const bins = this.dataArray;

    // 1. Precomputed speech-focused RMS energy (100 Hz to 7500 Hz)
    let sumSquares = 0;
    for (let i = this.speechStartBin; i <= this.speechEndBin; i++) {
      const val = bins[i] * 0.0039215686; // 1 / 255
      sumSquares += val * val;
    }
    let rms = Math.sqrt(sumSquares * this.invSpeechBinCount);

    // D5: Acoustic Reverb / Echo Decay Gate
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.speechEndTimeMs > 0) {
      const elapsed = nowMs - this.speechEndTimeMs;
      if (elapsed >= 0 && elapsed < 150) {
        const gateFactor = 1.0 - Math.exp(-6.0 * (elapsed / 150));
        rms *= gateFactor;
      }
    }
    if (this.reverbGateAttenuation < 1.0) {
      rms *= this.reverbGateAttenuation;
    }

    // 2. Extract Spectral Formant Energy Bands with Zero Allocation
    const f0Energy = this._getBand(bins, this.bandF0);
    const f1Energy = this._getBand(bins, this.bandF1);
    const f2Energy = this._getBand(bins, this.bandF2);
    const f3Energy = this._getBand(bins, this.bandF3);
    const highSibilant = this._getBand(bins, this.bandHighSibilant);
    const lowMidEnergy = this._getBand(bins, this.bandLowMid);
    const fricativeHigh = this._getBand(bins, this.bandFricativeHigh);

    // D3: Audible Breath vs. Silence Classifier
    let isAudibleBreath = false;
    let breathIntensity = 0.0;
    if (rms >= 0.008 && rms < 0.08) {
      if (highSibilant < 0.18 && fricativeHigh < 0.18) {
        isAudibleBreath = true;
        breathIntensity = Math.min(1.0, (rms - 0.008) / 0.035);
      }
    }
    this.currentFrame.isAudibleBreath = isAudibleBreath;
    this.currentFrame.breathIntensity = breathIntensity;

    if (rms < 0.005) {
      this._decayToRest(0);
      this.currentFrame.jawOpen = this.smoothJaw;
      this.currentFrame.lipWidth = this.smoothWidth;
      this.currentFrame.lipHeight = this.smoothHeight;
      this.currentFrame.lipPucker = this.smoothPucker;
      this.currentFrame.lipCompression = this.smoothCompression;
      this.currentFrame.labiodentalTuck = this.smoothLabiodental;
      this.currentFrame.tongueTipProtrusion = this.smoothTongueProtrusion;
      this.currentFrame.tongueTipElevated = this.smoothTongueElevated;
      this.currentFrame.teethClenched = this.smoothTeethClenched;
      this.currentFrame.rms = rms;
      this.currentFrame.dominantViseme = "sil";
      this.currentFrame.azureVisemeId = 0;
      this.currentFrame.azureVisemeName = AZURE_VISEME_NAMES[0];
      return this.currentFrame;
    }

    if (isAudibleBreath) {
      const breathJawTarget = 0.04 * breathIntensity;
      this._decayToRest(breathJawTarget);
      this.currentFrame.jawOpen = Math.max(this.jawPos, breathJawTarget);
      this.currentFrame.lipWidth = this.smoothWidth;
      this.currentFrame.lipHeight = this.smoothHeight;
      this.currentFrame.lipPucker = 0;
      this.currentFrame.lipCompression = 0;
      this.currentFrame.labiodentalTuck = 0;
      this.currentFrame.tongueTipProtrusion = 0;
      this.currentFrame.tongueTipElevated = 0;
      this.currentFrame.teethClenched = 0;
      this.currentFrame.rms = rms;
      this.currentFrame.dominantViseme = "sil";
      this.currentFrame.azureVisemeId = 0;
      this.currentFrame.azureVisemeName = AZURE_VISEME_NAMES[0];
      return this.currentFrame;
    }

    // 2.5. Peterson-Barney Acoustic Formant Inversion (F1/F2 Vowel Quadrilateral Ratio)
    const formantRatio = (f2Energy - f1Energy) / (f2Energy + f1Energy + 0.0001);
    const openness = f1Energy / (f1Energy + lowMidEnergy + 0.0001);

    // Multi-Lingual Articulatory Profile Biases
    let sibilantMultiplier = 2.2;
    let affricateMultiplier = 1.9;
    let puckerMultiplier = 1.0;
    const maxJawOpenLimit = this.articulatoryProfile === "japanese" ? 0.75 : 1.0;

    if (this.articulatoryProfile === "rioplatense_es") {
      // Argentine Spanish Yeísmo Rehilado: high postalveolar sibilant frication
      sibilantMultiplier = 2.8;
      affricateMultiplier = 2.4;
    } else if (this.articulatoryProfile === "french") {
      // French nasal and rounded vowels: elevated anterior labial pucker
      puckerMultiplier = 1.35;
    }

    // 3. Reset and Classify Oculus Visemes
    const raw = this.rawWeights;
    raw.sil = 0; raw.PP = 0; raw.FF = 0; raw.TH = 0; raw.DD = 0;
    raw.kk = 0; raw.CH = 0; raw.SS = 0; raw.nn = 0; raw.RR = 0;
    raw.aa = 0; raw.E = 0; raw.ih = 0; raw.oh = 0; raw.ou = 0;

    let targetAzureId = 1;

    if (highSibilant > 0.25 && highSibilant > f1Energy * 1.1) {
      // Sibilant /s/, /z/ (Azure 15)
      raw.SS = Math.min(1.0, highSibilant * sibilantMultiplier);
      targetAzureId = 15;
    } else if (fricativeHigh > 0.22 && f1Energy < 0.32) {
      // Labiodental fricative /f/, /v/ (Azure 18)
      raw.FF = Math.min(1.0, fricativeHigh * 2.0);
      targetAzureId = 18;
    } else if (f3Energy > 0.25 && f3Energy > f2Energy * 1.05) {
      // Affricates /ch/, /sh/ (Azure 16)
      raw.CH = Math.min(1.0, f3Energy * affricateMultiplier);
      targetAzureId = 16;
    } else if (formantRatio > 0.12 && f2Energy > 0.20) {
      // High front spread vowels /i/, /e/ (Azure 6, 4)
      if (f1Energy > 0.30) {
        raw.E = Math.min(1.0, f1Energy * 1.8);
        targetAzureId = 4;
      } else {
        raw.ih = Math.min(1.0, f2Energy * 1.9);
        targetAzureId = 6;
      }
    } else if (formantRatio < -0.12 && lowMidEnergy > 0.20) {
      // Back rounded vowels /o/, /u/ (Azure 8, 7)
      if (f1Energy > 0.28) {
        raw.oh = Math.min(1.0, lowMidEnergy * 1.8 * puckerMultiplier);
        targetAzureId = 8;
      } else {
        raw.ou = Math.min(1.0, lowMidEnergy * 2.0 * puckerMultiplier);
        targetAzureId = 7;
      }
    } else if (openness > 0.42 || f1Energy > 0.22) {
      // Open central vowel /a/, /aa/ (Azure 2)
      raw.aa = Math.min(1.0, f1Energy * 2.2 + rms * 0.8);
      targetAzureId = 2;
    } else if (f0Energy > 0.35 && f1Energy < 0.22) {
      // Bilabial plosive /p, b, m/ (Azure 21)
      raw.PP = Math.min(1.0, f0Energy * 1.8);
      targetAzureId = 21;
    } else {
      // Alveolar /d, t, n/ (Azure 19)
      raw.DD = Math.min(1.0, rms * 1.6);
      targetAzureId = 19;
    }

    // Fast Dominant Viseme Lookup
    let bestViseme: OculusViseme = "aa";
    let maxWeight = 0;
    const keys = OCULUS_VISEME_KEYS;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const w = raw[k];
      if (w > maxWeight) {
        maxWeight = w;
        bestViseme = k;
      }
    }

    // 3.5. 5-Frame Gaussian Temporal Coarticulation Convolution across 15 Visemes
    for (let i = 0; i < 15; i++) {
      this.rawVector[i] = raw[OCULUS_VISEME_KEYS[i]] || 0;
    }
    this.coartRing[this.coartIdx].set(this.rawVector);
    this.coartIdx = (this.coartIdx + 1) % 5;
    if (this.coartCount < 5) this.coartCount++;

    this.blendedWeights.fill(0);
    let totalCoartWeight = 0;
    for (let i = 0; i < this.coartCount; i++) {
      const idx = (this.coartIdx - 1 - i + 5) % 5;
      const w = AudioVisemeExtractor.GAUSS_COART_KERNEL[i];
      totalCoartWeight += w;
      const buf = this.coartRing[idx];
      for (let k = 0; k < 15; k++) {
        this.blendedWeights[k] += buf[k] * w;
      }
    }
    if (totalCoartWeight > 0.0001 && Math.abs(totalCoartWeight - 1.0) > 0.001) {
      const invW = 1.0 / totalCoartWeight;
      for (let k = 0; k < 15; k++) this.blendedWeights[k] *= invW;
    }
    for (let i = 0; i < 15; i++) {
      raw[OCULUS_VISEME_KEYS[i]] = this.blendedWeights[i];
    }

    // 4. Derive Continuous ARKit & Azure Blendshapes via Coarticulation Summation
    const wAA = raw.aa;
    const wE = raw.E;
    const wIH = raw.ih;
    const wOH = raw.oh;
    const wOU = raw.ou;
    const wPP = raw.PP;
    const wFF = raw.FF;
    const wTH = raw.TH;
    const wSS = raw.SS;
    const wCH = raw.CH;
    const wDD = raw.DD;

    let targetJaw = Math.min(1.0, wAA * 0.95 + wOH * 0.70 + wE * 0.55 + wCH * 0.28 + wTH * 0.22 + wIH * 0.20 + wFF * 0.16 + wDD * 0.32);
    // Bilabial compression seals jaw closed
    targetJaw *= (1.0 - wPP * 0.90);

    let targetWidth = (wIH * 0.85 + wE * 0.60 + wSS * 0.75 + wFF * 0.25) - (wOU * 0.80 + wOH * 0.50);
    targetWidth = Math.max(-1.0, Math.min(1.0, targetWidth));

    // D1: Real-Time LPC Formant Enhancement (F1/F2 Direct Vowel Mapping)
    if (this.analyser && typeof this.analyser.getFloatTimeDomainData === "function") {
      try {
        this.analyser.getFloatTimeDomainData(this.timeDomainBuffer as Float32Array<ArrayBuffer>);
        const formants = this.formantExtractor.extractFormants(this.timeDomainBuffer);
        if (formants.isVoicedVowel && formants.predictionGain > 2.5) {
          // Cross-blend acoustic LPC aperture estimate with FFT-derived target
          targetJaw = targetJaw * 0.70 + formants.jawOpenEstimate * 0.30;
          targetWidth = targetWidth * 0.70 + formants.lipWidthEstimate * 0.30;
          targetWidth = Math.max(-1.0, Math.min(1.0, targetWidth));
        }
      } catch {
        // Fallback gracefully if WebAudio buffer unavailable
      }
    }

    const targetPucker = Math.min(1.0, wOU * 0.95 + wOH * 0.65 + wCH * 0.45);
    const targetCompression = Math.min(1.0, wPP * 0.95);
    const targetLabiodental = Math.min(1.0, wFF * 0.92);
    const targetTongueProtrusion = Math.min(1.0, wTH * 0.90);
    const targetTongueElevated = Math.min(1.0, wDD * 0.75);
    const targetTeethClenched = Math.min(1.0, wSS * 0.95 + wCH * 0.80 + wIH * 0.65);

    // 5. Jaw Spring-Mass Oscillator + Physiological Smoothing for all other articulators.
    //
    // The jaw uses a damped spring (stiffness=180, damping=0.72) instead of exponential
    // smoothing. This produces:
    //   - Natural overshoot + bounce on plosive attacks (/p/→/a/ bilabial pop-open)
    //   - Organic settle on silence (gradual decay, not abrupt snap-to-zero)
    //   - Correct asymmetry: opening is faster than closing
    //
    // Plosive release kick: when lipCompression drops sharply (PP seal breaking),
    // inject +0.35 jaw velocity to simulate the burst open characteristic.
    const dtSpring = this.lastExtractTime > 0
      ? Math.max(0.001, Math.min(0.05, (nowMs - this.lastExtractTime) / 1000))
      : 0.016; // safe default 60 Hz
    this.lastExtractTime = nowMs;

    // Detect plosive release (PP seal breaking → jaw burst)
    const compressionDrop = this.prevCompression - targetCompression;
    if (compressionDrop > 0.35 && targetJaw > 0.15) {
      this.jawVel += 0.35; // bilabial pop-open burst velocity
    }
    this.prevCompression = targetCompression;

    // Damped spring: F = stiffness * (target - pos) - damping * vel
    // Applied at actual frame dt so it is frame-rate independent.
    const SPRING_STIFFNESS = 180;
    const SPRING_DAMPING   = 0.72;
    const springForce = SPRING_STIFFNESS * (targetJaw - this.jawPos) - SPRING_DAMPING * this.jawVel;
    this.jawVel += springForce * dtSpring;
    this.jawPos += this.jawVel * dtSpring;
    // Bilabial compression seals jaw shut (no bounce when lips are pressed)
    if (targetCompression > 0.5) {
      this.jawPos *= (1.0 - targetCompression * 0.8);
      this.jawVel *= 0.5;
    }

    // All other articulators keep their existing exponential smoothers (no spring needed,
    // they are fast muscle groups with damping already encoded in the FFT extractor).
    this.smoothWidth += (targetWidth - this.smoothWidth) * 0.22;
    this.smoothHeight += (this.jawPos * 0.8 - this.smoothHeight) * 0.22;
    this.smoothPucker += (targetPucker - this.smoothPucker) * 0.22;
    this.smoothCompression += (targetCompression - this.smoothCompression) * 0.30;
    this.smoothLabiodental += (targetLabiodental - this.smoothLabiodental) * 0.25;
    this.smoothTongueProtrusion += (targetTongueProtrusion - this.smoothTongueProtrusion) * 0.25;
    this.smoothTongueElevated += (targetTongueElevated - this.smoothTongueElevated) * 0.22;
    this.smoothTeethClenched += (targetTeethClenched - this.smoothTeethClenched) * 0.25;
    this.smoothAzureId = targetAzureId;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      this.weights[k] += (raw[k] - this.weights[k]) * 0.22;
    }

    let jawOutput = this.jawPos;
    if (this.webAudioLatencyMs > 0) {
      // H3: Phase-lead velocity extrapolation for WebAudio AnalyserNode buffer delay
      const dtLeadSec = Math.min(0.06, this.webAudioLatencyMs / 1000.0);
      jawOutput = this.jawPos + this.jawVel * dtLeadSec * 0.75;
    }

    this.currentFrame.jawOpen = Math.max(0, Math.min(maxJawOpenLimit, jawOutput));
    this.currentFrame.lipWidth = Math.max(-1.0, Math.min(1.0, this.smoothWidth));
    this.currentFrame.lipHeight = Math.max(-0.5, Math.min(1.0, this.smoothHeight));
    this.currentFrame.lipPucker = Math.max(0, Math.min(1.0, this.smoothPucker));
    this.currentFrame.lipCompression = Math.max(0, Math.min(1.0, this.smoothCompression));
    this.currentFrame.labiodentalTuck = Math.max(0, Math.min(1.0, this.smoothLabiodental));
    this.currentFrame.tongueTipProtrusion = Math.max(0, Math.min(1.0, this.smoothTongueProtrusion));
    this.currentFrame.tongueTipElevated = Math.max(0, Math.min(1.0, this.smoothTongueElevated));
    this.currentFrame.teethClenched = Math.max(0, Math.min(1.0, this.smoothTeethClenched));
    this.currentFrame.rms = rms;
    this.currentFrame.dominantViseme = bestViseme;
    this.currentFrame.azureVisemeId = this.smoothAzureId;
    this.currentFrame.azureVisemeName = AZURE_VISEME_NAMES[this.smoothAzureId] || "Speech";
    return this.currentFrame;
  }

  private _getBand(bins: Uint8Array, band: { start: number; end: number; invDenom: number }): number {
    if (band.start >= band.end) return 0;
    let sum = 0;
    for (let i = band.start; i <= band.end; i++) {
      sum += bins[i];
    }
    return sum * band.invDenom;
  }

  private _decayToRest(restJawTarget: number = 0): void {
    // Apply spring decay: let the spring settle naturally toward restJawTarget
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const dtSpring = this.lastExtractTime > 0
      ? Math.max(0.001, Math.min(0.05, (nowMs - this.lastExtractTime) / 1000))
      : 0.016;
    this.lastExtractTime = nowMs;

    const SPRING_STIFFNESS = 180;
    const SPRING_DAMPING   = 0.72;
    const springForce = SPRING_STIFFNESS * (restJawTarget - this.jawPos) - SPRING_DAMPING * this.jawVel;
    this.jawVel += springForce * dtSpring;
    this.jawPos += this.jawVel * dtSpring;
    if (Math.abs(this.jawPos - restJawTarget) < 0.003 && Math.abs(this.jawVel) < 0.01) {
      this.jawPos = restJawTarget;
      this.jawVel = 0;
    }

    this.smoothWidth *= 0.75;
    this.smoothHeight *= 0.75;
    this.smoothPucker *= 0.75;
    this.smoothCompression *= 0.75;
    this.smoothLabiodental *= 0.75;
    this.smoothTongueProtrusion *= 0.75;
    this.smoothTongueElevated *= 0.75;
    this.smoothTeethClenched *= 0.75;

    if (Math.abs(this.smoothWidth) < 0.005) this.smoothWidth = 0;
    if (this.smoothHeight < 0.005) this.smoothHeight = 0;
    if (this.smoothPucker < 0.005) this.smoothPucker = 0;
    if (this.smoothCompression < 0.005) this.smoothCompression = 0;
    if (this.smoothLabiodental < 0.005) this.smoothLabiodental = 0;
    if (this.smoothTongueProtrusion < 0.005) this.smoothTongueProtrusion = 0;
    if (this.smoothTongueElevated < 0.005) this.smoothTongueElevated = 0;
    if (this.smoothTeethClenched < 0.005) this.smoothTeethClenched = 0;
    this.coartCount = 0;

    const keys = OCULUS_VISEME_KEYS;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k === "sil") {
        this.weights.sil = 1.0;
      } else {
        this.weights[k] = 0;
      }
    }
  }

  public destroy(): void {
    this.analyser = null;
    this.dataArray = null;
    this._decayToRest();
  }
}
