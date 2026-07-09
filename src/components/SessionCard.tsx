import type { GuidedSession, SessionTheme } from '@/data/guidedSessions';

// Animated mini-scene card for a guided session. Each theme is a tiny
// living diorama (CSS-only animations) with a breathing Jiwo inside —
// like a muted looping video thumbnail.

const MASCOT_SRC: Record<string, string> = {
  idle: '/jiwo/idle.png',
  happy: '/jiwo/happy.png',
  calm: '/jiwo/calm.png',
  sad: '/jiwo/sad.png',
  sleep: '/jiwo/sleep.png',
};

const THEME_BG: Record<SessionTheme, string> = {
  bodyscan: 'linear-gradient(160deg, #DCEEE2, #B8D8C4)',
  senses: 'linear-gradient(160deg, #D2ECEE, #A8D5D7)',
  night: 'linear-gradient(160deg, #2B2D4A, #171830)',
  affirmation: 'linear-gradient(160deg, #F7E0E4, #EBC3CB)',
  beach: 'linear-gradient(160deg, #BFE3E8, #8CC5CF)',
  relief: 'linear-gradient(160deg, #F3D9D4, #C9DED9)',
  forest: 'linear-gradient(160deg, #CDE3C4, #9DC48E)',
  together: 'linear-gradient(160deg, #FCEDC8, #F5D98F)',
  morning: 'linear-gradient(160deg, #FDE7C2, #F6C489)',
};

function SceneDecor({ theme }: { theme: SessionTheme }) {
  switch (theme) {
    case 'bodyscan':
      // A soft scanning beam sweeping up and down over Jiwo
      return (
        <div
          className="absolute left-4 right-4 h-1 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
          style={{ animation: 'scanY 4.5s ease-in-out infinite' }}
        />
      );
    case 'senses':
      // Five sense-dots pulsing around Jiwo, one per sense
      return (
        <>
          {[
            { l: '12%', t: '22%', d: '0s' },
            { l: '82%', t: '18%', d: '0.5s' },
            { l: '8%', t: '62%', d: '1s' },
            { l: '88%', t: '58%', d: '1.5s' },
            { l: '50%', t: '10%', d: '2s' },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white/90"
              style={{ left: p.l, top: p.t, animation: `twinkle 2.6s ease-in-out ${p.d} infinite` }}
            />
          ))}
        </>
      );
    case 'night':
      // Crescent moon + twinkling stars
      return (
        <>
          <span className="absolute right-4 top-3 w-6 h-6 rounded-full" style={{ boxShadow: '-4px 3px 0 0 #F4EFD9' }} />
          {[
            { l: '15%', t: '20%', d: '0s' },
            { l: '35%', t: '12%', d: '0.8s' },
            { l: '62%', t: '26%', d: '1.4s' },
            { l: '22%', t: '48%', d: '2s' },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-white"
              style={{ left: p.l, top: p.t, animation: `twinkle 3s ease-in-out ${p.d} infinite` }}
            />
          ))}
        </>
      );
    case 'affirmation':
      // Little hearts rising like whispered words
      return (
        <>
          {[
            { l: '22%', d: '0s' },
            { l: '50%', d: '1.1s' },
            { l: '74%', d: '2.2s' },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute bottom-6 text-xs select-none"
              style={{ left: p.l, animation: `floatUp 3.4s ease-out ${p.d} infinite`, color: '#D66A79' }}
            >
              ♥
            </span>
          ))}
        </>
      );
    case 'beach':
      // Two drifting wave bands at the shore
      return (
        <>
          <div
            className="absolute bottom-0 h-6 w-[200%] rounded-[45%] bg-white/45"
            style={{ animation: 'waveX 7s linear infinite' }}
          />
          <div
            className="absolute -bottom-2 h-6 w-[200%] rounded-[45%] bg-white/70"
            style={{ animation: 'waveX 5s linear infinite reverse' }}
          />
        </>
      );
    case 'relief':
      // Calm ripples dissolving outward from Jiwo
      return (
        <>
          {[0, 1.5].map((d, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 -ml-12 -mt-12 w-24 h-24 rounded-full border-2 border-white/70"
              style={{ animation: `rippleOut 3s ease-out ${d}s infinite` }}
            />
          ))}
        </>
      );
    case 'forest':
      // Leaves drifting down between the trees
      return (
        <>
          {[
            { l: '20%', d: '0s' },
            { l: '55%', d: '1.6s' },
            { l: '80%', d: '3.2s' },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute top-0 w-2.5 h-2.5 bg-[#5E8C50]/80"
              style={{
                left: p.l,
                borderRadius: '80% 0 80% 0',
                animation: `leafFall 4.8s ease-in ${p.d} infinite`,
              }}
            />
          ))}
        </>
      );
    case 'together':
      return null; // the duo of mascots IS the scene
    case 'morning':
      // A pulsing rising sun behind Jiwo
      return (
        <span
          className="absolute left-1/2 top-6 -ml-8 w-16 h-16 rounded-full bg-[#FBD37A]"
          style={{ animation: 'sunPulse 4s ease-in-out infinite', boxShadow: '0 0 28px 10px rgba(251,211,122,0.55)' }}
        />
      );
  }
}

interface SessionCardProps {
  session: GuidedSession;
  onClick: () => void;
}

export default function SessionCard({ session, onClick }: SessionCardProps) {
  const dark = session.theme === 'night';
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-jiwo-primaryLight/25 hover:border-jiwo-primary/40 rounded-3xl overflow-hidden shadow-3xs hover:shadow-md transition duration-200 group"
    >
      {/* Animated mini-scene */}
      <div
        className="scene-anim relative h-28 overflow-hidden"
        style={{ background: THEME_BG[session.theme] }}
        aria-hidden="true"
      >
        <SceneDecor theme={session.theme} />

        {session.theme === 'together' ? (
          <>
            <img
              src={MASCOT_SRC.happy}
              alt=""
              draggable={false}
              className="absolute bottom-1 left-[24%] h-16 object-contain animate-breathe-slow drop-shadow-sm"
            />
            <img
              src={MASCOT_SRC.calm}
              alt=""
              draggable={false}
              className="absolute bottom-1 right-[24%] h-14 object-contain animate-float-slow drop-shadow-sm"
            />
          </>
        ) : (
          <img
            src={MASCOT_SRC[session.mascot]}
            alt=""
            draggable={false}
            className="absolute bottom-1 left-1/2 -translate-x-1/2 h-16 object-contain animate-breathe-slow drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>

      {/* Card meta */}
      <div className="p-3.5 space-y-1">
        <div className={`text-4xs font-extrabold uppercase tracking-widest ${dark ? 'text-[#8E8FC0]' : 'text-jiwo-primary'}`}>
          {session.category} · {session.duration}
        </div>
        <h4 className="text-xs font-extrabold text-jiwo-textDark leading-snug">{session.title}</h4>
      </div>
    </button>
  );
}
