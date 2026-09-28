// =========================================================================
// SOUNDSCAPE NUSANTARA: SUARA ALAM & ATMOSFER KOMUNAL INDONESIA
// Procedural Web Audio API Synthesis Engine (Zero Download, 100% Offline)
// =========================================================================

export type RainVariant = 'atap_seng' | 'sawah_ubud' | 'jakarta_malam';
export type WaveVariant = 'parangtritis' | 'bali';
export type CommunityVariant = 'motor_jauh' | 'warung_tutup' | 'teras_malam';
export type BowlVariant = 'slendro' | 'singing_bowl';

export interface SoundscapeBuffers {
  pink: AudioBuffer;
  brown: AudioBuffer;
  reverb: ConvolverNode;
}

export interface SubEngineTracker {
  nodes: AudioNode[];
  timers: any[];
}

export function createSubEngineTracker(): SubEngineTracker {
  return { nodes: [], timers: [] };
}

export function clearSubEngine(tracker: SubEngineTracker) {
  tracker.timers.forEach((t) => clearTimeout(t));
  tracker.timers = [];

  tracker.nodes.forEach((node) => {
    try {
      if ('stop' in node && typeof (node as any).stop === 'function') {
        (node as any).stop();
      }
      node.disconnect();
    } catch (e) {}
  });
  tracker.nodes = [];
}

/**
 * Buat buffer procedural (Pink Noise, Brown Noise, dan Convolver Reverb)
 */
export function createSoundscapeBuffers(ctx: AudioContext): SoundscapeBuffers {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * 3; // 3-second seamless loop

  // 1. Pink Noise (Kellet Filter Approximation)
  const pinkBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const pinkData = pinkBuffer.getChannelData(0);
  let p0 = 0, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    p0 = 0.99886 * p0 + white * 0.0555179;
    p1 = 0.99332 * p1 + white * 0.0750759;
    p2 = 0.96900 * p2 + white * 0.1538520;
    p3 = 0.86650 * p3 + white * 0.3104856;
    p4 = 0.55000 * p4 + white * 0.5329522;
    p5 = -0.7616 * p5 - white * 0.0168980;
    pinkData[i] = (p0 + p1 + p2 + p3 + p4 + p5 + p6 + white * 0.5362) * 0.11;
    p6 = white * 0.115926;
  }

  // 2. Brown Noise (Deep oceanic & rumble floor)
  const brownBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const brownData = brownBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    brownData[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = brownData[i];
    brownData[i] *= 3.5;
  }

  // 3. Convolver Reverb Impulse Response (Diffuse ambient space)
  const irLen = Math.floor(sampleRate * 1.6);
  const irBuffer = ctx.createBuffer(2, irLen, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const irData = irBuffer.getChannelData(ch);
    for (let i = 0; i < irLen; i++) {
      const env = Math.pow(1 - i / irLen, 2.5) * Math.min(1, i / (sampleRate * 0.01));
      irData[i] = (Math.random() * 2 - 1) * env;
    }
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = irBuffer;

  const reverbLp = ctx.createBiquadFilter();
  reverbLp.type = 'lowpass';
  reverbLp.frequency.value = 2200;

  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.32;

  reverb.connect(reverbLp);
  reverbLp.connect(reverbWet);

  return {
    pink: pinkBuffer,
    brown: brownBuffer,
    reverb,
  };
}

