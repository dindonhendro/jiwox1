import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import MoodIcon, { type MoodKey } from '@/components/MoodIcon';
import LockedCard from '@/components/LockedCard';
import PremiumSheet from '@/components/PremiumSheet';
import { ChevronLeft, Sparkles, CalendarHeart, Flame, Lock } from 'lucide-react';

type Period = 7 | 30 | 90;

interface Checkin {
  mood: string;
  anxiety_level: number | null;
  created_at: string;
}

const MOODS: { key: MoodKey; label: string; color: string; soft: string }[] = [
  { key: 'senang', label: 'Senang', color: '#E9BE4B', soft: 'rgba(233,190,75,0.16)' },
  { key: 'tenang', label: 'Tenang', color: '#8FBC8F', soft: 'rgba(143,188,143,0.16)' },
  { key: 'cemas', label: 'Cemas', color: '#E88E8D', soft: 'rgba(232,142,141,0.16)' },
  { key: 'sedih', label: 'Sedih', color: '#6B90B3', soft: 'rgba(107,144,179,0.16)' },
  { key: 'lelah', label: 'Lelah', color: '#9382CD', soft: 'rgba(147,130,205,0.16)' },
];
// Playful line for the dominant mood
const VIBE: Record<MoodKey, string> = {
  senang: 'Kamu lagi cerah-cerahnya! ☀️ Pertahankan ya.',
  tenang: 'Hatimu lagi adem banget belakangan ini 🌿',
  cemas: 'Pikiranmu cukup ramai. Jiwo peluk erat-erat ya 🤍',
  sedih: 'Hari-harimu terasa berat. Kamu nggak sendirian 💙',
  lelah: 'Kamu butuh istirahat. Sayangi dirimu dulu 💜',
};

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Small GSAP count-up number
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) { el.textContent = `${value}${suffix}`; return; }
    const obj = { n: 0 };
    const tw = gsap.to(obj, {
      n: value,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = `${Math.round(obj.n)}${suffix}`; },
    });
    return () => { tw.kill(); };
  }, [value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function MoodStats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>(7);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  // Periods beyond 7 days are Premium-only
  const locked = !isPremium && period !== 7;

  useEffect(() => {
    supabase.from('profiles').select('is_premium').single().then(({ data }) => {
      if (data) setIsPremium(!!data.is_premium);
    });
  }, []);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locked) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - period);
      const { data } = await supabase
        .from('mood_checkins')
        .select('mood, anxiety_level, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });
      if (active) {
        setCheckins((data as Checkin[]) || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [period, locked]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let anxSum = 0, anxN = 0;
    const days = new Set<string>();
    for (const c of checkins) {
      counts[c.mood] = (counts[c.mood] || 0) + 1;
      if (typeof c.anxiety_level === 'number') { anxSum += c.anxiety_level; anxN++; }
      days.add(new Date(c.created_at).toDateString());
    }
    const total = checkins.length;
    const dominant = MOODS
      .map((m) => ({ ...m, count: counts[m.key] || 0 }))
      .sort((a, b) => b.count - a.count)[0];
    const avgAnx = anxN ? anxSum / anxN : 0;
    // "kelegaan" = inverse of anxiety on a 0-100 scale (1 anx = 100%, 5 anx = 0%)
    const calm = anxN ? Math.round(((5 - avgAnx) / 4) * 100) : null;
    return { counts, total, dominant, calm, activeDays: days.size };
  }, [checkins]);

  // Animate bars + hero on data change
  useEffect(() => {
    if (loading || reduced()) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(heroRef.current, { opacity: 0, y: 16, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
      }
      if (barsRef.current) {
        gsap.fromTo(barsRef.current.querySelectorAll('.bar-fill'),
          { width: 0 },
          { width: (_i, t) => (t as HTMLElement).dataset.w + '%', duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.15 });
        gsap.fromTo(barsRef.current.querySelectorAll('.bar-row'),
          { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.08 });
      }
      // Draw the anxiety trend line
      const line = document.querySelector('.trend-line') as SVGPathElement | null;
      if (line && line.getTotalLength) {
        const len = line.getTotalLength();
        gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1.3, ease: 'power2.out', delay: 0.25 });
      }
    });
    return () => ctx.revert();
  }, [loading, checkins]);

  // Trend sparkline points (anxiety over time, normalized)
  const trend = useMemo(() => {
    const pts = checkins.filter((c) => typeof c.anxiety_level === 'number');
    if (pts.length < 2) return null;
    const W = 300, H = 60, pad = 6;
    const step = (W - pad * 2) / (pts.length - 1);
    const coords = pts.map((c, i) => {
      const x = pad + i * step;
      const y = pad + (1 - ((c.anxiety_level as number) - 1) / 4) * (H - pad * 2);
      return [x, y];
    });
    const d = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
    const area = `${d} L${coords[coords.length - 1][0]},${H} L${coords[0][0]},${H} Z`;
    return { d, area, W, H };
  }, [checkins]);

  const maxCount = Math.max(1, ...MOODS.map((m) => stats.counts[m.key] || 0));

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/tools')}
          className="p-2 rounded-full bg-white border border-jiwo-primaryLight/30 text-jiwo-textMuted hover:text-jiwo-primary transition"
          aria-label="Kembali"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-end gap-1.5">
          <img src="/jiwo/happy.png" alt="" draggable={false} className="h-11 w-11 object-contain animate-float-slow drop-shadow-sm -mb-0.5" />
          <div>
            <h1 className="text-xl font-extrabold text-jiwo-textDark tracking-tight leading-none">Peta Hati Kamu</h1>
            <p className="text-2xs text-jiwo-textMuted mt-0.5">Sekilas suasana hatimu belakangan ini</p>
          </div>
        </div>
      </div>

      {/* Period chips */}
      <div className="relative flex bg-jiwo-blueLight/50 p-1.5 rounded-2xl border border-jiwo-primaryLight/20">
        <span
          className="absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] bg-white rounded-xl shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
          style={{ transform: `translateX(${period === 7 ? 0 : period === 30 ? 100 : 200}%)` }}
          aria-hidden="true"
        />
        {([7, 30, 90] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`relative z-10 flex-1 py-2 rounded-xl font-bold text-xs transition-colors inline-flex items-center justify-center gap-1 ${
              period === p ? 'text-jiwo-primary' : 'text-jiwo-textMuted hover:text-jiwo-textDark'
            }`}
          >
            {p} Hari
            {!isPremium && p !== 7 && <Lock className="w-3 h-3 opacity-70" />}
          </button>
        ))}
      </div>

      {locked ? (
        <LockedCard
          title={`Peta hati ${period} hari`}
          subtitle="Lihat tren suasana hatimu lebih jauh dengan Premium. Statistik 7 hari selalu gratis."
          onUpgrade={() => setShowPremium(true)}
        >
          <div className="p-6 space-y-4">
            <div className="h-20 rounded-2xl bg-jiwo-primaryLight/30" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-2xl bg-jiwo-bg" />
              <div className="h-16 rounded-2xl bg-jiwo-bg" />
            </div>
            <div className="h-24 rounded-2xl bg-jiwo-bg" />
          </div>
        </LockedCard>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="w-8 h-8 border-4 border-jiwo-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-jiwo-textMuted">Menghitung suasana hatimu...</span>
        </div>
      ) : stats.total === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-jiwo-primaryLight/20 text-center space-y-4">
          <img src="/jiwo/idle.png" alt="" draggable={false} className="h-24 w-24 object-contain mx-auto animate-float-slow drop-shadow-sm" />
          <div className="space-y-1">
            <h3 className="font-bold text-jiwo-textDark">Belum Ada Cerita Hati</h3>
            <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
              Belum ada check-in mood di periode ini. Yuk sapa Jiwo di Beranda dan pilih perasaanmu hari ini 💙
            </p>
          </div>
          <button onClick={() => navigate('/')} className="text-sm font-bold text-jiwo-primary hover:underline">
            Check-in Mood Sekarang
          </button>
        </div>
      ) : (
        <>
          {/* Hero — dominant mood */}
          <div
            ref={heroRef}
            className="relative rounded-3xl p-6 overflow-hidden border border-white/60 shadow-sm"
            style={{ background: `linear-gradient(150deg, ${stats.dominant.soft}, #ffffff 85%)` }}
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl" style={{ background: stats.dominant.soft }} />
            <div className="relative flex items-center gap-4">
              <div className="shrink-0">
                <MoodIcon mood={stats.dominant.key} size={34} tile active />
              </div>
              <div className="space-y-0.5">
                <span className="text-3xs font-bold uppercase tracking-wider text-jiwo-textMuted">Paling sering kamu rasakan</span>
                <h2 className="text-2xl font-extrabold" style={{ color: stats.dominant.color }}>{stats.dominant.label}</h2>
                <p className="text-2xs text-jiwo-textMuted leading-snug max-w-[210px]">{VIBE[stats.dominant.key]}</p>
              </div>
            </div>
          </div>

          {/* Two playful stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-3xl p-4 border border-jiwo-primaryLight/20 shadow-3xs space-y-1">
              <div className="flex items-center gap-1.5 text-jiwo-primary">
                <CalendarHeart className="w-4 h-4" />
                <span className="text-3xs font-bold uppercase tracking-wider text-jiwo-textMuted">Check-in</span>
              </div>
              <div className="text-3xl font-extrabold text-jiwo-textDark"><CountUp value={stats.total} /></div>
              <p className="text-3xs text-jiwo-textMuted">di {stats.activeDays} hari berbeda</p>
            </div>
            <div className="bg-white rounded-3xl p-4 border border-jiwo-primaryLight/20 shadow-3xs space-y-1">
              <div className="flex items-center gap-1.5 text-jiwo-sage">
                <Sparkles className="w-4 h-4" />
                <span className="text-3xs font-bold uppercase tracking-wider text-jiwo-textMuted">Kelegaan</span>
              </div>
              <div className="text-3xl font-extrabold text-jiwo-textDark">
                {stats.calm === null ? '–' : <CountUp value={stats.calm} suffix="%" />}
              </div>
              <p className="text-3xs text-jiwo-textMuted">rata-rata ketenanganmu</p>
            </div>
          </div>

          {/* Distribution bars */}
          <div ref={barsRef} className="bg-white rounded-3xl p-5 border border-jiwo-primaryLight/20 shadow-3xs space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-jiwo-textMuted">Ragam Perasaanmu</h3>
            <div className="space-y-3">
              {MOODS.map((m) => {
                const count = stats.counts[m.key] || 0;
                const pct = Math.round((count / stats.total) * 100);
                const w = Math.round((count / maxCount) * 100);
                return (
                  <div key={m.key} className="bar-row flex items-center gap-3">
                    <div className="w-16 flex items-center gap-1.5 shrink-0">
                      <MoodIcon mood={m.key} size={16} />
                      <span className="text-2xs font-bold text-jiwo-textMuted">{m.label}</span>
                    </div>
                    <div className="flex-grow h-3 rounded-full bg-jiwo-bg overflow-hidden">
                      <div className="bar-fill h-full rounded-full" data-w={w} style={{ width: 0, background: m.color }} />
                    </div>
                    <span className="w-9 text-right text-2xs font-extrabold text-jiwo-textDark">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anxiety trend sparkline */}
          {trend && (
            <div className="bg-white rounded-3xl p-5 border border-jiwo-primaryLight/20 shadow-3xs space-y-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-jiwo-stress" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-jiwo-textMuted">Alur Kecemasan</h3>
              </div>
              <svg viewBox={`0 0 ${trend.W} ${trend.H}`} className="w-full h-16" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="anxFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4FA3A5" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#4FA3A5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={trend.area} fill="url(#anxFill)" />
                <path
                  d={trend.d}
                  fill="none"
                  stroke="#4FA3A5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="trend-line"
                />
              </svg>
              <div className="flex justify-between text-4xs text-jiwo-textMuted font-semibold">
                <span>Lebih tenang di bawah</span>
                <span>{period} hari terakhir</span>
              </div>
            </div>
          )}

          {/* Gentle footer note */}
          <p className="text-3xs text-center text-jiwo-textMuted/80 px-6 leading-relaxed">
            Angka-angka ini bukan penilaian, hanya cermin lembut perjalananmu. Apa pun perasaanmu, itu valid 🤍
          </p>
        </>
      )}

      <PremiumSheet open={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}
