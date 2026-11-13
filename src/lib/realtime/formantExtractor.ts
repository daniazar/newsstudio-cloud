/**
 * src/lib/realtime/formantExtractor.ts
 *
 * Real-Time Linear Predictive Coding (LPC) Formant Extractor (D1).
 *
 * Implements:
 * 1. Pre-emphasis filtering (alpha = 0.97) to counteract 6 dB/octave glottal spectral tilt.
 * 2. Hamming windowing on audio frames.
 * 3. Autocorrelation calculation up to order p = 14 (optimal for 16 kHz vocal tract modeling).
 * 4. Levinson-Durbin recursion to compute all-pole filter coefficients.
 * 5. LPC spectral envelope peak picking to extract Formants:
 *    - F1 (250 - 850 Hz): Vowel height / aperture (Jaw openness).
 *    - F2 (850 - 2500 Hz): Vowel front-back place of articulation (Lip spread vs rounding).
 *    - F3 (2200 - 3500 Hz): Retroflex rhoticity (/r/ detection).
 * 6. Direct acoustic-articulatory viseme refinement.
 */

export interface FormantResult {
  /** First formant frequency in Hz (vowel height / jaw opening) */
  f1: number;
  /** Second formant frequency in Hz (vowel frontness / lip rounding) */
  f2: number;
  /** Third formant frequency in Hz (retroflex rhoticity) */
  f3: number;
  /** Estimated vocal tract jaw openness (0.0 to 1.0) */
  jawOpenEstimate: number;
  /** Estimated horizontal lip width / spread (-1.0 rounded to +1.0 spread) */
  lipWidthEstimate: number;
  /** Estimated lip pucker (0.0 to 1.0) */
  lipPuckerEstimate: number;
  /** Prediction residual error energy (voicing confidence) */
  predictionGain: number;
  /** True if vocal tract exhibits sustained voiced vowel characteristics */
  isVoicedVowel: boolean;
}

export class FormantExtractor {
  private readonly sampleRate: number;
  private readonly lpcOrder: number;
  private readonly frameSize: number;
  private readonly hammingWindow: Float32Array;
  private readonly windowedBuffer: Float32Array;
  private readonly r: Float64Array; // Autocorrelation
  private readonly a: Float64Array; // LPC coefficients
  private readonly prevA: Float64Array;
  private prevSample: number = 0;

  // Smoothing filters for extracted formants
  private smoothF1: number = 500;
  private smoothF2: number = 1500;
  private smoothF3: number = 2500;

  constructor(sampleRate: number = 16000, lpcOrder: number = 14, frameSize: number = 256) {
    this.sampleRate = sampleRate;
    this.lpcOrder = lpcOrder;
    this.frameSize = frameSize;

    this.windowedBuffer = new Float32Array(frameSize);
    this.hammingWindow = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      this.hammingWindow[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
    }

    this.r = new Float64Array(lpcOrder + 1);
    this.a = new Float64Array(lpcOrder + 1);
    this.prevA = new Float64Array(lpcOrder + 1);
  }

  /**
   * Processes a slice of time-domain audio PCM samples (Float32Array)
   * and computes accurate F1/F2 formants and articulatory estimates.
   */
  public extractFormants(pcm: Float32Array): FormantResult {
    const N = Math.min(this.frameSize, pcm.length);
    if (N < this.lpcOrder * 2) {
      return this.defaultRestResult();
    }

    // 1. Pre-emphasis filtering + Hamming windowing
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const cur = pcm[i];
      const preEmphasized = cur - 0.97 * this.prevSample;
      this.prevSample = cur;
      const val = preEmphasized * this.hammingWindow[i];
      this.windowedBuffer[i] = val;
      energy += val * val;
    }

    const rms = Math.sqrt(energy / N);
    if (rms < 0.005) {
      return this.defaultRestResult();
    }

    // 2. Autocorrelation (Order p)
    const p = this.lpcOrder;
    for (let k = 0; k <= p; k++) {
      let sum = 0;
      for (let n = 0; n < N - k; n++) {
        sum += this.windowedBuffer[n] * this.windowedBuffer[n + k];
      }
      this.r[k] = sum;
    }

    if (this.r[0] <= 1e-9) {
      return this.defaultRestResult();
    }

    // 3. Levinson-Durbin Recursion
    // Solves R * a = -r for LPC all-pole filter coefficients
    let E = this.r[0];
    this.a.fill(0);
    this.a[0] = 1.0;

    for (let i = 1; i <= p; i++) {
      let lambda = 0;
      for (let j = 0; j < i; j++) {
        lambda += this.a[j] * this.r[i - j];
      }
      const k = -lambda / E;

      this.prevA.set(this.a);
      for (let j = 1; j < i; j++) {
        this.a[j] = this.prevA[j] + k * this.prevA[i - j];
      }
      this.a[i] = k;

      E *= 1.0 - k * k;
      if (E <= 0) break;
    }

