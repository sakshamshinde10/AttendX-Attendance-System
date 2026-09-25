const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Polyfill WebSocket for Node < 22 (required by @supabase/realtime-js)
const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');

let supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
if (supabaseUrl) {
  // Strip /rest/v1 or trailing slashes if pasted accidentally
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in backend/.env');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocketImpl,
  },
});

/**
 * Verify Supabase connection and table readiness
 */
const checkSupabaseConnection = async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  SUPABASE CONFIGURATION REQUIRED:');
    console.log('1. Go to: https://supabase.com/dashboard/project/_/settings/api');
    console.log('2. Copy Project URL -> SUPABASE_URL in backend/.env');
    console.log('3. Copy service_role secret key -> SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    console.log('4. Run the SQL script from backend/supabase_schema.sql in Supabase SQL Editor.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return false;
  }

  try {
    const { data, error } = await supabase.from('departments').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Supabase connected, but tables not found! Please run backend/supabase_schema.sql in Supabase SQL Editor.');
      } else {
        console.error(`❌ Supabase connection error: ${error.message}`);
      }
      return false;
    }
    console.log('✅ Supabase PostgreSQL Connected & Ready!');
    return true;
  } catch (err) {
    console.error(`❌ Supabase init error: ${err.message}`);
    return false;
  }
};

module.exports = { supabase, checkSupabaseConnection };
