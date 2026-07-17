import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import JiwoMascot from '@/components/JiwoMascot';
import { X, Play, Pause, Volume2, Timer, Sparkles, AlertCircle } from 'lucide-react';

export default function SleepCompanion() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Volume controls (0 to 1) — warm, sleep-friendly layers only
  const [rainVol, setRainVol] = useState(0.5);
  const [waveVol, setWaveVol] = useState(0.22);
  const [bowlVol, setBowlVol] = useState(0.32);
  const [fireVol, setFireVol] = useState(0.18);

  // Timer: null means infinite, or minutes left
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);

  // Stepper for Wind-down routine
  const [routineStep, setRoutineStep] = useState(0);
  const routineSteps = [
    { title: 'Tarik Selimutmu', desc: 'Posisikan tubuhmu dalam posisi tidur terlentang yang paling nyaman. Buat ruanganmu temaram atau gelap.' },
    { title: 'Kendurkan Bahu', desc: 'Tarik napas dalam, lalu embuskan perlahan sembari menjatuhkan ketegangan di bahu, rahang, dan matamu.' },
    { title: 'Fokus pada Suara', desc: 'Nyalakan suara alam di bawah ini. Dengarkan ritme ombak atau hujan, biarkan pikiranmu hanyut perlahan.' },
    { title: 'Bernapas Bersama Jiwo', desc: 'Ikuti pernapasan lambat Jiwo di layar. Tarik napas pelan... hembuskan lebih pelan...' }
  ];

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const waveGainRef = useRef<GainNode | null>(null);
  const bowlGainRef = useRef<GainNode | null>(null);
  const fireGainRef = useRef<GainNode | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const rainTimerRef = useRef<any>(null);
  const bowlTimerRef = useRef<any>(null);
  const fireTimerRef = useRef<any>(null);

  // Timer interval ref
  const timerIntervalRef = useRef<any>(null);
  const sleepMascotRef = useRef<HTMLDivElement>(null);

  // While the soundscape plays, Jiwo rocks gently side to side like being
  // lulled in a cradle — the user's breathing tends to follow the rhythm.
  useEffect(() => {
    const el = sleepMascotRef.current;
    if (!el || !isPlaying) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rock = gsap.to(el, {
      rotation: 3.5,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: '50% 95%',
    });
    gsap.set(el, { rotation: -3.5 });

    return () => {
      rock.kill();
      gsap.to(el, { rotation: 0, duration: 0.8, ease: 'sine.out' });
    };
  }, [isPlaying]);

  // Clean up audio and timer on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Update audio node volumes when sliders change
  useEffect(() => {
    if (rainGainRef.current) rainGainRef.current.gain.setValueAtTime(rainVol * (isPlaying ? 1 : 0), audioCtxRef.current?.currentTime || 0);
  }, [rainVol, isPlaying]);

  useEffect(() => {
    if (waveGainRef.current) waveGainRef.current.gain.setValueAtTime(waveVol * (isPlaying ? 1 : 0), audioCtxRef.current?.currentTime || 0);
  }, [waveVol, isPlaying]);

  useEffect(() => {
    if (bowlGainRef.current) bowlGainRef.current.gain.setValueAtTime(bowlVol * (isPlaying ? 1 : 0), audioCtxRef.current?.currentTime || 0);
  }, [bowlVol, isPlaying]);

  useEffect(() => {
    if (fireGainRef.current) fireGainRef.current.gain.setValueAtTime(fireVol * (isPlaying ? 1 : 0), audioCtxRef.current?.currentTime || 0);
  }, [fireVol, isPlaying]);

  // Countdown timer logic
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (timerMinutes !== null && isPlaying) {
      setTimeLeftSec(timerMinutes * 60);

      timerIntervalRef.current = setInterval(() => {
        setTimeLeftSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsPlaying(false);
            stopAudio();
            setTimerMinutes(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [timerMinutes, isPlaying]);

  const formatTimeLeft = () => {
    const mins = Math.floor(timeLeftSec / 60);
    const secs = timeLeftSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Synthesize a warm, sleep-friendly soundscape locally with the Web Audio API.
  // Every layer is chosen to soothe rather than startle: pink-noise rain, a
  // slowly breathing ocean, a warm singing-bowl drone, and a cozy fireplace.
  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 3; // 3-second seamless loop

    // Pink noise — softer and warmer than white noise (no harsh, anxious hiss).
    // Paul Kellet's economical pink-noise approximation.
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

    // Brown noise — deep, gentle rumble for the ocean bed and ember roar.
    const brownBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5; // Amplify
    }

    // --- A. WATER DROPLETS (individual soft drips, never a heavy downpour) ---
    const rainGain = ctx.createGain();
    rainGain.gain.value = rainVol;
    rainGainRef.current = rainGain;

    // Small-room reverb: a synthetic impulse response (decaying noise) through
    // a ConvolverNode. The drips are sent dry + wet, so each 'bloop' blooms in
    // a gentle cave-like space instead of dying flat.
    const irLen = Math.floor(sampleRate * 1.6);
    const irBuffer = ctx.createBuffer(2, irLen, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const irData = irBuffer.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        // Exponential decay with a soft early build-up (diffuse room, no slap).
        const env = Math.pow(1 - i / irLen, 2.6) * Math.min(1, i / (sampleRate * 0.01));
        irData[i] = (Math.random() * 2 - 1) * env;
      }
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = irBuffer;
    const reverbLP = ctx.createBiquadFilter();
    reverbLP.type = 'lowpass';
    reverbLP.frequency.value = 2400; // keep the tail warm, not hissy
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.35; // subtle room, drips stay intimate

    rainGain.connect(ctx.destination);       // dry
    rainGain.connect(reverb);                // wet send
    reverb.connect(reverbLP);
    reverbLP.connect(wetGain);
    wetGain.connect(ctx.destination);

    // A real water drip is physically a resonating air bubble: a tiny noise
    // splash on impact, then a 'bloop' whose pitch glides UP as the bubble
    // shrinks. Modelling both parts is what makes it sound wet, not electronic.
    const makeDrip = (at: number) => {
      const c = audioCtxRef.current;
      const rg = rainGainRef.current;
      if (!c || !rg) return;
      const loud = 0.25 + Math.random() * 0.3; // per-drip level (some near, some far)

      // 1) Impact splash — a very short, soft noise tick (the surface break).
      const spl = c.createBufferSource();
      spl.buffer = pinkBuffer;
      spl.loop = true;
      const splBP = c.createBiquadFilter();
      splBP.type = 'bandpass';
      splBP.frequency.value = 1800 + Math.random() * 1600;
      splBP.Q.value = 1.2;
      const splG = c.createGain();
      splG.gain.setValueAtTime(0.0001, at);
      splG.gain.exponentialRampToValueAtTime(loud * 0.5, at + 0.003);
      splG.gain.exponentialRampToValueAtTime(0.0003, at + 0.03);
      spl.connect(splBP);
      splBP.connect(splG);
      splG.connect(rg);
      spl.start(at);
      spl.stop(at + 0.05);

      // 2) Bubble 'bloop' — sine whose pitch RISES (Minnaert resonance). No FM
      //    vibrato (that sounds synthetic); the tone stays quiet and short.
      const osc = c.createOscillator();
      osc.type = 'sine';
      const f0 = 340 + Math.random() * 340; // start pitch of the bubble
      const rise = 1.25 + Math.random() * 0.35; // gentler upward bend
      const dur = 0.05 + Math.random() * 0.05; // short — real bloops are brief
      osc.frequency.setValueAtTime(f0, at + 0.004);
      osc.frequency.exponentialRampToValueAtTime(f0 * rise, at + 0.004 + dur);
      const oscG = c.createGain();
      oscG.gain.setValueAtTime(0.0001, at + 0.004);
      oscG.gain.exponentialRampToValueAtTime(loud * 0.7, at + 0.014);
      oscG.gain.exponentialRampToValueAtTime(0.0004, at + 0.004 + dur + 0.05);
      osc.connect(oscG);
      oscG.connect(rg);
      osc.start(at + 0.004);
      osc.stop(at + dur + 0.1);

      // 3) Resonant body — noise rung through a high-Q bandpass sweeping with
      //    the same pitch. Real water has this breathy, inharmonic grit that a
      //    pure sine lacks; it's what stops it from sounding electronic.
      const res = c.createBufferSource();
      res.buffer = pinkBuffer;
      res.loop = true;
      const resBP = c.createBiquadFilter();
      resBP.type = 'bandpass';
      resBP.Q.value = 12 + Math.random() * 8;
      resBP.frequency.setValueAtTime(f0, at + 0.004);
      resBP.frequency.exponentialRampToValueAtTime(f0 * rise, at + 0.004 + dur);
      const resG = c.createGain();
      resG.gain.setValueAtTime(0.0001, at + 0.004);
      resG.gain.exponentialRampToValueAtTime(loud * 0.5, at + 0.012);
      resG.gain.exponentialRampToValueAtTime(0.0004, at + 0.004 + dur + 0.06);
      res.connect(resBP);
      resBP.connect(resG);
      resG.connect(rg);
      res.start(at + 0.004);
      res.stop(at + dur + 0.14);
    };

    const scheduleDrips = () => {
      if (!audioCtxRef.current) return;
      // One unhurried drip at a time; occasionally a soft echo-drip follows.
      makeDrip(audioCtxRef.current.currentTime + 0.02 + Math.random() * 0.3);
      if (Math.random() < 0.18) {
        makeDrip(audioCtxRef.current.currentTime + 0.7 + Math.random() * 0.6);
      }
      rainTimerRef.current = setTimeout(scheduleDrips, 3800 + Math.random() * 4500);
    };
    scheduleDrips();

    // --- B. GENTLE OCEAN (a soft, distant hush — barely breathing) ---
    const waveSource = ctx.createBufferSource();
    waveSource.buffer = brownBuffer;
    waveSource.loop = true;

    const waveLP = ctx.createBiquadFilter();
    waveLP.type = 'lowpass';
    waveLP.frequency.value = 280; // very soft and far away, no roar

    const waveGain = ctx.createGain();
    waveGain.gain.value = waveVol;

    // A shallow, slow LFO — the surf barely rises and falls, so it never surges.
    const waveLfo = ctx.createOscillator();
    waveLfo.frequency.value = 0.07;
    const waveLfoDepth = ctx.createGain();
    waveLfoDepth.gain.value = 0.09;
    waveLfo.connect(waveLfoDepth);
    waveLfoDepth.connect(waveGain.gain);

    waveSource.connect(waveLP);
    waveLP.connect(waveGain);
    waveGain.connect(ctx.destination);
    waveLfo.start();
    waveGainRef.current = waveGain;
    audioSourcesRef.current.push(waveSource);
    oscNodesRef.current.push(waveLfo);

    // --- C. SINGING BOWL (struck bowl with inharmonic partials, long ring) ---
    const bowlGain = ctx.createGain();
    bowlGain.gain.value = bowlVol;
    bowlGain.connect(ctx.destination);
    bowlGainRef.current = bowlGain;

    // Inharmonic partial ratios typical of a Tibetan singing bowl. Each partial
    // is voiced twice, slightly detuned, so it shimmers and beats as it rings.
    const bowlPartials = [
      { ratio: 1.0, gain: 0.5 },
      { ratio: 2.74, gain: 0.3 },
      { ratio: 5.41, gain: 0.14 },
      { ratio: 8.9, gain: 0.07 },
    ];

    const strikeBowl = (at: number) => {
      const c = audioCtxRef.current;
      const bg = bowlGainRef.current;
      if (!c || !bg) return;
      const f0 = 210 + Math.random() * 70; // a warm, mid-low bowl
      const ring = 7 + Math.random() * 4;  // seconds of slow decay
      bowlPartials.forEach((pt) => {
        for (let d = 0; d < 2; d++) {
          const osc = c.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f0 * pt.ratio * (d === 0 ? 1 : 1.004);
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(pt.gain, at + 0.05); // soft mallet
          g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
          osc.connect(g);
          g.connect(bg);
          osc.start(at);
          osc.stop(at + ring + 0.1);
        }
      });
    };

    const scheduleBowl = () => {
      if (!audioCtxRef.current) return;
      strikeBowl(audioCtxRef.current.currentTime + 0.05);
      // A new strike every ~9–15s, so each bowl fully blooms and fades first.
      bowlTimerRef.current = setTimeout(scheduleBowl, 9000 + Math.random() * 6000);
    };
    scheduleBowl();

    // --- D. COZY FIREPLACE (quiet ember bed + soft random crackles) ---
    const fireGain = ctx.createGain();
    fireGain.gain.value = fireVol;
    fireGain.connect(ctx.destination);
    fireGainRef.current = fireGain;

    // Steady ember 'roar' — a very quiet brown-noise bed under the crackles.
    const emberSource = ctx.createBufferSource();
    emberSource.buffer = brownBuffer;
    emberSource.loop = true;
    const emberLP = ctx.createBiquadFilter();
    emberLP.type = 'lowpass';
    emberLP.frequency.value = 500;
    const emberGain = ctx.createGain();
    emberGain.gain.value = 0.4;
    emberSource.connect(emberLP);
    emberLP.connect(emberGain);
    emberGain.connect(fireGain);
    audioSourcesRef.current.push(emberSource);

    // Short, warm, filtered noise ticks fired at random gaps → gentle crackle.
    const makeCrackle = (startAt: number) => {
      const c = audioCtxRef.current;
      const fg = fireGainRef.current;
      if (!c || !fg) return;
      const pops = 1 + Math.floor(Math.random() * 3);
      let t = startAt;
      for (let i = 0; i < pops; i++) {
        const src = c.createBufferSource();
        src.buffer = pinkBuffer;
        src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900 + Math.random() * 1500;
        bp.Q.value = 4 + Math.random() * 4;
        const g = c.createGain();
        const dur = 0.012 + Math.random() * 0.035; // very short warm tick
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.4, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(fg);
        src.start(t);
        src.stop(t + dur + 0.02);
        t += 0.01 + Math.random() * 0.05;
      }
    };

    const scheduleFire = () => {
      if (!audioCtxRef.current) return;
      makeCrackle(audioCtxRef.current.currentTime + 0.02);
      fireTimerRef.current = setTimeout(scheduleFire, 250 + Math.random() * 900);
    };
    scheduleFire();

    // Start the looping bed sources together.
    waveSource.start();
    emberSource.start();
  };

  const stopAudio = () => {
    // Stop every scheduler first so no new sounds are queued.
    if (rainTimerRef.current) {
      clearTimeout(rainTimerRef.current);
      rainTimerRef.current = null;
    }
    if (bowlTimerRef.current) {
      clearTimeout(bowlTimerRef.current);
      bowlTimerRef.current = null;
    }
    if (fireTimerRef.current) {
      clearTimeout(fireTimerRef.current);
      fireTimerRef.current = null;
    }

    audioSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    audioSourcesRef.current = [];

    oscNodesRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    oscNodesRef.current = [];

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      stopAudio();
    } else {
      // Play
      setIsPlaying(true);
      initAudio();
    }
  };

  const handleTimerSelect = (mins: number | null) => {
    setTimerMinutes(mins);
    if (mins === null) {
      setTimeLeftSec(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E131F] text-slate-100 flex flex-col justify-between p-6 relative font-sans">
      
      {/* Top Header Bar */}
      <div className="flex justify-between items-center w-full z-10">
        <button
          onClick={() => {
            stopAudio();
            navigate('/tools');
          }}
          className="p-2.5 rounded-full bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 transition text-slate-400 hover:text-slate-100"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/20 text-3xs font-extrabold uppercase tracking-widest text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-jiwo-primary animate-pulse" /> Sleep Companion
        </div>
      </div>

      {/* Mascot sleep view with pulsing glow */}
      <div className="flex flex-col items-center justify-center flex-grow py-6 relative">
        <div className="absolute w-64 h-64 bg-jiwo-primary/10 rounded-full blur-3xl animate-pulse" />
        <div ref={sleepMascotRef} className="w-48 h-48 opacity-90 select-none">
          <JiwoMascot state="sleep" scale={1} showAnimation={true} />
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide mt-4 italic">
          Shhh... Jiwo sedang beristirahat menemanimu
        </p>

        {/* Countdown Timer Display */}
        {timerMinutes !== null && isPlaying && (
          <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/30 text-xs font-semibold text-jiwo-primary">
            <Timer className="w-4 h-4 animate-pulse" />
            <span>Mati otomatis dalam {formatTimeLeft()}</span>
          </div>
        )}
      </div>

      {/* Stepper Card for Wind-down routine */}
      <div className="w-full max-w-sm mx-auto bg-slate-800/35 border border-slate-700/25 p-5 rounded-3xl backdrop-blur-md mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-jiwo-primary">
            Sesi Relaksasi Mandiri
          </h4>
          <span className="text-3xs font-bold text-slate-500">
            {routineStep + 1} dari {routineSteps.length}
          </span>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-slate-100 leading-snug">
            {routineSteps[routineStep].title}
          </h3>
          <p className="text-2xs text-slate-400 leading-relaxed">
            {routineSteps[routineStep].desc}
          </p>
        </div>

        <div className="flex justify-between pt-1">
          <button
            disabled={routineStep === 0}
            onClick={() => setRoutineStep(routineStep - 1)}
            className="text-3xs font-bold text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
          >
            Sebelumnya
          </button>
          <button
            disabled={routineStep === routineSteps.length - 1}
            onClick={() => setRoutineStep(routineStep + 1)}
            className="text-3xs font-bold text-jiwo-primary hover:text-jiwo-primary/80 disabled:opacity-30"
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {/* Bottom Controls Panel */}
      <div className="w-full max-w-md mx-auto space-y-6 pt-4 border-t border-slate-800/60 z-10">
        
        {/* Ambient Sound Sliders */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-2xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
            <span>Suara Alam (Mixer)</span>
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Binaural
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Rain Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-300 w-24 shrink-0">💧 Tetesan Air</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={rainVol}
                onChange={(e) => setRainVol(parseFloat(e.target.value))}
                className="flex-grow accent-jiwo-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-3xs font-bold text-slate-500 w-6 text-right">
                {Math.round(rainVol * 100)}%
              </span>
            </div>

            {/* Wave Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-300 w-24 shrink-0">🌊 Ombak Tenang</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={waveVol}
                onChange={(e) => setWaveVol(parseFloat(e.target.value))}
                className="flex-grow accent-jiwo-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-3xs font-bold text-slate-500 w-6 text-right">
                {Math.round(waveVol * 100)}%
              </span>
            </div>

            {/* Singing Bowl Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-300 w-24 shrink-0">🔔 Singing Bowl</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bowlVol}
                onChange={(e) => setBowlVol(parseFloat(e.target.value))}
                className="flex-grow accent-jiwo-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-3xs font-bold text-slate-500 w-6 text-right">
                {Math.round(bowlVol * 100)}%
              </span>
            </div>

            {/* Cozy Fireplace Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-300 w-24 shrink-0">🔥 Perapian</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={fireVol}
                onChange={(e) => setFireVol(parseFloat(e.target.value))}
                className="flex-grow accent-jiwo-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-3xs font-bold text-slate-500 w-6 text-right">
                {Math.round(fireVol * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Action controls (Timer selectors & Play button) */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Sleep Timers */}
          <div className="flex gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl shrink-0">
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleTimerSelect(mins)}
                className={`px-3 py-2.5 rounded-xl text-3xs font-extrabold transition ${
                  timerMinutes === mins
                    ? 'bg-slate-800 text-jiwo-primary border border-slate-700/35'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {mins}M
              </button>
            ))}
            {timerMinutes !== null && (
              <button
                onClick={() => handleTimerSelect(null)}
                className="px-2.5 py-2.5 rounded-xl text-3xs font-extrabold text-jiwo-stress hover:text-jiwo-stress/80 transition"
              >
                Batal
              </button>
            )}
          </div>

          {/* Large Master Play Button */}
          <button
            onClick={handlePlayPause}
            className="flex-grow flex items-center justify-center gap-2 bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm hover:from-jiwo-primary/95 hover:to-jiwo-blueCalm/95 text-slate-100 font-extrabold py-3.5 px-6 rounded-2xl shadow-md transition duration-200"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Matikan Suara</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Istirahat</span>
              </>
            )}
          </button>
        </div>

        {/* Safety Warning */}
        <p className="text-5xs text-center text-slate-500 leading-normal flex items-center justify-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Gunakan earphone untuk suara 3D yang maksimal. Jangan dengarkan saat mengemudi.</span>
        </p>
      </div>

    </div>
  );
}