    // 4. LPC Spectral Peak Picking on Vocal Tract Frequency Grid
    // Evaluates |A(e^jw)|^-1 from 200 Hz to 3500 Hz with 25 Hz resolution
    const minHz = 200;
    const maxHz = 3500;
    const stepHz = 25;
    const numPoints = Math.floor((maxHz - minHz) / stepHz) + 1;
    const spectrum = new Float32Array(numPoints);

    for (let idx = 0; idx < numPoints; idx++) {
      const freq = minHz + idx * stepHz;
      const omega = (2 * Math.PI * freq) / this.sampleRate;

      let real = 0;
      let imag = 0;
      for (let k = 0; k <= p; k++) {
        const angle = k * omega;
        real += this.a[k] * Math.cos(angle);
        imag -= this.a[k] * Math.sin(angle);
      }
      const magSq = real * real + imag * imag;
      spectrum[idx] = 1.0 / Math.max(1e-6, magSq);
    }

    // Peak picking for formant resonances
    const peaks: { freq: number; amp: number }[] = [];
    for (let idx = 1; idx < numPoints - 1; idx++) {
      if (spectrum[idx] > spectrum[idx - 1] && spectrum[idx] > spectrum[idx + 1]) {
        const f = minHz + idx * stepHz;
        peaks.push({ freq: f, amp: spectrum[idx] });
      }
    }

    // Assign F1, F2, F3 from resonance peaks
    let rawF1 = this.smoothF1;
    let rawF2 = this.smoothF2;
    let rawF3 = this.smoothF3;

    // F1 typically 250 - 900 Hz
    const f1Candidates = peaks.filter((pk) => pk.freq >= 250 && pk.freq <= 950);
    if (f1Candidates.length > 0) {
      f1Candidates.sort((a, b) => b.amp - a.amp);
      rawF1 = f1Candidates[0].freq;
    }

    // F2 typically 950 - 2500 Hz
    const f2Candidates = peaks.filter((pk) => pk.freq >= 950 && pk.freq <= 2500);
    if (f2Candidates.length > 0) {
      f2Candidates.sort((a, b) => b.amp - a.amp);
      rawF2 = f2Candidates[0].freq;
    }

    // F3 typically 2200 - 3500 Hz
    const f3Candidates = peaks.filter((pk) => pk.freq >= 2200 && pk.freq <= 3500);
    if (f3Candidates.length > 0) {
      f3Candidates.sort((a, b) => b.amp - a.amp);
      rawF3 = f3Candidates[0].freq;
    }

    // Temporal smoothing of formants (alpha = 0.35)
    this.smoothF1 += (rawF1 - this.smoothF1) * 0.35;
    this.smoothF2 += (rawF2 - this.smoothF2) * 0.35;
    this.smoothF3 += (rawF3 - this.smoothF3) * 0.35;

    // 5. Direct Acoustic-Phonetic Mapping to Articulators
    // F1 (250Hz - 850Hz) maps directly to jaw aperture / mouth openness:
    // Low F1 (/i/, /u/) -> ~300 Hz -> small jaw
    // High F1 (/a/, /ae/) -> ~800 Hz -> wide jaw
    const normF1 = Math.max(0, Math.min(1, (this.smoothF1 - 280) / (850 - 280)));
    const jawOpenEstimate = Math.pow(normF1, 1.3);

    // F2 (900Hz - 2400Hz) maps directly to front-back vowel place:
    // Back vowels (/u/, /o/) -> low F2 (< 1100 Hz) -> pucker, negative width
    // Front vowels (/i/, /e/) -> high F2 (> 1900 Hz) -> wide smile / spread lips
    const normF2 = Math.max(-1, Math.min(1, (this.smoothF2 - 1500) / 900));
    const lipWidthEstimate = normF2;

    // Pucker occurs when F2 is back (< 1400 Hz) and F1 is close/mid (< 750 Hz)
    const f2PuckerFactor = Math.max(0, Math.min(1, (1400 - this.smoothF2) / 500));
    const f1PuckerFactor = Math.max(0, Math.min(1, (750 - this.smoothF1) / 400));
    const lipPuckerEstimate = Math.min(1.0, f2PuckerFactor * f1PuckerFactor);

    const predictionGain = this.r[0] / Math.max(1e-6, E);
    const isVoicedVowel = rms > 0.02 && predictionGain > 3.5;

    return {
      f1: this.smoothF1,
      f2: this.smoothF2,
      f3: this.smoothF3,
      jawOpenEstimate,
      lipWidthEstimate,
      lipPuckerEstimate,
      predictionGain,
      isVoicedVowel,
    };
  }

  private defaultRestResult(): FormantResult {
    return {
      f1: 500,
      f2: 1500,
      f3: 2500,
      jawOpenEstimate: 0,
      lipWidthEstimate: 0,
      lipPuckerEstimate: 0,
      predictionGain: 1.0,
      isVoicedVowel: false,
    };
  }
}
