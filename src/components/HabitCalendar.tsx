import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, habitsActiveOn, stressColor, type Habit, type HabitLog } from '@/lib/habits';

interface HabitCalendarProps {
  month: Date;
  habits: Habit[];
  logs: HabitLog[];
  stressByDay: Record<string, number>;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
  onMonthShift: (delta: number) => void;
}

const WEEKDAYS = ['S', 'S', 'R', 'K', 'J', 'S', 'M']; // Senin → Minggu

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Month grid where every cell carries two signals at once: the fill tint is how
 * stressed the user was that day, and the ring around it is how much of their
 * routine they completed. Seeing rings fill while tints cool is the whole point.
 */
export default function HabitCalendar({
  month,
  habits,
  logs,
  stressByDay,
  selectedDay,
  onSelectDay,
  onMonthShift,
}: HabitCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const todayKey = dateKey(new Date());

  // Completion count per day, from the raw logs
  const doneByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of logs) m[l.done_on] = (m[l.done_on] || 0) + 1;
    return m;
  }, [logs]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    // JS weeks start Sunday; shift so Monday leads the grid.
    const lead = (first.getDay() + 6) % 7;

    const out: ({ key: string; day: number } | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      out.push({ key: dateKey(date), day: d });
    }
    return out;
  }, [month]);

  // Gentle stagger whenever the month changes
  useEffect(() => {
    const el = gridRef.current;
    if (!el || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-cell]',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', stagger: 0.012 }
      );
    }, el);
    return () => ctx.revert();
  }, [month]);

  const monthLabel = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const isFuture =
    month.getFullYear() > new Date().getFullYear() ||
    (month.getFullYear() === new Date().getFullYear() && month.getMonth() >= new Date().getMonth());

  return (
    <div className="bg-white border border-jiwo-primaryLight/25 rounded-3xl p-5 shadow-3xs space-y-4">
      {/* Month switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonthShift(-1)}
          aria-label="Bulan sebelumnya"
          className="p-1.5 rounded-full text-jiwo-textMuted hover:text-jiwo-primary hover:bg-jiwo-bg transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-extrabold text-jiwo-textDark capitalize">{monthLabel}</h3>
        <button
          onClick={() => onMonthShift(1)}
          disabled={isFuture}
          aria-label="Bulan berikutnya"
          className="p-1.5 rounded-full text-jiwo-textMuted hover:text-jiwo-primary hover:bg-jiwo-bg transition disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-4xs font-bold uppercase text-jiwo-textMuted/70 text-center">
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div ref={gridRef} className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`pad-${i}`} />;

          const active = habitsActiveOn(habits, cell.key).length;
          const done = doneByDay[cell.key] || 0;
          const ratio = active ? Math.min(1, done / active) : 0;
          const tint = stressColor(stressByDay[cell.key]);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDay;
          const ahead = cell.key > todayKey;

          // Ring geometry (r=15 in a 36-box → circumference ≈ 94.2)
          const CIRC = 94.2;

          return (
            <button
              key={cell.key}
              data-cell
              disabled={ahead}
              onClick={() => onSelectDay(isSelected ? null : cell.key)}
              className={`relative aspect-square rounded-2xl flex items-center justify-center transition disabled:opacity-30 ${
                isSelected ? 'ring-2 ring-jiwo-primary ring-offset-1' : ''
              }`}
              style={{ background: tint ? `${tint}26` : 'rgba(0,0,0,0.02)' }}
              aria-label={`${cell.day}: ${done} dari ${active} kebiasaan`}
            >
              {/* Completion ring */}
              {ratio > 0 && (
                <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#4FA3A5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${ratio * CIRC} ${CIRC}`}
                    opacity={0.9}
                  />
                </svg>
              )}
              <span
                className={`text-2xs font-bold ${
                  isToday ? 'text-jiwo-primary' : 'text-jiwo-textDark/75'
                }`}
              >
                {cell.day}
              </span>
              {isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-jiwo-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1 text-4xs text-jiwo-textMuted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-jiwo-primary" /> Kebiasaan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#8FBC8F66' }} /> Tenang
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#E88E8D66' }} /> Tegang
        </span>
      </div>
    </div>
  );
}
