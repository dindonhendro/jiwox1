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
        { user_id: user.id, role: 'user', content: message, flagged_crisis: true },
        { 
          user_id: user.id, 
          role: 'assistant', 
          content: 'Maafkan aku ya, tapi sepertinya kamu sedang melewati masa yang sangat berat saat ini. Aku sangat peduli padamu, tapi aku hanyalah AI pendamping. Tolong hubungi layanan darurat SEJIWA dengan menekan tombol darurat merah atau kontak profesional kesehatan jiwa Indonesia sekarang juga. Kamu tidak sendirian.', 
          flagged_crisis: true 
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
      role: 'user',
      content: message,
      flagged_crisis: false
    });

    // Fetch user profile info to personalize response
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama, baseline_assessment')
      .eq('id', user.id)
      .single();

    const userName = profile?.nama || 'Sahabat';

    // 2. RAG AUGMENTATION (IF AVAILABLE)
    let ragContext = '';
    try {
      // Generate embedding for query using native gte-small model
      // @ts-ignore
      const aiSession = new Supabase.ai.Session('gte-small');
      const queryEmbedding = await aiSession.run(message, {
        mean_pool: true,
        normalize: true,
      });

      // Query database for similar chunks
      const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_rag_chunks', {
        query_embedding: Array.from(queryEmbedding),
        match_threshold: 0.6,
        match_count: 3
      });

      if (rpcError) {
        console.error('RPC match_rag_chunks error:', rpcError);
      } else if (matchedChunks && matchedChunks.length > 0) {
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
      ${ragContext ? `\nInformasi referensi tepercaya untuk merespons:\n${ragContext}\n` : ''}
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

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    let replyText: string;

    if (anthropicApiKey) {
      // --- Provider 1: Anthropic Claude (production) ---
      // claude-3-5-sonnet-20241022 was retired (Oct 2025) and returns 404;
      // claude-sonnet-4-6 is its official drop-in replacement.
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API call failed:', errText);
        throw new Error(`Anthropic Claude API returned error: ${response.status}`);
      }

      const resJson = await response.json();
      replyText = resJson.content[0].text;

    } else if (geminiApiKey) {
      // --- Provider 2: Google Gemini (free tier) ---
      const response = await fetch(
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

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API call failed:', errText);
        throw new Error(`Gemini API returned error: ${response.status}`);
      }

      const resJson = await response.json();
      replyText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) throw new Error('Gemini returned an empty response');

    } else {
      // --- Provider 3: Pollinations.ai (free, no API key — testing fallback) ---
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: systemPrompt },
            ...formattedMessages
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Pollinations API call failed:', errText);
        throw new Error(`Pollinations API returned error: ${response.status}`);
      }

      // Endpoint mirrors the OpenAI chat-completions shape, but be tolerant
      // of a plain-text body as well.
      const raw = await response.text();
      try {
        const resJson = JSON.parse(raw);
        replyText = resJson.choices?.[0]?.message?.content ?? raw;
      } catch {
        replyText = raw;
      }
      if (!replyText || !replyText.trim()) throw new Error('Pollinations returned an empty response');
    }

    // Save assistant reply to database
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: replyText,
      flagged_crisis: false
    });

    return new Response(JSON.stringify({
      flagged_crisis: false,
      reply: replyText
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
