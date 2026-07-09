import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import { Home, MessageCircle, BookOpen, AlertOctagon, Heart, LogOut, User, Trash2, Shield, Compass, Users, Sparkles } from 'lucide-react';
import CrisisModal from './CrisisModal';
import PageTransition from './PageTransition';
import JiwoPeek from './JiwoPeek';

// Lazy-loaded so three.js stays out of the critical bundle
const CalmScene = lazy(() => import('./three/CalmScene'));

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Elastic entrance + slow heartbeat for the Rescue FAB
  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const intro = gsap.fromTo(
      fab,
      { scale: 0, rotation: -30 },
      { scale: 1, rotation: 0, duration: 1, delay: 0.5, ease: 'elastic.out(1, 0.5)' }
    );
    const pulse = gsap.to(fab, {
      scale: 1.06,
      duration: 1.6,
      delay: 1.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => {
      intro.kill();
      pulse.kill();
      gsap.set(fab, { clearProps: 'all' });
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        // Fetch profile
        supabase
          .from('profiles')
          .select('nama')
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteData = async () => {
    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin menghapus seluruh data Anda permanen dari Jiwo.ai?\nTindakan ini akan menghapus akun, jurnal, riwayat chat, dan riwayat mood Anda secara permanen sesuai regulasi UU PDP No. 27/2022. Tindakan ini tidak dapat dibatalkan."
    );
    if (!confirmDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (error) throw error;

      // Log out user and redirect to login
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      alert(`Gagal menghapus data: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex justify-center text-jiwo-textDark font-sans">
      {/* Ambient Three.js aurora + particle scene behind everything */}
      <Suspense fallback={null}>
        <CalmScene />
      </Suspense>

      {/* Mobile Frame Container: Mobile full-screen, desktop centered glass card over the 3D scene */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl min-h-screen flex flex-col relative z-10 shadow-lg border-x border-jiwo-primaryLight/20 pb-20">

        {/* Header */}
        <header className="px-5 py-4 border-b border-jiwo-primaryLight/20 flex justify-between items-center bg-white/70 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img src="/logo jiwo.png" alt="Jiwo Logo" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-lg text-jiwo-textDark tracking-tight">Jiwo.ai</span>
          </div>

          {/* User profile actions */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-jiwo-bg transition duration-150"
            >
              <div className="w-8 h-8 rounded-full bg-jiwo-primaryLight text-jiwo-primary font-bold flex items-center justify-center text-sm border border-jiwo-primary/20">
                {profile?.nama?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
              </div>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-jiwo-primaryLight/35 p-2 z-50 animate-fade-in space-y-1">
                  <div className="px-3 py-2 text-xs text-jiwo-textMuted border-b border-jiwo-primaryLight/20 mb-1">
                    Hai, <span className="font-bold text-jiwo-textDark">{profile?.nama || 'Sahabat'}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowCrisis(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jiwo-stress hover:bg-jiwo-stress/10 rounded-xl transition text-left"
                  >
                    <AlertOctagon className="w-4 h-4" /> Bantuan Krisis
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jiwo-textMuted hover:bg-jiwo-bg hover:text-jiwo-textDark rounded-xl transition text-left"
                  >
                    <LogOut className="w-4 h-4" /> Keluar Akun
                  </button>

                  <a
                    href="/welcome/index.html"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jiwo-primary hover:bg-jiwo-primaryLight/25 rounded-xl transition text-left font-semibold"
                  >
                    <Sparkles className="w-4 h-4" /> Kenali Jiwo (Cerita Kami)
                  </a>

                  <Link
                    to="/privacy-policy"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jiwo-textMuted hover:bg-jiwo-bg hover:text-jiwo-textDark rounded-xl transition text-left"
                  >
                    <Shield className="w-4 h-4" /> Privasi & Legalitas
                  </Link>

                  <button
                    onClick={handleDeleteData}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jiwo-stress hover:bg-jiwo-stress/10 rounded-xl transition text-left border-t border-jiwo-primaryLight/10 pt-2"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Semua Data
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-5 overflow-y-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        {/* Floating Action Button (FAB) for Rescue */}
        <div ref={fabRef} className="absolute bottom-24 right-5 z-40">
          <Link
            to="/rescue"
            title="Sesi Rescue (Tenangkan Diri)"
            className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-jiwo-primary to-jiwo-blueCalm hover:from-jiwo-primary/95 hover:to-jiwo-blueCalm/95 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Heart className="w-7 h-7 fill-white animate-pulse" />
          </Link>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur border-t border-jiwo-primaryLight/25 py-2 px-2 flex justify-around items-center z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 p-1 text-4xs sm:text-xs font-semibold rounded-2xl transition duration-150 ${
              isActive('/') 
                ? 'text-jiwo-primary scale-105' 
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <Home className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span>Home</span>
          </Link>

          <Link
            to="/chat"
            className={`flex flex-col items-center gap-1 p-1 text-4xs sm:text-xs font-semibold rounded-2xl transition duration-150 ${
              isActive('/chat') 
                ? 'text-jiwo-primary scale-105' 
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <MessageCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span>Chat</span>
          </Link>

          <Link
            to="/journal"
            className={`flex flex-col items-center gap-1 p-1 text-4xs sm:text-xs font-semibold rounded-2xl transition duration-150 ${
              isActive('/journal') 
                ? 'text-jiwo-primary scale-105' 
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <BookOpen className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span>Jurnal</span>
          </Link>

          <Link
            to="/community"
            className={`flex flex-col items-center gap-1 p-1 text-4xs sm:text-xs font-semibold rounded-2xl transition duration-150 ${
              isActive('/community') 
                ? 'text-jiwo-primary scale-105' 
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <Users className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span>Komunitas</span>
          </Link>

          <Link
            to="/tools"
            className={`flex flex-col items-center gap-1 p-1 text-4xs sm:text-xs font-semibold rounded-2xl transition duration-150 ${
              isActive('/tools') 
                ? 'text-jiwo-primary scale-105' 
                : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            <Compass className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span>Tools</span>
          </Link>
        </nav>

        {/* Jiwo occasionally peeks from the corner with an encouraging word */}
        <JiwoPeek />

        {/* Crisis Modal */}
        <CrisisModal isOpen={showCrisis} onClose={() => setShowCrisis(false)} />
      </div>
    </div>
  );
}
