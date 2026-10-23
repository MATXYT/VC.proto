/**
 * Procedural Web Audio Engine for Vice City Web:
 * Zero external mp3 dependencies - generates authentic sounds using Web Audio API:
 * - Dynamic car engine with RPM modulation
 * - Tire drift screech
 * - Metal collision crashes
 * - Weapon gunshots (pistol, SMG, shotgun, melee punch)
 * - Police sirens with spatial pitch
 * - Cash register chime and mission fanfare
 * - Procedural 80s Synthwave radio music loop
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isRadioPlaying: boolean = false;
  private radioInterval: number | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.sirenGain) this.sirenGain.gain.value = 0;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Engine sound loop that tracks vehicle speed/RPM
  public updateEngine(speed: number, maxSpeed: number, isAccelerating: boolean) {
    if (!this.ctx || this.isMuted) return;

    if (!this.engineOsc) {
      try {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        // Sawtooth wave for rough engine rumble
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 45;
        this.engineGain.gain.value = 0.05;

        // Lowpass filter for muffled engine block
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      } catch {
        return;
      }
    }

    if (this.engineOsc && this.engineGain) {
      const absSpeed = Math.abs(speed);
      const speedRatio = Math.min(1, absSpeed / maxSpeed);

      // Multi-gear simulation: simulates shifting gears
      const gearProgress = (absSpeed % 10) / 10;
      const targetFreq = 40 + gearProgress * 120 + (isAccelerating ? 25 : 0);
      const targetGain = 0.04 + speedRatio * 0.1 + (isAccelerating ? 0.03 : 0);

      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  // Tire skid / drift screech sound
  public playTireSkid() {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 4;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // safe fallback
    }
  }

  // Crash / impact impact
  public playCrash(severity: number = 1) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Low punch boom
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.35);

      oscGain.gain.setValueAtTime(0.35 * severity, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.35);

      // Noise metal crunch
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 400;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * severity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // safe fallback
    }
  }

  // Gunshots
  public playGunshot(weapon: string = 'pistol') {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;

      if (weapon === 'fists') {
        // Melee swoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(t + 0.12);
        return;
      }

      // Gunshot blast
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const isShotgun = weapon === 'shotgun';
      const isSMG = weapon === 'smg';

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isShotgun ? 190 : (isSMG ? 280 : 320), t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

      const vol = isShotgun ? 0.4 : (isSMG ? 0.22 : 0.28);
      oscGain.gain.setValueAtTime(vol, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.18);

      // Noise crack
      const dur = isShotgun ? 0.3 : 0.12;
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // safe fallback
    }
  }

  // Police Siren
  public updateSiren(wantedLevel: number) {
    if (!this.ctx || this.isMuted || wantedLevel <= 0) {
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      }
      return;
    }

    if (!this.sirenOsc) {
      try {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'sine';
        this.sirenGain.gain.value = 0.06;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
      } catch {
        return;
      }
    }

    if (this.sirenOsc && this.sirenGain) {
      // 2-tone frequency alternation
      const cycle = Math.sin(this.ctx.currentTime * 3.5);
      const freq = cycle > 0 ? 750 : 600;
      this.sirenOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
      this.sirenGain.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.1);
    }
  }

  // Cash Pickup Sound
  public playCash() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.15);
      });
    } catch {
      // safe fallback
    }
  }

  // Car horn
  public playHorn() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [349.23, 440.0].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // safe fallback
    }
  }

  // Toggle Procedural 80s Synthwave Radio
  public toggleRadio(): boolean {
    if (this.isRadioPlaying) {
      if (this.radioInterval) clearInterval(this.radioInterval);
      this.isRadioPlaying = false;
      return false;
    }

    if (!this.ctx) this.init();
    if (!this.ctx || this.isMuted) return false;

    this.isRadioPlaying = true;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 98, 110];
    let step = 0;

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.isRadioPlaying || this.isMuted) return;
      const t = this.ctx.currentTime;
      const freq = bassline[step % bassline.length];
      step++;

      // Synth bass note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }, 220);

    return true;
  }
}

export const soundEngine = new SoundEngine();
