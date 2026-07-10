import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '@/lib/supabaseClient';
import MoodIcon, { type MoodKey } from '@/components/MoodIcon';
import { Calendar, PlusCircle, CheckCircle, RefreshCw, Feather, Sparkles, Send } from 'lucide-react';

type JournalType = 'mood_story' | 'gratitude' | 'future_self';

// Accent colour per mood — used as the hand-painted edge on history cards
const MOOD_ACCENT: Record<string, string> = {
  tenang: '#8FBC8F',
  senang: '#E9BE4B',
  cemas: '#E88E8D',
  sedih: '#6B90B3',
  lelah: '#9382CD',
};

const ACTIVE_MOOD_CLASSES: Record<string, string> = {
  tenang: 'bg-[#8FBC8F]/25 text-[#3b5c3b] border-[#8FBC8F]/60 shadow-xs scale-[1.03]',
  senang: 'bg-[#E9BE4B]/25 text-[#8f6d0f] border-[#E9BE4B]/60 shadow-xs scale-[1.03]',
  cemas: 'bg-[#E88E8D]/25 text-[#913b39] border-[#E88E8D]/60 shadow-xs scale-[1.03]',
  sedih: 'bg-[#6B90B3]/25 text-[#2b4c6e] border-[#6B90B3]/60 shadow-xs scale-[1.03]',
  lelah: 'bg-[#9382CD]/25 text-[#4a3a8a] border-[#9382CD]/60 shadow-xs scale-[1.03]',
};

const TEMPLATE_CLASSES: Record<string, { active: string; inactive: string }> = {
  mood_story: {
    active: 'border-[#E88E8D] bg-gradient-to-b from-[#E88E8D]/20 to-white text-[#913b39] shadow-sm scale-[1.03]',
    inactive: 'border-[#E88E8D]/25 hover:bg-[#E88E8D]/5 text-jiwo-textMuted hover:-translate-y-0.5'
  },
  gratitude: {
    active: 'border-[#E9BE4B] bg-gradient-to-b from-[#E9BE4B]/20 to-white text-[#8f6d0f] shadow-sm scale-[1.03]',
    inactive: 'border-[#E9BE4B]/25 hover:bg-[#E9BE4B]/5 text-jiwo-textMuted hover:-translate-y-0.5'
  },
  future_self: {
    active: 'border-[#8FBC8F] bg-gradient-to-b from-[#8FBC8F]/20 to-white text-[#3b5c3b] shadow-sm scale-[1.03]',
    inactive: 'border-[#8FBC8F]/25 hover:bg-[#8FBC8F]/5 text-jiwo-textMuted hover:-translate-y-0.5'
  }
};

// Gentle writing sparks that rotate under the textarea label
const WRITING_PROMPTS = [
  'Apa satu hal kecil yang membuatmu tersenyum hari ini?',
  'Kalau perasaanmu hari ini sebuah cuaca, cuaca apa dia?',
  'Apa yang ingin kamu lepaskan sebelum tidur malam ini?',
  'Siapa yang membuat harimu sedikit lebih ringan?',
  'Apa yang kamu butuhkan, tapi belum sempat kamu minta?',
];

