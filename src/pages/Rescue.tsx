import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { setSceneMood } from '@/lib/sceneMood';
import { speak, stopSpeaking, preloadTts } from '@/lib/tts';
import JiwoMascot from '@/components/JiwoMascot';
import BreathingJiwo from '@/components/BreathingJiwo';
import { ArrowRight, RefreshCw, Sparkles, BookOpen, Volume2, VolumeX } from 'lucide-react';

// Lazy-loaded so three.js stays out of the critical bundle
const CalmScene = lazy(() => import('@/components/three/CalmScene'));

type RescueStep = 'intro' | 'breathing' | 'grounding' | 'affirmation' | 'complete';
type BreathingPhase = 'inhale' | 'hold' | 'exhale';

// Prompts ringkas pernapasan
const BREATH_PROMPTS = {
  inhaleInitial: 'Tarik napas perlahan...',
  exhale: 'Hembuskan perlahan...',
  inhaleNext: 'Tarik napas kembali...',
};

// Prompts grounding 5-4-3-2-1
const GROUNDING_PROMPTS: Record<number, string> = {
  5: 'Sekarang mari kita lakukan teknik grounding 5 4 3 2 1. 5 Benda yang Dapat Dilihat. Lihatlah sekelilingmu dan sebutkan 5 benda yang kamu lihat saat ini. Perhatikan detail warnanya.',
  4: '4 Hal yang Dapat Disentuh. Sentuhlah 4 benda di sekitarmu. Rasakan teksturnya.',
  3: '3 Suara yang Dapat Didengar. Pejamkan mata sejenak, dengarkan lingkunganmu. Sebutkan 3 suara berbeda.',
  2: '2 Hal yang Dapat Dicium. Tarik napas dalam-dalam. Sebutkan 2 aroma yang bisa kamu cium.',
  1: '1 Hal yang Dapat Dirasakan. Sebutkan 1 rasa di dalam mulutmu saat ini, atau bayangkan rasa buah segar yang manis.',
};

// Daftar Afirmasi Penenang
const AFFIRMATIONS = [
  "Semua kecemasan ini adalah ombak yang akan berlalu. Aku aman di sini.",
  "Aku sedang bernapas dengan tenang. Detak jantungku melambat secara alami.",
  "Aku tidak didefinisikan oleh pikiran cemasku. Aku kuat dan mampu menghadapinya.",
  "Tubuhku rileks, pikiranku tenang, dan segalanya akan baik-baik saja.",
  "Aku hadir sepenuhnya di momen ini. Aku terlindungi."
];

// Prompt Selesai
const COMPLETE_PROMPT = 'Hebat sekali! Kamu berhasil menyelesaikan sesi pertolongan ini. Jiwo bangga padamu.';

