// Animated dioramas for the Safe Place guided sessions: Jiwo relaxing on a
// beach, and Jiwo resting inside a forest. Pure CSS animations (shared
// keyframes live in index.css) so the scenes stay light and calming.

interface SafePlaceSceneProps {
  theme: 'beach' | 'forest';
}

export default function SafePlaceScene({ theme }: SafePlaceSceneProps) {
  if (theme === 'beach') {
    return (
      <div
        className="scene-anim relative w-full max-w-sm h-56 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
        style={{
          background:
            'linear-gradient(180deg, #D8EEF6 0%, #BCE2EF 38%, #9DD4E4 55%, #F4E4C1 72%, #EFD9AE 100%)',
        }}
        aria-hidden="true"
      >
        {/* Sun */}
        <span
          className="absolute right-6 top-5 w-12 h-12 rounded-full bg-[#FBD37A]"
          style={{ animation: 'sunPulse 5s ease-in-out infinite', boxShadow: '0 0 30px 12px rgba(251,211,122,0.55)' }}
        />

        {/* Drifting clouds */}
        <span
          className="absolute top-6 w-20 h-5 rounded-full bg-white/80 blur-[2px]"
          style={{ animation: 'cloudAcross 42s linear infinite' }}
        />
        <span
          className="absolute top-12 w-14 h-4 rounded-full bg-white/60 blur-[2px]"
          style={{ animation: 'cloudAcross 60s linear -20s infinite' }}
        />

        {/* Rolling waves at the shoreline */}
        <div
          className="absolute w-[200%] h-6 rounded-[45%] bg-white/50"
          style={{ top: '58%', animation: 'waveX 8s linear infinite' }}
        />
        <div
          className="absolute w-[200%] h-6 rounded-[45%] bg-white/75"
          style={{ top: '63%', animation: 'waveX 6s linear infinite reverse' }}
        />

        {/* Palm & shell accents */}
        <span className="absolute left-2 bottom-8 text-4xl" style={{ animation: 'breathe 7s ease-in-out infinite' }}>🌴</span>
        <span className="absolute right-5 bottom-3 text-sm opacity-80">🐚</span>
        <span className="absolute left-[30%] bottom-2.5 text-3xs opacity-60">⭐</span>

        {/* Sparkles on the water */}
        <span className="absolute left-[18%] top-[48%] w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'twinkle 2.8s ease-in-out infinite' }} />
        <span className="absolute left-[70%] top-[52%] w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'twinkle 3.4s ease-in-out 1.2s infinite' }} />

        {/* Jiwo relaxing on the sand */}
        <img
          src="/jiwo/calm.png"
          alt=""
          draggable={false}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-28 object-contain drop-shadow-md"
          style={{ animation: 'breathe 8s ease-in-out infinite' }}
        />
      </div>
    );
  }

  // --- FOREST ---
  return (
    <div
      className="scene-anim relative w-full max-w-sm h-56 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
      style={{
        background: 'linear-gradient(180deg, #E3F2DC 0%, #C5E2B8 45%, #A3CC94 75%, #8FBC80 100%)',
      }}
      aria-hidden="true"
    >
      {/* Soft canopy shadows */}
      <span className="absolute -top-6 -left-8 w-36 h-24 rounded-full bg-[#6FA55F]/35 blur-xl" />
      <span className="absolute -top-8 right-0 w-40 h-24 rounded-full bg-[#6FA55F]/30 blur-xl" />

      {/* Sun ray slipping through the leaves */}
      <span className="absolute -top-4 left-[30%] w-14 h-44 bg-gradient-to-b from-white/45 to-transparent rotate-12 blur-[3px]" />

      {/* Trees */}
      <span className="absolute left-1 bottom-6 text-5xl opacity-90" style={{ animation: 'breathe 9s ease-in-out infinite' }}>🌲</span>
      <span className="absolute right-2 bottom-8 text-4xl opacity-80" style={{ animation: 'breathe 10s ease-in-out 1s infinite' }}>🌳</span>
      <span className="absolute left-[22%] bottom-14 text-2xl opacity-50">🌲</span>

      {/* Falling leaves */}
      <span className="absolute top-0 left-[35%] w-2.5 h-2.5 bg-[#5E8C50]/80" style={{ borderRadius: '80% 0 80% 0', animation: 'leafFall 5.5s ease-in infinite' }} />
      <span className="absolute top-0 left-[62%] w-2.5 h-2.5 bg-[#7CA968]/80" style={{ borderRadius: '80% 0 80% 0', animation: 'leafFall 6.5s ease-in 2s infinite' }} />
      <span className="absolute top-0 left-[80%] w-2 h-2 bg-[#5E8C50]/70" style={{ borderRadius: '80% 0 80% 0', animation: 'leafFall 5s ease-in 3.5s infinite' }} />

      {/* Fireflies */}
      <span className="absolute left-[15%] top-[55%] w-1.5 h-1.5 rounded-full bg-[#F4E27A]" style={{ animation: 'twinkle 2.6s ease-in-out infinite' }} />
      <span className="absolute left-[75%] top-[45%] w-1.5 h-1.5 rounded-full bg-[#F4E27A]" style={{ animation: 'twinkle 3.2s ease-in-out 1s infinite' }} />
      <span className="absolute left-[55%] top-[62%] w-1 h-1 rounded-full bg-[#F4E27A]" style={{ animation: 'twinkle 2.2s ease-in-out 0.6s infinite' }} />

      {/* Little stream glint */}
      <span className="absolute bottom-3 left-4 right-4 h-1 rounded-full bg-white/30" />

      {/* Jiwo resting under the trees */}
      <img
        src="/jiwo/idle.png"
        alt=""
        draggable={false}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 h-28 object-contain drop-shadow-md"
        style={{ animation: 'breathe 8s ease-in-out infinite' }}
      />
    </div>
  );
}
