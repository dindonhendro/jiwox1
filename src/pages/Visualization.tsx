import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { setSceneMood } from '@/lib/sceneMood';
import { speak, stopSpeaking, ttsSupported } from '@/lib/tts';
import JiwoMascot from '@/components/JiwoMascot';
import JiwoFilm from '@/components/JiwoFilm';
import SafePlaceScene from '@/components/SafePlaceScene';
import SessionCard from '@/components/SessionCard';
import { GUIDED_SESSIONS, type GuidedSession } from '@/data/guidedSessions';
import { Eye, Wind, ChevronRight, Compass, Send, Volume2, VolumeX } from 'lucide-react';

export default function Visualization() {
  const [activeMode, setActiveMode] = useState<'safe_place' | 'release'>('safe_place');
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('idle');
  const guideMascotRef = useRef<HTMLDivElement>(null);
  const promptCardRef = useRef<HTMLDivElement>(null);
  const releaseMascotRef = useRef<HTMLDivElement>(null);

  // The ambient 3D scene follows the mascot's emotional state
  useEffect(() => {
    setSceneMood(mascotState === 'happy' ? 'happy' : mascotState === 'calm' ? 'calm' : 'idle');
    return () => setSceneMood('idle');
  }, [mascotState]);

  // --- SAFE PLACE STATE ---
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  // --- GUIDED SESSION CARDS ---
  const [activeSession, setActiveSession] = useState<GuidedSession | null>(null);
  const [sessionStep, setSessionStep] = useState(0);

  // --- TEXT-TO-SPEECH (free, browser-native Web Speech API) ---
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

  // Never keep talking after the user leaves the page
  useEffect(() => () => stopSpeaking(), []);

  const openSession = (s: GuidedSession) => {
    setActiveSession(s);
    setSessionStep(0);
    setMascotState(s.mascot as typeof mascotState);
  };

  const closeSession = (finished: boolean) => {
    setActiveSession(null);
    setSessionStep(0);
    setMascotState(finished ? 'happy' : 'idle');
  };

  // On each guided step Jiwo drifts to a new spot like it's leading the way,
  // and the prompt text floats in — the mascot feels like a companion, not a decal.
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

  const places = [
    {
      title: 'Pantai',
      theme: 'beach' as const,
      desc: 'Bayangkan pasir putih hangat di bawah telapak kakimu, deburan ombak berirama teratur, dan matahari pagi menyinari pundakmu.',
      prompts: [
        'Duduklah dengan santai dan tutup matamu perlahan...',
        'Bayangkan kamu berdiri di tepi pantai saat matahari terbit. Langit berwarna jingga lembut dan merah muda.',
        'Rasakan kehangatan pasir laut di telapak kakimu. Pasir itu menopang langkahmu dengan aman.',
        'Dengarkan suara ombak. Tarik napas saat ombak mendekat... Hembuskan saat ombak surut...',
        'Rasakan embusan angin laut yang menyapu pipimu secara lembut, membawa pergi sisa kecemasanmu.',
        'Kamu berada di tempat yang aman. Tarik napas dalam-dalam, rasakan kedamaian mengalir ke seluruh tubuhmu.'
      ]
    },
    {
      title: 'Hutan',
      theme: 'forest' as const,
      desc: 'Bayangkan aroma tanah basah segar setelah hujan, gemercik air sungai kecil, dan rindang daun hijau membentengi pikiranmu.',
      prompts: [
        'Duduklah tegak namun santai, biarkan otot-otot tubuhmu lemas...',
        'Bayangkan kamu sedang berjalan di setapak teduh di tengah hutan yang rindang. Udara terasa sangat sejuk dan segar.',
        'Hirup aroma petrichor (tanah basah setelah hujan) yang menenangkan. Tarik napas dalam... hembuskan...',
        'Dengarkan suara gemercik air sungai jernih di dekatmu dan kicauan burung yang saling bersahutan secara alami.',
        'Lihatlah pohon-pohon raksasa berdaun hijau lebat di sekelilingmu. Mereka ada di sini untuk melindungimu.',
        'Rasakan kekuatan dan ketenangan alam menyerap ke dalam jiwamu. Kamu rileks, aman, dan memegang kendali.'
      ]
    }
  ];

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

    // Wind puffs streaming from Jiwo toward the worry cloud
    const puffTimer = setInterval(() => {
      const puff = document.createElement('span');
      puff.textContent = '💨';
      puff.setAttribute('aria-hidden', 'true');
      puff.style.cssText =
        'position:absolute;left:60%;top:40%;font-size:20px;pointer-events:none;will-change:transform,opacity;';
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

    // Simulate blowing animation (5 seconds)
    // 0s to 3s: blowing wind
    // 3s: complete fade out, swap mascot state to happy
    // 5s: finish
    setTimeout(() => {
      setMascotState('happy');
      setBlowComplete(true);
    }, 4000);

    setTimeout(() => {
      setIsBlowing(false);
    }, 5500);
  };

  const resetRelease = () => {
    setAnxietyText('');
    setBlowComplete(false);
    setMascotState('idle');
  };

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-170px)] relative font-sans py-4">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full z-10 shrink-0">
        <div className="flex items-center gap-2">

          {/* Free browser-native TTS: Jiwo reads every guided prompt aloud */}
          {ttsSupported() && (
            <button
              onClick={toggleTts}
              aria-label={ttsOn ? 'Matikan suara panduan' : 'Nyalakan suara panduan'}
              title={ttsOn ? 'Suara panduan: nyala' : 'Suara panduan: mati'}
              className={`p-2.5 rounded-full border transition ${
                ttsOn
                  ? 'bg-jiwo-primary border-jiwo-primary text-white shadow-sm'
                  : 'bg-white border-jiwo-primaryLight/35 text-jiwo-textMuted hover:text-jiwo-primary'
              }`}
            >
              {ttsOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}
        </div>

        <div className="flex bg-white/70 p-1.5 rounded-2xl border border-jiwo-primaryLight/30 gap-1">
          <button
            onClick={() => {
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
      <div className="flex-grow flex flex-col items-center justify-center py-6 w-full max-w-md mx-auto relative z-10">

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
                  if (sessionStep === 0) closeSession(false);
                  else setSessionStep(sessionStep - 1);
                }}
                className="flex-1 py-3.5 rounded-2xl border border-jiwo-primaryLight/40 hover:bg-jiwo-bg text-xs font-bold text-jiwo-textMuted transition"
              >
                {sessionStep === 0 ? 'Kembali' : 'Sebelumnya'}
              </button>

              <button
                onClick={() => {
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
              {/* Cinematic auto-playing Jiwo film — watch him drift through empat emosi */}
              <JiwoFilm />

              <div className="text-center space-y-1.5 mb-2">
                <h2 className="text-xl font-extrabold text-jiwo-textDark font-sans">
                  Pilih Tempat Tenangmu
                </h2>
                <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
                  Imajinasikan pikiranmu berkelana ke sudut Nusantara yang damai untuk merilekskan sistem saraf tegang.
                </p>
              </div>

              {places.map((place, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedPlace(idx);
                    setGuideStep(0);
                    setMascotState('calm');
                  }}
                  className="w-full text-left bg-white border border-jiwo-primaryLight/20 hover:border-jiwo-primary/30 p-5 rounded-3xl transition duration-150 shadow-3xs flex justify-between items-center group"
                >
                  <div className="space-y-1 pr-4">
                    <h3 className="font-extrabold text-sm text-jiwo-textDark">{place.title}</h3>
                    <p className="text-2xs text-jiwo-textMuted leading-relaxed">{place.desc}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-jiwo-bg text-jiwo-textMuted group-hover:text-jiwo-primary flex items-center justify-center shrink-0 transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}

              {/* Guided session library — animated cards, Jiwo in every one */}
              <div className="pt-4 space-y-3">
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
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-jiwo-primary">
                {places[selectedPlace].title}
              </h2>

              {/* Animated diorama: Jiwo at the beach / in the forest */}
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
