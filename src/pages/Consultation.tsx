import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star, Calendar, Clock, ShieldAlert, CheckCircle, Video, ArrowLeft, Trash2 } from 'lucide-react';
import CrisisModal from '@/components/CrisisModal';

interface Psychologist {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  affiliation: string;
  expertise: string[];
  rating: number;
  reviewCount: number;
  price: string;
  priceNum: number;
  bio: string;
  initials: string;
  bgColor: string;
}

interface Booking {
  id: string;
  psychologist: Psychologist;
  date: string;
  time: string;
  bookingCode: string;
  createdAt: string;
}

export default function Consultation() {
  const navigate = useNavigate();
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [selectedPsy, setSelectedPsy] = useState<Psychologist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // List of mock Indonesian mental health professionals
  const psychologists: Psychologist[] = [
    {
      id: 'psy-sari',
      name: 'Sari Puspita, M.Psi., Psikolog',
      specialty: 'Psikolog Klinis Dewasa',
      experience: '6 tahun',
      affiliation: 'Terdaftar HIMPSI (Himpunan Psikologi Indonesia)',
      expertise: ['Anxiety', 'Overthinking', 'Trauma Relasi', 'CBT'],
      rating: 4.9,
      reviewCount: 124,
      price: 'Rp 150.000',
      priceNum: 150000,
      bio: 'Berfokus pada manajemen kecemasan harian, pemulihan trauma masa lalu, serta pengembangan citra diri yang sehat menggunakan pendekatan Acceptance and Commitment Therapy (ACT) dan CBT.',
      initials: 'SP',
      bgColor: 'bg-jiwo-primary/10 text-jiwo-primary border-jiwo-primary/20'
    },
    {
      id: 'psy-budi',
      name: 'dr. Budi Setiawan, Sp.KJ',
      specialty: 'Dokter Spesialis Kedokteran Jiwa (Psikiater)',
      experience: '10 tahun',
      affiliation: 'Anggota IDI & PDSKJI',
      expertise: ['Anxiety Akut', 'Panic Disorder', 'Depresi Klinis', 'Farmakoterapi'],
      rating: 4.8,
      reviewCount: 246,
      price: 'Rp 250.000',
      priceNum: 250000,
      bio: 'Spesialis dalam penanganan integratif medis-psikologis untuk gangguan kecemasan akut, serangan panik berulang, dan gangguan afektif dengan pendekatan empati serta berbasis bukti medis.',
      initials: 'BS',
      bgColor: 'bg-jiwo-blueCalm/10 text-jiwo-blueCalm border-jiwo-blueCalm/20'
    },
    {
      id: 'psy-rian',
      name: 'Rian Hidayat, M.Psi., Psikolog',
      specialty: 'Psikolog Klinis & Life Coach',
      experience: '5 tahun',
      affiliation: 'Terdaftar HIMPSI',
      expertise: ['Burnout Karir', 'Stres Pekerjaan', 'Work-Life Balance', 'Mindfulness'],
      rating: 4.9,
      reviewCount: 98,
      price: 'Rp 175.000',
      priceNum: 175000,
      bio: 'Membantu profesional muda mengatasi kejenuhan kerja (burnout), transisi karir, stres akademis, serta melatih kedasaran penuh (mindfulness) untuk keseimbangan hidup sehari-hari.',
      initials: 'RH',
      bgColor: 'bg-jiwo-sage/10 text-jiwo-sage border-jiwo-sage/20'
    }
  ];

  // Dynamic Date Generator (next 5 days)
  const getNextDays = () => {
    const days = [];
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    const locale = 'id-ID';

    for (let i = 1; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const formatted = date.toLocaleDateString(locale, options);
      days.push(formatted);
    }
    return days;
  };

  const nextDays = getNextDays();

  // Time Slots
  const timeSlots = [
    '09:00 - 09:50',
    '11:00 - 11:50',
    '14:00 - 14:50',
    '16:00 - 16:50',
    '19:00 - 19:50'
  ];

  // Load bookings from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('jiwo_consultation_bookings');
    if (saved) {
      try {
        setMyBookings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleOpenBooking = (psy: Psychologist) => {
    setSelectedPsy(psy);
    setSelectedDate(nextDays[0]); // default to first day
    setSelectedTime(timeSlots[0]); // default to first slot
    setConsentChecked(false);
  };

  const handleConfirmBooking = () => {
    if (!selectedPsy || !selectedDate || !selectedTime || !consentChecked) return;

    const bookingCode = `JW-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      psychologist: selectedPsy,
      date: selectedDate,
      time: selectedTime,
      bookingCode,
      createdAt: new Date().toISOString()
    };

    const updated = [newBooking, ...myBookings];
    setMyBookings(updated);
    localStorage.setItem('jiwo_consultation_bookings', JSON.stringify(updated));

    setLatestBooking(newBooking);
    setBookingSuccess(true);
    setSelectedPsy(null);
  };

  const handleCancelBooking = (id: string) => {
    const updated = myBookings.filter(b => b.id !== id);
    setMyBookings(updated);
    localStorage.setItem('jiwo_consultation_bookings', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in font-sans">
      
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tools')}
          className="p-2 rounded-full bg-white border border-jiwo-primaryLight/40 hover:bg-jiwo-bg text-jiwo-textMuted hover:text-jiwo-primary transition"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-xl font-extrabold text-jiwo-textDark tracking-tight">
            Konsultasi Ahli
          </h1>
          <p className="text-xs text-jiwo-textMuted">
            Booking sesi tatap muka online dengan psikolog klinis / psikiater.
          </p>
        </div>
      </div>

      {/* Safety Alert Box */}
      <div className="bg-jiwo-stress/10 border border-jiwo-stress/20 rounded-3xl p-4.5 flex gap-4 items-start shadow-3xs">
        <div className="w-10 h-10 rounded-2xl bg-jiwo-stress/25 flex items-center justify-center text-jiwo-stress shrink-0 mt-0.5 animate-pulse">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-grow">
          <h3 className="font-extrabold text-sm text-jiwo-textDark">
            Butuh Bantuan Krisis Segera?
          </h3>
          <p className="text-2xs text-jiwo-textMuted leading-relaxed">
            Halaman pemesanan ini ditujukan untuk sesi konsultasi non-darurat terjadwal. Jika Anda berada dalam bahaya, mengalami krisis mental berat, atau berniat menyakiti diri sendiri, silakan hubungi hotline SEJIWA segera.
          </p>
          <button
            onClick={() => setIsCrisisOpen(true)}
            className="text-xs font-extrabold text-jiwo-stress hover:text-jiwo-stress/80 transition flex items-center gap-1.5"
          >
            <span>Hubungi Layanan Darurat 24 Jam (SEJIWA) &rarr;</span>
          </button>
        </div>
      </div>

      {/* Booking Success View */}
      {bookingSuccess && latestBooking && (
        <div className="bg-jiwo-sageLight/70 border-2 border-jiwo-sage/40 rounded-3xl p-6 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 bg-jiwo-sage/20 rounded-full flex items-center justify-center text-jiwo-sage mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-jiwo-textDark">Booking Sesi Berhasil!</h3>
            <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
              Jadwal Anda telah diverifikasi oleh sistem Jiwo.ai. Rincian konfirmasi telah dikirim ke WhatsApp/Email Anda.
            </p>
          </div>

          <div className="bg-white border border-jiwo-sage/25 p-4.5 rounded-2xl text-left max-w-sm mx-auto space-y-2.5">
            <div className="flex justify-between items-center text-3xs font-bold text-jiwo-textMuted border-b border-jiwo-sageLight pb-2">
              <span>KODE BOOKING</span>
              <span className="text-jiwo-primary font-mono">{latestBooking.bookingCode}</span>
            </div>
            
            <div className="space-y-1 text-xs">
              <p className="font-extrabold text-jiwo-textDark">{latestBooking.psychologist.name}</p>
              <p className="text-2xs text-jiwo-textMuted">{latestBooking.psychologist.specialty}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5 text-2xs">
              <div className="flex items-center gap-1.5 text-jiwo-textDark">
                <Calendar className="w-3.5 h-3.5 text-jiwo-primary shrink-0" />
                <span className="font-semibold">{latestBooking.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-jiwo-textDark">
                <Clock className="w-3.5 h-3.5 text-jiwo-primary shrink-0" />
                <span className="font-semibold">{latestBooking.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2.5 border-t border-jiwo-sageLight text-3xs text-jiwo-textMuted leading-snug">
              <Video className="w-4 h-4 text-jiwo-sage shrink-0" />
              <span>Link Video Call (Google Meet) akan aktif 10 menit sebelum sesi dimulai.</span>
            </div>
          </div>

          <button
            onClick={() => setBookingSuccess(false)}
            className="w-full max-w-sm py-3.5 bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold rounded-2xl shadow transition"
          >
            Selesai & Tutup
          </button>
        </div>
      )}

      {/* Main Professional Lists */}
      {!bookingSuccess && (
        <div className="space-y-5">
          <h2 className="text-sm font-bold text-jiwo-textDark uppercase tracking-wider px-1">
            Praktisi Kesehatan Mental
          </h2>

          <div className="space-y-4">
            {psychologists.map((psy) => (
              <div
                key={psy.id}
                className="bg-white border border-jiwo-primaryLight/20 p-5 rounded-3xl shadow-3xs space-y-4 hover:border-jiwo-primary/20 transition-all duration-200"
              >
                {/* Profile row */}
                <div className="flex gap-4">
                  {/* Initials Avatar */}
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 font-extrabold text-base ${psy.bgColor}`}>
                    {psy.initials}
                  </div>
                  
                  {/* Info details */}
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-extrabold text-sm text-jiwo-textDark leading-snug truncate">
                      {psy.name}
                    </h3>
                    <p className="text-2xs text-jiwo-primary font-semibold">
                      {psy.specialty}
                    </p>
                    <div className="flex items-center gap-2 text-3xs text-jiwo-textMuted font-medium pt-0.5">
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                        {psy.rating}
                      </span>
                      <span>•</span>
                      <span>{psy.reviewCount} ulasan</span>
                      <span>•</span>
                      <span>Exp {psy.experience}</span>
                    </div>
                  </div>
                </div>

                {/* Professional details */}
                <p className="text-xs text-jiwo-textMuted leading-relaxed italic">
                  "{psy.bio}"
                </p>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-4xs font-bold uppercase tracking-wider text-jiwo-textMuted bg-jiwo-bg border border-jiwo-primaryLight/30 px-2.5 py-1 rounded-md shrink-0">
                    {psy.affiliation}
                  </span>
                  {psy.expertise.map((exp, idx) => (
                    <span
                      key={idx}
                      className="text-4xs font-bold uppercase tracking-wider text-jiwo-primary bg-jiwo-primaryLight/20 px-2.5 py-1 rounded-md shrink-0"
                    >
                      {exp}
                    </span>
                  ))}
                </div>

                {/* Price and Action Row */}
                <div className="flex justify-between items-center pt-2.5 border-t border-jiwo-bg">
                  <div className="space-y-0.5">
                    <span className="text-5xs text-jiwo-textMuted font-bold uppercase tracking-wider">Tarif Sesi</span>
                    <p className="text-sm font-black text-jiwo-textDark">{psy.price} <span className="text-5xs font-bold text-jiwo-textMuted">/ 50 Mnt</span></p>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(psy)}
                    className="bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-2.5 px-5 rounded-2xl text-xs shadow-xs transition"
                  >
                    Booking Jadwal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Form Sheet (Conditional Modal) */}
      {selectedPsy && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedPsy(null)}
          />

          {/* Form Dialog Box */}
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-jiwo-primaryLight/30 z-10 animate-fade-in max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-jiwo-textDark">
                  Atur Jadwal Konsultasi
                </h3>
                <p className="text-2xs text-jiwo-textMuted leading-snug">
                  Silakan pilih tanggal dan jam yang sesuai dengan kesibukan Anda.
                </p>
              </div>
              <button
                onClick={() => setSelectedPsy(null)}
                className="p-1.5 text-jiwo-textMuted hover:text-jiwo-textDark rounded-full hover:bg-jiwo-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Practitioner Profile Mini Summary */}
            <div className="p-3 bg-jiwo-bg rounded-2xl flex gap-3 border border-jiwo-primaryLight/20 items-center">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-extrabold text-xs ${selectedPsy.bgColor}`}>
                {selectedPsy.initials}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-jiwo-textDark leading-snug truncate">
                  {selectedPsy.name}
                </h4>
                <p className="text-4xs font-bold text-jiwo-primary uppercase tracking-wide">
                  {selectedPsy.specialty}
                </p>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-3xs font-black uppercase tracking-wider text-jiwo-textMuted block">
                Pilih Tanggal Sesi
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {nextDays.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`px-3 py-2.5 rounded-xl border font-bold text-2xs shrink-0 text-center transition flex flex-col gap-1 min-w-[70px] ${
                      selectedDate === day
                        ? 'bg-jiwo-primary text-white border-jiwo-primary'
                        : 'bg-white border-jiwo-primaryLight/30 text-jiwo-textDark hover:bg-jiwo-bg'
                    }`}
                  >
                    <span>{day.split(',')[0]}</span>
                    <span className="text-xs font-black">{day.split(',')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-2">
              <label className="text-3xs font-black uppercase tracking-wider text-jiwo-textMuted block">
                Pilih Waktu (WIB)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-3 rounded-xl border font-bold text-2xs text-center transition ${
                      selectedTime === time
                        ? 'bg-jiwo-primary text-white border-jiwo-primary'
                        : 'bg-white border-jiwo-primaryLight/35 text-jiwo-textDark hover:bg-jiwo-bg'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Fees Breakdown */}
            <div className="space-y-1.5 pt-1 border-t border-jiwo-bg">
              <div className="flex justify-between items-center text-xs text-jiwo-textDark">
                <span className="font-medium text-jiwo-textMuted">Biaya Konsultasi</span>
                <span className="font-extrabold">{selectedPsy.price}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-jiwo-textDark">
                <span className="font-medium text-jiwo-textMuted">Biaya Layanan PWA</span>
                <span className="font-bold text-jiwo-sage">Rp 0 (Subsidi Jiwo)</span>
              </div>
              <div className="flex justify-between items-center text-sm text-jiwo-textDark border-t border-dashed border-jiwo-primaryLight/40 pt-2 font-black">
                <span>Total Pembayaran</span>
                <span>{selectedPsy.price}</span>
              </div>
            </div>

            {/* Professional Consent Checkbox */}
            <div className="flex items-start gap-2.5 pt-1 text-2xs leading-relaxed text-jiwo-textMuted">
              <input
                id="consent-check"
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 accent-jiwo-primary shrink-0"
              />
              <label htmlFor="consent-check" className="cursor-pointer select-none">
                Saya memahami bahwa sesi ini di luar kendali Jiwo.ai, ditangani langsung oleh praktisi terlisensi independen, dan bukan pengganti penanganan krisis darurat.
              </label>
            </div>

            {/* Confirmation Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedPsy(null)}
                className="flex-1 py-3 bg-white border border-jiwo-primaryLight/40 text-jiwo-textMuted hover:bg-jiwo-bg font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                disabled={!consentChecked}
                onClick={handleConfirmBooking}
                className="flex-1 py-3 bg-jiwo-primary hover:bg-jiwo-primary/95 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                Konfirmasi Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Active Bookings List */}
      {!bookingSuccess && myBookings.length > 0 && (
        <div className="space-y-3.5 border-t border-jiwo-primaryLight/20 pt-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-extrabold text-jiwo-textDark uppercase tracking-wider">
              Jadwal Sesi Anda
            </h2>
            <span className="text-4xs font-bold text-jiwo-primary bg-jiwo-primaryLight/30 px-2 py-0.5 rounded-full">
              {myBookings.length} Sesi Terjadwal
            </span>
          </div>

          <div className="space-y-3">
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="bg-jiwo-sageLight/20 border border-jiwo-sage/20 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center"
              >
                <div className="space-y-1 flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="text-3xs font-extrabold text-jiwo-primary bg-jiwo-primaryLight/40 px-1.5 py-0.5 rounded font-mono">
                      {b.bookingCode}
                    </span>
                    <h4 className="font-bold text-xs text-jiwo-textDark">
                      {b.psychologist.name}
                    </h4>
                  </div>
                  <p className="text-3xs text-jiwo-textMuted">
                    {b.psychologist.specialty}
                  </p>
                  
                  <div className="flex items-center gap-3 pt-1 text-3xs text-jiwo-textDark font-bold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-jiwo-primary" /> {b.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-jiwo-primary" /> {b.time} WIB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => {
                      alert(`Tautan ruang video Google Meet (${b.bookingCode}) akan diaktifkan secara otomatis 10 menit sebelum jadwal (${b.time}) dimulai.`);
                    }}
                    className="flex-grow sm:flex-none flex items-center justify-center gap-1 bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold text-3xs py-2 px-3 rounded-xl shadow-3xs transition"
                  >
                    <Video className="w-3 h-3 shrink-0" />
                    <span>Mulai Video Call</span>
                  </button>
                  
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="p-2 text-jiwo-textMuted hover:text-jiwo-stress hover:bg-jiwo-stress/10 rounded-xl transition"
                    title="Batalkan Booking"
                    aria-label="Batalkan Booking"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crisis Help Modal */}
      <CrisisModal
        isOpen={isCrisisOpen}
        onClose={() => setIsCrisisOpen(false)}
      />

    </div>
  );
}
