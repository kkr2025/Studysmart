import { createClient } from '@supabase/supabase-js';

// Get credentials from Vite environment variables (.env.local)
const metaEnv = (import.meta as any).env || {};
const envUrl = metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);

// Default / fallback credentials (can be overridden in .env.local)
const DEFAULT_URL = 'https://YOUR_NEW_SUPABASE_PROJECT.supabase.co';
const DEFAULT_KEY = 'YOUR_NEW_SUPABASE_ANON_KEY';

export const supabaseUrl = envUrl || DEFAULT_URL;
export const supabaseAnonKey = envKey || DEFAULT_KEY;

if (supabaseUrl.includes('YOUR_NEW_SUPABASE_PROJECT')) {
  console.warn(
    '⚠️ SmartStudy: Supabase credentials not configured yet! Please update .env.local with your new Supabase Project URL and Anon Key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
