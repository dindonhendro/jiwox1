import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ahnchamqeyiqhfeezlxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobmNoYW1xZXlpcWhmZWV6bHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDk0ODIsImV4cCI6MjA3NjA4NTQ4Mn0.seGmkxXPQ73QyzHycjJ5xyNyAkd1KUNQIum3qQvqaXY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `test-user-${Date.now()}@example.com`;
  const password = 'Password123!';
  
  console.log('Logging in a test user to query RAG chat...', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nama: 'Aria'
      }
    }
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  let session = signUpData.session;
  if (!session) {
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

  const token = session.access_token;
  
  const query = 'Bagaimana cara melakukan teknik grounding 5-4-3-2-1?';
  console.log(`Sending chat query: "${query}"`);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: query,
        history: []
      })
    });

    console.log('HTTP Status:', res.status);
    const body = await res.json();
    console.log('\n--- Jiwo AI response ---');
    console.log(body.reply);
    console.log('------------------------\n');
    console.log('Flagged Crisis:', body.flagged_crisis);
  } catch (err) {
    console.error('Error during chat query:', err);
  } finally {
    await supabase.auth.signOut();
  }
}

run();
