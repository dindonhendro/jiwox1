import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { setSceneMood } from '@/lib/sceneMood';
import JiwoMascot from '@/components/JiwoMascot';
import BreathingJiwo from '@/components/BreathingJiwo';
import { ArrowRight, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

// Lazy-loaded so three.js stays out of the critical bundle
const CalmScene = lazy(() => import('@/components/three/CalmScene'));

type RescueStep = 'intro' | 'breathing' | 'grounding' | 'affirmation' | 'complete';
type BreathingPhase = 'inhale' | 'hold' | 'exhale';

export default function Rescue() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RescueStep>('intro');
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('stress');
  const [user, setUser] = useState<any>(null);

  // Breathing States
  const [breathePhase, setBreathePhase] = useState<BreathingPhase>('inhale');
  const [breatheSeconds, setBreatheSeconds] = useState(4);
  const [breatheRound, setBreatheRound] = useState(1);
  const maxRounds = 3;
  const breatheTimer = useRef<any>(null);

  // Tint the ambient 3D scene to follow the session's emotional arc
  useEffect(() => {
    setSceneMood(step === 'complete' ? 'happy' : step === 'intro' ? 'idle' : 'calm');
    return () => setSceneMood('idle');
  }, [step]);

  // Grounding States
  const [groundingIndex, setGroundingIndex] = useState(5); // Starts at 5, goes down to 1
  const groundingTexts = {
    5: { title: '5 Benda yang Dapat Dilihat', desc: 'Lihatlah sekelilingmu dan sebutkan 5 benda yang kamu lihat saat ini. Perhatikan detail warnanya.' },
    4: { title: '4 Hal yang Dapat Disentuh', desc: 'Sentuhlah 4 benda di sekitarmu. Rasakan teksturnya (baju, meja, lantai, kulitmu sendiri).' },
    3: { title: '3 Suara yang Dapat Didengar', desc: 'Pejamkan mata sejenak, dengarkan lingkunganmu. Sebutkan 3 suara berbeda (kipas, angin, lalu lintas).' },
    2: { title: '2 Hal yang Dapat Dicium', desc: 'Tarik napas dalam-dalam. Sebutkan 2 aroma yang bisa kamu cium (parfum, kopi, buku, udara segar).' },
    1: { title: '1 Hal yang Dapat Dirasakan', desc: 'Sebutkan 1 rasa di dalam mulutmu saat ini, atau bayangkan rasa buah segar yang manis.' }
  };

  // Affirmation States
  const affirmations = [
    "Semua kecemasan ini adalah ombak yang akan berlalu. Aku aman di sini.",
    "Aku sedang bernapas dengan tenang. Detak jantungku melambat secara alami.",
    "Aku tidak didefinisikan oleh pikiran cemasku. Aku kuat dan mampu menghadapinya.",
    "Tubuhku rileks, pikiranku tenang, dan segalanya akan baik-baik saja.",
    "Aku hadir sepenuhnya di momen ini. Aku terlindungi."
  ];
  const [selectedAffirmation, setSelectedAffirmation] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });
    // Pick random affirmation
    setSelectedAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)]);
  }, []);

  // Breathing Loop Controller
  useEffect(() => {
    if (step !== 'breathing') {
      if (breatheTimer.current) clearInterval(breatheTimer.current);
      return;
    }

    setMascotState('calm');
    setBreathePhase('inhale');
    setBreatheSeconds(4);

    breatheTimer.current = setInterval(() => {
      setBreatheSeconds((prevSec) => {
        if (prevSec > 1) {
          return prevSec - 1;
        } else {
          // Transition phase
          setBreathePhase((prevPhase) => {
            if (prevPhase === 'inhale') {
              setBreatheSeconds(2);
              return 'hold';
            } else if (prevPhase === 'hold') {
              setBreatheSeconds(6);
              return 'exhale';
            } else {
              // End of round
              setBreatheRound((prevRound) => {
                if (prevRound >= maxRounds) {
                  // Stop breathing session
                  clearInterval(breatheTimer.current);
                  setTimeout(() => setStep('grounding'), 500);
                  return prevRound;
                }
                // Next round
                setBreatheSeconds(4);
                return prevRound + 1;
              });
              return 'inhale';
            }
          });
          return 0;
        }
      });
    }, 1000);

    return () => {
      if (breatheTimer.current) clearInterval(breatheTimer.current);
    };
  }, [step]);

  const handleStart = () => {
    setStep('breathing');
    setMascotState('calm');
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
            duration_sec: 180 // Estimated duration: breathing (~40s) + grounding (~100s) + affirmations (~40s)
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

          <div className="relative">
            <JiwoMascot state={mascotState} scale={1} />
          </div>

          <div className="w-full space-y-4">
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
                {breathePhase === 'hold' && 'Tahan...'}
                {breathePhase === 'exhale' && 'Hembuskan...'}
              </span>
            </div>
            <span className="text-5xl font-black text-jiwo-textDark animate-pulse">{breatheSeconds}</span>
          </div>

          <div className="w-full bg-jiwo-blueLight/50 p-4 rounded-2xl border border-jiwo-primaryLight/20 text-center">
            <p className="text-xs font-medium text-jiwo-textMuted leading-relaxed">
              Ikuti detak napas Jiwo. Mascot akan membesar saat menarik napas, diam saat menahan, dan mengecil saat mengembuskan napas.
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
              onClick={() => setSelectedAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)])}
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