export default function Rescue() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RescueStep>('intro');
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('stress');
  const [user, setUser] = useState<any>(null);

  // Breathing States
  const [breathePhase, setBreathePhase] = useState<BreathingPhase>('inhale');
  const [breatheSeconds, setBreatheSeconds] = useState(5);
  const [breatheRound, setBreatheRound] = useState(1);
  const maxRounds = 3;

  // Audio & TTS Playback States
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const speakPrompt = (text: string) => {
    if (isMutedRef.current || !text) return;
    speak(text);
  };

  // Pre-load seluruh audio (Pernapasan, Grounding, Afirmasi, dan Completion) di awal agar 100% bebas delay (0ms)
  useEffect(() => {
    preloadTts([
      // 1. Pernapasan
      BREATH_PROMPTS.inhaleInitial,
      BREATH_PROMPTS.exhale,
      BREATH_PROMPTS.inhaleNext,
      // 2. Grounding 5-4-3-2-1
      ...Object.values(GROUNDING_PROMPTS),
      // 3. Afirmasi Penenang
      ...AFFIRMATIONS.map((aff) => `Resapi dan ulangi afirmasi ini di dalam hatimu: ${aff}`),
      ...AFFIRMATIONS,
      // 4. Completion
      COMPLETE_PROMPT,
    ]);

    return () => {
      stopSpeaking();
    };
  }, []);

  // Tint the ambient 3D scene to follow the session's emotional arc
  useEffect(() => {
    setSceneMood(step === 'complete' ? 'happy' : step === 'intro' ? 'idle' : 'calm');
    return () => setSceneMood('idle');
  }, [step]);

  // Grounding States
  const [groundingIndex, setGroundingIndex] = useState(5); // Starts at 5, goes down to 1
  const groundingTexts = {
    5: { title: '5 Benda yang Dapat Dilihat', desc: 'Lihatlah sekelilingmu dan sebutkan 5 benda yang kamu lihat saat ini. Perhatikan detail warnanya.' },
    4: { title: '4 Hal yang Dapat Disentuh', desc: 'Sentuhlah 4 benda di sekitarmu. Rasakan teksturnya.' },
    3: { title: '3 Suara yang Dapat Didengar', desc: 'Pejamkan mata sejenak, dengarkan lingkunganmu. Sebutkan 3 suara berbeda.' },
    2: { title: '2 Hal yang Dapat Dicium', desc: 'Tarik napas dalam-dalam. Sebutkan 2 aroma yang bisa kamu cium.' },
    1: { title: '1 Hal yang Dapat Dirasakan', desc: 'Sebutkan 1 rasa di dalam mulutmu saat ini, atau bayangkan rasa buah segar yang manis.' }
  };

  // Affirmation States
  const [selectedAffirmation, setSelectedAffirmation] = useState('');
  const [selectedAffirmationIndex, setSelectedAffirmationIndex] = useState(-1);
  const isFirstAffirmation = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });
    // Pick random affirmation
    const randomIndex = Math.floor(Math.random() * AFFIRMATIONS.length);
    setSelectedAffirmationIndex(randomIndex);
    setSelectedAffirmation(AFFIRMATIONS[randomIndex]);
  }, []);

  // Breathing Timer Loop (Coherent Breathing 5-0-5)
  useEffect(() => {
    if (step !== 'breathing') return;

    const timer = setTimeout(() => {
      if (breatheSeconds > 1) {
        setBreatheSeconds(breatheSeconds - 1);
      } else {
        // Transition phase (Inhale <-> Exhale)
        if (breathePhase === 'inhale') {
          setBreathePhase('exhale');
          setBreatheSeconds(5);
          speakPrompt(BREATH_PROMPTS.exhale);
        } else if (breathePhase === 'exhale') {
          if (breatheRound >= maxRounds) {
            setStep('grounding');
          } else {
            setBreathePhase('inhale');
            setBreatheSeconds(5);
            setBreatheRound((r) => r + 1);
            speakPrompt(BREATH_PROMPTS.inhaleNext);
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, breatheSeconds, breathePhase, breatheRound]);

  // Grounding Audio TTS Controller
  useEffect(() => {
    if (step === 'grounding') {
      const prompt = GROUNDING_PROMPTS[groundingIndex];
      if (prompt) {
        speakPrompt(prompt);
      }
    }
  }, [step, groundingIndex]);

  // Affirmation Audio TTS Controller
  useEffect(() => {
    if (step !== 'affirmation') {
      isFirstAffirmation.current = true;
      return;
    }

    if (selectedAffirmationIndex !== -1 && selectedAffirmation) {
      if (isFirstAffirmation.current) {
        isFirstAffirmation.current = false;
        speakPrompt(`Resapi dan ulangi afirmasi ini di dalam hatimu: ${selectedAffirmation}`);
      } else {
        speakPrompt(selectedAffirmation);
      }
    }
  }, [step, selectedAffirmationIndex, selectedAffirmation]);

  // Complete Audio TTS Controller
  useEffect(() => {
    if (step === 'complete') {
      speakPrompt(COMPLETE_PROMPT);
    }
  }, [step]);

  const handleStart = () => {
    setBreathePhase('inhale');
    setBreatheSeconds(5);
    setBreatheRound(1);
    setStep('breathing');
    setMascotState('calm');
    speakPrompt(BREATH_PROMPTS.inhaleInitial);
  };

  const handleGroundingNext = () => {
    if (groundingIndex > 1) {
      setGroundingIndex(groundingIndex - 1);
    } else {
      setStep('affirmation');
    }
  };

  const handleComplete = async () => {
    setStep('complete');
    setMascotState('happy');

    // Save session in database
    if (user) {
      try {
        await supabase
          .from('rescue_sessions')
          .insert({
            user_id: user.id,
            completed: true,
            duration_sec: 180
          });
      } catch (err) {
        console.error('Error saving rescue session:', err);
      }
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-between min-h-[calc(100vh-170px)] py-2 select-none max-w-md mx-auto px-5">
      {/* Ambient Three.js aurora + particle scene */}
      <Suspense fallback={null}>
        <CalmScene />
      </Suspense>

      {/* Floating Sound Toggle */}
      <div className="absolute top-2 right-5 z-20">
        <button
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            if (nextMuted) {
              stopSpeaking();
            } else {
              // Speak current step text as confirmation
              if (step === 'breathing') {
                speakPrompt(breathePhase === 'inhale' ? BREATH_PROMPTS.inhaleNext : BREATH_PROMPTS.exhale);
              } else if (step === 'grounding') {
                const prompt = GROUNDING_PROMPTS[groundingIndex];
                if (prompt) speakPrompt(prompt);
              } else if (step === 'affirmation' && selectedAffirmation) {
                speakPrompt(selectedAffirmation);
              }
            }
          }}
          className="p-2.5 rounded-full bg-white/80 backdrop-blur-xs border border-jiwo-primaryLight/35 text-jiwo-primary hover:bg-white transition shadow-3xs"
          title={isMuted ? "Aktifkan Suara" : "Matikan Suara"}
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Step Screen renders */}

      {step === 'intro' && (
        <div className="flex-grow flex flex-col items-center justify-between w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-jiwo-textDark font-sans">
              Mari Tarik Napas Sejenak
            </h1>
            <p className="text-sm text-jiwo-textMuted max-w-xs mx-auto">
              Jiwo di sini untuk menemanimu. Kita akan melakukan sesi pernapasan diikuti dengan teknik grounding.
            </p>
          </div>

          <div className="relative my-2">
            <JiwoMascot state={mascotState} scale={1.05} />
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleStart}
              className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-4 rounded-2xl shadow transition"
            >
              Mulai Sesi Tenang
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full text-sm font-semibold text-jiwo-textMuted hover:text-jiwo-textDark py-2"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      )}

      {step === 'breathing' && (
        <div className="flex-grow flex flex-col items-center justify-between w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-jiwo-primary uppercase tracking-wider bg-jiwo-primaryLight/40 px-3 py-1 rounded-full">
              Putaran {breatheRound} dari {maxRounds}
            </span>
            <h2 className="text-xl font-bold text-jiwo-textMuted">Latihan Napas Seimbang</h2>
          </div>

          <div className="flex flex-col items-center space-y-2">
            {/* Jiwo breathes with you: swells on inhale, holds, deflates on exhale */}
            <BreathingJiwo phase={breathePhase} />
            <div className="h-10 flex items-center justify-center">
              <span className="text-2xl font-black text-jiwo-primary tracking-wide uppercase transition-all duration-300">
                {breathePhase === 'inhale' && 'Tarik Napas...'}
                {breathePhase === 'exhale' && 'Hembuskan...'}
              </span>
            </div>
          </div>

          <div className="w-full bg-jiwo-blueLight/50 p-4 rounded-2xl border border-jiwo-primaryLight/20 text-center">
            <p className="text-xs font-medium text-jiwo-textMuted leading-relaxed">
              Ikuti detak napas Jiwo. Tarik napas saat lingkaran membesar, dan hembuskan perlahan saat lingkaran mengecil.
            </p>
          </div>
        </div>
      )}

      {step === 'grounding' && (
        <div className="flex-grow flex flex-col items-center justify-between w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-jiwo-primary uppercase tracking-wider bg-jiwo-primaryLight/40 px-3 py-1 rounded-full">
              Metode Grounding 5-4-3-2-1
            </span>
            <h2 className="text-xl font-bold text-jiwo-textDark font-sans">Meredakan Overthinking</h2>
          </div>

          <div className="flex flex-col items-center space-y-4 my-2">
            {/* Mascot remains calm */}
            <JiwoMascot state="calm" scale={1} />
            
            <div className="text-center space-y-2 max-w-sm px-2">
              <span className="text-4xl font-extrabold text-jiwo-primary">{groundingIndex}</span>
              <h3 className="text-lg font-bold text-jiwo-textDark">{groundingTexts[groundingIndex as keyof typeof groundingTexts].title}</h3>
              <p className="text-sm text-jiwo-textMuted leading-relaxed">
                {groundingTexts[groundingIndex as keyof typeof groundingTexts].desc}
              </p>
            </div>
          </div>

          <button
            onClick={handleGroundingNext}
            className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-4 rounded-2xl shadow transition flex items-center justify-center gap-2"
          >
            <span>{groundingIndex > 1 ? 'Sudah, Lanjutkan' : 'Selesai Grounding'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {step === 'affirmation' && (
        <div className="flex-grow flex flex-col items-center justify-between w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-jiwo-primary uppercase tracking-wider bg-jiwo-primaryLight/40 px-3 py-1 rounded-full">
              Afirmasi Penenang
            </span>
            <h2 className="text-xl font-bold text-jiwo-textDark font-sans">Ucapkan dalam Hati</h2>
          </div>

          <div className="flex flex-col items-center space-y-6 my-2">
            <JiwoMascot state="calm" scale={1.035} />
            <div className="p-6 rounded-3xl bg-jiwo-blueLight/30 border border-jiwo-primaryLight/40 text-center max-w-sm">
              <p className="text-lg font-bold italic text-jiwo-primary leading-relaxed">
                "{selectedAffirmation}"
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => {
                const randomIndex = Math.floor(Math.random() * AFFIRMATIONS.length);
                setSelectedAffirmationIndex(randomIndex);
                setSelectedAffirmation(AFFIRMATIONS[randomIndex]);
              }}
              className="w-full bg-jiwo-bg hover:bg-jiwo-primaryLight/30 text-jiwo-primary font-bold py-3.5 rounded-2xl border border-jiwo-primaryLight/50 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Ganti Afirmasi
            </button>

            <button
              onClick={handleComplete}
              className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-4 rounded-2xl shadow transition"
            >
              Akhiri Sesi Tenang
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="flex-grow flex flex-col items-center justify-between w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="flex justify-center text-jiwo-happy mb-2">
              <Sparkles className="w-12 h-12 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-jiwo-textDark font-sans">
              Kamu Berhasil!
            </h1>
            <p className="text-sm text-jiwo-textMuted max-w-xs mx-auto">
              Bagaimana perasaanmu sekarang? Jiwo bangga kamu berhasil melaluinya.
            </p>
          </div>

          <div className="relative">
            <JiwoMascot state="happy" scale={1.05} />
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => navigate('/journal')}
              className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-4 rounded-2xl shadow transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" /> Tulis Refleksi di Jurnal
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-jiwo-bg hover:bg-jiwo-primaryLight/30 text-jiwo-primary font-bold py-3.5 rounded-2xl border border-jiwo-primaryLight/50 transition"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
