import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { setSceneMood } from '@/lib/sceneMood';
import { speak, stopSpeaking, ttsSupported, preloadTts } from '@/lib/tts';
import JiwoMascot from '@/components/JiwoMascot';
import JiwoFilm from '@/components/JiwoFilm';
import SafePlaceScene, { type SafePlaceTheme } from '@/components/SafePlaceScene';
import SessionCard from '@/components/SessionCard';
import { GUIDED_SESSIONS, type GuidedSession } from '@/data/guidedSessions';
import { Eye, Wind, ChevronRight, Compass, Send, Volume2, VolumeX, Sparkles, Waves } from 'lucide-react';
import {
  createSoundscapeBuffers,
  createSubEngineTracker,
  clearSubEngine,
  setupRainEngine,
  setupWaveEngine,
  setupCommunityEngine,
  setupBowlEngine,
  type SoundscapeBuffers,
  type SubEngineTracker,
} from '@/lib/nusantaraSoundscape';

interface PlaceOption {
  title: string;
  theme: SafePlaceTheme;
  desc: string;
  prompts: string[];
}

export default function Visualization() {
  const [activeMode, setActiveMode] = useState<'safe_place' | 'release'>('safe_place');
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('idle');
  const guideMascotRef = useRef<HTMLDivElement>(null);
  const promptCardRef = useRef<HTMLDivElement>(null);
  const releaseMascotRef = useRef<HTMLDivElement>(null);

  // --- VISUALISASI TERPANDU NUSANTARA (SAFE PLACE RE-IMAGINED) ---
  const places: PlaceOption[] = [
    {
      title: 'Lembayung Senja Pantai Selatan',
      theme: 'pantai_selatan',
      desc: 'Deburan ombak megah Samudra Hindia, embun kabut laut lembut, dan langit senja lembayung keemasan yang melapangkan dada.',
      prompts: [
        'Duduklah dengan nyaman. Pejamkan matamu perlahan, dan biarkan seluruh tubuhmu rileks...',
        'Bayangkan kamu sedang berdiri di tepian Pantai Selatan saat matahari mulai terbenam. Langit di hadapanmu terbentang luas bergradasi jingga, merah muda, dan lembayung ungu yang hangat.',
        'Telapak kakimu menyentuh pasir pantai basah yang padat dan hangat. Udara laut bertiup lapang membawa aroma garam dan kebebasan.',
        'Dengarkan deburan ombak Samudra Hindia yang megah dan berirama teratur. Tarik napas perlahan saat ombak mendekat ke tepian... Hembuskan panjang saat buih putihnya surut kembali ke lautan luas...',
        'Setiap kali ombak surut, bayangkan ia membasuh dan membawa pergi sisa ketegangan, beban pikiran, dan rasa lelah yang menumpuk di pundakmu.',
        'Kamu aman di hadapan samudra yang luas ini. Jiwamu lapang, tenang, dan kembali menemukan kekuatannya.'
      ]
    },
    {
      title: 'Duduk di Teras Rumah Nenek',
      theme: 'teras_nenek',
      desc: 'Aroma tanah basah setelah disiram air, secangkir teh melati hangat, semilir angin sore, dan rasa aman tanpa tuntutan dunia luar.',
      prompts: [
        'Tarik napas dalam-dalam, lalu hembuskan perlahan. Lepaskan semua target dan ekspektasi yang membebani kepalamu...',
        'Bayangkan kamu sedang duduk santai di kursi rotan di teras rumah nenek saat sore hari yang teduh.',
        'Halaman tanah baru saja disiram air sejuk. Hirup aroma petrichor tanah basah bercampur harum bunga melati yang sangat menenangkan.',
        'Di mejamu ada secangkir teh melati hangat. Rasakan kehangatan cangkir itu di telapak tanganmu saat kamu menyeruputnya pelan-pelan...',
        'Dengarkan semilir angin sore menggoyangkan dedaunan pohon mangga. Di tempat ini, kamu tidak perlu terburu-buru. Kamu tidak perlu membuktikan apa pun kepada siapa pun.',
        'Kamu diterima seutuhnya. Kamu pulang ke ruang amanmu yang paling tulus dan penuh kasih.'
      ]
    },
    {
      title: 'Bonceng Motor Keliling Kota Malam',
      theme: 'bonceng_motor',
      desc: 'Angin malam sejuk menerpa jaket, lampu jalanan kuning keemasan berbaris temaram, dan kota yang perlahan tertidur melarutkan overthinking.',
      prompts: [
        'Sandarkan punggungmu, lemaskan bahu dan lehermu. Tarik napas sejuk perlahan...',
        'Bayangkan kamu sedang dibonceng motor dengan kecepatan santai menembus jalanan kota yang lengang di malam hari.',
        'Angin malam yang segar menerpa lembut wajah dan jaketmu, mendinginkan pikiran yang seharian tadi terlalu bising dan penuh.',
        'Lihatlah deretan lampu jalanan berwarna kuning keemasan yang tenang. Lampu-lampu itu meluncur perlahan ke belakang seperti jejak waktu yang telah berlalu.',
        'Setiap meter jalan yang kamu lewati, bayangkan pikiran-pikiran overthinking tertinggal di belakang dan larut dalam heningnya malam kota.',
        'Napasmu kini terasa ringan dan ritmis. Kamu bergerak maju dengan damai, menyerahkan sisa malam ini untuk beristirahat.'
      ]
    }
  ];

  // The ambient 3D scene follows the mascot's emotional state
  useEffect(() => {
    setSceneMood(mascotState === 'happy' ? 'happy' : mascotState === 'calm' ? 'calm' : 'idle');
    return () => setSceneMood('idle');
  }, [mascotState]);

  // Pre-load seluruh prompt Safe Place Nusantara saat halaman dimuat (0ms Latency)
  useEffect(() => {
    const allSafePrompts = places.flatMap((p) => p.prompts);
    preloadTts(allSafePrompts);

    return () => {
      stopSpeaking();
    };
  }, []);

  // --- SAFE PLACE STATE ---
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  // --- GUIDED SESSION CARDS ---
  const [activeSession, setActiveSession] = useState<GuidedSession | null>(null);
  const [sessionStep, setSessionStep] = useState(0);

  // Pre-load prompt sesi terpandu yang sedang dipilih
  useEffect(() => {
    if (activeSession) {
      preloadTts(activeSession.prompts);
    }
  }, [activeSession]);

  // --- TEXT-TO-SPEECH (Gemini TTS dengan Request ID Token Discard Guard & Cache) ---
  const [ttsOn, setTtsOn] = useState(() => localStorage.getItem('jiwo_tts') !== 'off');

  const toggleTts = () => {
    setTtsOn((prev) => {
      const next = !prev;
      localStorage.setItem('jiwo_tts', next ? 'on' : 'off');
      if (!next) stopSpeaking();
      return next;
    });
  };

  // Voice the current guided-session prompt whenever the step changes
  useEffect(() => {
    if (!activeSession || !ttsOn) return;
    speak(activeSession.prompts[sessionStep]);
    return () => stopSpeaking();
  }, [activeSession, sessionStep, ttsOn]);

  // Voice the Safe Place prompts too
  useEffect(() => {
    if (selectedPlace === null || !ttsOn) return;
    speak(places[selectedPlace].prompts[guideStep]);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace, guideStep, ttsOn]);

  // --- SOUNDSCAPE AMBIENT AUDIO ENGINE (Nusantara Procedural Audio) ---
  const [soundscapeOn, setSoundscapeOn] = useState(() => localStorage.getItem('jiwo_safe_soundscape') !== 'off');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<SoundscapeBuffers | null>(null);
  const rainTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const waveTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const commTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());
  const bowlTrackerRef = useRef<SubEngineTracker>(createSubEngineTracker());

  const toggleSoundscape = () => {
    setSoundscapeOn((prev) => {
      const next = !prev;
      localStorage.setItem('jiwo_safe_soundscape', next ? 'on' : 'off');
      return next;
    });
  };

  const getSafePlaceSoundscapeLabel = (theme: SafePlaceTheme) => {
    if (theme === 'pantai_selatan' || theme === 'beach') return 'Deburan Ombak Parangtritis';
    if (theme === 'teras_nenek') return 'Semilir Angin & Teras Sore';
    if (theme === 'bonceng_motor') return 'Deru Motor Santai & Angin Malam';
    return 'Resonansi Penenang';
  };

  const stopSoundscapeAudio = () => {
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
  };

  const startSoundscapeAudio = (theme: SafePlaceTheme) => {
    stopSoundscapeAudio();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 3.5;
    comp.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.35; // Gentle background level behind Gemini TTS narration
    masterGain.connect(comp);

    const buffers = createSoundscapeBuffers(ctx);
    buffers.reverb.connect(masterGain);
    buffersRef.current = buffers;

    if (theme === 'pantai_selatan' || theme === 'beach') {
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.55;
      waveGain.connect(masterGain);

      const bowlGain = ctx.createGain();
      bowlGain.gain.value = 0.18;
      bowlGain.connect(masterGain);

      setupWaveEngine(ctx, 'parangtritis', waveGain, buffers, waveTrackerRef.current);
      setupBowlEngine(ctx, 'slendro', bowlGain, buffers, bowlTrackerRef.current);
    } else if (theme === 'teras_nenek') {
      const commGain = ctx.createGain();
      commGain.gain.value = 0.45;
      commGain.connect(masterGain);

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.28;
      rainGain.connect(masterGain);

      setupCommunityEngine(ctx, 'teras_malam', commGain, buffers, commTrackerRef.current);
      setupRainEngine(ctx, 'sawah_ubud', rainGain, buffers, rainTrackerRef.current);
    } else if (theme === 'bonceng_motor') {
      const commGain = ctx.createGain();
      commGain.gain.value = 0.48;
      commGain.connect(masterGain);

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.22;
      rainGain.connect(masterGain);

      setupCommunityEngine(ctx, 'motor_jauh', commGain, buffers, commTrackerRef.current);
      setupRainEngine(ctx, 'jakarta_malam', rainGain, buffers, rainTrackerRef.current);
    } else {
      const bowlGain = ctx.createGain();
      bowlGain.gain.value = 0.35;
      bowlGain.connect(masterGain);
      setupBowlEngine(ctx, 'slendro', bowlGain, buffers, bowlTrackerRef.current);
    }
  };

  // Trigger Soundscape when Safe Place session is active
  useEffect(() => {
    if (selectedPlace !== null && soundscapeOn) {
      startSoundscapeAudio(places[selectedPlace].theme);
    } else {
      stopSoundscapeAudio();
    }

    return () => {
      stopSoundscapeAudio();
    };
  }, [selectedPlace, soundscapeOn]);

  // Never keep talking or playing sound after the user leaves the page
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopSoundscapeAudio();
    };
  }, []);

  const openSession = (s: GuidedSession) => {
    stopSpeaking();
    setActiveSession(s);
    setSessionStep(0);
    setMascotState(s.mascot as typeof mascotState);
  };

  const closeSession = (finished: boolean) => {
    stopSpeaking();
    setActiveSession(null);
    setSessionStep(0);
    setMascotState(finished ? 'happy' : 'idle');
  };

  // On each guided step Jiwo drifts to a new spot like it's leading the way
  useEffect(() => {
    if (selectedPlace === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tweens: gsap.core.Tween[] = [];
    if (guideMascotRef.current) {
      tweens.push(
        gsap.fromTo(
          guideMascotRef.current,
          { y: 10, opacity: 0.7 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' }
        )
      );
    }
    if (promptCardRef.current) {
      tweens.push(
        gsap.fromTo(
          promptCardRef.current,
          { opacity: 0, y: 16, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }
        )
      );
    }
    return () => tweens.forEach((t) => t.kill());
  }, [guideStep, selectedPlace]);

  // --- ANXIETY RELEASE STATE ---
  const [anxietyText, setAnxietyText] = useState('');
  const [isBlowing, setIsBlowing] = useState(false);
  const [blowComplete, setBlowComplete] = useState(false);

  // While blowing, Jiwo inhales deeply, leans in, and puffs the worry away
  useEffect(() => {
    const el = releaseMascotRef.current;
    if (!isBlowing || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline()
      .to(el, { scale: 1.14, y: -6, duration: 1.2, ease: 'sine.inOut' }) // deep inhale
      .to(el, { scale: 0.95, y: 0, rotation: 7, x: 12, duration: 1.6, ease: 'power2.out' }) // blow!
      .to(el, { scale: 1, rotation: 0, x: 0, duration: 1.6, ease: 'elastic.out(1, 0.5)' });

    const puffTimer = setInterval(() => {
      const puff = document.createElement('span');
      puff.innerText = '💨';
      puff.style.cssText = 'position:absolute;left:50%;top:40%;font-size:20px;pointer-events:none;will-change:transform,opacity;';
      el.appendChild(puff);
      gsap.fromTo(
        puff,
        { x: 0, y: 0, opacity: 0, scale: 0.5 },
        {
          x: gsap.utils.random(60, 130),
          y: gsap.utils.random(-50, -10),
          opacity: 1,
          scale: gsap.utils.random(0.9, 1.4),
          duration: 1.1,
          ease: 'power1.out',
          onComplete: () => {
            gsap.to(puff, { opacity: 0, duration: 0.4, onComplete: () => puff.remove() });
          },
        }
      );
    }, 300);
    const stopPuffs = setTimeout(() => clearInterval(puffTimer), 3500);

    return () => {
      tl.kill();
      clearInterval(puffTimer);
      clearTimeout(stopPuffs);
      gsap.set(el, { scale: 1, rotation: 0, x: 0, y: 0 });
    };
  }, [isBlowing]);

  const handleBlowAway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anxietyText.trim() || isBlowing) return;

    setIsBlowing(true);
    setMascotState('calm');

    if (ttsOn) {
      speak('Tarik napas panjang... dan mari kita hembuskan pikiran ini bersama-sama hingga sirnah.');
    }

    setTimeout(() => {
      setMascotState('happy');
      setBlowComplete(true);
    }, 4000);

    setTimeout(() => {
      setIsBlowing(false);
    }, 5500);
  };

  const resetRelease = () => {
    stopSpeaking();
    setAnxietyText('');
    setBlowComplete(false);
    setMascotState('idle');
  };

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-170px)] relative font-sans py-4">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full z-10 shrink-0">
        <div className="flex items-center gap-2">

          {/* Gemini TTS Speaker Toggle */}
          {ttsSupported() && (
            <button
              onClick={toggleTts}
              aria-label={ttsOn ? 'Matikan suara panduan narasi' : 'Nyalakan suara panduan narasi'}
              title={ttsOn ? 'Narasi suara: nyala' : 'Narasi suara: mati'}
              className={`p-2.5 rounded-full border transition ${
                ttsOn
                  ? 'bg-jiwo-primary border-jiwo-primary text-white shadow-sm'
                  : 'bg-white border-jiwo-primaryLight/35 text-jiwo-textMuted hover:text-jiwo-primary'
              }`}
            >
              {ttsOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}

          {/* Soundscape Ambient Audio Toggle */}
          <button
            onClick={toggleSoundscape}
            aria-label={soundscapeOn ? 'Matikan suara latar alam' : 'Nyalakan suara latar alam'}
            title={soundscapeOn ? 'Suara latar alam: nyala' : 'Suara latar alam: mati'}
            className={`p-2.5 rounded-full border transition ${
              soundscapeOn
                ? 'bg-jiwo-blueCalm border-jiwo-blueCalm text-white shadow-sm'
                : 'bg-white border-jiwo-primaryLight/35 text-jiwo-textMuted hover:text-jiwo-blueCalm'
            }`}
          >
            <Waves className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-white/70 p-1.5 rounded-2xl border border-jiwo-primaryLight/30 gap-1">
          <button
            onClick={() => {
              stopSpeaking();
              setActiveMode('safe_place');
              setSelectedPlace(null);
              setMascotState('idle');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-3xs font-extrabold uppercase tracking-wider transition ${
              activeMode === 'safe_place'
                ? 'bg-jiwo-primary text-white'
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Safe Place
          </button>
          <button
            onClick={() => {
              stopSpeaking();
              setActiveMode('release');
              resetRelease();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-3xs font-extrabold uppercase tracking-wider transition ${
              activeMode === 'release'
                ? 'bg-jiwo-primary text-white'
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <Wind className="w-3.5 h-3.5" /> Anxiety Release
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-center py-4 w-full max-w-md mx-auto relative z-10">

        {activeSession ? (
          // --- GUIDED SESSION PLAYER (from the session cards) ---
          <div className="w-full text-center space-y-6 animate-fade-in flex flex-col items-center">
            <div className="space-y-1.5">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-jiwo-primary bg-jiwo-primaryLight/40 px-3 py-1 rounded-full">
                {activeSession.category} · {activeSession.duration}
              </span>
              <h2 className="text-lg font-extrabold text-jiwo-textDark font-sans">
                {activeSession.title}
              </h2>
            </div>

            {/* Jiwo accompanies every session */}
            <div className="w-40 h-40 origin-bottom select-none">
              <JiwoMascot state={activeSession.mascot} scale={1.05} showAnimation={true} />
            </div>

            <div className="w-full bg-white/85 backdrop-blur border border-jiwo-primaryLight/25 p-6 rounded-3xl shadow-3xs min-h-[140px] flex items-center justify-center">
              <p key={sessionStep} className="text-sm font-semibold text-jiwo-textDark leading-relaxed animate-fade-in">
                {activeSession.prompts[sessionStep]}
              </p>
            </div>

            <div className="flex justify-center gap-1.5">
              {activeSession.prompts.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    i === sessionStep ? 'bg-jiwo-primary' : 'bg-jiwo-primaryLight/60'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => {
                  stopSpeaking();
                  if (sessionStep === 0) closeSession(false);
                  else setSessionStep(sessionStep - 1);
                }}
                className="flex-1 py-3.5 rounded-2xl border border-jiwo-primaryLight/40 hover:bg-jiwo-bg text-xs font-bold text-jiwo-textMuted transition"
              >
                {sessionStep === 0 ? 'Kembali' : 'Sebelumnya'}
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  if (sessionStep === activeSession.prompts.length - 1) closeSession(true);
                  else setSessionStep(sessionStep + 1);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-jiwo-primary hover:bg-jiwo-primary/95 text-xs font-bold text-white shadow-xs transition"
              >
                {sessionStep === activeSession.prompts.length - 1 ? 'Selesai & Lega' : 'Lanjutkan'}
              </button>
            </div>
          </div>
        ) : activeMode === 'safe_place' ? (
          // --- SAFE PLACE CONTENT ---
          selectedPlace === null ? (
            <div className="space-y-5 w-full animate-fade-in">

              {/* Header Ruang Aman Nusantara — ditempatkan paling atas agar langsung terlihat */}
              <div className="text-center space-y-1 mb-2">
                <div className="inline-flex items-center gap-1.5 bg-jiwo-primary/10 text-jiwo-primary px-3 py-1 rounded-full text-3xs font-extrabold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" /> Nuansa Otentik Nusantara
                </div>
                <h2 className="text-xl font-extrabold text-jiwo-textDark font-sans">
                  Pilih Ruang Aman Nusantaramu
                </h2>
                <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
                  Imajinasikan pikiranmu berkelana ke sudut Nusantara yang damai untuk merilekskan sistem saraf tegang.
                </p>
              </div>

              {/* 3 Kartu Ruang Aman Nusantara */}
              <div className="space-y-3">
                {places.map((place, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      stopSpeaking();
                      setSelectedPlace(idx);
                      setGuideStep(0);
                      setMascotState('calm');
                    }}
                    className="w-full text-left bg-white border border-jiwo-primaryLight/25 hover:border-jiwo-primary/50 p-4.5 rounded-3xl transition duration-150 shadow-3xs hover:shadow-2xs flex justify-between items-center group"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {place.theme === 'pantai_selatan' ? '🌅' : place.theme === 'teras_nenek' ? '🏡' : '🛵'}
                        </span>
                        <h3 className="font-extrabold text-sm text-jiwo-textDark group-hover:text-jiwo-primary transition">
                          {place.title}
                        </h3>
                      </div>
                      <p className="text-2xs text-jiwo-textMuted leading-relaxed">{place.desc}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-jiwo-bg text-jiwo-textMuted group-hover:text-jiwo-primary group-hover:bg-jiwo-primaryLight/30 flex items-center justify-center shrink-0 transition">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Cinematic auto-playing Jiwo film */}
              <div className="pt-2">
                <JiwoFilm />
              </div>

              {/* Guided session library */}
              <div className="pt-2 space-y-3">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-extrabold text-jiwo-textDark font-sans">
                    Sesi Terpandu Bersama Jiwo
                  </h3>
                  <p className="text-2xs text-jiwo-textMuted">
                    Pilih suasananya — Jiwo menemanimu di setiap sesi.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {GUIDED_SESSIONS.map((s) => (
                    <SessionCard key={s.id} session={s} onClick={() => openSession(s)} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Active Safe Place Guided Session
            <div className="w-full text-center space-y-6 animate-fade-in flex flex-col items-center">
              <div className="space-y-1">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-jiwo-primary bg-jiwo-primaryLight/40 px-3 py-1 rounded-full">
                  Langkah {guideStep + 1} dari {places[selectedPlace].prompts.length}
                </span>
                <h2 className="text-base font-extrabold text-jiwo-textDark font-sans mt-2">
                  {places[selectedPlace].title}
                </h2>
              </div>

              {/* Soundscape Ambiance Active Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/75 backdrop-blur border border-jiwo-primaryLight/35 text-3xs font-bold text-jiwo-textDark shadow-3xs select-none">
                <span className={`w-2 h-2 rounded-full ${soundscapeOn ? 'bg-jiwo-primary animate-pulse' : 'bg-slate-300'}`} />
                <span>{soundscapeOn ? `Suara Latar: ${getSafePlaceSoundscapeLabel(places[selectedPlace].theme)}` : 'Suara Latar Dimatikan'}</span>
                <button
                  onClick={toggleSoundscape}
                  title={soundscapeOn ? 'Matikan suara latar alam' : 'Nyalakan suara latar alam'}
                  className="ml-1 p-0.5 rounded text-jiwo-textMuted hover:text-jiwo-primary transition"
                >
                  {soundscapeOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Animated diorama: Pantai Selatan / Teras Nenek / Bonceng Motor */}
              <div ref={guideMascotRef} className="w-full flex justify-center select-none">
                <SafePlaceScene theme={places[selectedPlace].theme} />
              </div>

              {/* Slide text card */}
              <div
                ref={promptCardRef}
                className="w-full bg-white/85 backdrop-blur border border-jiwo-primaryLight/25 p-6 rounded-3xl shadow-3xs min-h-[140px] flex items-center justify-center"
              >
                <p className="text-sm font-semibold text-jiwo-textDark leading-relaxed">
                  {places[selectedPlace].prompts[guideStep]}
                </p>
              </div>

              {/* Slide Nav Buttons */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => {
                    stopSpeaking();
                    if (guideStep === 0) {
                      setSelectedPlace(null);
                      setMascotState('idle');
                    } else {
                      setGuideStep(guideStep - 1);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl border border-jiwo-primaryLight/40 hover:bg-jiwo-bg text-xs font-bold text-jiwo-textMuted transition"
                >
                  {guideStep === 0 ? 'Pilih Tempat Lain' : 'Sebelumnya'}
                </button>
                
                <button
                  onClick={() => {
                    stopSpeaking();
                    if (guideStep === places[selectedPlace].prompts.length - 1) {
                      setSelectedPlace(null);
                      setMascotState('happy');
                    } else {
                      setGuideStep(guideStep + 1);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-jiwo-primary hover:bg-jiwo-primary/95 text-xs font-bold text-white shadow-xs transition"
                >
                  {guideStep === places[selectedPlace].prompts.length - 1 ? 'Selesai & Lega' : 'Lanjutkan'}
                </button>
              </div>
            </div>
          )
        ) : (
          // --- ANXIETY RELEASE CONTENT ---
          <div className="w-full text-center space-y-6 animate-fade-in flex flex-col items-center">
            
            {/* Jiwo inhales and blows the worry away with you */}
            <div ref={releaseMascotRef} className="w-40 h-40 origin-bottom select-none relative">
              <JiwoMascot state={mascotState} scale={1.05} showAnimation={true} />
            </div>

            {!blowComplete ? (
              // In progress form
              <div className="w-full space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-jiwo-textDark">Hembuskan Kecemasanmu</h2>
                  <p className="text-2xs text-jiwo-textMuted max-w-xs mx-auto">
                    Tuliskan apa saja pikiran cemas atau hal yang membuatmu overthinking di bawah ini, lalu kita hembuskan bersama agar hilang memudar.
                  </p>
                </div>

                <form onSubmit={handleBlowAway} className="space-y-4">
                  <div className="relative">
                    {/* Visual worry cloud enclosing input */}
                    <div className={`p-4 rounded-3xl border border-dashed border-slate-300 bg-white transition-all duration-[4000ms] ${
                      isBlowing 
                        ? 'opacity-0 scale-50 -translate-y-24 rotate-12 blur-xs' 
                        : 'opacity-100 scale-100'
                    }`}>
                      <textarea
                        disabled={isBlowing}
                        value={anxietyText}
                        onChange={(e) => setAnxietyText(e.target.value)}
                        placeholder="Contoh: Aku takut ujian besok gagal / Aku merasa tidak cukup hebat..."
                        className="w-full h-24 p-1 focus:outline-none text-xs text-jiwo-textDark leading-relaxed resize-none bg-transparent"
                        required
                      />
                    </div>

                    {isBlowing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1.5 text-jiwo-primary animate-pulse">
                        <Wind className="w-8 h-8 animate-bounce" />
                        <span className="text-2xs font-bold uppercase tracking-wider">Hembuskan napas panjang...</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!anxietyText.trim() || isBlowing}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm hover:from-jiwo-primary/95 hover:to-jiwo-blueCalm/95 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xs transition disabled:opacity-40"
                  >
                    <Send className="w-4 h-4 fill-current" />
                    <span>Hembuskan Bersama Jiwo</span>
                  </button>
                </form>
              </div>
            ) : (
              // Blow complete relief screen
              <div className="w-full space-y-6 animate-fade-in">
                <div className="bg-jiwo-sageLight border border-jiwo-sage/20 p-6 rounded-3xl space-y-2 max-w-sm mx-auto">
                  <h3 className="font-extrabold text-sm text-jiwo-textDark">Pikiranmu Kini Lebih Lapang</h3>
                  <p className="text-xs text-jiwo-textMuted leading-relaxed">
                    Kecemasan itu telah ditiup pergi. Ingatlah bahwa pikiran cemas hanyalah awan sementara di langit jiwamu. Langitnya sendiri selalu bersih dan aman.
                  </p>
                </div>

                <button
                  onClick={resetRelease}
                  className="w-full max-w-xs py-3.5 rounded-2xl bg-jiwo-primary hover:bg-jiwo-primary/95 text-xs font-bold text-white shadow-xs transition"
                >
                  Lepaskan Pikiran Lain
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="w-full text-center shrink-0 pt-4 border-t border-jiwo-primaryLight/10">
        <p className="text-4xs text-jiwo-textMuted font-bold uppercase tracking-widest flex items-center justify-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Visualisasi Bayang Jiwo
        </p>
      </div>

    </div>
  );
}
