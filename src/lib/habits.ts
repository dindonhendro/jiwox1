// Pure helpers for the habit tracker: date keys, streak maths, stress scoring
// and the habit↔stress correlation insight. Kept free of React and Supabase so
// the rules stay easy to reason about (and to change) in one place.

export type HabitCategory = 'calming' | 'body' | 'reflection' | 'social' | 'rest';

export interface Habit {
  id: string;
  title: string;
  icon: string;
  category: HabitCategory;
  stress_impact: number; // 1..3
  link_to: string | null;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  habit_id: string;
  done_on: string; // 'YYYY-MM-DD'
}

// --- DATES (local time, so a day flips at the user's midnight, not UTC) ---

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// --- CATEGORIES ---

export const CATEGORY_META: Record<
  HabitCategory,
  { label: string; color: string; soft: string }
> = {
  calming: { label: 'Menenangkan', color: '#4FA3A5', soft: 'rgba(79,163,165,0.12)' },
  body: { label: 'Tubuh', color: '#8FBC8F', soft: 'rgba(143,188,143,0.14)' },
  reflection: { label: 'Refleksi', color: '#6B90B3', soft: 'rgba(107,144,179,0.13)' },
  social: { label: 'Sosial', color: '#F4D35E', soft: 'rgba(244,211,94,0.18)' },
  rest: { label: 'Istirahat', color: '#9382CD', soft: 'rgba(147,130,205,0.13)' },
};

// Starter habits drawn from everyday stress-relief practice. Several deep-link
// straight into the calming tools the app already has.
export const HABIT_TEMPLATES: Omit<Habit, 'id' | 'archived' | 'created_at'>[] = [
  { title: 'Latihan napas tenang', icon: '🌬️', category: 'calming', stress_impact: 3, link_to: '/rescue' },
  { title: 'Meditasi 5 menit', icon: '🧘', category: 'calming', stress_impact: 3, link_to: '/visualization' },
  { title: 'Tulis jurnal syukur', icon: '📓', category: 'reflection', stress_impact: 2, link_to: '/journal' },
  { title: 'Tidur sebelum jam 23.00', icon: '🌙', category: 'rest', stress_impact: 3, link_to: '/tools/sleep' },
  { title: 'Jalan pagi 15 menit', icon: '🚶', category: 'body', stress_impact: 2, link_to: null },
  { title: 'Minum cukup air', icon: '💧', category: 'body', stress_impact: 1, link_to: null },
  { title: 'Peregangan ringan', icon: '🤸', category: 'body', stress_impact: 2, link_to: null },
  { title: 'Ngobrol dengan orang terdekat', icon: '🤝', category: 'social', stress_impact: 2, link_to: null },
  { title: 'Detoks layar 1 jam', icon: '📵', category: 'reflection', stress_impact: 2, link_to: null },
  { title: 'Dengar musik menenangkan', icon: '🎧', category: 'calming', stress_impact: 1, link_to: null },
];

// --- STRESS COLOURS (anxiety_level 1..5 → calm green to soft red) ---

const STRESS_SCALE = ['#8FBC8F', '#A9C89B', '#E9C46A', '#E8A87C', '#E88E8D'];

export function stressColor(level: number | null | undefined): string | null {
  if (level == null) return null;
  const i = Math.min(5, Math.max(1, Math.round(level))) - 1;
  return STRESS_SCALE[i];
}

// --- HABITS ACTIVE ON A GIVEN DAY ---

// A habit only counts for days on or after it was created, so past months
// aren't retroactively marked "incomplete" for habits that didn't exist yet.
export function habitsActiveOn(habits: Habit[], key: string): Habit[] {
  return habits.filter((h) => h.created_at.slice(0, 10) <= key);
}

// --- COMPASSIONATE STREAK ---
// A missed day does NOT reset the streak outright: the user gets one "hari
// pelindung" (grace day) per week walked back. Mental-health habits should
// forgive a bad day rather than punish it. Today never counts as a miss —
// the day isn't over yet.

export interface StreakResult {
  streak: number;
  graceUsed: number;
}

