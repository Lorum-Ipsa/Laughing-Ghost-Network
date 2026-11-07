import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.database.types';

/**
 * Development fallback: PUBLIC publishable key, never a service-role secret.
 * Production deployments must supply VITE_LGN_SUPABASE_* variables.
 * All data authorization remains enforced by Supabase RLS.
 */
const developmentUrl = 'https://oatdfrnytmliunauxqyd.supabase.co';
const developmentPublishableKey = 'sb_publishable_s96-vMc_eEhA5K0s7D8CtA_WcTCeh2f';
let singleton: SupabaseClient<Database> | null = null;

/** The same publishable credentials may also be used for SSR reads of PUBLIC fields.
 * This function never returns a service-role key. */
export function supabasePublicConfig(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_LGN_SUPABASE_URL || (import.meta.env.DEV ? developmentUrl : '');
  const configuredKey = import.meta.env.VITE_LGN_SUPABASE_PUBLISHABLE_KEY || '';
  const key = configuredKey.startsWith('sb_publishable_') || configuredKey.startsWith('eyJ')
    ? configuredKey : (import.meta.env.DEV ? developmentPublishableKey : '');
  if (!url || !key || !url.startsWith('https://')) return null;
  return { url, key };
}

export function supabaseBrowser(): SupabaseClient<Database> {
  if (typeof window === 'undefined') throw new Error('Supabase Auth must run in a browser.');
  const url = import.meta.env.VITE_LGN_SUPABASE_URL || (import.meta.env.DEV ? developmentUrl : '');
  const configuredKey = import.meta.env.VITE_LGN_SUPABASE_PUBLISHABLE_KEY || '';
  const key = configuredKey.startsWith('sb_publishable_') || configuredKey.startsWith('eyJ')
    ? configuredKey : (import.meta.env.DEV ? developmentPublishableKey : '');
  if (!url || !key) throw new Error('Supabase Auth has not been configured for this deployment.');
  if (!url.startsWith('https://') && !url.startsWith('http://localhost:')) {
    throw new Error('Supabase must use HTTPS.');
  }
  if (!singleton) {
    singleton = createClient<Database>(url, key, {
      auth: {
        flowType: 'implicit', // Client-only preview; SSR migration requires PKCE.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'lgn-supabase-auth',
      },
    });
  }
  return singleton;
}
export const verifyEmailRedirect = () => `${window.location.origin}/verify-email`;
export const resetPasswordRedirect = () => `${window.location.origin}/reset-password`;
