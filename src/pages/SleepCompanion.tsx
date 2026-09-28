import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import JiwoMascot from '@/components/JiwoMascot';
import { 
  X, Play, Pause, Volume2, Timer, Sparkles, AlertCircle, 
  CloudRain, Waves, Bike, Bell, Check, Moon, Sliders
} from 'lucide-react';
import {
  type RainVariant,
  type WaveVariant,
  type CommunityVariant,
  type BowlVariant,
  type SoundscapeBuffers,
  type SubEngineTracker,
  createSubEngineTracker,
  createSoundscapeBuffers,
  clearSubEngine,
  setupRainEngine,
  setupWaveEngine,
  setupCommunityEngine,
  setupBowlEngine,
} from '@/lib/nusantaraSoundscape';

export type PresetId = 'kos_hujan' | 'ubud_asri' | 'jogja_malam' | 'pantai_selatan' | 'custom';

interface SoundscapePreset {
  id: PresetId;
  name: string;
  shortName: string;
  subtitle: string;
  tagline: string;
  badge: string;
  rainVariant: RainVariant;
  rainVol: number;
  waveVariant: WaveVariant;
  waveVol: number;
  communityVariant: CommunityVariant;
  communityVol: number;
  bowlVariant: BowlVariant;
  bowlVol: number;
}

const PRESETS: Record<Exclude<PresetId, 'custom'>, SoundscapePreset> = {
  kos_hujan: {
    id: 'kos_hujan',
    name: 'Kamar Kos Waktu Hujan',
    shortName: 'Kamar Kos Hujan',
    subtitle: 'Atap Seng • Motor Jauh • Genta',
    tagline: 'Hangatnya selimut saat hujan deras memukul atap seng & motor sayup melintas di gang.',
    badge: '🌧️ Favorit',
    rainVariant: 'atap_seng',
    rainVol: 0.65,
    waveVariant: 'parangtritis',
    waveVol: 0,
    communityVariant: 'motor_jauh',
    communityVol: 0.45,
    bowlVariant: 'slendro',
    bowlVol: 0.18,
  },
  ubud_asri: {
    id: 'ubud_asri',
    name: 'Pagi Tenang di Ubud',
    shortName: 'Pagi di Ubud',
    subtitle: 'Sawah Tropis • Teras Asri • Gamelan',
    tagline: 'Gerimis lembut menyapu dedaunan sawah Ubud, semilir angin teras, dan genta penenang batin.',
    badge: '🌾 Asri Tropis',
    rainVariant: 'sawah_ubud',
    rainVol: 0.60,
    waveVariant: 'bali',
    waveVol: 0,
    communityVariant: 'teras_malam',
    communityVol: 0.48,
    bowlVariant: 'slendro',
    bowlVol: 0.32,
  },
  jogja_malam: {
    id: 'jogja_malam',
    name: 'Malam Damai di Jogja',
    shortName: 'Malam di Jogja',
    subtitle: 'Gang Malam • Warung Tutup • Aspal Hujan',
    tagline: 'Suasana gang malam yang teduh dan aman, sayup rolling door warung tutup dan ketenangan kota.',
    badge: '🛵 Komunal Aman',
    rainVariant: 'jakarta_malam',
    rainVol: 0.35,
    waveVariant: 'parangtritis',
    waveVol: 0,
    communityVariant: 'warung_tutup',
    communityVol: 0.55,
    bowlVariant: 'slendro',
    bowlVol: 0.22,
  },
  pantai_selatan: {
    id: 'pantai_selatan',
    name: 'Senja Pantai Selatan',
    shortName: 'Pantai Parangtritis',
    subtitle: 'Ombak Samudra • Desir Laut • Meditasi',
    tagline: 'Deburan ombak megah Samudra Hindia yang berirama dalam, melarutkan penat dan overthinking.',
    badge: '🌊 Samudra Megah',
    rainVariant: 'atap_seng',
    rainVol: 0,
    waveVariant: 'parangtritis',
    waveVol: 0.72,
    communityVariant: 'teras_malam',
    communityVol: 0.25,
    bowlVariant: 'singing_bowl',
    bowlVol: 0.28,
  }
};

