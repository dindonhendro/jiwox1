import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import JiwoMascot from '@/components/JiwoMascot';
import HabitCalendar from '@/components/HabitCalendar';
import PremiumSheet from '@/components/PremiumSheet';
import { FREE_HABIT_LIMIT } from '@/lib/limits';
import {
  CATEGORY_META,
  HABIT_TEMPLATES,
  MIN_INSIGHT_DAYS,
  adaptiveTarget,
  addDays,
  calcStreak,
  calmScore,
  dateKey,
  findBestInsight,
  habitsActiveOn,
  stressColor,
  suggestHabit,
  type Habit,
  type HabitLog,
} from '@/lib/habits';
import {
  ArrowLeft,
  Check,
  Plus,
  Flame,
  Sparkles,
  X,
  ChevronRight,
  Lock,
  Trash2,
  Shield,
  TrendingDown,
} from 'lucide-react';

const WINDOW_DAYS = 120;

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Large ring that fills to the day's calm score
function ScoreRing({ value }: { value: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const CIRC = 2 * Math.PI * 52;

  useEffect(() => {
    const ring = ringRef.current;
    const num = numRef.current;
    if (!ring || !num) return;

    if (reduced()) {
      ring.style.strokeDasharray = `${(value / 100) * CIRC} ${CIRC}`;
      num.textContent = String(value);
      return;
    }

    const obj = { n: 0 };
    const tw = gsap.to(obj, {
      n: value,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        ring.style.strokeDasharray = `${(obj.n / 100) * CIRC} ${CIRC}`;
        num.textContent = String(Math.round(obj.n));
      },
    });
    return () => { tw.kill(); };
  }, [value, CIRC]);

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#D2ECEE" strokeWidth="9" opacity={0.55} />
        <circle
          ref={ringRef}
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#4FA3A5"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`0 ${CIRC}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span ref={numRef} className="text-3xl font-extrabold text-jiwo-textDark leading-none">0</span>
        <span className="text-4xs font-bold uppercase tracking-widest text-jiwo-textMuted mt-1">Tenang</span>
      </div>
    </div>
  );
}