// =========================================================================
// 1. ENGINE HUJAN NUSANTARA (Atap Seng Kos, Sawah Ubud, Jakarta Malam)
// =========================================================================
export function setupRainEngine(
  ctx: AudioContext,
  variant: RainVariant,
  dest: GainNode,
  buffers: SoundscapeBuffers,
  tracker: SubEngineTracker
) {
  clearSubEngine(tracker);
  const { pink, brown } = buffers;

  if (variant === 'atap_seng') {
    // Bed gemeretak hujan di seng gelombang
    const bedSrc = ctx.createBufferSource();
    bedSrc.buffer = pink;
    bedSrc.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2800;
    bp.Q.value = 2.4;

    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 4200;
    peak.Q.value = 6;
    peak.gain.value = 8; // Resonansi seng tipis

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.35;

    bedSrc.connect(bp);
    bp.connect(peak);
    peak.connect(bedGain);
    bedGain.connect(dest);
    bedSrc.start();
    tracker.nodes.push(bedSrc, bp, peak, bedGain);

    // Tetesan logam individual pada atap seng
    const scheduleZincTap = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const tapCount = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < tapCount; i++) {
        const t = now + i * 0.04 + Math.random() * 0.05;
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = pink;

        const metalBP = ctx.createBiquadFilter();
        metalBP.type = 'bandpass';
        metalBP.frequency.value = 3200 + Math.random() * 1600;
        metalBP.Q.value = 14;

        const tapGain = ctx.createGain();
        const amp = 0.2 + Math.random() * 0.35;
        tapGain.gain.setValueAtTime(0.0001, t);
        tapGain.gain.linearRampToValueAtTime(amp, t + 0.002);
        tapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

        noiseSrc.connect(metalBP);
        metalBP.connect(tapGain);
        tapGain.connect(dest);

        noiseSrc.start(t);
        noiseSrc.stop(t + 0.035);
      }

      // Tetesan air berongga sesekali
      if (Math.random() < 0.25) {
        const dripT = now + 0.1;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const f0 = 310 + Math.random() * 70;
        osc.frequency.setValueAtTime(f0, dripT);
        osc.frequency.exponentialRampToValueAtTime(f0 * 1.4, dripT + 0.05);

        const dG = ctx.createGain();
        dG.gain.setValueAtTime(0.0001, dripT);
        dG.gain.linearRampToValueAtTime(0.18, dripT + 0.005);
        dG.gain.exponentialRampToValueAtTime(0.0001, dripT + 0.06);

        osc.connect(dG);
        dG.connect(dest);
        osc.start(dripT);
        osc.stop(dripT + 0.07);
      }

      const timer = setTimeout(scheduleZincTap, 120 + Math.random() * 220);
      tracker.timers.push(timer);
    };
    scheduleZincTap();

  } else if (variant === 'sawah_ubud') {
    // Hujan lembut membasuh sawah asri & dedaunan tropis
    const bedSrc = ctx.createBufferSource();
    bedSrc.buffer = pink;
    bedSrc.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1350;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.42;

    bedSrc.connect(lp);
    lp.connect(bedGain);
    bedGain.connect(dest);
    bedSrc.start();
    tracker.nodes.push(bedSrc, lp, bedGain);

    // Tetesan air di daun talas/pisang
    const scheduleFoliageDrop = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f0 = 240 + Math.random() * 120;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.75, now + 0.07);

      const dG = ctx.createGain();
      dG.gain.setValueAtTime(0.0001, now);
      dG.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.15, now + 0.008);
      dG.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(dG);
      dG.connect(dest);
      osc.start(now);
      osc.stop(now + 0.09);

      const timer = setTimeout(scheduleFoliageDrop, 1400 + Math.random() * 1800);
      tracker.timers.push(timer);
    };
    scheduleFoliageDrop();

    // Fauna sawah tropis lembut
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.frequency.value = 4500;
    osc2.frequency.value = 4750;

    const faunaLfo = ctx.createOscillator();
    faunaLfo.frequency.value = 14;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.035;

    const faunaGain = ctx.createGain();
    faunaGain.gain.value = 0.03;

    faunaLfo.connect(lfoDepth);
    lfoDepth.connect(faunaGain.gain);

    osc1.connect(faunaGain);
    osc2.connect(faunaGain);
    faunaGain.connect(dest);

    osc1.start();
    osc2.start();
    faunaLfo.start();
    tracker.nodes.push(osc1, osc2, faunaLfo, lfoDepth, faunaGain);

  } else if (variant === 'jakarta_malam') {
    // Aspal basah kota & keheningan malam
    const brownSrc = ctx.createBufferSource();
    brownSrc.buffer = brown;
    brownSrc.loop = true;

    const brownLp = ctx.createBiquadFilter();
    brownLp.type = 'lowpass';
    brownLp.frequency.value = 450;
    const brownGain = ctx.createGain();
    brownGain.gain.value = 0.35;

    brownSrc.connect(brownLp);
    brownLp.connect(brownGain);
    brownGain.connect(dest);
    brownSrc.start();

    const pinkSrc = ctx.createBufferSource();
    pinkSrc.buffer = pink;
    pinkSrc.loop = true;
    const pinkBp = ctx.createBiquadFilter();
    pinkBp.type = 'bandpass';
    pinkBp.frequency.value = 850;
    pinkBp.Q.value = 1.0;
    const pinkGain = ctx.createGain();
    pinkGain.gain.value = 0.28;

    pinkSrc.connect(pinkBp);
    pinkBp.connect(pinkGain);
    pinkGain.connect(dest);
    pinkSrc.start();

    tracker.nodes.push(brownSrc, brownLp, brownGain, pinkSrc, pinkBp, pinkGain);

    // Deru cipratan ban mobil melintas di kejauhan
    const scheduleTireWhoosh = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const dur = 6 + Math.random() * 3;

      const src = ctx.createBufferSource();
      src.buffer = pink;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(320, now);
      bp.frequency.linearRampToValueAtTime(700, now + dur * 0.45);
      bp.frequency.linearRampToValueAtTime(280, now + dur);
      bp.Q.value = 2.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.18, now + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        const startPan = Math.random() > 0.5 ? -0.8 : 0.8;
        panner.pan.setValueAtTime(startPan, now);
        panner.pan.linearRampToValueAtTime(-startPan, now + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(panner);
        panner.connect(dest);
      } else {
        src.connect(bp);
        bp.connect(g);
        g.connect(dest);
      }

      src.start(now);
      src.stop(now + dur + 0.1);

      const timer = setTimeout(scheduleTireWhoosh, 14000 + Math.random() * 12000);
      tracker.timers.push(timer);
    };
    scheduleTireWhoosh();

    // Gemuruh petir frekuensi rendah di kejauhan
    const scheduleThunder = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const thunderSrc = ctx.createBufferSource();
      thunderSrc.buffer = brown;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 95;

      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, now);
      tg.gain.linearRampToValueAtTime(0.35, now + 3);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 9);

      thunderSrc.connect(lp);
      lp.connect(tg);
      tg.connect(dest);
      thunderSrc.start(now);
      thunderSrc.stop(now + 9.5);

      const timer = setTimeout(scheduleThunder, 24000 + Math.random() * 20000);
      tracker.timers.push(timer);
    };
    scheduleThunder();
  }
}