export default function Journal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [journalType, setJournalType] = useState<JournalType>('mood_story');
  
  // Form states
  const [moodTag, setMoodTag] = useState('tenang');
  const [content, setContent] = useState('');
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Art & animation refs
  const formAreaRef = useRef<HTMLFormElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const historyListRef = useRef<HTMLDivElement>(null);
  const [promptIdx, setPromptIdx] = useState(0);

  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rotate the writing spark every few seconds while composing a mood story
  useEffect(() => {
    if (activeTab !== 'write' || journalType !== 'mood_story') return;
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % WRITING_PROMPTS.length), 6000);
    return () => clearInterval(t);
  }, [activeTab, journalType]);

  // Soft settle animation when switching journal template
  useEffect(() => {
    const el = formAreaRef.current;
    if (!el || reducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0.35, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
    return () => { tween.kill(); };
  }, [journalType]);

  // History cards float in one after another, like pages settling
  useEffect(() => {
    const list = historyListRef.current;
    if (!list || historyLoading || !history.length || reducedMotion()) return;
    const tween = gsap.fromTo(
      list.children,
      { opacity: 0, y: 26, rotateZ: -0.6 },
      { opacity: 1, y: 0, rotateZ: 0, duration: 0.55, stagger: 0.09, ease: 'power3.out', clearProps: 'transform' }
    );
    return () => { tween.kill(); };
  }, [historyLoading, history, activeTab]);

  // A little burst of sparks from the save button on success
  const celebrateSave = () => {
    const btn = saveBtnRef.current;
    if (!btn || reducedMotion()) return;
    const rect = btn.getBoundingClientRect();
    ['✨', '🌿', '✨', '💛', '✨', '🌿'].forEach((emoji, i) => {
      const s = document.createElement('span');
      s.textContent = emoji;
      s.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${rect.top}px;font-size:16px;pointer-events:none;z-index:60;`;
      document.body.appendChild(s);
      gsap.fromTo(
        s,
        { x: 0, y: 0, scale: 0.5, opacity: 1 },
        {
          x: (i - 2.5) * 34 + gsap.utils.random(-8, 8),
          y: gsap.utils.random(-70, -110),
          scale: gsap.utils.random(0.9, 1.3),
          rotation: gsap.utils.random(-40, 40),
          opacity: 0,
          duration: 1.1,
          ease: 'power2.out',
          onComplete: () => s.remove(),
        }
      );
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching journal history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      let finalContent = '';
      if (journalType === 'mood_story') {
        finalContent = content;
      } else if (journalType === 'gratitude') {
        finalContent = JSON.stringify([gratitude1, gratitude2, gratitude3]);
      } else {
        finalContent = content; // Future self letter
      }

      if (!finalContent.trim() && journalType !== 'gratitude') {
        throw new Error('Jurnal tidak boleh kosong');
      }

      const { error } = await supabase
        .from('journal_entries')
        .insert({
          type: journalType,
          content: finalContent,
          mood_tag: moodTag,
        });

      if (error) throw error;

      // Clear states
      setContent('');
      setGratitude1('');
      setGratitude2('');
      setGratitude3('');
      setSuccessMsg('Jurnalmu berhasil disimpan dengan aman.');
      celebrateSave();
      
      // Auto redirect to history tab after 2 seconds
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('history');
      }, 2000);

    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan jurnal');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const parseGratitude = (contentStr: string) => {
    try {
      const arr = JSON.parse(contentStr);
      if (Array.isArray(arr)) return arr;
      return [contentStr];
    } catch {
      return [contentStr];
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title — Jiwo floats beside it, with a hand-drawn ink underline */}
      <div className="text-center relative" data-animate>
        <div className="flex items-end justify-center gap-1.5">
          <img
            src="/jiwo/happy.png"
            alt=""
            draggable={false}
            className="h-12 w-12 object-contain animate-float-slow drop-shadow-sm -mb-0.5"
          />
          <h1 className="text-2xl font-extrabold text-jiwo-textDark font-sans">Jurnal Jiwo</h1>
        </div>
        <svg width="130" height="9" viewBox="0 0 130 9" className="mx-auto mt-1 text-jiwo-primary/45" aria-hidden="true">
          <path d="M3 6 Q 33 1.5 65 4.5 T 127 3.5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-jiwo-textMuted mt-1">Refleksikan pikiranmu di ruang aman terenkripsi</p>
      </div>

      {/* Tab Selectors — a white pill glides between the two tabs */}
      <div className="relative flex bg-jiwo-blueLight/50 p-1.5 rounded-2xl border border-jiwo-primaryLight/20" data-animate>
        <span
          className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] ${
            activeTab === 'history' ? 'translate-x-full' : 'translate-x-0'
          }`}
          aria-hidden="true"
        />
        <button
          onClick={() => setActiveTab('write')}
          className={`relative z-10 flex-grow py-2.5 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'write' ? 'text-jiwo-primary' : 'text-jiwo-textMuted hover:text-jiwo-textDark'
          }`}
        >
          Tulis Jurnal
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`relative z-10 flex-grow py-2.5 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'history' ? 'text-jiwo-primary' : 'text-jiwo-textMuted hover:text-jiwo-textDark'
          }`}
        >
          Riwayat Jurnal
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-jiwo-sageLight text-jiwo-textDark border border-jiwo-sage/40 flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-jiwo-sage shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Write Tab */}
      {activeTab === 'write' && (
        <div className="bg-white rounded-3xl p-6 border border-jiwo-primaryLight/20 shadow-sm space-y-6 animate-fade-in">
          
          {/* Template Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-jiwo-textMuted uppercase tracking-wider">Pilih Template Jurnal</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'mood_story', label: 'Mood Story', icon: <Feather className="w-4 h-4" /> },
                { type: 'gratitude', label: 'Gratitude', icon: <Sparkles className="w-4 h-4" /> },
                { type: 'future_self', label: 'Future Self', icon: <Send className="w-4 h-4" /> }
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setJournalType(t.type as JournalType)}
                  className={`py-2.5 rounded-xl text-center text-xs font-semibold border transition-all duration-300 flex flex-col items-center gap-1 ${
                    journalType === t.type
                      ? TEMPLATE_CLASSES[t.type].active
                      : TEMPLATE_CLASSES[t.type].inactive
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5" ref={formAreaRef}>
            
            {/* Mood Tag Selector for all logs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-jiwo-textMuted uppercase tracking-wider">Bagaimana perasaanmu sekarang?</label>
              <div className="flex justify-between gap-1.5 bg-jiwo-bg/40 p-1.5 rounded-2xl border border-jiwo-primaryLight/20">
                {[
                  { tag: 'tenang' as const, label: 'Tenang' },
                  { tag: 'senang' as const, label: 'Senang' },
                  { tag: 'cemas' as const, label: 'Cemas' },
                  { tag: 'sedih' as const, label: 'Sedih' },
                  { tag: 'lelah' as const, label: 'Lelah' }
                ].map((m) => (
                  <button
                    key={m.tag}
                    type="button"
                    onClick={() => setMoodTag(m.tag)}
                    className={`flex-grow py-2.5 rounded-xl text-xs font-bold text-center transition-all duration-300 border border-transparent flex flex-col items-center gap-1 ${
                      moodTag === m.tag
                        ? ACTIVE_MOOD_CLASSES[m.tag]
                        : 'text-jiwo-textMuted hover:text-jiwo-textDark hover:bg-jiwo-bg/40'
                    }`}
                  >
                    <MoodIcon mood={m.tag} size={18} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template specific input forms */}
            {journalType === 'mood_story' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-jiwo-textMuted uppercase tracking-wider">Ceritakan Harimu</label>
                {/* Rotating writing spark */}
                <p key={promptIdx} className="text-2xs italic text-jiwo-textMuted/85 animate-fade-in flex items-start gap-1">
                  <span aria-hidden="true">💭</span> {WRITING_PROMPTS[promptIdx]}
                </p>
                <div className="relative pt-2">
                  <span className="washi-tape absolute -top-0.5 left-1/2 -translate-x-1/2 -rotate-3 w-24 h-5 rounded-sm shadow-2xs z-10" aria-hidden="true" />
                  <textarea
                    required
                    rows={6}
                    placeholder="Apa saja yang terjadi hari ini? Tumpahkan semua perasaan dan beban pikiranmu di sini..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="journal-paper w-full px-4 py-3 rounded-2xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent text-jiwo-textDark text-sm resize-none shadow-2xs"
                  />
                </div>
              </div>
            )}

            {journalType === 'gratitude' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-jiwo-textMuted uppercase tracking-wider block mb-1">3 Hal yang Disyukuri Hari Ini</label>
                {[
                  { state: gratitude1, setter: setGratitude1, num: 1, ph: 'Hal kecil pertama yang kusyukuri...', tint: '#8FBC8F' },
                  { state: gratitude2, setter: setGratitude2, num: 2, ph: 'Hal kedua yang kusyukuri...', tint: '#4FA3A5' },
                  { state: gratitude3, setter: setGratitude3, num: 3, ph: 'Hal ketiga yang kusyukuri...', tint: '#E9BE4B' }
                ].map((g) => (
                  <div key={g.num} className="relative flex items-center group">
                    <span
                      className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center text-2xs font-extrabold text-white shadow-2xs transition-transform duration-300 group-focus-within:scale-110"
                      style={{ background: g.tint }}
                    >
                      {g.num}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={g.ph}
                      value={g.state}
                      onChange={(e) => g.setter(e.target.value)}
                      className="journal-paper w-full pl-11 pr-4 py-3 rounded-xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent text-jiwo-textDark text-sm shadow-2xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {journalType === 'future_self' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-jiwo-textMuted uppercase tracking-wider">Surat untuk Dirimu di Masa Depan</label>
                <div className="relative pt-2">
                  <span className="washi-tape absolute -top-0.5 left-1/2 -translate-x-1/2 rotate-2 w-24 h-5 rounded-sm shadow-2xs z-10" aria-hidden="true" />
                  <span className="absolute top-4 right-3 text-jiwo-primaryLight z-10" aria-hidden="true">
                    <Send className="w-4 h-4 -rotate-12" />
                  </span>
                  <textarea
                    required
                    rows={6}
                    placeholder="Tulis pesan penyemangat untuk dirimu sebulan atau setahun ke depan. Ceritakan impianmu..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="journal-paper w-full px-4 py-3 rounded-2xl border border-jiwo-primaryLight/50 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent text-jiwo-textDark text-sm resize-none shadow-2xs"
                  />
                </div>
              </div>
            )}

            <button
              ref={saveBtnRef}
              type="submit"
              disabled={loading}
              className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-3.5 px-6 rounded-2xl shadow transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0"
            >
              {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </form>

        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <RefreshCw className="w-8 h-8 text-jiwo-primary animate-spin" />
              <span className="text-sm text-jiwo-textMuted">Memuat riwayat...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-jiwo-primaryLight/20 text-center space-y-4">
              <img
                src="/jiwo/idle.png"
                alt=""
                draggable={false}
                className="h-24 w-24 object-contain mx-auto animate-float-slow drop-shadow-sm"
              />
              <div className="space-y-1">
                <h3 className="font-bold text-jiwo-textDark">Belum Ada Catatan Jurnal</h3>
                <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
                  Tulis jurnal pertamamu — Jiwo sudah menunggu untuk membacanya bersamamu.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('write')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-jiwo-primary hover:underline"
              >
                <PlusCircle className="w-4.5 h-4.5" /> Tulis Jurnal Sekarang
              </button>
            </div>
          ) : (
            <div ref={historyListRef} className="space-y-4">
              {history.map((item) => {
                const accent = MOOD_ACCENT[item.mood_tag] || '#4FA3A5';
                return (
                  <div
                    key={item.id}
                    className="relative bg-white rounded-3xl p-5 pl-7 border border-jiwo-primaryLight/20 shadow-2xs space-y-3 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                    style={{
                      background: `linear-gradient(to right, ${accent}12, ${accent}04 120px, white 200px)`
                    }}
                  >
                    {/* Hand-painted mood edge */}
                    <span
                      className="absolute left-0 top-0 bottom-0 w-2.5"
                      style={{ background: `linear-gradient(180deg, ${accent}, ${accent}99)` }}
                      aria-hidden="true"
                    />
                    {/* Big decorative quote mark */}
                    <span
                      className="absolute -top-3 right-4 font-serif text-7xl leading-none select-none"
                      style={{ color: `${accent}22` }}
                      aria-hidden="true"
                    >
                      &ldquo;
                    </span>

                    <div className="flex justify-between items-start relative">
                      <div className="space-y-0.5">
                        <span 
                          className="text-3xs font-extrabold px-2.5 py-0.75 rounded-full uppercase tracking-wider text-white"
                          style={{ backgroundColor: accent }}
                        >
                          {item.type === 'mood_story' && 'Mood Story'}
                          {item.type === 'gratitude' && 'Gratitude Log'}
                          {item.type === 'future_self' && 'Future Letter'}
                        </span>
                        <div className="flex items-center gap-1.5 text-3xs text-jiwo-textMuted pt-1.5">
                          <Calendar className="w-3.5 h-3.5 text-jiwo-textMuted" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                      {['tenang', 'senang', 'cemas', 'sedih', 'lelah'].includes(item.mood_tag) && (
                        <MoodIcon mood={item.mood_tag as MoodKey} size={16} tile />
                      )}
                    </div>

                    {/* Content rendering based on journal type */}
                    <div className="text-sm text-jiwo-textDark leading-relaxed pt-1 whitespace-pre-line border-t border-jiwo-primaryLight/15 mt-2 relative">
                      {item.type === 'gratitude' ? (
                        <ul className="space-y-1.5 list-none pl-0">
                          {parseGratitude(item.content).map((gText, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                className="w-4.5 h-4.5 rounded-full text-3xs font-extrabold text-white flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: accent }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-sm">{gText}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{item.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