export function calcStreak(doneDays: Set<string>, today = new Date()): StreakResult {
  let streak = 0;
  let graceUsed = 0;

  for (let i = 0; i < 400; i++) {
    const key = dateKey(addDays(today, -i));
    if (doneDays.has(key)) {
      streak++;
      continue;
    }
    if (i === 0) continue; // today is still in progress
    const allowed = Math.floor(i / 7) + 1; // one protected day per week
    // The miss that exceeds the allowance is what ENDS the streak — it was
    // never protected, so it must not be reported as a grace day spent.
    if (graceUsed + 1 > allowed) break;
    graceUsed++;
  }

  // With no streak there is nothing to have protected.
  return { streak, graceUsed: streak > 0 ? graceUsed : 0 };
}

// --- DAILY CALM SCORE ---
// Weighted by stress_impact, so finishing one deeply calming habit counts for
// more than ticking an easy one.

export function calmScore(habits: Habit[], doneIds: Set<string>): number {
  const total = habits.reduce((s, h) => s + h.stress_impact, 0);
  if (!total) return 0;
  const done = habits.reduce((s, h) => (doneIds.has(h.id) ? s + h.stress_impact : s), 0);
  return Math.round((done / total) * 100);
}

// --- ADAPTIVE TARGET ---
// On high-stress days the bar drops: asking for a full routine when someone is
// already overwhelmed is how habit apps become another source of guilt.

export interface AdaptiveTarget {
  target: number;
  message: string;
  gentle: boolean;
}

export function adaptiveTarget(habitCount: number, recentStress: number | null): AdaptiveTarget {
  if (!habitCount) {
    return { target: 0, message: 'Yuk mulai dengan satu kebiasaan kecil 🌱', gentle: false };
  }
  if (recentStress != null && recentStress >= 4) {
    return {
      target: 1,
      message: 'Belakangan ini berat ya. Hari ini cukup satu langkah kecil saja 🤍',
      gentle: true,
    };
  }
  if (recentStress != null && recentStress >= 3) {
    return {
      target: Math.max(1, Math.ceil(habitCount / 2)),
      message: 'Pikiranmu lagi cukup ramai. Pelan-pelan saja, separuh sudah hebat 🌿',
      gentle: true,
    };
  }
  return { target: habitCount, message: 'Hatimu lagi stabil — waktu yang pas untuk lengkap 💙', gentle: false };
}

// --- HABIT ↔ STRESS CORRELATION ---
// Compares mean anxiety on days a habit was done against days it wasn't. This
// is the payoff of the whole feature: personal evidence that the habit works.

export const MIN_INSIGHT_DAYS = 10;
const MIN_SAMPLE_PER_SIDE = 3;
const MIN_MEANINGFUL_DELTA = 0.3;

export interface HabitInsight {
  habitId: string;
  title: string;
  icon: string;
  withAvg: number;
  withoutAvg: number;
  delta: number; // positive = calmer on days the habit was done
}

export function findBestInsight(
  habits: Habit[],
  logs: HabitLog[],
  stressByDay: Record<string, number>
): HabitInsight | null {
  const days = Object.keys(stressByDay);
  if (days.length < MIN_INSIGHT_DAYS) return null;

  const doneByHabit = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set());
    doneByHabit.get(l.habit_id)!.add(l.done_on);
  }

  let best: HabitInsight | null = null;

  for (const h of habits) {
    const done = doneByHabit.get(h.id) ?? new Set<string>();
    const withVals: number[] = [];
    const withoutVals: number[] = [];

    for (const day of days) {
      // Ignore days before the habit existed — it couldn't have been done then.
      if (h.created_at.slice(0, 10) > day) continue;
      (done.has(day) ? withVals : withoutVals).push(stressByDay[day]);
    }

    if (withVals.length < MIN_SAMPLE_PER_SIDE || withoutVals.length < MIN_SAMPLE_PER_SIDE) continue;

    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const withAvg = mean(withVals);
    const withoutAvg = mean(withoutVals);
    const delta = withoutAvg - withAvg;

    if (delta < MIN_MEANINGFUL_DELTA) continue;
    if (!best || delta > best.delta) {
      best = { habitId: h.id, title: h.title, icon: h.icon, withAvg, withoutAvg, delta };
    }
  }

  return best;
}

// --- SUGGESTION ---
// When stress is elevated, nudge the strongest calming habit still undone.

export function suggestHabit(
  habits: Habit[],
  doneIds: Set<string>,
  recentStress: number | null
): Habit | null {
  if (recentStress == null || recentStress < 3) return null;
  const undone = habits.filter((h) => !doneIds.has(h.id));
  if (!undone.length) return null;
  return undone.slice().sort((a, b) => b.stress_impact - a.stress_impact)[0];
}
