import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

// Lazy-loaded so three.js stays out of the critical bundle
const CalmScene = lazy(() => import('@/components/three/CalmScene'));

export default function Login() {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Entrance timeline: the card rises out of the aurora, children cascade in
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(
        card,
        { opacity: 0, y: 48, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8 }
      ).fromTo(
        card.querySelectorAll('[data-animate]'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, clearProps: 'transform' },
        '-=0.45'
      );
    }, card);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        if (!nama.trim()) {
          throw new Error('Nama panggilan harus diisi');
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nama: nama.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.user && data.session === null) {
          setErrorMsg('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.');
        } else if (data.session) {
          navigate('/onboarding');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Check if profile has onboarding complete (or baseline_assessment set)
        const { data: profile } = await supabase
          .from('profiles')
          .select('baseline_assessment')
          .single();

        if (profile?.baseline_assessment && Object.keys(profile.baseline_assessment).length > 0) {
          navigate('/');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Ambient Three.js aurora + particle scene */}
      <Suspense fallback={null}>
        <CalmScene />
      </Suspense>

      <div
        ref={cardRef}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/60 flex flex-col items-center relative z-10"
      >
        {/* Jiwo greets you at the door */}
        <div className="w-28 h-28 mb-3 relative" data-animate>
          <div className="absolute inset-2 rounded-full bg-jiwo-primaryLight/60 blur-xl" />
          <img
            src="/jiwo/happy.png"
            alt="Jiwo, teman jiwamu"
            draggable={false}
            className="relative w-full h-full object-contain animate-float-slow drop-shadow-md"
          />
        </div>

        <h1 className="text-3xl font-extrabold text-jiwo-textDark tracking-tight font-sans" data-animate>
          Jiwo.ai
        </h1>
        <p className="text-jiwo-textMuted text-sm text-center mt-1 mb-8" data-animate>
          Teman Jiwa yang Selalu Ada — Siap Peluk Saat Cemas
        </p>

        {errorMsg && (
          <div className={`w-full p-4 rounded-2xl flex items-start gap-2 mb-6 text-sm ${
            errorMsg.includes('berhasil') 
              ? 'bg-jiwo-sageLight text-jiwo-textDark border border-jiwo-sage/40' 
              : 'bg-jiwo-stress/10 text-jiwo-textDark border border-jiwo-stress/30'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5" data-animate>
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-jiwo-textDark ml-1">Nama Panggilan</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-jiwo-textMuted">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Siapa namamu?"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent bg-jiwo-bg/40 text-jiwo-textDark"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-jiwo-textDark ml-1">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-jiwo-textMuted">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                placeholder="alamat@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent bg-jiwo-bg/40 text-jiwo-textDark"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-jiwo-textDark ml-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-jiwo-textMuted">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 rounded-2xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent bg-jiwo-bg/40 text-jiwo-textDark"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-jiwo-textMuted hover:text-jiwo-primary"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-jiwo-primary hover:bg-jiwo-primary/90 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition duration-200 mt-4 disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : isSignUp ? 'Daftar Sekarang' : 'Masuk ke Jiwo.ai'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-2.5" data-animate>
          <a
            href="/welcome/index.html"
            className="inline-block text-xs font-bold text-jiwo-primary hover:text-jiwo-blueCalm transition"
          >
            ✨ Kenali Jiwo — lihat cerita kami
          </a>
          <p className="text-sm text-jiwo-textMuted">
            {isSignUp ? 'Sudah punya akun?' : 'Baru di Jiwo.ai?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="text-jiwo-primary font-bold ml-1 hover:underline"
            >
              {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
            </button>
          </p>
          <div className="text-3xs text-jiwo-textMuted/70 pt-2 border-t border-jiwo-primaryLight/10">
            Dengan melanjutkan, Anda menyetujui{' '}
            <Link to="/privacy-policy" className="underline hover:text-jiwo-primary font-bold">
              Ketentuan Layanan & Kebijakan Privasi
            </Link>{' '}
            kami.
          </div>
        </div>
      </div>
    </div>
  );
}
