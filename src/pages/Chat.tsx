import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import JiwoMascot from '@/components/JiwoMascot';
import CrisisModal from '@/components/CrisisModal';
import { Send, AlertOctagon, RefreshCw } from 'lucide-react';

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [mascotState, setMascotState] = useState<'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep'>('idle');
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        fetchChatHistory();
      }
    });
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data);
      } else {
        // Fallback to default greeting if empty
        setMessages([
          {
            id: 'init',
            role: 'assistant',
            content: 'Hai! Aku Jiwo, teman yang selalu ada untukmu. Ada apa hari ini? Ceritakan padaku, aku siap peluk kecemasanmu...',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching chat logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const analyzeMascotExpression = (text: string) => {
    const cleanText = text.toLowerCase();
    
    // Check keywords to swap mascot state
    if (
      cleanText.includes('senang') || 
      cleanText.includes('bahagia') || 
      cleanText.includes('terima kasih') || 
      cleanText.includes('makasih') ||
      cleanText.includes('hebat') ||
      cleanText.includes('bangga')
    ) {
      setMascotState('happy');
    } else if (
      cleanText.includes('sedih') || 
      cleanText.includes('nangis') || 
      cleanText.includes('kecewa') || 
      cleanText.includes('sakit') ||
      cleanText.includes('luka')
    ) {
      setMascotState('sad');
    } else if (
      cleanText.includes('cemas') || 
      cleanText.includes('takut') || 
      cleanText.includes('panik') || 
      cleanText.includes('khawatir') ||
      cleanText.includes('stres') ||
      cleanText.includes('stress')
    ) {
      setMascotState('stress');
    } else if (
      cleanText.includes('tenang') || 
      cleanText.includes('damai') || 
      cleanText.includes('lega') || 
      cleanText.includes('napas')
    ) {
      setMascotState('calm');
    } else {
      setMascotState('idle');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Add user message optimistically
    const temporaryUserMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, temporaryUserMessage]);

    // Analyze mascot reaction to what user typed
    analyzeMascotExpression(userText);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Crisis keywords detection list (Indonesian)
      const CRISIS_KEYWORDS = [
        'bunuh diri',
        'akhiri hidup',
        'akhiri hidupku',
        'ingin mati',
        'pengen mati',
        'pengin mati',
        'mau mati',
        'menyakiti diri',
        'sayat tangan',
        'potong nadi',
        'gantung diri',
        'minum racun',
        'lompat dari gedung',
        'nyilet',
        'suicide',
        'self harm',
        'menabrakkan diri'
      ];
      const checkCrisis = (text: string): boolean => {
        const cleanText = text.toLowerCase();
        return CRISIS_KEYWORDS.some(keyword => cleanText.includes(keyword));
      };

      // 1. CRISIS DETECTION (SAFETY LAYER)
      if (checkCrisis(userText)) {
        const crisisReply = 'Maafkan aku ya, tapi sepertinya kamu sedang melewati masa yang sangat berat saat ini. Aku sangat peduli padamu, tapi aku hanyalah AI pendamping. Tolong hubungi layanan darurat SEJIWA dengan menekan tombol darurat merah atau kontak profesional kesehatan jiwa Indonesia sekarang juga. Kamu tidak sendirian.';
        
        // Save flagged message to db
        await supabase.from('chat_messages').insert([
          { user_id: session?.user?.id, role: 'user', content: userText, flagged_crisis: true },
          { user_id: session?.user?.id, role: 'assistant', content: crisisReply, flagged_crisis: true }
        ]);

        setShowCrisisModal(true);
        setMascotState('sad');
        await fetchChatHistory();
        return;
      }

      // Save user message to database
      await supabase.from('chat_messages').insert({
        user_id: session?.user?.id,
        role: 'user',
        content: userText,
        flagged_crisis: false
      });

      // Call n8n webhook
      const response = await fetch('https://dindon.app.n8n.cloud/webhook/mindfullnessx1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userText,
          userId: session?.user?.id,
          history: messages.filter(m => m.id !== 'init').map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('server');
      }

      let replyText = '';
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          replyText = first.output || first.reply || first.response || first.text || first.message || '';
        } else {
          replyText = data.output || data.reply || data.response || data.text || data.message || '';
        }
      } else {
        replyText = await response.text();
      }

      if (!replyText || !replyText.trim()) {
        throw new Error('server');
      }

      // Save assistant reply to database
      await supabase.from('chat_messages').insert({
        user_id: session?.user?.id,
        role: 'assistant',
        content: replyText,
        flagged_crisis: false
      });

      // Analyze mascot expression based on Jiwo's response
      analyzeMascotExpression(replyText);

      // Re-fetch chat logs to sync state with database id values
      await fetchChatHistory();

    } catch (err: any) {
      console.error('Chat error:', err);
      // Distinguish a server-side failure from a real network problem so we
      // don't wrongly tell the user to check their internet.
      const isServerIssue = err?.message === 'server';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: isServerIssue
            ? 'Maaf ya, Jiwo sedang mengalami gangguan teknis sebentar. Bukan salah koneksimu kok — coba kirim lagi beberapa saat lagi ya 💙'
            : 'Maaf ya, koneksi ke Jiwo terputus sebentar. Tolong pastikan internetmu aktif dan coba kirim pesan lagi.',
          created_at: new Date().toISOString()
        }
      ]);
      setMascotState('sad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-165px)] justify-between relative">
      
      {/* Mascot Header Anchor */}
      <div className="flex items-center gap-3 bg-jiwo-blueLight/30 p-3 rounded-2xl border border-jiwo-primaryLight/20 mb-3.5 shadow-2xs shrink-0 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-12 h-12 scale-90 origin-bottom transform translate-y-1">
            <JiwoMascot state={mascotState} scale={1} showAnimation={true} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-jiwo-textDark">Jiwo Companion</h3>
            <p className="text-3xs text-jiwo-textMuted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-jiwo-primary animate-pulse" />
              <span>
                {mascotState === 'idle' && 'Menemani harimu'}
                {mascotState === 'happy' && 'Ikut senang untukmu'}
                {mascotState === 'calm' && 'Mari bernapas tenang'}
                {mascotState === 'stress' && 'Jiwo siap peluk cemasmu'}
                {mascotState === 'sad' && 'Jiwo berempati padamu'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCrisisModal(true)}
          className="flex items-center gap-1 text-3xs font-extrabold text-white bg-jiwo-stress hover:bg-jiwo-stress/90 px-2.5 py-1.5 rounded-xl transition shadow-sm uppercase tracking-wider"
        >
          <AlertOctagon className="w-3.5 h-3.5" /> Krisis
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto space-y-4 px-1 pb-4 scrollbar-thin scroll-smooth">
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <RefreshCw className="w-7 h-7 text-jiwo-primary animate-spin" />
            <span className="text-xs text-jiwo-textMuted font-semibold">Mengingat percakapan...</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-tr from-jiwo-primary to-jiwo-blueCalm text-white rounded-br-none shadow-2xs font-medium'
                    : 'bg-jiwo-blueLight/50 text-jiwo-textDark rounded-bl-none border border-jiwo-primaryLight/15'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-jiwo-textMuted text-xs font-semibold pl-2 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-jiwo-primary animate-ping" />
            <span>Jiwo sedang mengetik...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="flex gap-2 bg-white pt-2 border-t border-jiwo-primaryLight/10 shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ceritakan keluh kesahmu hari ini..."
          className="flex-grow px-4.5 py-3.5 rounded-2xl border border-jiwo-primaryLight/40 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent text-sm bg-jiwo-bg/40 text-jiwo-textDark"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="bg-jiwo-primary hover:bg-jiwo-primary/95 text-white p-3.5 rounded-2xl shadow transition disabled:opacity-50 shrink-0"
        >
          <Send className="w-5 h-5 fill-current" />
        </button>
      </form>

      {/* Crisis helpline list modal */}
      <CrisisModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
    </div>
  );
}
