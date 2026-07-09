import { useNavigate } from 'react-router-dom';
import { Moon, UserCheck, Wind, ChevronRight, Heart, Users } from 'lucide-react';

export default function Tools() {
  const navigate = useNavigate();

  const toolItems = [
    {
      id: 'sleep',
      title: 'Tidur Nyenyak',
      subtitle: 'Sleep Companion & Wind-down',
      desc: 'Sesi relaksasi otot (Yoga Nidra) dan pemutar suara alam menenangkan untuk membantu tidur pulap.',
      icon: Moon,
      color: 'bg-jiwo-blueCalm/10 text-jiwo-blueCalm border-jiwo-blueCalm/20',
      action: () => navigate('/tools/sleep')
    },
    {
      id: 'community',
      title: 'Komunitas Jiwo',
      subtitle: 'Support Group & Sharing',
      desc: 'Berbagi cerita, keluh kesah, dan saling menguatkan bersama ribuan sahabat Jiwo lainnya.',
      icon: Users,
      color: 'bg-jiwo-primary/10 text-jiwo-primary border-jiwo-primary/20',
      action: () => navigate('/tools/community')
    },
    {
      id: 'consultation',
      title: 'Konsultasi Ahli',
      subtitle: 'Professional Matching',
      desc: 'Booking jadwal dengan psikolog atau psikiater klinis terverifikasi untuk bantuan medis mendalam.',
      icon: UserCheck,
      color: 'bg-jiwo-sage/10 text-jiwo-sage border-jiwo-sage/20',
      action: () => navigate('/tools/consultation')
    },
    {
      id: 'breathing',
      title: 'Latihan Napas',
      subtitle: 'Breathing Quickstart',
      desc: 'Akses cepat langsung ke sesi pertolongan darurat napas tenang luring (Rescue).',
      icon: Wind,
      color: 'bg-jiwo-stress/10 text-jiwo-stress border-jiwo-stress/20',
      action: () => navigate('/rescue')
    }
  ];

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-extrabold text-jiwo-textDark tracking-tight font-sans">
          Holistic Tools
        </h1>
        <p className="text-sm text-jiwo-textMuted max-w-sm">
          Berbagai metode praktis luring dan medis untuk menenangkan hati serta pikiranmu.
        </p>
      </div>

      {/* Main Cards Grid */}
      <div className="space-y-4.5">
        {toolItems.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={tool.action}
              className="w-full text-left bg-white border border-jiwo-primaryLight/20 hover:border-jiwo-primary/30 p-5 rounded-3xl transition duration-200 shadow-3xs hover:shadow-2xs flex items-center gap-4.5 group"
            >
              {/* Tool Icon Circle */}
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${tool.color}`}>
                <Icon className="w-7 h-7" />
              </div>

              {/* Tool Texts */}
              <div className="flex-grow min-w-0 space-y-0.5">
                <span className="text-3xs font-bold uppercase tracking-wider text-jiwo-textMuted group-hover:text-jiwo-primary transition">
                  {tool.subtitle}
                </span>
                <h3 className="font-extrabold text-base text-jiwo-textDark leading-snug">
                  {tool.title}
                </h3>
                <p className="text-xs text-jiwo-textMuted/95 truncate">
                  {tool.desc}
                </p>
              </div>

              {/* Arrow */}
              <div className="w-8 h-8 rounded-full bg-jiwo-bg text-jiwo-textMuted group-hover:text-jiwo-primary group-hover:bg-jiwo-primaryLight/40 flex items-center justify-center shrink-0 transition">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Quote Banner */}
      <div className="bg-jiwo-sageLight/50 border border-jiwo-sage/20 rounded-3xl p-5 text-center space-y-1">
        <Heart className="w-5 h-5 text-jiwo-sage fill-current mx-auto animate-pulse" />
        <p className="text-xs font-bold text-jiwo-textDark">"Setiap langkah kecil menuju ketenangan adalah kemenangan."</p>
        <p className="text-4xs text-jiwo-textMuted font-bold uppercase tracking-widest">Jiwo Companion</p>
      </div>
    </div>
  );
}
