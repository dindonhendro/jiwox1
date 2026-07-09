import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ahnchamqeyiqhfeezlxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobmNoYW1xZXlpcWhmZWV6bHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDk0ODIsImV4cCI6MjA3NjA4NTQ4Mn0.seGmkxXPQ73QyzHycjJ5xyNyAkd1KUNQIum3qQvqaXY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function chunkText(text, maxWords = 150, overlapWords = 30) {
  const words = text.split(/\s+/);
  const chunks = [];
  
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

async function run() {
  // Read document content
  const docPath = path.resolve('docs/reference_anxiety_guide.md');
  if (!fs.existsSync(docPath)) {
    console.error('Reference document not found at:', docPath);
    return;
  }

  const content = fs.readFileSync(docPath, 'utf-8');
  console.log('Read reference document with length:', content.length);

  // Chunk content locally
  const chunks = chunkText(content);
  console.log(`Generated ${chunks.length} chunks locally for ingestion.`);

  // Authenticate (temporary test user or login)
  const email = `ingest-agent-${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('Creating a temporary session for ingestion:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nama: 'Ingest Agent'
      }
    }
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  let session = signUpData.session;
  if (!session) {
    console.log('Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in error:', signInError);
      return;
    }
    session = signInData.session;
  }

  if (!session) {
    console.error('Could not retrieve active session.');
    return;
  }

  const token = session.access_token;
  console.log('Authenticated successfully.');

  try {
    // 1. Create Document Entry
    console.log('Creating document entry via Edge Function...');
    const docRes = await fetch(`${supabaseUrl}/functions/v1/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create_document',
        title: 'Panduan Penanganan Kecemasan & Overthinking (Jiwo.ai Reference)',
        source: 'docs/reference_anxiety_guide.md'
      })
    });

    if (!docRes.ok) {
      const errBody = await docRes.text();
      throw new Error(`Failed to create document: HTTP ${docRes.status} - ${errBody}`);
    }

    const docBody = await docRes.json();
    const documentId = docBody.document_id;
    console.log('Document created with ID:', documentId);

    // 2. Upload Chunks Sequentially
    console.log('Uploading chunks...');
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Uploading chunk ${i + 1}/${chunks.length}...`);
      const chunkRes = await fetch(`${supabaseUrl}/functions/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'insert_chunk',
          document_id: documentId,
          content: chunks[i],
          chunk_index: i,
          total_chunks: chunks.length
        })
      });

      if (!chunkRes.ok) {
        const errBody = await chunkRes.text();
        console.error(`Error uploading chunk ${i + 1}: HTTP ${chunkRes.status} - ${errBody}`);
      } else {
        const chunkBody = await chunkRes.json();
        console.log(`Chunk ${i + 1} uploaded successfully! ID: ${chunkBody.chunk_id}`);
      }
    }

    console.log('All reference chunks successfully processed!');
  } catch (err) {
    console.error('Error during ingest pipeline:', err);
  } finally {
    console.log('Cleaning up: Logging out.');
    await supabase.auth.signOut();
  }
}

run();