export default function SleepCompanion() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetId>('kos_hujan');

  // Soundscape track configurations
  const [rainVariant, setRainVariant] = useState<RainVariant>('atap_seng');
  const [rainVol, setRainVol] = useState(0.65);

  const [waveVariant, setWaveVariant] = useState<WaveVariant>('parangtritis');
  const [waveVol, setWaveVol] = useState(0.0);

  const [communityVariant, setCommunityVariant] = useState<CommunityVariant>('motor_jauh');
  const [communityVol, setCommunityVol] = useState(0.45);

  const [bowlVariant, setBowlVariant] = useState<BowlVariant>('slendro');
  const [bowlVol, setBowlVol] = useState(0.18);

  // Timer controls: null means continuous play
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);

  // Stepper for culturally comforting Indonesian wind-down routine
  const [routineStep, setRoutineStep] = useState(0);
  const routineSteps = [
    { 
      title: 'Tarik Selimut & Redupkan Kamar', 
      desc: 'Posisikan tubuhmu dalam posisi paling santai di kasur. Redupkan lampu ruangan, letakkan ponsel sedikit menjauh, dan rasakan hangatnya selimutmu.' 
    },
    { 
      title: 'Kendurkan Rahang & Pundak', 
      desc: 'Tarik napas panjang dari hidung... lalu embuskan perlahan sembari menjatuhkan ketegangan di bahu, kening, dan rahangmu. Hari ini sudah selesai.' 
    },
    { 
      title: 'Larut dalam Suara Nusantara', 
      desc: 'Dengarkan rintik atap seng kos, deburan ombak Parangtritis, atau sayup motor gang malam. Sadari bahwa saat ini kamu aman di ruang pribadimu.' 
    },
    { 
      title: 'Bernapas Lambat Bersama Jiwo', 
      desc: 'Ikuti ayunan ritme pernapasan Jiwo di layar. Tarik napas 4 detik... tahan sejenak... lalu hembuskan panjang 6 detik melarutkan sisa beban pikiran.' 
    }
  ];

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<SoundscapeBuffers | null>(null);

  const rainGainRef = useRef<GainNode | null>(null);
  const waveGainRef = useRef<GainNode | null>(null);
  const communityGainRef = useRef<GainNode | null>(null);
  const bowlGainRef = useRef<GainNode | null>(null);

  // Sub-engine trackers for live hot-swapping
  const rainTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const waveTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const commTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const bowlTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());

  // Timer interval ref
  const timerIntervalRef = useRef<any>(null);
  const sleepMascotRef = useRef<HTMLDivElement>(null);

  // Gentle rocking cradle animation while playing
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

  // Update track gain volumes smoothly in real time
  useEffect(() => {
    if (rainGainRef.current && audioCtxRef.current) {
      rainGainRef.current.gain.setTargetAtTime(isPlaying ? rainVol : 0, audioCtxRef.current.currentTime, 0.05);
    }
  }, [rainVol, isPlaying]);

  useEffect(() => {
    if (waveGainRef.current && audioCtxRef.current) {
      waveGainRef.current.gain.setTargetAtTime(isPlaying ? waveVol : 0, audioCtxRef.current.currentTime, 0.05);
    }
  }, [waveVol, isPlaying]);

  useEffect(() => {
    if (communityGainRef.current && audioCtxRef.current) {
      communityGainRef.current.gain.setTargetAtTime(isPlaying ? communityVol : 0, audioCtxRef.current.currentTime, 0.05);
    }
  }, [communityVol, isPlaying]);

  useEffect(() => {
    if (bowlGainRef.current && audioCtxRef.current) {
      bowlGainRef.current.gain.setTargetAtTime(isPlaying ? bowlVol : 0, audioCtxRef.current.currentTime, 0.05);
    }
  }, [bowlVol, isPlaying]);

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

  // Master Audio Initialization
  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Master Dynamics Compressor: warm tape-like limiting without harsh peaks
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.05;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    // Procedural sound buffers
    const buffers = createSoundscapeBuffers(ctx);
    buffers.reverb.connect(comp);
    buffersRef.current = buffers;

    // Master track gains
    const rainGain = ctx.createGain();
    rainGain.gain.value = rainVol;
    rainGain.connect(comp);
    rainGainRef.current = rainGain;

    const waveGain = ctx.createGain();
    waveGain.gain.value = waveVol;
    waveGain.connect(comp);
    waveGainRef.current = waveGain;

    const commGain = ctx.createGain();
    commGain.gain.value = communityVol;
    commGain.connect(comp);
    communityGainRef.current = commGain;

    const bowlGain = ctx.createGain();
    bowlGain.gain.value = bowlVol;
    bowlGain.connect(comp);
    bowlGainRef.current = bowlGain;

    // Start all 4 active engines
    setupRainEngine(ctx, rainVariant, rainGain, buffers, rainTrackerRef.current);
    setupWaveEngine(ctx, waveVariant, waveGain, buffers, waveTrackerRef.current);
    setupCommunityEngine(ctx, communityVariant, commGain, buffers, commTrackerRef.current);
    setupBowlEngine(ctx, bowlVariant, bowlGain, buffers, bowlTrackerRef.current);
  };

  const stopAudio = () => {
    clearSubEngine(rainTrackerRef.current);
    clearSubEngine(waveTrackerRef.current);
    clearSubEngine(commTrackerRef.current);
    clearSubEngine(bowlTrackerRef.current);

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    buffersRef.current = null;
    rainGainRef.current = null;
    waveGainRef.current = null;
    communityGainRef.current = null;
    bowlGainRef.current = null;
  };

  const handlePlayPause = () => {
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      setIsPlaying(true);
      initAudio();
    }
  };

  // Preset Selection
  const handleSelectPreset = (id: Exclude<PresetId, 'custom'>) => {
    const p = PRESETS[id];
    setActivePreset(id);
    setRainVariant(p.rainVariant);
    setRainVol(p.rainVol);
    setWaveVariant(p.waveVariant);
    setWaveVol(p.waveVol);
    setCommunityVariant(p.communityVariant);
    setCommunityVol(p.communityVol);
    setBowlVariant(p.bowlVariant);
    setBowlVol(p.bowlVol);

    // If audio is currently playing, dynamically reconfigure engines
    if (isPlaying && audioCtxRef.current && buffersRef.current) {
      const ctx = audioCtxRef.current;
      const bufs = buffersRef.current;
      if (rainGainRef.current) setupRainEngine(ctx, p.rainVariant, rainGainRef.current, bufs, rainTrackerRef.current);
      if (waveGainRef.current) setupWaveEngine(ctx, p.waveVariant, waveGainRef.current, bufs, waveTrackerRef.current);
      if (communityGainRef.current) setupCommunityEngine(ctx, p.communityVariant, communityGainRef.current, bufs, commTrackerRef.current);
      if (bowlGainRef.current) setupBowlEngine(ctx, p.bowlVariant, bowlGainRef.current, bufs, bowlTrackerRef.current);
    }
  };

  // Live Variant Switchers (Hot-swapping without clicking)
  const handleSwitchRain = (v: RainVariant) => {
    setRainVariant(v);
    setActivePreset('custom');
    if (isPlaying && audioCtxRef.current && rainGainRef.current && buffersRef.current) {
      setupRainEngine(audioCtxRef.current, v, rainGainRef.current, buffersRef.current, rainTrackerRef.current);
    }
  };

  const handleSwitchWave = (v: WaveVariant) => {
    setWaveVariant(v);
    setActivePreset('custom');
    if (isPlaying && audioCtxRef.current && waveGainRef.current && buffersRef.current) {
      setupWaveEngine(audioCtxRef.current, v, waveGainRef.current, buffersRef.current, waveTrackerRef.current);
    }
  };

  const handleSwitchCommunity = (v: CommunityVariant) => {
    setCommunityVariant(v);
    setActivePreset('custom');
    if (isPlaying && audioCtxRef.current && communityGainRef.current && buffersRef.current) {
      setupCommunityEngine(audioCtxRef.current, v, communityGainRef.current, buffersRef.current, commTrackerRef.current);
    }
  };

  const handleSwitchBowl = (v: BowlVariant) => {
    setBowlVariant(v);
    setActivePreset('custom');
    if (isPlaying && audioCtxRef.current && bowlGainRef.current && buffersRef.current) {
      setupBowlEngine(audioCtxRef.current, v, bowlGainRef.current, buffersRef.current, bowlTrackerRef.current);
    }
  };

  const handleTimerSelect = (mins: number | null) => {
    setTimerMinutes(mins);
    if (mins === null) {
      setTimeLeftSec(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex flex-col justify-between p-5 md:p-8 relative font-sans overflow-x-hidden">
      
      {/* Ambient background night glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-jiwo-primary/10 via-jiwo-blueCalm/5 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-12 left-10 w-1 h-1 bg-white/40 rounded-full animate-ping" />
        <div className="absolute top-28 right-16 w-1.5 h-1.5 bg-amber-200/30 rounded-full animate-pulse" />
        <div className="absolute top-48 left-1/4 w-1 h-1 bg-sky-200/40 rounded-full animate-pulse" />
      </div>

      {/* Top Header Bar */}
      <div className="flex justify-between items-center w-full z-10 max-w-lg mx-auto">
        <button
          onClick={() => {
            stopAudio();
            navigate('/tools');
          }}
          className="p-2.5 rounded-full bg-slate-800/70 border border-slate-700/40 hover:bg-slate-700/70 transition text-slate-400 hover:text-slate-100"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/30 text-3xs font-extrabold uppercase tracking-widest text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-jiwo-primary animate-pulse" /> Soundscape Nusantara
        </div>
      </div>

      {/* Mascot sleep view with breathing glow */}
      <div className="flex flex-col items-center justify-center flex-grow py-5 relative z-10 max-w-lg mx-auto w-full">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-52 h-52 bg-jiwo-primary/15 rounded-full blur-2xl animate-pulse" />
          <div ref={sleepMascotRef} className="w-44 h-44 opacity-95 select-none relative z-10">
            <JiwoMascot state="sleep" scale={1} showAnimation={true} />
          </div>
        </div>

        <p className="text-xs text-slate-400 font-medium tracking-wide mt-3 text-center italic max-w-xs">
          {isPlaying ? 'Dengarkan suara yang memelukmu, Jiwo menemanimu tidur pulap...' : 'Shhh... Jiwo sedang beristirahat menemanimu'}
        </p>

        {/* Countdown Timer Display */}
        {timerMinutes !== null && isPlaying && (
          <div className="mt-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-bold text-jiwo-primary shadow-sm">
            <Timer className="w-3.5 h-3.5 animate-pulse" />
            <span>Mati otomatis dalam {formatTimeLeft()}</span>
          </div>
        )}
      </div>

      {/* Stepper Card for Indonesian Wind-down Routine */}
      <div className="w-full max-w-lg mx-auto bg-slate-800/35 border border-slate-700/30 p-4.5 rounded-3xl backdrop-blur-md mb-5 space-y-2.5 z-10">
        <div className="flex justify-between items-center">
          <span className="text-3xs font-extrabold uppercase tracking-wider text-jiwo-primary flex items-center gap-1.5">
            <Moon className="w-3 h-3" /> Relaksasi Menjelang Tidur
          </span>
          <span className="text-3xs font-bold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full">
            Langkah {routineStep + 1} / {routineSteps.length}
          </span>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-slate-100 leading-snug">
            {routineSteps[routineStep].title}
          </h3>
          <p className="text-2xs text-slate-300 leading-relaxed">
            {routineSteps[routineStep].desc}
          </p>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-700/20">
          <button
            disabled={routineStep === 0}
            onClick={() => setRoutineStep(routineStep - 1)}
            className="text-3xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-25 transition py-1"
          >
            ← Sebelumnya
          </button>
          <button
            disabled={routineStep === routineSteps.length - 1}
            onClick={() => setRoutineStep(routineStep + 1)}
            className="text-3xs font-bold text-jiwo-primary hover:text-jiwo-primary/80 disabled:opacity-25 transition py-1"
          >
            Selanjutnya →
          </button>
        </div>
      </div>

      {/* Preset Cepat Nusantara (1-Tap Selection) */}
      <div className="w-full max-w-lg mx-auto mb-5 space-y-2 z-10">
        <div className="flex justify-between items-center px-1">
          <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">
            Suasana Pilihan Nusantara
          </span>
          {activePreset === 'custom' && (
            <span className="text-3xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Kustom Aktif
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRESETS) as Array<Exclude<PresetId, 'custom'>>).map((id) => {
            const p = PRESETS[id];
            const isSelected = activePreset === id;
            return (
              <button
                key={id}
                onClick={() => handleSelectPreset(id)}
                className={`p-3 rounded-2xl text-left border transition relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-jiwo-primary/70 ring-1 ring-jiwo-primary/40 shadow-sm'
                    : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded-md bg-slate-900/60 text-slate-300">
                    {p.badge}
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-jiwo-primary flex items-center justify-center text-slate-950">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h4 className="font-extrabold text-xs text-slate-100 leading-tight">
                  {p.shortName}
                </h4>
                <p className="text-4xs text-slate-400 truncate mt-0.5">
                  {p.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mixer Suara Nusantara (Track Sliders & Variant Selectors) */}
      <div className="w-full max-w-lg mx-auto space-y-4 pt-3 border-t border-slate-800/80 z-10">
        <div className="flex justify-between items-center text-3xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-jiwo-primary" /> Mixer Suara Nusantara
          </span>
          <span className="flex items-center gap-1 text-slate-500 font-semibold">
            <Volume2 className="w-3.5 h-3.5" /> Web Audio 3D
          </span>
        </div>

        {/* --- TRACK 1: HUJAN NUSANTARA --- */}
        <div className="bg-slate-800/25 border border-slate-700/25 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-400">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Hujan Nusantara</h4>
                <p className="text-4xs text-slate-400">Pilih tekstur rintik hujan khas tanah air</p>
              </div>
            </div>
            <span className="text-2xs font-extrabold text-blue-400 w-8 text-right">
              {Math.round(rainVol * 100)}%
            </span>
          </div>

          {/* Rain Variants */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { id: 'atap_seng', label: 'Atap Seng Kos', desc: 'Gemeretak intim' },
              { id: 'sawah_ubud', label: 'Sawah Ubud', desc: 'Rintik daun asri' },
              { id: 'jakarta_malam', label: 'Jakarta Malam', desc: 'Aspal basah kota' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => handleSwitchRain(v.id as RainVariant)}
                className={`py-1.5 px-2 rounded-xl text-center transition border ${
                  rainVariant === v.id
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-200 font-bold'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 text-3xs'
                }`}
              >
                <div className="text-3xs leading-none">{v.label}</div>
                <div className="text-5xs text-slate-500 mt-0.5 leading-none">{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Rain Slider */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={rainVol}
              onChange={(e) => {
                setRainVol(parseFloat(e.target.value));
                setActivePreset('custom');
              }}
              className="flex-grow accent-blue-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* --- TRACK 2: OMBAK NUSANTARA --- */}
        <div className="bg-slate-800/25 border border-slate-700/25 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-cyan-500/15 text-cyan-400">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Ombak Nusantara</h4>
                <p className="text-4xs text-slate-400">Irama deburan air laut yang melegakan dada</p>
              </div>
            </div>
            <span className="text-2xs font-extrabold text-cyan-400 w-8 text-right">
              {Math.round(waveVol * 100)}%
            </span>
          </div>

          {/* Wave Variants */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {[
              { id: 'parangtritis', label: 'Pantai Selatan (Parangtritis)', desc: 'Swell samudra dalam & berat' },
              { id: 'bali', label: 'Pesisir Bali (Sanur)', desc: 'Riak lembut pasir putih' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => handleSwitchWave(v.id as WaveVariant)}
                className={`py-1.5 px-2 rounded-xl text-center transition border ${
                  waveVariant === v.id
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-bold'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 text-3xs'
                }`}
              >
                <div className="text-3xs leading-none">{v.label}</div>
                <div className="text-5xs text-slate-500 mt-0.5 leading-none">{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Wave Slider */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={waveVol}
              onChange={(e) => {
                setWaveVol(parseFloat(e.target.value));
                setActivePreset('custom');
              }}
              className="flex-grow accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* --- TRACK 3: SUARA KEHIDUPAN & KEAMANAN KOMUNAL --- */}
        <div className="bg-slate-800/25 border border-slate-700/25 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Kehidupan & Keamanan Komunal</h4>
                <p className="text-4xs text-slate-400">Suara sayup lingkungan yang memberi rasa aman</p>
              </div>
            </div>
            <span className="text-2xs font-extrabold text-amber-400 w-8 text-right">
              {Math.round(communityVol * 100)}%
            </span>
          </div>

          {/* Community Variants: 3 Options */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { id: 'motor_jauh', label: 'Motor Jauh di Gang', desc: 'Deru 4-tak pelan' },
              { id: 'warung_tutup', label: 'Warung Tutup', desc: 'Rolling door & piring' },
              { id: 'teras_malam', label: 'Teras Sayup Malam', desc: 'Jangkrik & bambu' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => handleSwitchCommunity(v.id as CommunityVariant)}
                className={`py-1.5 px-2 rounded-xl text-center transition border ${
                  communityVariant === v.id
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 font-bold'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 text-3xs'
                }`}
              >
                <div className="text-3xs leading-none">{v.label}</div>
                <div className="text-5xs text-slate-500 mt-0.5 leading-none">{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Community Slider */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={communityVol}
              onChange={(e) => {
                setCommunityVol(parseFloat(e.target.value));
                setActivePreset('custom');
              }}
              className="flex-grow accent-amber-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* --- TRACK 4: GENTA & RESONANSI PENENANG --- */}
        <div className="bg-slate-800/25 border border-slate-700/25 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Genta Meditatif</h4>
                <p className="text-4xs text-slate-400">Denting harmonik perunggu beresonansi panjang</p>
              </div>
            </div>
            <span className="text-2xs font-extrabold text-purple-400 w-8 text-right">
              {Math.round(bowlVol * 100)}%
            </span>
          </div>

          {/* Bowl Variants */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {[
              { id: 'slendro', label: 'Genta Laras Slendro', desc: 'Harmonik perunggu gamelan' },
              { id: 'singing_bowl', label: 'Mangkuk Tibet', desc: 'Singing bowl dalam' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => handleSwitchBowl(v.id as BowlVariant)}
                className={`py-1.5 px-2 rounded-xl text-center transition border ${
                  bowlVariant === v.id
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-200 font-bold'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 text-3xs'
                }`}
              >
                <div className="text-3xs leading-none">{v.label}</div>
                <div className="text-5xs text-slate-500 mt-0.5 leading-none">{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Bowl Slider */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bowlVol}
              onChange={(e) => {
                setBowlVol(parseFloat(e.target.value));
                setActivePreset('custom');
              }}
              className="flex-grow accent-purple-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action Controls (Timer Selectors & Master Play Button) */}
        <div className="flex items-center justify-between gap-3 pt-2">
          
          {/* Sleep Timers */}
          <div className="flex gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shrink-0">
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleTimerSelect(mins)}
                className={`px-3 py-2 rounded-xl text-3xs font-extrabold transition ${
                  timerMinutes === mins
                    ? 'bg-slate-800 text-jiwo-primary border border-slate-700/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mins}m
              </button>
            ))}
            {timerMinutes !== null && (
              <button
                onClick={() => handleTimerSelect(null)}
                className="px-2.5 py-2 rounded-xl text-3xs font-extrabold text-jiwo-stress hover:text-jiwo-stress/80 transition"
              >
                Batal
              </button>
            )}
          </div>

          {/* Large Master Play Button */}
          <button
            onClick={handlePlayPause}
            className="flex-grow flex items-center justify-center gap-2 bg-gradient-to-r from-jiwo-primary via-jiwo-blueCalm to-jiwo-primary text-slate-100 font-extrabold py-3.5 px-6 rounded-2xl shadow-md hover:brightness-110 active:scale-98 transition duration-200"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span className="text-sm">Hentikan Suara</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span className="text-sm">Mulai Dengarkan</span>
              </>
            )}
          </button>
        </div>

        {/* Safety & Earphone Advice */}
        <p className="text-5xs text-center text-slate-500 leading-normal flex items-center justify-center gap-1.5 pb-2">
          <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Gunakan earphone untuk efek spasial 3D alami. Bebas kuota internet (sintesis lokal luring).</span>
        </p>

      </div>

    </div>
  );
}
