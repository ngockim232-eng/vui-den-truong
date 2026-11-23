class HighlandAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private musicTimer: number | null = null;
  private birdTimer: number | null = null;
  private insectTimer: number | null = null;
  private dropletTimer: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;
  private ambienceNodes: AudioNode[] = [];
  private ambienceSources: AudioScheduledSourceNode[] = [];
  private ambienceMasterGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Ambient Highland Nature Loop:
   * - Babbling mountain stream (pink/brown current + dual LFO-modulated ripples + water droplets)
   * - Characteristic highland forest insects (rhythmic mountain crickets & distant forest cicadas)
   */
  public startAmbientLoop() {
    this.startNatureAmbience();
  }

  public stopAmbientLoop() {
    this.stopNatureAmbience();
  }

  public startNatureAmbience() {
    if (this.isMuted || this.ambienceMasterGain) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(0.42, now + 0.75);
    master.connect(ctx.destination);
    this.ambienceMasterGain = master;

    // 1. Seamless looping water noise buffer for babbling highland brook
    const durationSec = 5;
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const streamBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = streamBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.042 * white) / 1.042;
      // Gentle crossfade window near loop edges for zero-click seamless looping
      const edgeFade =
        i < 1024
          ? i / 1024
          : i > bufferSize - 1024
            ? (bufferSize - i) / 1024
            : 1;
      data[i] = (lastOut * 2.5 + white * 0.2) * (0.65 + 0.35 * edgeFade);
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = streamBuffer;
    noiseSrc.loop = true;

    // Low warm flowing current
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'bandpass';
    lowFilter.frequency.setValueAtTime(380, now);
    lowFilter.Q.setValueAtTime(0.85, now);

    const lowGain = ctx.createGain();
    lowGain.gain.setValueAtTime(0.28, now);

    // Mid babbling ripple layer modulated by slow organic LFO
    const rippleFilter = ctx.createBiquadFilter();
    rippleFilter.type = 'bandpass';
    rippleFilter.frequency.setValueAtTime(1150, now);
    rippleFilter.Q.setValueAtTime(2.3, now);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.52, now);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(360, now);
    lfo.connect(lfoDepth);
    lfoDepth.connect(rippleFilter.frequency);

    const rippleGain = ctx.createGain();
    rippleGain.gain.setValueAtTime(0.16, now);

    // Bright upper stream sparkle modulated at a secondary phase
    const sparkleFilter = ctx.createBiquadFilter();
    sparkleFilter.type = 'bandpass';
    sparkleFilter.frequency.setValueAtTime(1920, now);
    sparkleFilter.Q.setValueAtTime(3.1, now);

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.setValueAtTime(0.83, now);
    const lfo2Depth = ctx.createGain();
    lfo2Depth.gain.setValueAtTime(420, now);
    lfo2.connect(lfo2Depth);
    lfo2Depth.connect(sparkleFilter.frequency);

    const sparkleGain = ctx.createGain();
    sparkleGain.gain.setValueAtTime(0.08, now);

    noiseSrc.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(master);

    noiseSrc.connect(rippleFilter);
    rippleFilter.connect(rippleGain);
    rippleGain.connect(master);

    noiseSrc.connect(sparkleFilter);
    sparkleFilter.connect(sparkleGain);
    sparkleGain.connect(master);

    noiseSrc.start(now);
    lfo.start(now);
    lfo2.start(now);

    this.ambienceSources.push(noiseSrc, lfo, lfo2);
    this.ambienceNodes.push(
      master,
      lowFilter,
      lowGain,
      rippleFilter,
      lfoDepth,
      rippleGain,
      sparkleFilter,
      lfo2Depth,
      sparkleGain,
    );

    // 2. Gentle water droplet / stone-splash pings on the stream
    this.dropletTimer = window.setInterval(() => {
      if (this.isMuted || !this.ambienceMasterGain) return;
      if (Math.random() < 0.78) {
        this.playWaterDroplet();
      }
    }, 460);

    // 3. Characteristic highland forest crickets & cicadas loop
    this.playForestInsects();
    this.insectTimer = window.setInterval(() => {
      if (this.isMuted || !this.ambienceMasterGain) return;
      const roll = Math.random();
      if (roll < 0.72) {
        this.playForestInsects();
      } else {
        this.playMountainCicada();
      }
    }, 2100);
  }

  public stopNatureAmbience() {
    if (this.dropletTimer !== null) {
      window.clearInterval(this.dropletTimer);
      this.dropletTimer = null;
    }
    if (this.insectTimer !== null) {
      window.clearInterval(this.insectTimer);
      this.insectTimer = null;
    }

    const activeMaster = this.ambienceMasterGain;
    const sourcesToStop = [...this.ambienceSources];
    const nodesToDisconnect = [...this.ambienceNodes];
    this.ambienceMasterGain = null;
    this.ambienceSources = [];
    this.ambienceNodes = [];

    if (activeMaster && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        activeMaster.gain.cancelScheduledValues(now);
        activeMaster.gain.setValueAtTime(
          Math.max(0.001, activeMaster.gain.value),
          now,
        );
        activeMaster.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);
      } catch {
        // Ignore ramp errors if context closed
      }
      window.setTimeout(() => {
        sourcesToStop.forEach((src) => {
          try {
            src.stop();
          } catch {
            // Already stopped
          }
        });
        nodesToDisconnect.forEach((node) => {
          try {
            node.disconnect();
          } catch {
            // Ignore disconnect error
          }
        });
      }, 240);
      return;
    }

    sourcesToStop.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
    });
    nodesToDisconnect.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect error
      }
    });
  }

  private playWaterDroplet() {
    if (this.isMuted || !this.ambienceMasterGain) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 900 + Math.random() * 1200;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.48, now + 0.065);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.036, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.088);

    osc.connect(gain);
    gain.connect(this.ambienceMasterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  private playForestInsects() {
    if (this.isMuted || !this.ambienceMasterGain) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pulses = 3 + Math.floor(Math.random() * 3);
    const carrierFreq = 3950 + Math.random() * 820;

    for (let i = 0; i < pulses; i++) {
      const start = now + i * 0.085;
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(carrierFreq, start);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(36, start);
      modGain.gain.setValueAtTime(165, start);

      mod.connect(modGain);
      modGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.0008, start);
      gain.gain.exponentialRampToValueAtTime(0.03, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.064);

      osc.connect(gain);
      gain.connect(this.ambienceMasterGain);
      osc.start(start);
      mod.start(start);
      osc.stop(start + 0.072);
      mod.stop(start + 0.072);
    }
  }

  private playMountainCicada() {
    if (this.isMuted || !this.ambienceMasterGain) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    const baseFreq = 2780 + Math.random() * 380;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, now);
    lfoGain.gain.setValueAtTime(95, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.exponentialRampToValueAtTime(0.016, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.72);

    osc.connect(gain);
    gain.connect(this.ambienceMasterGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.75);
    lfo.stop(now + 0.75);
  }

  // Cheerful highland bamboo xylophone (T'rung inspired pentatonic melody)
  public startBackgroundMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.startNatureAmbience();
    this.isMusicPlaying = true;
    const melody = [
      523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25,
    ];

    const playNote = () => {
      if (!this.isMusicPlaying || this.isMuted) return;
      const c = this.ensureContext();
      if (!c) return;

      const now = c.currentTime;
      const freq = melody[this.musicStep % melody.length];
      this.musicStep++;

      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.042, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.34);

      if (this.musicStep % 4 === 1) {
        const bass = c.createOscillator();
        const bassGain = c.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(freq * 0.25, now);
        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.exponentialRampToValueAtTime(0.036, now + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.48);
        bass.connect(bassGain);
        bassGain.connect(c.destination);
        bass.start(now);
        bass.stop(now + 0.5);
      }
    };

    playNote();
    this.musicTimer = window.setInterval(playNote, 330);

    this.birdTimer = window.setInterval(() => {
      if (!this.isMuted && this.isMusicPlaying && Math.random() < 0.65) {
        this.playBirdChirp();
      }
    }, 3000);
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    this.stopNatureAmbience();
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.birdTimer !== null) {
      window.clearInterval(this.birdTimer);
      this.birdTimer = null;
    }
  }

  public playBirdChirp() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chirps = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < chirps; i++) {
      const start = now + i * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = 2150 + Math.random() * 750;
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 1.38, start + 0.045);
      osc.frequency.exponentialRampToValueAtTime(base * 0.95, start + 0.095);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.11);
    }
  }

  /**
   * Louder, fuller School Bell Ringing (Chuông reo to đóng cổng trường)
   */
  public playSchoolBell() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.15, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.35, now);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Rich rapid metallic bell strikes over ~1.65s
    const strikes = 20;
    for (let i = 0; i < strikes; i++) {
      const start = now + i * 0.075;
      const partials = [
        { freq: 587.33, amp: 0.16, type: 'triangle' as OscillatorType, dur: 0.22 },
        { freq: 1174.66, amp: 0.24, type: 'triangle' as OscillatorType, dur: 0.18 },
        { freq: 2349.32, amp: 0.14, type: 'sine' as OscillatorType, dur: 0.16 },
        { freq: 3524.0, amp: 0.08, type: 'sine' as OscillatorType, dur: 0.14 },
      ];
      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = p.type;
        osc.frequency.setValueAtTime(p.freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(p.amp, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + p.dur);

        osc.connect(gain);
        gain.connect(compressor);
        osc.start(start);
        osc.stop(start + p.dur + 0.02);
      });
    }
  }

  public playSurpriseChime() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const start = now + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  public playCelebrationApplause() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.78);
    });

    const bufferSize = Math.floor(ctx.sampleRate * 2.1);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope =
        Math.sin(Math.PI * Math.min(1, t / 2.1)) *
        (0.55 + 0.45 * Math.sin(t * 42) * Math.cos(t * 19));
      output[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, now);
    bandpass.Q.setValueAtTime(0.85, now);

    const applauseGain = ctx.createGain();
    applauseGain.gain.setValueAtTime(0.001, now + 0.12);
    applauseGain.gain.exponentialRampToValueAtTime(0.15, now + 0.4);
    applauseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    noise.connect(bandpass);
    bandpass.connect(applauseGain);
    applauseGain.connect(ctx.destination);
    noise.start(now + 0.12);
    noise.stop(now + 2.25);

    window.setTimeout(() => this.playBirdChirp(), 450);
  }
}

export const audioEngine = new HighlandAudioEngine();
