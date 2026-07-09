import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import { setSceneMood, type SceneMood } from '@/lib/sceneMood';
import JiwoMascot from '@/components/JiwoMascot';
import MoodIcon, { type MoodKey } from '@/components/MoodIcon';
import { Heart, Sparkles, CheckCircle } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('idle');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, [navigate]);

  const moods = [
    { label: 'Tenang', key: 'tenang' as MoodKey, state: 'calm' },
    { label: 'Senang', key: 'senang' as MoodKey, state: 'happy' },
    { label: 'Cemas', key: 'cemas' as MoodKey, state: 'stress' },
    { label: 'Sedih', key: 'sedih' as MoodKey, state: 'sad' },
    { label: 'Lelah', key: 'lelah' as MoodKey, state: 'sleep' }
  ];

  const moodRowRef = useRef<HTMLDivElement>(null);

  const handleMoodSelect = async (mood: typeof moods[0]) => {
    if (!profile) return;
    setSelectedMood(mood.key);
    setMascotState(mood.state as any);
    // Tint the ambient 3D scene toward the chosen mood
    setSceneMood(mood.state as SceneMood);

    // Celebratory pop on the chosen emoji, gentle dim on the rest
    const row = moodRowRef.current;
    if (row && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const buttons = Array.from(row.querySelectorAll('button'));
      const chosen = buttons.find((b) => b.dataset.mood === mood.key);
      if (chosen) {
        gsap.fromTo(
          chosen,
          { scale: 0.7, rotation: -8 },
          { scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }
        );
        gsap.to(buttons.filter((b) => b !== chosen), {
          opacity: 0.45,
          scale: 0.92,
          duration: 0.3,
          ease: 'power2.out',
        });
        gsap.to(buttons, { opacity: 1, scale: 1, duration: 0.5, delay: 3.6, ease: 'power2.out' });
      }
    }

    try {
      const { error } = await supabase
        .from('mood_checkins')
        .insert({
          user_id: profile.id,
          mood: mood.key,
          anxiety_level: mood.key === 'cemas' ? 4 : mood.key === 'tenang' ? 1 : 2,
          note: `Mood check-in dari Beranda: ${mood.label}`
        });

      if (error) throw error;
      setMoodSaved(true);
      
      // Keep "happy" or other mood state for 4s, then fallback to idle
      setTimeout(() => {
        setMascotState('idle');
        setMoodSaved(false);
        setSceneMood('idle');
      }, 4000);
    } catch (err) {
      console.error('Error saving mood:', err);
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Selamat pagi';
    if (hrs < 17) return 'Selamat siang';
    return 'Selamat malam';
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-170px)] text-center py-4">
      
      {/* Greetings */}
      <div className="space-y-1" data-animate>
        <h2 className="text-jiwo-textMuted text-sm font-semibold tracking-wide uppercase">
          {getGreeting()}
        </h2>
        <h1 className="text-3xl font-extrabold text-jiwo-textDark tracking-tight font-sans">
          Hai, {profile?.nama || 'Sahabat'}
        </h1>
        <p className="text-sm text-jiwo-textMuted max-w-xs mx-auto">
          Bagaimana kabar hatimu saat ini?
        </p>
      </div>

      {/* Mascot Container */}
      <div className="my-6 relative flex flex-col items-center" data-animate>
        <JiwoMascot state={mascotState} scale={1.05} />
        {moodSaved && (
          <div className="absolute -top-6 bg-jiwo-sageLight text-jiwo-textDark border border-jiwo-sage/30 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-3.5 h-3.5 text-jiwo-sage" /> Mood tercatat!
          </div>
        )}
      </div>

      {/* Mood Checkin Emojis */}
      <div className="w-full max-w-sm space-y-3" data-animate>
        <div ref={moodRowRef} className="flex justify-between px-2">
          {moods.map((m) => (
            <button
              key={m.key}
              data-mood={m.key}
              onClick={() => handleMoodSelect(m)}
              disabled={moodSaved}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition duration-150 transform hover:scale-110 ${
                selectedMood === m.key && moodSaved 
                  ? 'bg-jiwo-primaryLight/40' 
                  : 'hover:bg-jiwo-bg'
              }`}
            >
              <MoodIcon
                mood={m.key}
                size={24}
                tile
                active={selectedMood === m.key && moodSaved}
              />
              <span className="text-2xs font-semibold text-jiwo-textMuted">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Call to action (Rescue Button) */}
      <div className="w-full max-w-sm pt-4" data-animate>
        <Link
          to="/rescue"
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm hover:from-jiwo-primary/95 hover:to-jiwo-blueCalm/95 text-white font-bold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition duration-200"
        >
          <Heart className="w-5 h-5 fill-white animate-pulse" />
          <span>Sesi Pertolongan (Rescue)</span>
        </Link>
        <p className="text-3xs text-jiwo-textMuted mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-jiwo-primary" /> Latihan napas & grounding luring
        </p>
      </div>

    </div>
  );
}
