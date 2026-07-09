import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, CheckCircle } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="min-h-screen bg-jiwo-bg text-jiwo-textDark font-sans flex justify-center py-8 px-4">
      {/* Mobile-centric card style */}
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-jiwo-primaryLight/35 flex flex-col justify-between">
        
        <div>
          {/* Header & Back Button */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl hover:bg-jiwo-bg text-jiwo-textMuted hover:text-jiwo-primary transition border border-jiwo-primaryLight/20"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-jiwo-textDark">
                Legalitas & Privasi
              </h1>
              <p className="text-xs text-jiwo-textMuted">
                Komitmen kenyamanan dan keamanan Anda di Jiwo.ai
              </p>
            </div>
          </div>

          {/* Calming Notice */}
          <div className="bg-jiwo-blueLight/30 border border-jiwo-primaryLight/30 rounded-2xl p-4.5 mb-6 text-sm flex items-start gap-3">
            <Shield className="w-5 h-5 text-jiwo-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-jiwo-textDark">Privasi Anda adalah Prioritas</span>
              <p className="text-xs text-jiwo-textMuted mt-0.5 leading-relaxed">
                Kami tunduk penuh pada UU Pelindungan Data Pribadi (UU PDP No. 27/2022). Data kesehatan mental Anda dienkripsi secara penuh dan tidak akan pernah dijual atau dibagikan.
              </p>
            </div>
          </div>

          {/* Tabs Nav */}
          <div className="flex bg-jiwo-bg p-1.5 rounded-2xl mb-6 gap-1 border border-jiwo-primaryLight/20">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                activeTab === 'privacy'
                  ? 'bg-white text-jiwo-primary shadow-xs'
                  : 'text-jiwo-textMuted hover:text-jiwo-textDark'
              }`}
            >
              <Shield className="w-4 h-4" /> Kebijakan Privasi
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                activeTab === 'terms'
                  ? 'bg-white text-jiwo-primary shadow-xs'
                  : 'text-jiwo-textMuted hover:text-jiwo-textDark'
              }`}
            >
              <FileText className="w-4 h-4" /> Ketentuan Layanan
            </button>
          </div>

          {/* Document Content */}
          <div className="space-y-6 text-sm leading-relaxed overflow-y-auto max-h-[50vh] pr-2 scrollbar-thin">
            {activeTab === 'privacy' ? (
              <div className="space-y-4 animate-fade-in text-jiwo-textDark/90">
                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    1. Informasi yang Kami Kumpulkan
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Jiwo.ai hanya mengumpulkan data spesifik yang Anda masukkan secara sadar untuk memfasilitasi pendampingan emosional Anda, yaitu:
                  </p>
                  <ul className="list-disc pl-8 text-xs text-jiwo-textMuted space-y-1 mt-1">
                    <li><strong>Profil Pengguna:</strong> Nama panggilan dan alamat email (autentikasi).</li>
                    <li><strong>Riwayat Mood (Check-in):</strong> Catatan harian emosi dan tingkat kecemasan.</li>
                    <li><strong>Jiwo Journal:</strong> Catatan syukur (gratitude list), Mood Story (catatan bebas), dan Future Self Letter.</li>
                    <li><strong>Percakapan Chat:</strong> Obrolan teks Anda dengan mascot Jiwo.</li>
                  </ul>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    2. Cara Kami Menggunakan Data
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Data Anda hanya digunakan secara eksklusif untuk memberikan visual mascot dan saran koping AI yang disesuaikan dengan kondisi emosional Anda saat ini. Kami **tidak pernah** membagikan, menjual, atau menyalahgunakan data pribadi/kesehatan mental Anda kepada pihak ketiga atau platform periklanan mana pun.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    3. Keamanan Data & enkripsi
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Seluruh percakapan, jurnal, dan status kecemasan Anda disimpan dalam database terenkripsi dengan kebijakan **Row-Level Security (RLS)** yang ketat di tingkat server PostgreSQL. Hanya akun Anda yang memiliki kunci otorisasi untuk membaca atau menulis data tersebut.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    4. Hak Penghapusan Data (UU PDP)
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Sesuai regulasi UU PDP No. 27/2022, Anda memiliki hak penuh untuk menarik persetujuan pengolahan data. Anda dapat memilih untuk menghapus seluruh akun dan data secara permanen kapan saja melalui menu **"Hapus Semua Data"** di bagian profil aplikasi. Tindakan ini akan menghapus permanen riwayat chat, jurnal, mood, dan akun auth Anda dari database kami secara seketika.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in text-jiwo-textDark/90">
                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    1. Jiwo BUKAN Pengganti Layanan Profesional
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Jiwo.ai adalah asisten kecemasan berbasis AI untuk pendampingan koping emosional harian. Jiwo **bukan** psikolog klinis, psikiater, ataupun lembaga konseling medis. Jiwo tidak memberikan diagnosis klinis formal, resep obat, ataupun terapi formal.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    2. Batasan Penggunaan saat Krisis
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5 font-semibold text-jiwo-stress">
                    Jika Anda mengalami krisis psikologis berat, memiliki kecenderungan menyakiti diri, atau berpikiran untuk mengakhiri hidup, mohon jangan gunakan obrolan AI Jiwo. Segera hubungi hotline krisis resmi seperti SEJIWA 119 (ext 8), IGD 112, atau langsung tekan tombol darurat "Krisis" di pojok kanan atas aplikasi untuk melihat kontak darurat kesehatan jiwa Indonesia.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    3. Batasan Tanggung Jawab
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Kami berupaya keras menyajikan informasi koping terbaik berdasarkan panduan umum kesehatan jiwa yang valid. Namun, Anda memegang tanggung jawab penuh atas interpretasi dan tindakan yang Anda ambil berdasarkan respons dari asisten AI kami.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-jiwo-textDark flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-jiwo-primary rounded-full" />
                    4. Persetujuan Layanan
                  </h3>
                  <p className="text-xs text-jiwo-textMuted pl-3.5">
                    Dengan membuat akun di Jiwo.ai, Anda secara sadar memahami seluruh disclaimer di atas dan memberikan persetujuan eksplisit kepada Jiwo.ai untuk menyimpan dan mengolah riwayat koping serta jurnal kesehatan mental Anda secara rahasia demi personalisasi asisten.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Footer Accept Check */}
        <div className="mt-8 pt-4 border-t border-jiwo-primaryLight/20 flex flex-col items-center gap-3">
          <p className="text-3xs text-jiwo-textMuted text-center">
            Pembaruan terakhir: 23 Juni 2026
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xs transition duration-150 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4.5 h-4.5 fill-white/10" /> Saya Mengerti & Setuju
          </button>
        </div>

      </div>
    </div>
  );
}
