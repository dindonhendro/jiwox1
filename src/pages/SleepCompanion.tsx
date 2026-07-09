import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import JiwoMascot from '@/components/JiwoMascot';
import { X, Play, Pause, Volume2, Timer, Sparkles, AlertCircle } from 'lucide-react';

export default function SleepCompanion() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Volume controls (0 to 1)
  const [rainVol, setRainVol] = useState(0.4);
  const [waveVol, setWaveVol] = useState(0.3);
  const [windVol, setWindVol] = useState(0.2);

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
  const windGainRef = useRef<GainNode | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const waveLfoRef = useRef<OscillatorNode | null>(null);

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
    if (windGainRef.current) windGainRef.current.gain.setValueAtTime(windVol * (isPlaying ? 1 : 0), audioCtxRef.current?.currentTime || 0);
  }, [windVol, isPlaying]);

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

  // Synthesize custom noises locally using Web Audio API
  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // 1. Create Noise Buffers
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds loop

    // White Noise buffer
    const whiteBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Brown Noise buffer (for deep wind and wave base)
    const brownBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5; // Amplify
    }

    // --- SOUND GENERATORS ---

    // A. RAIN (Filtered White Noise + Bandpass)
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = whiteBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 900; // Calming rain hiss

    const rainGain = ctx.createGain();
    rainGain.gain.value = rainVol;

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(ctx.destination);

    rainGainRef.current = rainGain;
    audioSourcesRef.current.push(rainSource);

    // B. OCEAN WAVES (Brown Noise modulated by slow LFO)
    const waveSource = ctx.createBufferSource();
    waveSource.buffer = brownBuffer;
    waveSource.loop = true;

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 350; // Deeper rumble

    const waveGain = ctx.createGain();
    waveGain.gain.value = waveVol;

    // LFO to simulate rolling waves (fading volume in and out)
    const waveLfo = ctx.createOscillator();
    waveLfo.frequency.value = 0.08; // Wave cycle every ~12.5 seconds
    
    const waveLfoGain = ctx.createGain();
    waveLfoGain.gain.value = 0.35; // Modulate depth
    
    waveLfo.connect(waveLfoGain);
    // Connect LFO modulation directly to waveGain node
    waveLfoGain.connect(waveGain.gain);

    waveSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(ctx.destination);

    waveLfo.start();
    waveLfoRef.current = waveLfo;
    waveGainRef.current = waveGain;
    audioSourcesRef.current.push(waveSource);

    // C. NIGHT WIND (Filtered Brown Noise with random-like sweeping bandpass)
    const windSource = ctx.createBufferSource();
    windSource.buffer = brownBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.value = 2.0;
    windFilter.frequency.value = 400;

    // Sweeping wind LFO
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.05; // Gentle wind sweep
    
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 150; // Frequency variation range
    
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.value = windVol;

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);

    windLfo.start();
    windGainRef.current = windGain;
    audioSourcesRef.current.push(windSource);

    // Start playback
    rainSource.start();
    waveSource.start();
    windSource.start();
  };

  const stopAudio = () => {
    audioSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    audioSourcesRef.current = [];

    if (waveLfoRef.current) {
      try {
        waveLfoRef.current.stop();
      } catch (e) {}
      waveLfoRef.current = null;
    }

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
              <span className="text-xs font-semibold text-slate-300 w-16 shrink-0">🌧️ Hujan</span>
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
              <span className="text-xs font-semibold text-slate-300 w-16 shrink-0">🌊 Ombak</span>
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

            {/* Night Wind Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-300 w-16 shrink-0">🍃 Angin</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={windVol}
                onChange={(e) => setWindVol(parseFloat(e.target.value))}
                className="flex-grow accent-jiwo-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-3xs font-bold text-slate-500 w-6 text-right">
                {Math.round(windVol * 100)}%
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
