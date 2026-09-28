// Animated dioramas for Safe Place guided sessions:
// 1. Senja Lembayung Pantai Selatan
// 2. Teras Rumah Nenek (Sore Hari)
// 3. Bonceng Motor Keliling Kota Malam
// Pure CSS animations keeping the scenes lightweight, performant, and calming.

export type SafePlaceTheme = 'pantai_selatan' | 'teras_nenek' | 'bonceng_motor' | 'beach' | 'forest';

interface SafePlaceSceneProps {
  theme: SafePlaceTheme;
}

export default function SafePlaceScene({ theme }: SafePlaceSceneProps) {
  // --- 1. SENJA PANTAI SELATAN (Parangtritis / Menganti) ---
  if (theme === 'pantai_selatan' || theme === 'beach') {
    return (
      <div
        className="scene-anim relative w-full max-w-sm h-60 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
        style={{
          background: 'linear-gradient(180deg, #2D1B36 0%, #683053 28%, #BF4F46 54%, #E8883B 70%, #2B2329 100%)',
        }}
        aria-hidden="true"
      >
        {/* Glowing Sunset Sun */}
        <span
          className="absolute left-1/2 -translate-x-1/2 top-14 w-14 h-14 rounded-full bg-[#FFAA47]"
          style={{
            animation: 'sunPulse 5s ease-in-out infinite',
            boxShadow: '0 0 45px 18px rgba(245, 140, 50, 0.65)',
          }}
        />

        {/* Sunset Clouds with dusky tints */}
        <span
          className="absolute top-4 w-28 h-5 rounded-full bg-[#E5989B]/40 blur-[2px]"
          style={{ animation: 'cloudAcross 38s linear infinite' }}
        />
        <span
          className="absolute top-10 w-20 h-4 rounded-full bg-[#FFB5A7]/30 blur-[2px]"
          style={{ animation: 'cloudAcross 55s linear -18s infinite' }}
        />

        {/* Sea mist & horizon haze */}
        <span className="absolute top-[48%] left-0 right-0 h-6 bg-gradient-to-b from-[#E8883B]/25 to-transparent blur-xs" />

        {/* Rolling waves on dark wet volcanic sand */}
        <div
          className="absolute w-[200%] h-7 rounded-[45%] bg-[#FEE8D6]/35"
          style={{ top: '56%', animation: 'waveX 7.5s linear infinite' }}
        />
        <div
          className="absolute w-[200%] h-7 rounded-[45%] bg-[#FFF3E8]/60"
          style={{ top: '61%', animation: 'waveX 5.8s linear infinite reverse' }}
        />

        {/* Golden sun shimmer on the water */}
        <span
          className="absolute left-1/2 -translate-x-1/2 top-[53%] w-20 h-1 rounded-full bg-[#FFE5B4]/80 blur-[1px]"
          style={{ animation: 'twinkle 2.5s ease-in-out infinite' }}
        />
        <span
          className="absolute left-[44%] top-[57%] w-12 h-1 rounded-full bg-[#FFD199]/70 blur-[1px]"
          style={{ animation: 'twinkle 3.2s ease-in-out 0.8s infinite' }}
        />

        {/* Cliff / Coastal Rock Silhouette */}
        <span className="absolute left-0 bottom-4 text-4xl opacity-75 drop-shadow-sm">🪨</span>
        <span className="absolute right-3 bottom-5 text-2xl opacity-70">🌊</span>

        {/* Jiwo peacefully gazing at the Southern Ocean sunset */}
        <img
          src="/jiwo/calm.png"
          alt=""
          draggable={false}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-28 object-contain drop-shadow-lg"
          style={{ animation: 'breathe 8s ease-in-out infinite' }}
        />
      </div>
    );
  }

  // --- 2. TERAS RUMAH NENEK (Sore Hari) ---
  if (theme === 'teras_nenek') {
    return (
      <div
        className="scene-anim relative w-full max-w-sm h-60 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
        style={{
          background: 'linear-gradient(180deg, #FDE6C4 0%, #F6CF9E 40%, #E7B67B 70%, #B8824C 100%)',
        }}
        aria-hidden="true"
      >
        {/* Warm afternoon sunbeam through wooden rafters */}
        <span className="absolute -top-6 left-[22%] w-24 h-56 bg-gradient-to-b from-white/40 via-amber-100/25 to-transparent rotate-[24deg] blur-[4px]" />
        <span className="absolute -top-6 left-[52%] w-16 h-56 bg-gradient-to-b from-white/30 via-amber-100/20 to-transparent rotate-[24deg] blur-[4px]" />

        {/* Porch eaves / roofline silhouette */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#7A4B20]/45 border-b-2 border-[#543213]/40" />

        {/* Potted plants around the porch */}
        <span className="absolute left-3 bottom-6 text-3xl opacity-90 drop-shadow-xs" style={{ animation: 'breathe 7s ease-in-out infinite' }}>🪴</span>
        <span className="absolute left-10 bottom-4 text-xl opacity-80">🌿</span>
        <span className="absolute right-4 bottom-5 text-3xl opacity-85" style={{ animation: 'breathe 8s ease-in-out 1s infinite' }}>🎋</span>

        {/* Vintage steaming jasmine tea cup on rustic wooden stool */}
        <div className="absolute right-12 bottom-6 flex flex-col items-center">
          <span className="text-xs -mb-1 animate-pulse opacity-75">♨️</span>
          <span className="text-xl drop-shadow-xs">🍵</span>
        </div>

        {/* Warm evening dust motes floating in sunlight */}
        <span className="absolute left-[38%] top-[35%] w-1.5 h-1.5 rounded-full bg-white/70" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <span className="absolute left-[58%] top-[25%] w-1 h-1 rounded-full bg-amber-100/80" style={{ animation: 'twinkle 2.4s ease-in-out 1.1s infinite' }} />
        <span className="absolute left-[28%] top-[50%] w-1 h-1 rounded-full bg-white/60" style={{ animation: 'twinkle 3.5s ease-in-out 0.5s infinite' }} />

        {/* Vintage red tile porch border */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#8C3A27]/60 border-t border-amber-900/30" />

        {/* Jiwo resting happily on the warm porch */}
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

  // --- 3. BONCENG MOTOR KELILING KOTA MALAM ---
  if (theme === 'bonceng_motor') {
    return (
      <div
        className="scene-anim relative w-full max-w-sm h-60 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
        style={{
          background: 'linear-gradient(180deg, #0A1128 0%, #131E3D 42%, #1C2D5A 72%, #263866 100%)',
        }}
        aria-hidden="true"
      >
        {/* Night Crescent Moon */}
        <span
          className="absolute right-7 top-5 w-9 h-9 rounded-full border-b-[3.5px] border-r-[3.5px] border-[#FFEAA7] rotate-[-25deg]"
          style={{ filter: 'drop-shadow(0 0 10px rgba(255,234,167,0.7))' }}
        />

        {/* Distant city building silhouettes */}
        <div className="absolute bottom-10 left-0 right-0 h-16 flex items-end justify-between px-3 opacity-25">
          <span className="w-8 h-14 bg-indigo-950 rounded-t-sm" />
          <span className="w-6 h-10 bg-indigo-950 rounded-t-sm" />
          <span className="w-10 h-16 bg-indigo-950 rounded-t-sm" />
          <span className="w-7 h-12 bg-indigo-950 rounded-t-sm" />
          <span className="w-9 h-15 bg-indigo-950 rounded-t-sm" />
        </div>

        {/* Streetlight glow bokeh floating backwards */}
        <span
          className="absolute top-16 w-8 h-8 rounded-full bg-[#F39C12]/50 blur-[5px]"
          style={{ animation: 'cloudAcross 8s linear infinite' }}
        />
        <span
          className="absolute top-24 w-10 h-10 rounded-full bg-[#F1C40F]/40 blur-[6px]"
          style={{ animation: 'cloudAcross 12s linear -4s infinite' }}
        />
        <span
          className="absolute top-12 w-6 h-6 rounded-full bg-[#E67E22]/45 blur-[4px]"
          style={{ animation: 'cloudAcross 10s linear -7s infinite' }}
        />

        {/* Wind lines streaming past */}
        <span className="absolute top-[44%] left-[10%] text-xs opacity-60 text-cyan-200" style={{ animation: 'twinkle 1.8s ease-in-out infinite' }}>彡</span>
        <span className="absolute top-[52%] right-[14%] text-xs opacity-50 text-cyan-200" style={{ animation: 'twinkle 2.2s ease-in-out 0.9s infinite' }}>彡</span>

        {/* Asphalt road line */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#171E2E] border-t border-slate-700/60" />
        <div className="absolute bottom-2.5 left-0 right-0 h-0.5 border-b border-dashed border-amber-300/40" />

        {/* Friendly scooter emoji accent */}
        <span className="absolute left-6 bottom-4 text-2xl opacity-80 drop-shadow-sm">🛵</span>

        {/* Jiwo enjoying the cool night wind */}
        <img
          src="/jiwo/happy.png"
          alt=""
          draggable={false}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-28 object-contain drop-shadow-md"
          style={{ animation: 'breathe 6s ease-in-out infinite' }}
        />
      </div>
    );
  }

  // --- DEFAULT / FOREST FALLBACK ---
  return (
    <div
      className="scene-anim relative w-full max-w-sm h-60 rounded-3xl overflow-hidden shadow-md border border-white/60 select-none"
      style={{
        background: 'linear-gradient(180deg, #E3F2DC 0%, #C5E2B8 45%, #A3CC94 75%, #8FBC80 100%)',
      }}
      aria-hidden="true"
    >
      <span className="absolute left-1 bottom-6 text-5xl opacity-90" style={{ animation: 'breathe 9s ease-in-out infinite' }}>🌲</span>
      <span className="absolute right-2 bottom-8 text-4xl opacity-80" style={{ animation: 'breathe 10s ease-in-out 1s infinite' }}>🌳</span>
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