// =========================================================================
// 2. ENGINE OMBAK NUSANTARA (Pantai Selatan Parangtritis & Pesisir Bali)
// =========================================================================
export function setupWaveEngine(
  ctx: AudioContext,
  variant: WaveVariant,
  dest: GainNode,
  buffers: SoundscapeBuffers,
  tracker: SubEngineTracker
) {
  clearSubEngine(tracker);
  const { pink, brown } = buffers;

  if (variant === 'parangtritis') {
    // Samudra Hindia: deburan berat, swell dalam, irama 13.3 detik
    const brownSrc = ctx.createBufferSource();
    brownSrc.buffer = brown;
    brownSrc.loop = true;

    const lp1 = ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp1.frequency.value = 210;

    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 260;

    const waveAmp = ctx.createGain();
    waveAmp.gain.value = 0.45;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.075;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.35;
    lfo.connect(lfoDepth);
    lfoDepth.connect(waveAmp.gain);

    brownSrc.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(waveAmp);
    waveAmp.connect(dest);

    // Buih ombak pasir vulkanik hitam
    const foamSrc = ctx.createBufferSource();
    foamSrc.buffer = pink;
    foamSrc.loop = true;

    const foamBp = ctx.createBiquadFilter();
    foamBp.type = 'bandpass';
    foamBp.frequency.value = 750;
    foamBp.Q.value = 1.2;

    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.18;
    lfoDepth.connect(foamGain.gain);

    foamSrc.connect(foamBp);
    foamBp.connect(foamGain);
    foamGain.connect(dest);

    // Sub-bass undertone 48Hz
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 48;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.08;
    lfoDepth.connect(subGain.gain);
    subOsc.connect(subGain);
    subGain.connect(dest);

    brownSrc.start();
    foamSrc.start();
    subOsc.start();
    lfo.start();

    tracker.nodes.push(brownSrc, lp1, lp2, waveAmp, foamSrc, foamBp, foamGain, subOsc, subGain, lfo, lfoDepth);

  } else if (variant === 'bali') {
    // Pesisir Bali: riak lembut pasir putih & terumbu
    const waveSrc = ctx.createBufferSource();
    waveSrc.buffer = pink;
    waveSrc.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 850;
    bp.Q.value = 1.0;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.35;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.22;
    lfo.connect(lfoDepth);
    lfoDepth.connect(waveGain.gain);

    waveSrc.connect(bp);
    bp.connect(lp);
    lp.connect(waveGain);
    waveGain.connect(dest);

    waveSrc.start();
    lfo.start();

    tracker.nodes.push(waveSrc, bp, lp, waveGain, lfo, lfoDepth);
  }
}

