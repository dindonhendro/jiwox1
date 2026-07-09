import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function chunkText(text: string, maxWords = 150, overlapWords = 30): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + maxWords);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '));
    }
    i += maxWords - overlapWords;
  }
  
  return chunks;
}

Deno.serve(async (req) => {
  // CORS Preflight
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

    // Initialize Supabase Client using incoming auth header (JWT) to verify user is logged in
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize admin Supabase Client with service role key to insert documents bypass RLS
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse Request Body
    const body = await req.json();
    const { action } = body;

    if (action === 'create_document') {
      const { title, source } = body;
      if (!title) {
        return new Response(JSON.stringify({ error: 'Missing title field' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: docData, error: docError } = await supabase
        .from('rag_documents')
        .insert({ title, source })
        .select()
        .single();

      if (docError) {
        throw new Error(`Failed to insert document: ${docError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        document_id: docData.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } 
    
    if (action === 'insert_chunk') {
      const { document_id, content, chunk_index, total_chunks } = body;
      if (!document_id || !content) {
        return new Response(JSON.stringify({ error: 'Missing document_id or content field' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate embedding using gte-small (384 dimensions)
      // @ts-ignore
      const session = new Supabase.ai.Session('gte-small');
      const embeddingResult = await session.run(content, {
        mean_pool: true,
        normalize: true,
      });

      // Insert chunk into DB
      const { data: chunkData, error: chunkError } = await supabase
        .from('rag_chunks')
        .insert({
          document_id,
          content,
          embedding: Array.from(embeddingResult), // Convert Float32Array to standard JS Array
          metadata: { chunk_index, total_chunks }
        })
        .select()
        .single();

      if (chunkError) {
        throw new Error(`Failed to insert chunk: ${chunkError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        chunk_id: chunkData.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid or missing action. Use create_document or insert_chunk.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Ingest Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
