// Minimalist mood glyphs — abstract line-art instead of generic emoji.
// Each emotion is a quiet visual metaphor in the Jiwo palette:
// tenang = still water · senang = sunrise · cemas = a tangled line ·
// sedih = a single drop · lelah = a waning moon.

export type MoodKey = 'tenang' | 'senang' | 'cemas' | 'sedih' | 'lelah';

interface MoodStyle {
  stroke: string;
  tile: string;
  tileActive: string;
  glyph: React.ReactNode;
}

const MOODS: Record<MoodKey, MoodStyle> = {
  tenang: {
    stroke: '#7FAE7F',
    tile: 'rgba(143, 188, 143, 0.14)',
    tileActive: 'rgba(143, 188, 143, 0.28)',
    glyph: (
      <>
        <path d="M3.5 10.4 Q6.3 8.6 9.1 10.4 T14.7 10.4 T20.5 10.4" />
        <path d="M6.2 15.2 Q8.6 13.8 11 15.2 T15.8 15.2" opacity="0.5" />
      </>
    ),
  },
  senang: {
    stroke: '#D9A62E',
    tile: 'rgba(244, 211, 94, 0.18)',
    tileActive: 'rgba(244, 211, 94, 0.35)',
    glyph: (
      <>
        <path d="M7 15.5 a5 5 0 0 1 10 0" />
        <path d="M3.8 18.6 h16.4" />
        <path d="M12 4.8 v2.5" />
        <path d="M5.4 7.6 l1.7 1.7" />
        <path d="M18.6 7.6 l-1.7 1.7" />
      </>
    ),
  },
  cemas: {
    stroke: '#DE7F7E',
    tile: 'rgba(232, 142, 141, 0.14)',
    tileActive: 'rgba(232, 142, 141, 0.28)',
    glyph: (
      <>
        <path d="M3.5 14.5 L7.2 9.5 L10.6 15 L14 8.5 L17.2 14 L20.5 10.5" />
        <circle cx="19.7" cy="5.4" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  sedih: {
    stroke: '#6B90B3',
    tile: 'rgba(107, 144, 179, 0.13)',
    tileActive: 'rgba(107, 144, 179, 0.26)',
    glyph: (
      <>
        <path d="M12 4.8 C10.2 7.5 7.2 11.2 7.2 14.2 a4.8 4.8 0 0 0 9.6 0 C16.8 11.2 13.8 7.5 12 4.8 Z" />
        <path d="M9.8 14.6 a2.2 2.2 0 0 0 1.6 2.1" opacity="0.5" />
      </>
    ),
  },
  lelah: {
    stroke: '#9382CD',
    tile: 'rgba(147, 130, 205, 0.14)',
    tileActive: 'rgba(147, 130, 205, 0.28)',
    glyph: (
      <>
        <path d="M11.2 4.4 a6.4 6.4 0 0 0 8.6 8.6 a8.4 8.4 0 1 1 -8.6 -8.6 Z" />
        <path d="M18.4 3.9 v2.6" />
        <path d="M17.1 5.2 h2.6" />
      </>
    ),
  },
};

interface MoodIconProps {
  mood: MoodKey;
  /** Icon size in px (the glyph, not the tile) */
  size?: number;
  /** Wrap the glyph in a soft rounded tile */
  tile?: boolean;
  /** Stronger tile tint for the selected state */
  active?: boolean;
  className?: string;
}

export default function MoodIcon({
  mood,
  size = 24,
  tile = false,
  active = false,
  className = '',
}: MoodIconProps) {
  const m = MOODS[mood];
  if (!m) return null;

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: m.stroke }}
      aria-hidden="true"
    >
      {m.glyph}
    </svg>
  );

  if (!tile) {
    return <span className={`inline-flex ${className}`}>{svg}</span>;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl transition-colors duration-300 ${className}`}
      style={{
        width: size * 2,
        height: size * 2,
        background: active ? m.tileActive : m.tile,
      }}
    >
      {svg}
    </span>
  );
}