// =========================================================================
// 3. ENGINE SUARA KEHIDUPAN & KEAMANAN KOMUNAL (Motor, Warung, Teras)
// =========================================================================
export function setupCommunityEngine(
  ctx: AudioContext,
  variant: CommunityVariant,
  dest: GainNode,
  buffers: SoundscapeBuffers,
  tracker: SubEngineTracker
) {
  clearSubEngine(tracker);
  const { pink, reverb } = buffers;

  if (variant === 'motor_jauh') {
    // Motor 4-tak / bebek pelan melintas di gang malam
    const scheduleMotorPass = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const dur = 11 + Math.random() * 4;

      const engineOsc = ctx.createOscillator();
      engineOsc.type = 'triangle';
      engineOsc.frequency.setValueAtTime(80, now);
      engineOsc.frequency.linearRampToValueAtTime(94, now + dur * 0.5);
      engineOsc.frequency.linearRampToValueAtTime(76, now + dur);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(260, now);
      lp.frequency.linearRampToValueAtTime(360, now + dur * 0.5);
      lp.frequency.linearRampToValueAtTime(240, now + dur);

      const pulseOsc = ctx.createOscillator();
      pulseOsc.frequency.value = 15;
      const pulseDepth = ctx.createGain();
      pulseDepth.gain.value = 0.12;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.0001, now);
      mainGain.gain.linearRampToValueAtTime(0.38, now + dur * 0.5);
      mainGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      pulseOsc.connect(pulseDepth);
      pulseDepth.connect(mainGain.gain);

      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        const startL = Math.random() > 0.5 ? -0.85 : 0.85;
        panner.pan.setValueAtTime(startL, now);
        panner.pan.linearRampToValueAtTime(-startL, now + dur);
        engineOsc.connect(lp);
        lp.connect(mainGain);
        mainGain.connect(panner);
        panner.connect(dest);
      } else {
        engineOsc.connect(lp);
        lp.connect(mainGain);
        mainGain.connect(dest);
      }

      engineOsc.start(now);
      pulseOsc.start(now);
      engineOsc.stop(now + dur + 0.1);
      pulseOsc.stop(now + dur + 0.1);

      const timer = setTimeout(scheduleMotorPass, 22000 + Math.random() * 18000);
      tracker.timers.push(timer);
    };
    scheduleMotorPass();

  } else if (variant === 'warung_tutup') {
    // Rolling door warung ditutup + denting sendok piring
    const scheduleWarungEvent = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;

      const doorNoise = ctx.createBufferSource();
      doorNoise.buffer = pink;

      const doorBp = ctx.createBiquadFilter();
      doorBp.type = 'bandpass';
      doorBp.frequency.setValueAtTime(750, now);
      doorBp.frequency.linearRampToValueAtTime(450, now + 0.8);
      doorBp.Q.value = 3.5;

      const tremolo = ctx.createOscillator();
      tremolo.frequency.value = 22;
      const tremDepth = ctx.createGain();
      tremDepth.gain.value = 0.15;

      const doorGain = ctx.createGain();
      doorGain.gain.setValueAtTime(0.0001, now);
      doorGain.gain.linearRampToValueAtTime(0.28, now + 0.1);
      doorGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      tremolo.connect(tremDepth);
      tremDepth.connect(doorGain.gain);

      doorNoise.connect(doorBp);
      doorBp.connect(doorGain);
      doorGain.connect(dest);

      doorNoise.start(now);
      tremolo.start(now);
      doorNoise.stop(now + 0.9);
      tremolo.stop(now + 0.9);

      // Thud bawah rolling door
      const thudOsc = ctx.createOscillator();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(110, now + 0.75);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.95);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.0001, now + 0.75);
      thudGain.gain.linearRampToValueAtTime(0.35, now + 0.78);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

      thudOsc.connect(thudGain);
      thudGain.connect(dest);
      thudOsc.start(now + 0.75);
      thudOsc.stop(now + 1.1);

      // Denting sendok/piring di kejauhan
      if (Math.random() < 0.65) {
        const clinkT = now + 2.5 + Math.random() * 2;
        const clinkOsc = ctx.createOscillator();
        clinkOsc.type = 'sine';
        clinkOsc.frequency.value = 2400 + Math.random() * 800;

        const clinkGain = ctx.createGain();
        clinkGain.gain.setValueAtTime(0.0001, clinkT);
        clinkGain.gain.linearRampToValueAtTime(0.12, clinkT + 0.003);
        clinkGain.gain.exponentialRampToValueAtTime(0.0001, clinkT + 0.22);

        clinkOsc.connect(clinkGain);
        clinkGain.connect(reverb);
        clinkGain.connect(dest);

        clinkOsc.start(clinkT);
        clinkOsc.stop(clinkT + 0.25);
      }

      const timer = setTimeout(scheduleWarungEvent, 16000 + Math.random() * 14000);
      tracker.timers.push(timer);
    };
    scheduleWarungEvent();

  } else if (variant === 'teras_malam') {
    // Jangkrik malam berirama 3-ketukan biologis + semilir angin bambu
    const jangkrikOsc1 = ctx.createOscillator();
    const jangkrikOsc2 = ctx.createOscillator();
    jangkrikOsc1.frequency.value = 4600;
    jangkrikOsc2.frequency.value = 4850;

    const jangkrikGain = ctx.createGain();
    jangkrikGain.gain.value = 0.0001;

    jangkrikOsc1.connect(jangkrikGain);
    jangkrikOsc2.connect(jangkrikGain);
    jangkrikGain.connect(dest);

    jangkrikOsc1.start();
    jangkrikOsc2.start();
    tracker.nodes.push(jangkrikOsc1, jangkrikOsc2, jangkrikGain);

    const scheduleChirps = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const chirps = 3;
      for (let i = 0; i < chirps; i++) {
        const t = now + i * 0.12;
        jangkrikGain.gain.setValueAtTime(0.0001, t);
        jangkrikGain.gain.linearRampToValueAtTime(0.065, t + 0.02);
        jangkrikGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      }
      const timer = setTimeout(scheduleChirps, 1200 + Math.random() * 900);
      tracker.timers.push(timer);
    };
    scheduleChirps();

    // Semilir angin malam di rumpun bambu
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = pink;
    windSrc.loop = true;

    const windBp = ctx.createBiquadFilter();
    windBp.type = 'bandpass';
    windBp.frequency.value = 920;
    windBp.Q.value = 2.0;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.08;

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.09;
    const windDepth = ctx.createGain();
    windDepth.gain.value = 0.05;
    windLfo.connect(windDepth);
    windDepth.connect(windGain.gain);

    windSrc.connect(windBp);
    windBp.connect(windGain);
    windGain.connect(dest);

    windSrc.start();
    windLfo.start();
    tracker.nodes.push(windSrc, windBp, windGain, windLfo, windDepth);
  }
}

