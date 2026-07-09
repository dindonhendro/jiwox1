import { ShieldAlert, Phone, ExternalLink, X } from 'lucide-react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrisisModal({ isOpen, onClose }: CrisisModalProps) {
  if (!isOpen) return null;

  const contacts = [
    {
      name: 'Layanan SEJIWA (Kemenkes)',
      number: '119 ext 8',
      desc: 'Hotline Kesehatan Jiwa resmi dari Kementerian Kesehatan RI. Gratis & tersedia 24 jam.',
      link: 'tel:119'
    },
    {
      name: 'Yayasan Pulih',
      number: '+62 21 7884 2580',
      desc: 'Layanan konseling psikologi klinis dan pemulihan trauma terpercaya di Indonesia.',
      link: 'https://yayasanpulih.org'
    },
    {
      name: 'HIMPSI (Himpunan Psikologi Indonesia)',
      number: 'Hubungi Wilayah Terdekat',
      desc: 'Asosiasi psikolog profesional Indonesia yang menyediakan direktori layanan psikologi di berbagai kota.',
      link: 'https://himpsi.or.id'
    },
    {
      name: 'Panggilan Darurat Umum',
      number: '112',
      desc: 'Nomor darurat bebas pulsa nasional untuk situasi darurat medis, penyelamatan, atau keamanan.',
      link: 'tel:112'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-jiwo-stress/30 z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-jiwo-textMuted hover:text-jiwo-textDark rounded-full hover:bg-jiwo-bg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-jiwo-stress/10 rounded-full flex items-center justify-center text-jiwo-stress mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-jiwo-textDark font-sans">
            Kami Peduli dengan Anda
          </h2>
          <p className="text-sm text-jiwo-textMuted mt-1 max-w-sm">
            Jiwo mendeteksi bahwa Anda sedang mengalami tekanan emosional yang sangat berat. Tolong ingat bahwa Anda tidak sendirian dan ada bantuan nyata yang siap mendukung Anda.
          </p>
        </div>

        {/* Helpline List */}
        <div className="space-y-4">
          {contacts.map((contact, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-2xl bg-jiwo-bg border border-jiwo-primaryLight/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="space-y-1 max-w-[70%]">
                <h3 className="font-bold text-jiwo-textDark text-sm">{contact.name}</h3>
                <p className="text-xs text-jiwo-textMuted leading-relaxed">{contact.desc}</p>
                <span className="inline-block text-xs font-bold text-jiwo-primary bg-jiwo-primaryLight/40 px-2 py-0.5 rounded mt-1">
                  {contact.number}
                </span>
              </div>
              
              <a
                href={contact.link}
                target={contact.link.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                {contact.link.startsWith('tel') ? (
                  <>
                    <Phone className="w-3.5 h-3.5" /> Hubungi
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" /> Kunjungi
                  </>
                )}
              </a>
            </div>
          ))}
        </div>

        {/* Close and return button */}
        <div className="mt-6 pt-4 border-t border-jiwo-primaryLight/20 text-center">
          <button
            onClick={onClose}
            className="text-xs text-jiwo-textMuted hover:text-jiwo-primary font-semibold underline"
          >
            Tutup & Kembali ke Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
}