export default function HabitTracker() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [stressByDay, setStressByDay] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const todayKey = dateKey(new Date());

  // --- LOAD ---
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = dateKey(addDays(new Date(), -WINDOW_DAYS));

      const [profileRes, habitRes, logRes, moodRes] = await Promise.all([
        supabase.from('profiles').select('is_premium').single(),
        supabase.from('habits').select('*').eq('archived', false).order('sort_order'),
        supabase.from('habit_logs').select('habit_id, done_on').gte('done_on', since),
        supabase
          .from('mood_checkins')
          .select('anxiety_level, created_at')
          .gte('created_at', new Date(`${since}T00:00:00`).toISOString()),
      ]);

      if (!active) return;

      setIsPremium(!!profileRes.data?.is_premium);
      setHabits((habitRes.data as Habit[]) || []);
      setLogs((logRes.data as HabitLog[]) || []);

      // Average anxiety per calendar day
      const buckets: Record<string, number[]> = {};
      for (const m of (moodRes.data as { anxiety_level: number | null; created_at: string }[]) || []) {
        if (typeof m.anxiety_level !== 'number') continue;
        const k = dateKey(new Date(m.created_at));
        (buckets[k] ||= []).push(m.anxiety_level);
      }
      const avg: Record<string, number> = {};
      for (const [k, vals] of Object.entries(buckets)) {
        avg[k] = vals.reduce((s, v) => s + v, 0) / vals.length;
      }
      setStressByDay(avg);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // --- DERIVED ---
  const doneToday = useMemo(
    () => new Set(logs.filter((l) => l.done_on === todayKey).map((l) => l.habit_id)),
    [logs, todayKey]
  );

  const doneDays = useMemo(() => new Set(logs.map((l) => l.done_on)), [logs]);

  // Mean anxiety across the last 7 days — the "how are things lately" signal
  const recentStress = useMemo(() => {
    const vals: number[] = [];
    for (let i = 0; i < 7; i++) {
      const v = stressByDay[dateKey(addDays(new Date(), -i))];
      if (typeof v === 'number') vals.push(v);
    }
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }, [stressByDay]);

  const score = useMemo(() => calmScore(habits, doneToday), [habits, doneToday]);
  const target = useMemo(() => adaptiveTarget(habits.length, recentStress), [habits.length, recentStress]);
  const { streak, graceUsed } = useMemo(() => calcStreak(doneDays), [doneDays]);
  const insight = useMemo(
    () => findBestInsight(habits, logs, stressByDay),
    [habits, logs, stressByDay]
  );
  const suggestion = useMemo(
    () => suggestHabit(habits, doneToday, recentStress),
    [habits, doneToday, recentStress]
  );

  const doneCount = doneToday.size;
  const targetMet = target.target > 0 && doneCount >= target.target;

  // Jiwo mirrors the user: anxious when stress is high and nothing is done yet,
  // easing to calm as habits land, delighted when the day's target is met.
  const jiwoState = useMemo(() => {
    if (!habits.length) return 'idle' as const;
    if (score >= 100 || targetMet) return 'happy' as const;
    if (recentStress != null && recentStress >= 3.5 && score < 40) return 'stress' as const;
    if (score >= 35) return 'calm' as const;
    return 'idle' as const;
  }, [habits.length, score, targetMet, recentStress]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || loading || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
    }, el);
    return () => ctx.revert();
  }, [loading]);

  // --- ACTIONS ---
  const toggleHabit = async (h: Habit, btn: HTMLElement | null) => {
    const wasDone = doneToday.has(h.id);

    // Optimistic: the tick should feel instant
    setLogs((prev) =>
      wasDone
        ? prev.filter((l) => !(l.habit_id === h.id && l.done_on === todayKey))
        : [...prev, { habit_id: h.id, done_on: todayKey }]
    );

    if (btn && !reduced()) {
      gsap.fromTo(
        btn,
        { scale: wasDone ? 1 : 0.75 },
        { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' }
      );
    }

    if (wasDone) {
      await supabase.from('habit_logs').delete().eq('habit_id', h.id).eq('done_on', todayKey);
    } else {
      await supabase.from('habit_logs').insert({ habit_id: h.id, done_on: todayKey });
    }
  };

  const addHabit = async (t: (typeof HABIT_TEMPLATES)[number]) => {
    if (!isPremium && habits.length >= FREE_HABIT_LIMIT) {
      setShowAdd(false);
      setShowPremium(true);
      return;
    }
    const { data } = await supabase
      .from('habits')
      .insert({
        title: t.title,
        icon: t.icon,
        category: t.category,
        stress_impact: t.stress_impact,
        link_to: t.link_to,
        sort_order: habits.length,
      })
      .select()
      .single();

    if (data) {
      setHabits((prev) => [...prev, data as Habit]);
      setShowAdd(false);
      setCustomTitle('');
    }
  };

  const removeHabit = async (h: Habit) => {
    setHabits((prev) => prev.filter((x) => x.id !== h.id));
    await supabase.from('habits').update({ archived: true }).eq('id', h.id);
  };

  const atLimit = !isPremium && habits.length >= FREE_HABIT_LIMIT;

  // Detail for a tapped calendar day
  const dayDetail = useMemo(() => {
    if (!selectedDay) return null;
    const ids = new Set(logs.filter((l) => l.done_on === selectedDay).map((l) => l.habit_id));
    return {
      done: habits.filter((h) => ids.has(h.id)),
      total: habitsActiveOn(habits, selectedDay).length,
      stress: stressByDay[selectedDay] ?? null,
    };
  }, [selectedDay, logs, habits, stressByDay]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-9 h-9 border-4 border-jiwo-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-jiwo-primary">Menyiapkan kebiasaanmu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tools')}
          aria-label="Kembali"
          className="p-2 rounded-full bg-white border border-jiwo-primaryLight/40 hover:bg-jiwo-bg text-jiwo-textMuted hover:text-jiwo-primary transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-xl font-extrabold text-jiwo-textDark tracking-tight">Kebiasaan Menenangkan</h1>
          <p className="text-xs text-jiwo-textMuted">Langkah kecil setiap hari untuk hati yang lebih ringan.</p>
        </div>
      </div>

      {/* Hero — Jiwo mirrors today's progress */}
      <div
        ref={heroRef}
        className="bg-white border border-jiwo-primaryLight/25 rounded-3xl p-5 shadow-3xs"
      >
        <div className="flex items-center gap-2">
          {/* Jiwo's own box is a fixed 180px that `scale` only shrinks visually.
              Taking it out of flow lets the soft aura bleed instead of being
              clipped into a hard-edged square, without disturbing the layout. */}
          <div className="relative w-28 h-28 shrink-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <JiwoMascot state={jiwoState} scale={0.62} showAnimation />
            </div>
          </div>
          <ScoreRing value={score} />
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-jiwo-textDark leading-relaxed">{target.message}</p>
          {habits.length > 0 && (
            <div className="flex items-center gap-2 text-3xs font-bold text-jiwo-textMuted">
              <span
                className={`px-2.5 py-1 rounded-full ${
                  targetMet
                    ? 'bg-jiwo-sageLight text-jiwo-sage'
                    : 'bg-jiwo-blueLight text-jiwo-blueCalm'
                }`}
              >
                {doneCount} / {target.target} target hari ini
              </span>
              {target.gentle && (
                <span className="flex items-center gap-1 text-jiwo-primary">
                  <Shield className="w-3 h-3" /> Target diringankan
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compassionate streak */}
      {habits.length > 0 && (
        <div className="bg-gradient-to-r from-jiwo-primaryLight/40 to-jiwo-sageLight/40 border border-jiwo-primaryLight/30 rounded-3xl p-4 flex items-center gap-3.5">
          <span className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
            <Flame className="w-5.5 h-5.5 text-jiwo-primary" />
          </span>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-extrabold text-jiwo-textDark">
              {streak > 0 ? `${streak} hari beruntun` : 'Mulai rangkaianmu hari ini'}
            </p>
            <p className="text-3xs text-jiwo-textMuted leading-snug">
              {graceUsed > 0
                ? `${graceUsed} hari pelindung terpakai — rangkaianmu tetap aman 🤍`
                : 'Satu hari libur per minggu tidak akan memutus rangkaianmu.'}
            </p>
          </div>
        </div>
      )}

      {/* Stress-aware suggestion — withdrawn once the day's target is met, so
          reaching a deliberately gentle goal is never followed by another nudge. */}
      {suggestion && !targetMet && (
        <button
          onClick={() => suggestion.link_to && navigate(suggestion.link_to)}
          className="w-full text-left bg-jiwo-stress/8 border border-jiwo-stress/25 rounded-3xl p-4 flex items-center gap-3.5 hover:bg-jiwo-stress/12 transition"
        >
          <span className="text-2xl shrink-0">{suggestion.icon}</span>
          <div className="flex-grow min-w-0">
            <p className="text-3xs font-bold uppercase tracking-wider text-jiwo-stress">Saran Jiwo</p>
            <p className="text-xs font-semibold text-jiwo-textDark leading-snug">
              Kamu terlihat cukup tegang. Coba "{suggestion.title}" — biasanya ini membantu.
            </p>
          </div>
          {suggestion.link_to && <ChevronRight className="w-4 h-4 text-jiwo-stress shrink-0" />}
        </button>
      )}

      {/* Today's habits */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xs font-extrabold uppercase tracking-wider text-jiwo-textMuted">
            Kebiasaan Hari Ini
          </h2>
          {habits.length > 0 && (
            <span className="text-3xs font-bold text-jiwo-textMuted">
              {habits.length}{!isPremium && ` / ${FREE_HABIT_LIMIT}`}
            </span>
          )}
        </div>

        {habits.length === 0 ? (
          <div className="bg-white border border-dashed border-jiwo-primaryLight/50 rounded-3xl p-7 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-jiwo-primary mx-auto" />
            <p className="text-sm font-bold text-jiwo-textDark">Belum ada kebiasaan</p>
            <p className="text-2xs text-jiwo-textMuted max-w-xs mx-auto leading-relaxed">
              Pilih satu kebiasaan kecil yang menenangkan. Jiwo akan menemanimu merawatnya setiap hari.
            </p>
          </div>
        ) : (
          habits.map((h) => {
            const done = doneToday.has(h.id);
            const meta = CATEGORY_META[h.category] ?? CATEGORY_META.calming;
            return (
              <div
                key={h.id}
                className={`group bg-white border rounded-3xl p-3.5 flex items-center gap-3.5 transition ${
                  done ? 'border-jiwo-sage/40' : 'border-jiwo-primaryLight/25'
                }`}
                style={done ? { background: meta.soft } : undefined}
              >
                <button
                  onClick={(e) => toggleHabit(h, e.currentTarget)}
                  aria-label={done ? `Batalkan ${h.title}` : `Tandai ${h.title} selesai`}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-2 transition ${
                    done ? 'border-transparent text-white' : 'border-jiwo-primaryLight/70 text-transparent'
                  }`}
                  style={done ? { background: meta.color } : undefined}
                >
                  {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-lg">{h.icon}</span>}
                </button>

                <button
                  onClick={() => h.link_to && navigate(h.link_to)}
                  disabled={!h.link_to}
                  className="flex-grow min-w-0 text-left disabled:cursor-default"
                >
                  <p
                    className={`text-sm font-bold leading-snug ${
                      done ? 'text-jiwo-textMuted line-through' : 'text-jiwo-textDark'
                    }`}
                  >
                    {h.title}
                  </p>
                  <span className="text-4xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                    {h.link_to && ' · buka sesi'}
                  </span>
                </button>

                <button
                  onClick={() => removeHabit(h)}
                  aria-label={`Hapus ${h.title}`}
                  className="p-2 rounded-full text-jiwo-textMuted/0 group-hover:text-jiwo-textMuted/60 hover:!text-jiwo-stress transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}

        <button
          onClick={() => (atLimit ? setShowPremium(true) : setShowAdd(true))}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-3xl border-2 border-dashed border-jiwo-primaryLight/60 text-jiwo-primary font-bold text-xs hover:bg-jiwo-primaryLight/20 transition"
        >
          {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {atLimit ? `Batas ${FREE_HABIT_LIMIT} kebiasaan — buka Premium` : 'Tambah kebiasaan'}
        </button>
      </div>

      {/* Calendar */}
      <HabitCalendar
        month={month}
        habits={habits}
        logs={logs}
        stressByDay={stressByDay}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onMonthShift={(d) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))}
      />

      {/* Tapped-day detail */}
      {dayDetail && selectedDay && (
        <div className="bg-white border border-jiwo-primaryLight/25 rounded-3xl p-4 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-jiwo-textDark">
              {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              aria-label="Tutup detail"
              className="p-1 rounded-full text-jiwo-textMuted hover:bg-jiwo-bg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {dayDetail.stress != null && (
            <div className="flex items-center gap-2 text-3xs font-bold">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: stressColor(dayDetail.stress) ?? '#ccc' }}
              />
              <span className="text-jiwo-textMuted">
                Tingkat ketegangan {dayDetail.stress.toFixed(1)} dari 5
              </span>
            </div>
          )}

          {dayDetail.done.length ? (
            <div className="flex flex-wrap gap-1.5">
              {dayDetail.done.map((h) => (
                <span
                  key={h.id}
                  className="px-2.5 py-1 rounded-full bg-jiwo-sageLight text-jiwo-sage text-3xs font-bold"
                >
                  {h.icon} {h.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-2xs text-jiwo-textMuted">
              Tidak ada kebiasaan tercatat hari itu — dan itu tidak apa-apa 🤍
            </p>
          )}
          <p className="text-4xs text-jiwo-textMuted">
            {dayDetail.done.length} dari {dayDetail.total} kebiasaan
          </p>
        </div>
      )}

      {/* Correlation insight */}
      {insight ? (
        <div className="bg-jiwo-sageLight/50 border border-jiwo-sage/25 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-jiwo-sage" />
            <h3 className="text-3xs font-extrabold uppercase tracking-wider text-jiwo-sage">
              Yang Jiwo Perhatikan
            </h3>
          </div>
          <p className="text-sm font-semibold text-jiwo-textDark leading-relaxed">
            Di hari kamu {insight.icon} <strong>{insight.title.toLowerCase()}</strong>, rata-rata
            ketegangan kamu <strong>{insight.withAvg.toFixed(1)}</strong> — dibanding{' '}
            <strong>{insight.withoutAvg.toFixed(1)}</strong> di hari lain.
          </p>
          <p className="text-3xs text-jiwo-textMuted">
            Selisih {insight.delta.toFixed(1)} poin. Kebiasaan ini tampaknya benar-benar membantumu 💙
          </p>
        </div>
      ) : (
        habits.length > 0 && (
          <div className="bg-white border border-jiwo-primaryLight/25 rounded-3xl p-5 text-center space-y-1.5">
            <Sparkles className="w-5 h-5 text-jiwo-primary mx-auto" />
            <p className="text-xs font-bold text-jiwo-textDark">Jiwo sedang mengamati polamu</p>
            <p className="text-3xs text-jiwo-textMuted leading-relaxed max-w-xs mx-auto">
              Setelah sekitar {MIN_INSIGHT_DAYS} hari mencatat mood dan kebiasaan, Jiwo akan
              menunjukkan kebiasaan mana yang paling menurunkan ketegangamu.
            </p>
          </div>
        )
      )}

      {/* Add-habit sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)} />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 shadow-2xl border-t border-jiwo-primaryLight/30 max-h-[80vh] overflow-y-auto"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.2,1,0.3,1)' }}
          >
            <span className="block w-10 h-1 rounded-full bg-jiwo-primaryLight/70 mx-auto mb-4" aria-hidden="true" />
            <button
              onClick={() => setShowAdd(false)}
              aria-label="Tutup"
              className="absolute top-4 right-4 p-1.5 rounded-full text-jiwo-textMuted hover:bg-jiwo-bg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-extrabold text-jiwo-textDark mb-1">Pilih kebiasaan</h2>
            <p className="text-2xs text-jiwo-textMuted mb-4">
              Mulai dari yang paling ringan. Satu kebiasaan kecil sudah cukup 🌱
            </p>

            <div className="space-y-2">
              {HABIT_TEMPLATES.filter((t) => !habits.some((h) => h.title === t.title)).map((t) => {
                const meta = CATEGORY_META[t.category];
                return (
                  <button
                    key={t.title}
                    onClick={() => addHabit(t)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-jiwo-primaryLight/30 hover:border-jiwo-primary/40 hover:bg-jiwo-bg transition text-left"
                  >
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-jiwo-textDark leading-snug">{t.title}</p>
                      {/* Category plus a 3-dot strength meter. Dots keep this on
                          one line and show the scale (2 of 3) that words didn't. */}
                      <span
                        className="flex items-center gap-1.5 whitespace-nowrap text-4xs font-bold uppercase tracking-wider"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                        <span
                          className="flex items-center gap-0.5"
                          title={`Peredam stres ${t.stress_impact} dari 3`}
                          aria-label={`Peredam stres ${t.stress_impact} dari 3`}
                        >
                          {[1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className={`w-1 h-1 rounded-full bg-current ${
                                i <= t.stress_impact ? 'opacity-100' : 'opacity-25'
                              }`}
                            />
                          ))}
                        </span>
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-jiwo-primary shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Custom habit */}
            <div className="mt-5 pt-4 border-t border-jiwo-primaryLight/25">
              <p className="text-2xs font-bold text-jiwo-textDark mb-2">Atau buat sendiri</p>
              <div className="flex gap-2">
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="mis. Menyiram tanaman"
                  maxLength={60}
                  className="flex-grow px-3.5 py-2.5 rounded-2xl border border-jiwo-primaryLight/40 text-xs focus:outline-none focus:border-jiwo-primary transition"
                />
                <button
                  disabled={!customTitle.trim()}
                  onClick={() =>
                    addHabit({
                      title: customTitle.trim(),
                      icon: '🌱',
                      category: 'calming',
                      stress_impact: 2,
                      link_to: null,
                    })
                  }
                  className="px-4 rounded-2xl bg-jiwo-primary text-white font-bold text-xs disabled:opacity-40 transition"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PremiumSheet open={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}
