/**
 * High-fidelity Web Audio Synthesizer for Schrödinger's WebXR Simulation
 * Provides realistic procedural SFX without external network dependencies.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.quantumHumGain = null;
    this.quantumOsc1 = null;
    this.quantumOsc2 = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Single erratic Geiger counter discharge click */
  playGeigerClick(volume = 0.25) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const bufferSize = this.ctx.sampleRate * 0.003; // 3ms impulse
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + Math.random() * 600;
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  /** Rapid radioactive burst (detected decay event) */
  playDecayBurst() {
    this.ensureContext();
    const count = 18 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playGeigerClick(0.35 + Math.random() * 0.2);
      }, i * (12 + Math.random() * 35));
    }
  }

  /** Mechanical metallic clank when the hammer is tripped */
  playHammerStrike() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Heavy metallic strike impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    // High metal ring resonance
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(1420, now);
    ringGain.gain.setValueAtTime(0.4, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    ring.connect(ringGain);
    gain.connect(this.ctx.destination);
    ringGain.connect(this.ctx.destination);

    osc.start(now);
    ring.start(now);
    osc.stop(now + 0.15);
    ring.stop(now + 0.36);
  }

  /** High crystalline shattering of the poison vial */
  playVialShatter() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
  }

  /** Cheerful cat meow upon observing live cat */
  playCatMeow() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // pitch inflection: rises then gently falls (me-ow)
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  /** Continuous low-frequency quantum superposition resonance hum */
  startQuantumHum() {
    this.ensureContext();
    if (!this.ctx || this.quantumHumGain) return;

    const now = this.ctx.currentTime;
    this.quantumHumGain = this.ctx.createGain();
    this.quantumHumGain.gain.setValueAtTime(0.01, now);
    this.quantumHumGain.gain.linearRampToValueAtTime(0.09, now + 1.5);

    this.quantumOsc1 = this.ctx.createOscillator();
    this.quantumOsc2 = this.ctx.createOscillator();

    this.quantumOsc1.type = 'sine';
    this.quantumOsc1.frequency.setValueAtTime(108, now); // Fundamental

    this.quantumOsc2.type = 'sine';
    this.quantumOsc2.frequency.setValueAtTime(216.8, now); // Slightly detuned harmonic

    this.quantumOsc1.connect(this.quantumHumGain);
    this.quantumOsc2.connect(this.quantumHumGain);
    this.quantumHumGain.connect(this.ctx.destination);

    this.quantumOsc1.start();
    this.quantumOsc2.start();
  }

  stopQuantumHum() {
    if (this.quantumHumGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.quantumHumGain.gain.linearRampToValueAtTime(0.001, now + 0.6);
      setTimeout(() => {
        try {
          this.quantumOsc1?.stop();
          this.quantumOsc2?.stop();
          this.quantumOsc1?.disconnect();
          this.quantumOsc2?.disconnect();
          this.quantumHumGain?.disconnect();
        } catch (_) {}
        this.quantumHumGain = null;
        this.quantumOsc1 = null;
        this.quantumOsc2 = null;
      }, 700);
    }
  }

  /** Tactile UI button click sound */
  playUiClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const sounds = new SoundManager();
