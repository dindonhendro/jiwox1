import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

// An auto-playing canvas "film": Jiwo breathes and drifts through four
// emotional chapters (senang → tenang → sedih → terlelap) with cinematic
// colour grading — procedurally rendered, no video file needed.

const LOOP_SEC = 28;

interface Chapter {
  at: number;
  img: string;
  label: string;
  top: [number, number, number];
  bot: [number, number, number];
  halo: [number, number, number];
  haloA: number;
  rot: number;
}

// Soft pastel palettes — soothing daylight tones, never dark or heavy.
const CHAPTERS: Chapter[] = [
  { at: 0.0, img: '/jiwo/happy.png', label: 'Senang', top: [253, 238, 216], bot: [250, 224, 196], halo: [246, 196, 137], haloA: 0.4, rot: 0 },
  { at: 0.27, img: '/jiwo/calm.png', label: 'Tenang', top: [222, 240, 232], bot: [198, 228, 222], halo: [79, 163, 165], haloA: 0.3, rot: 0 },
  { at: 0.54, img: '/jiwo/sad.png', label: 'Bersedih Bersama', top: [225, 236, 248], bot: [204, 221, 241], halo: [107, 144, 179], haloA: 0.28, rot: 0 },
  { at: 0.78, img: '/jiwo/sleep.png', label: 'Terlelap', top: [235, 229, 248], bot: [219, 210, 242], halo: [147, 130, 205], haloA: 0.3, rot: 0.05 },
];
const XFADE = 0.06;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function chapterBlend(p: number): [number, number, number] {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (p >= CHAPTERS[i].at) {
      const next = CHAPTERS[i + 1];
      if (next && p > next.at - XFADE) {
        return [i, i + 1, smooth((p - (next.at - XFADE)) / XFADE)];
      }
      // Loop back to the first chapter at the very end
      if (i === CHAPTERS.length - 1 && p > 1 - XFADE) {
        return [i, 0, smooth((p - (1 - XFADE)) / XFADE)];
      }
      return [i, i, 0];
    }
  }
  return [0, 0, 0];
}

export default function JiwoFilm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [label, setLabel] = useState('Senang');
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgs: Record<string, HTMLImageElement> = {};
    CHAPTERS.forEach((c) => {
      const im = new Image();
      im.src = c.img;
      imgs[c.img] = im;
    });

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.imageSmoothingQuality = 'high';
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    let raf = 0;
    let elapsed = 0; // film time, only advances while playing
    let lastNow = performance.now();
    let currentLabel = '';

    const drawMascot = (img: HTMLImageElement, alpha: number, t: number, rot: number) => {
      if (!img.complete || !img.naturalWidth || alpha <= 0.003) return;
      const breathe = 1 + 0.02 * Math.sin(t * 1.1);
      const bob = Math.sin(t * 0.8) * 5;
      const mh = h * 0.72 * breathe;
      const mw = mh * (img.naturalWidth / img.naturalHeight);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, h * 0.56 + bob);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(img, -mw / 2, -mh / 2, mw, mh);
      ctx.restore();
    };

    const draw = (t: number) => {
      const p = (t % LOOP_SEC) / LOOP_SEC;
      const [ia, ib, mix] = chapterBlend(p);
      const A = CHAPTERS[ia], B = CHAPTERS[ib];

      const top = A.top.map((v, i) => Math.round(lerp(v, B.top[i], mix)));
      const bot = A.bot.map((v, i) => Math.round(lerp(v, B.bot[i], mix)));
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgb(${top.join(',')})`);
      g.addColorStop(1, `rgb(${bot.join(',')})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Drifting pastel cloud-blobs — a slow, living aurora of soft colour
      const blob = (x: number, y: number, r: number, rgb: number[], a: number) => {
        const bg2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        bg2.addColorStop(0, `rgba(${rgb.join(',')},${a})`);
        bg2.addColorStop(1, `rgba(${rgb.join(',')},0)`);
        ctx.fillStyle = bg2;
        ctx.fillRect(0, 0, w, h);
      };
      const halo = A.halo.map((v, i) => Math.round(lerp(v, B.halo[i], mix)));
      blob(
        w * (0.22 + 0.08 * Math.sin(t * 0.21)),
        h * (0.3 + 0.1 * Math.cos(t * 0.17)),
        h * 0.55, [255, 255, 255], 0.5
      );
      blob(
        w * (0.8 + 0.07 * Math.cos(t * 0.15)),
        h * (0.35 + 0.09 * Math.sin(t * 0.19)),
        h * 0.5, halo, 0.22
      );

      // Warm glow behind Jiwo
      const haloA = lerp(A.haloA, B.haloA, mix);
      const rg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.65);
      rg.addColorStop(0, `rgba(${halo.join(',')},${haloA})`);
      rg.addColorStop(1, `rgba(${halo.join(',')},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);

      drawMascot(imgs[A.img], 1 - mix, t, A.rot * (1 - mix));
      if (ib !== ia) drawMascot(imgs[B.img], mix, t, B.rot * mix);

      // Progress hairline (dark-on-light so it stays visible on pastel)
      ctx.fillStyle = 'rgba(44,62,63,0.1)';
      ctx.fillRect(0, h - 2, w, 2);
      ctx.fillStyle = 'rgba(79,163,165,0.85)';
      ctx.fillRect(0, h - 2, w * p, 2);

      const active = mix > 0.5 ? B : A;
      if (active.label !== currentLabel) {
        currentLabel = active.label;
        setLabel(active.label);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      if (playingRef.current) elapsed += dt;
      draw(elapsed);
      raf = requestAnimationFrame(loop);
    };

    // Draw the first frame synchronously as soon as images arrive (so the
    // film is never blank, even in a hidden tab), then run the loop
    Promise.all(
      Object.values(imgs).map(
        (im) => new Promise((res) => { im.onload = res; im.onerror = res; })
      )
    ).then(() => {
      draw(0);
      lastNow = performance.now();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-jiwo-primaryLight/20 select-none group">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Chapter label */}
      <div className="absolute top-3.5 left-4 text-3xs font-extrabold uppercase tracking-[0.25em] text-jiwo-textDark/55">
        Film Jiwo · {label}
      </div>

      {/* Play / pause */}
      <button
        onClick={() => setPlaying((v) => !v)}
        aria-label={playing ? 'Jeda film' : 'Putar film'}
        className="absolute bottom-3.5 left-3.5 w-9 h-9 rounded-full bg-white/65 hover:bg-white/90 backdrop-blur flex items-center justify-center text-jiwo-primary shadow-sm transition"
      >
        {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>
    </div>
  );
}
