import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe(): void } | undefined;
    try {
      const api = supabaseBrowser();
      const { data } = api.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setLoading(false);
      });
      subscription = data.subscription;
      void api.auth.getUser().then(({ data, error: authError }) => {
        if (!active) return;
        setUser(authError ? null : (data.user ?? null));
        setLoading(false);
      }).catch(e => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Could not verify your session.');
        setLoading(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Supabase is not configured.');
      setLoading(false);
    }
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  return { user, isLoading, isAuthed: !!user?.email_confirmed_at, error };
}
