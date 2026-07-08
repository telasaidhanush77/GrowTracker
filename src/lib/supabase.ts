import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { sessionStorageAdapter } from './secureStore';
import type { Database } from '../db/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables.\n' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n' +
    'Copy .env.example to .env and fill in your Supabase project values.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Native: AES-encrypted, keychain-backed session store. Web: AsyncStorage.
    storage: sessionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

