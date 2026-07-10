import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    // We can query postgrest to see one row's structure, or run an RPC if available.
    // Or we can just try to insert a test message with 'sender' and see if it works, or do a select.
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('Columns in chat_messages table:', Object.keys(data[0] || {}));
  } catch (err) {
    console.error('Error:', err);
  }
}

inspect();
