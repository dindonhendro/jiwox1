import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Heart, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Consent/Disclaimer, 2: Assessment Q1, 3: Assessment Q2, 4: Assessment Q3
  const [user, setUser] = useState<any>(null);
  
  // Assessment answers
  const [anxietyLevel, setAnxietyLevel] = useState<number>(3);
  const [trigger, setTrigger] = useState<string>('');
  const [coping, setCoping] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const baseline = {
        anxiety_level: anxietyLevel,
        primary_trigger: trigger,
        preferred_coping: coping,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          baseline_assessment: baseline,
          consent_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      navigate('/');
    } catch (err) {
      console.error('Error saving onboarding info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-jiwo-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl p-8 shadow-sm border border-jiwo-primaryLight/30 min-h-[500px] flex flex-col justify-between">
        
        {/* Step indicator */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-jiwo-primary">
            Langkah {step} dari 4
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-jiwo-primary' : 'bg-jiwo-primaryLight/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Contents */}
        <div className="flex-grow flex flex-col justify-center py-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center text-jiwo-primary mb-2">
                <ShieldCheck className="w-16 h-16" />
              </div>
              <h2 className="text-2xl font-bold text-jiwo-textDark text-center font-sans">
                Komitmen Keamanan & Privasi Anda
              </h2>
              <div className="bg-jiwo-blueLight/50 p-5 rounded-2xl text-jiwo-textDark text-sm leading-relaxed space-y-3">
                <p>
                  <strong>Jiwo.ai</strong> peduli penuh dengan privasi Anda sesuai dengan <strong>UU PDP No. 27/2022</strong>. Semua jurnal dan chat Anda dienkripsi serta diproteksi secara ketat. Kami tidak akan pernah membagikan data kesehatan mental Anda kepada pihak ketiga mana pun.
                </p>
                <p className="text-xs text-jiwo-textMuted border-t border-jiwo-primaryLight/30 pt-3">
                  <strong>⚠️ Disclaimer Penting:</strong> Jiwo.ai adalah aplikasi pendamping berbasis AI untuk membantu meredakan kecemasan ringan dan bukan pengganti psikolog atau psikiater profesional. Jika Anda berada dalam situasi krisis atau berpikiran untuk menyakiti diri, silakan hubungi kontak darurat profesional yang kami sediakan di dalam aplikasi.
                </p>
              </div>
              <p className="text-xs text-center text-jiwo-textMuted mt-4">
                Dengan melanjutkan, Anda menyetujui{' '}
                <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-jiwo-primary font-bold">
                  Ketentuan Layanan & Kebijakan Privasi
                </Link>{' '}
                Jiwo.ai.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="flex justify-center text-jiwo-primary mb-2">
                <HelpCircle className="w-16 h-16" />
              </div>
              <h2 className="text-2xl font-bold text-jiwo-textDark font-sans">
                Seberapa cemas perasaanmu hari ini?
              </h2>
              <p className="text-jiwo-textMuted text-sm">
                Skala 1 (Sangat Tenang) hingga 5 (Sangat Cemas/Panik)
              </p>
              
              <div className="flex justify-center gap-3 py-6">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setAnxietyLevel(lvl)}
                    className={`w-12 h-12 rounded-full font-bold text-lg transition duration-200 ${
                      anxietyLevel === lvl
                        ? 'bg-jiwo-primary text-white scale-110 shadow'
                        : 'bg-jiwo-blueLight/50 text-jiwo-textDark hover:bg-jiwo-primaryLight/60'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="flex justify-between max-w-xs mx-auto text-xs text-jiwo-textMuted font-medium">
                <span>1 - Tenang Sekali</span>
                <span>5 - Panik/Cemas</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-2xl font-bold text-jiwo-textDark text-center font-sans mb-2">
                Apa pemicu utama kecemasanmu?
              </h2>
              <p className="text-jiwo-textMuted text-sm text-center mb-6">
                Ini membantu Jiwo memahami sudut pandangmu
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'career', label: 'Kerja / Akademis' },
                  { key: 'relationship', label: 'Hubungan / Pertemanan' },
                  { key: 'financial', label: 'Finansial / Keuangan' },
                  { key: 'future', label: 'Masa Depan / Overthinking' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTrigger(item.key)}
                    className={`p-4 rounded-2xl text-left border font-semibold text-sm transition duration-200 ${
                      trigger === item.key
                        ? 'border-jiwo-primary bg-jiwo-primaryLight/30 text-jiwo-primary'
                        : 'border-jiwo-primaryLight/20 hover:bg-jiwo-bg text-jiwo-textDark'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-2xl font-bold text-jiwo-textDark text-center font-sans mb-2">
                Bagaimana biasanya kamu menenangkan diri?
              </h2>
              <p className="text-jiwo-textMuted text-sm text-center mb-6">
                Metode apa yang paling efektif untukmu?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'breathing', label: 'Latihan Pernapasan' },
                  { key: 'sharing', label: 'Curhat ke Teman/Keluarga' },
                  { key: 'writing', label: 'Menulis / Journaling' },
                  { key: 'quiet', label: 'Menyendiri / Tidur' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setCoping(item.key)}
                    className={`p-4 rounded-2xl text-left border font-semibold text-sm transition duration-200 ${
                      coping === item.key
                        ? 'border-jiwo-primary bg-jiwo-primaryLight/30 text-jiwo-primary'
                        : 'border-jiwo-primaryLight/20 hover:bg-jiwo-bg text-jiwo-textDark'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons Nav */}
        <div className="flex gap-4 mt-8 pt-4 border-t border-jiwo-primaryLight/20">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="py-3 px-6 rounded-2xl text-jiwo-textDark hover:bg-jiwo-bg border border-jiwo-primaryLight/30 font-semibold transition"
            >
              Kembali
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={step === 3 && !trigger}
              className="flex-grow bg-jiwo-primary hover:bg-jiwo-primary/90 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Lanjutkan <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || !coping}
              className="flex-grow bg-jiwo-primary hover:bg-jiwo-primary/90 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Mulai Bersama Jiwo!'} <Heart className="w-5 h-5 fill-current" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
