// Deno Edge Function for Jiwo Chat & Safety Guardrails
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function checkCrisis(text: string): boolean {
  const cleanText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => cleanText.includes(keyword));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user identity from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse Request Body
    const { message, history = [] } = await req.json();

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message content cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. CRISIS DETECTION (SAFETY LAYER)
    if (checkCrisis(message)) {
      // Save flagged message to db
      await supabase.from('chat_messages').insert([
        { user_id: user.id, sender: 'user', content: message },
        { 
          user_id: user.id, 
          sender: 'ai', 
          content: 'Maafkan aku ya, tapi sepertinya kamu sedang melewati masa yang sangat berat saat ini. Aku sangat peduli padamu, tapi aku hanyalah AI pendamping. Tolong hubungi layanan darurat SEJIWA dengan menekan tombol darurat merah atau kontak profesional kesehatan jiwa Indonesia sekarang juga. Kamu tidak sendirian.'
        }
      ]);

      return new Response(JSON.stringify({
        flagged_crisis: true,
        reply: 'Maafkan aku ya, tapi sepertinya kamu sedang melewati masa yang sangat berat saat ini. Aku sangat peduli padamu, tapi aku hanyalah AI pendamping. Tolong hubungi layanan darurat SEJIWA dengan menekan tombol darurat merah atau kontak profesional kesehatan jiwa Indonesia sekarang juga. Kamu tidak sendirian.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save user message to database
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      sender: 'user',
      content: message
    });

    // Fetch user profile info to personalize response
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama, baseline_assessment')
      .eq('id', user.id)
      .single();

    const userName = profile?.nama || 'Sahabat';

    // 2. RAG RETRIEVAL — find knowledge chunks relevant to the message
    let ragContext = '';
    let matchedCount = 0;
    // Note: with gte-small on Indonesian text, cosine similarity is compressed
    // and non-discriminative (~0.83–0.90 for both relevant and irrelevant
    // queries), so a similarity threshold cannot tell "grounded" from "not".
    // Instead we let the model self-report actual reference usage via a hidden
    // [[GROUNDED]] tag (detected after generation below).
    try {
      // Generate embedding for query using native gte-small model
      // @ts-ignore
      const aiSession = new Supabase.ai.Session('gte-small');
      const queryEmbedding = await aiSession.run(message, {
        mean_pool: true,
        normalize: true,
      });

      // Query database for similar chunks. Threshold lowered to 0.45 for better
      // recall on Indonesian text with gte-small; take up to 4 chunks.
      const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_rag_chunks', {
        query_embedding: Array.from(queryEmbedding),
        match_threshold: 0.45,
        match_count: 4
      });

      if (rpcError) {
        console.error('RPC match_rag_chunks error:', rpcError);
      } else if (matchedChunks && matchedChunks.length > 0) {
        matchedCount = matchedChunks.length;
        console.log(`Matched ${matchedChunks.length} chunks from RAG.`);
        ragContext = matchedChunks
          .map((c: any, index: number) => `[Referensi ${index + 1}]:\n${c.content}`)
          .join('\n\n');
      } else {
        console.log('No matching chunks found above threshold.');
      }
    } catch (e) {
      console.warn('RAG similarity search omitted or failed:', e);
    }

    // 3. LLM INVOCATION (provider chain: Claude → Gemini → free keyless fallback)
    const systemPrompt = `
      Nama Anda adalah Jiwo. Anda adalah pendamping kesehatan mental (mental health companion) interaktif untuk Gen Z & Milenial di Indonesia.
      Kepribadian Anda: Sangat hangat, empatik, menenangkan, sabar, dan bersahabat.
      Gaya bicara: Bahasa Indonesia kasual yang santai namun sopan dan berempati. Gunakan panggilan "kamu" untuk pengguna dan "aku" untuk diri Anda. Gunakan akhiran kalimat yang lembut khas Indonesia seperti "ya", "sih", "kok", "nih".
      
      Aturan Penting & Guardrails:
      1. Anda BUKAN seorang psikolog atau psikiater klinis. Jangan mendiagnosis masalah kesehatan mental (misal: "Anda menderita bipolar/depresi klinis").
      2. Jangan meresepkan obat atau terapi klinis formal.
      3. Jika pengguna menunjukkan kecemasan, berikan validasi emosi mereka secara hangat, lalu ajak mereka untuk melakukan latihan pernapasan (sesi Rescue) di aplikasi ini.
      4. Jangan pernah berhalusinasi atau memberikan saran medis jika tidak yakin. Mengakulah dengan jujur bahwa Anda adalah pendamping AI yang terbatas.
      5. Panggil nama pengguna: ${userName} untuk membangun kedekatan emosional.

      Aturan Sumber Jawaban (PENTING):
      6. Untuk pertanyaan yang meminta INFORMASI, FAKTA, TEKNIK, atau SARAN, utamakan dan bersandar pada "Informasi referensi" di bawah. Jika informasi yang diminta TIDAK ADA di referensi, JANGAN mengarang atau mengambil dari pengetahuan umum — akui dengan jujur dan hangat bahwa kamu belum punya bahannya di catatanmu, lalu tawarkan menemani atau mengarahkan ke fitur aplikasi (Rescue, Jurnal, Visualisasi).
      7. Untuk curhat, sapaan, atau dukungan emosional, kamu TETAP boleh merespons penuh empati walau tanpa referensi. Kehangatan tidak butuh sumber.
      8. Saat memakai isi referensi, sampaikan kembali dengan bahasamu sendiri yang hangat dan mudah dipahami — jangan menyalin mentah-mentah.
      9. PENANDA (WAJIB): Jika jawabanmu benar-benar mengambil isi dari "Informasi referensi" di atas, tuliskan tepat token [[GROUNDED]] di baris paling akhir jawabanmu. Jika jawabanmu TIDAK memakai referensi (sekadar empati, sapaan, obrolan, atau kamu menolak karena tak ada bahannya di catatan), JANGAN tulis token itu sama sekali. Token ini akan disembunyikan dari pengguna.
      ${ragContext
        ? `\nInformasi referensi tepercaya (gunakan ini sebagai sumber utama untuk pertanyaan informasi):\n${ragContext}\n`
        : `\n(Catatan internal: tidak ada referensi yang cocok untuk pesan ini. Jika pengguna menanyakan informasi/fakta/teknik, akui dengan hangat bahwa kamu belum punya bahannya dan JANGAN mengarang. Jika ini curhat atau sapaan, temani saja dengan empati.)\n`}
    `;

    // Map history to Claude message structure
    // Anthropic Claude Messages API format: [{role: "user"|"assistant", content: [{type: "text", text: "..."}]}]
    const formattedMessages = [
      ...history.slice(-10).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    // Free keyless LLM used as the universal fallback (no API key needed).
    const askPollinations = async (): Promise<string> => {
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages]
        })
      });
      if (!res.ok) throw new Error(`Pollinations ${res.status}: ${await res.text()}`);
      const raw = await res.text();
      try {
        const j = JSON.parse(raw);
        return (j.choices?.[0]?.message?.content ?? raw).trim();
      } catch {
        return raw.trim();
      }
    };

    let replyText = '';
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    try {
      if (anthropicApiKey) {
        // --- Provider 1: Anthropic Claude (production) ---
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: formattedMessages
          })
        });
        if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
        const j = await res.json();
        replyText = (j.content?.[0]?.text ?? '').trim();

      } else if (geminiApiKey) {
        // --- Provider 2: Google Gemini (free tier) ---
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: formattedMessages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              })),
              generationConfig: { maxOutputTokens: 1024 }
            })
          }
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
        const j = await res.json();
        replyText = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

      } else {
        // --- Provider 3: Pollinations.ai (free, no API key — testing) ---
        replyText = await askPollinations();
      }
    } catch (llmErr) {
      console.error('LLM provider failed:', llmErr);
      // Primary keyed provider errored → fall back to the free keyless LLM so
      // chat never goes fully dark.
      if (anthropicApiKey || geminiApiKey) {
        try {
          replyText = await askPollinations();
        } catch (fbErr) {
          console.error('Keyless fallback failed:', fbErr);
        }
      }
    }

    if (!replyText) {
      replyText = 'Hai! Aku sedang menyelaraskan pikiranku sebentar. Boleh kamu sapa aku lagi nanti? 💙';
    }

    // "grounded" = the model self-reported that it actually used the knowledge
    // base (via the hidden [[GROUNDED]] tag). Detect it, then strip it so the
    // user never sees the token.
    const grounded = /\[\[\s*GROUNDED\s*\]\]/i.test(replyText);
    replyText = replyText.replace(/\[\[\s*GROUNDED\s*\]\]/gi, '').trim();

    // Save assistant reply to database
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      sender: 'ai',
      content: replyText
    });

    return new Response(JSON.stringify({
      flagged_crisis: false,
      reply: replyText,
      grounded,           // true = jawaban benar-benar memakai knowledge base
      sources: matchedCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Edge Function Chat Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
