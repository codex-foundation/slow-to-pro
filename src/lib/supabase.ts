import { createClient } from '@supabase/supabase-js';

import { appStorage } from '@/utils/mmkv';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

const sbStorage = {
  getItem: (key: string) => Promise.resolve(appStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(appStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(appStorage.removeItem(key)),
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: sbStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const CLOUD_SYNC_TABLE = 'user_sync_snapshots';
