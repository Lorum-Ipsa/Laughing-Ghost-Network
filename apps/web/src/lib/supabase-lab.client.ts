import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.database.types';

/**
 * Experimental, browser-only Supabase client for the isolated /supabase-lab route.
 * This is NOT the production auth implementation. React Router loaders/actions
 * must use a cookie-based SSR integration when we migrate the actual app.
 */
let labClient: SupabaseClient<Database> | null = null;

export function getSupabaseLabClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;

  const url = import.meta.env.VITE_LGN_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_LGN_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;

  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error('The Supabase test URL must use HTTPS (or local development).');
  }
  if (!labClient) {
    labClient = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'lgn-supabase-lab-session',
      },
    });
  }
  return labClient;
}