// =========================================================================
// 4. ENGINE GENTA & SINGING BOWL (Gamelan Slendro & Tibetan Bowl)
// =========================================================================
export function setupBowlEngine(
  ctx: AudioContext,
  variant: BowlVariant,
  dest: GainNode,
  _buffers: SoundscapeBuffers,
  tracker: SubEngineTracker
) {
  clearSubEngine(tracker);

  if (variant === 'slendro') {
    // Harmoni perunggu Gamelan Slendro (Laras Nem ~268Hz) dengan detuning shimmer
    const slendroPartials = [
      { ratio: 1.0, gain: 0.45 },
      { ratio: 1.34, gain: 0.28 },
      { ratio: 1.82, gain: 0.16 },
      { ratio: 2.45, gain: 0.08 },
      { ratio: 3.12, gain: 0.04 },
    ];

    const strikeGamelanGong = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const f0 = 268 + Math.random() * 12;
      const decayTime = 10 + Math.random() * 4;

      slendroPartials.forEach((pt) => {
        for (let d = 0; d < 2; d++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const detuneMult = d === 0 ? 1.0 : 1.0035;
          osc.frequency.value = f0 * pt.ratio * detuneMult;

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(pt.gain * 0.7, now + 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

          osc.connect(g);
          g.connect(dest);
          osc.start(now);
          osc.stop(now + decayTime + 0.1);
        }
      });

      const timer = setTimeout(strikeGamelanGong, 12000 + Math.random() * 8000);
      tracker.timers.push(timer);
    };
    strikeGamelanGong();

  } else if (variant === 'singing_bowl') {
    // Tibetan Singing Bowl harmonik dalam
    const bowlPartials = [
      { ratio: 1.0, gain: 0.5 },
      { ratio: 2.74, gain: 0.3 },
      { ratio: 5.41, gain: 0.14 },
      { ratio: 8.9, gain: 0.07 },
    ];

    const strikeBowl = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const f0 = 210 + Math.random() * 60;
      const decayTime = 8 + Math.random() * 4;

      bowlPartials.forEach((pt) => {
        for (let d = 0; d < 2; d++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f0 * pt.ratio * (d === 0 ? 1 : 1.004);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(pt.gain * 0.7, now + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

          osc.connect(g);
          g.connect(dest);
          osc.start(now);
          osc.stop(now + decayTime + 0.1);
        }
      });

      const timer = setTimeout(strikeBowl, 9500 + Math.random() * 6500);
      tracker.timers.push(timer);
    };
    strikeBowl();
  }
}
