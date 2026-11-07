import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase.database.types';
import { getSupabaseLabClient } from '@/lib/supabase-lab.client';

type GhostPublic = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  location_disclosure: string;
  location_country: string;
};

export function meta() {
  return [{ title: 'Supabase identity lab — LGN (development only)' }, { name: 'robots', content: 'noindex,nofollow,noarchive' }];
}

/** Never expose the test route on a production server or without opt-in. */
export function loader() {
  if (process.env.NODE_ENV === 'production' || process.env.LGN_SUPABASE_LAB !== 'true') {
    throw new Response('Not Found', { status: 404 });
  }
  return null;
}

/**
 * Isolated integration test for Supabase Auth + public Ghost identities.
 * The real /join, /login and /ghost-space pages still use PocketBase.
 * An unconfirmed signup receives no session; complete email confirmation
 * and sign in before claiming a persistent handle.
 */
export default function SupabaseIdentityLab() {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GhostPublic | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    let api: SupabaseClient<Database> | null = null;
    try {
      api = getSupabaseLabClient();
      if (mounted) setClient(api);
    } catch (e) {
      if (mounted) setError(e instanceof Error ? e.message : 'Invalid Supabase configuration.');
      return;
    }
    if (!api) return;
    void api.auth.getUser().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError) { setUser(null); return; }
      setUser(data.user);
    });
    const { data: { subscription } } = api.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!client || !user) {
      setProfile(null);
      return;
    }
    let active = true;
    setProfile(null);
    void findOwnProfile(client).then((value) => {
      if (active) setProfile(value);
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Profile lookup failed.');
    });
    return () => { active = false; };
  }, [client, user?.id]);

  // Reload the editable draft from the fetched profile. Clearing it when the
  // account changes prevents displaying data from a previous test session.
  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    if (!profile) setHandle('');
  }, [profile]);

  async function refreshProfile() {
    if (!client || !user) return;
    setProfile(await findOwnProfile(client));
  }

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setMessage(await task());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The test operation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    if (!client) throw new Error('Supabase is not configured.');
    if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
    const { data, error: authError } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + '/supabase-lab' },
    });
    if (authError) throw authError;
    setPassword('');
    if (!data.session) {
      return 'Account request accepted. Confirm the email address, return to this page, then sign in before claiming a Ghost handle. Do not assume an authenticated session exists.';
    }
    return 'Test account authenticated. Choose and claim a persistent handle below.';
  }

  async function signIn() {
    if (!client) throw new Error('Supabase is not configured.');
    const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) throw authError;
    setPassword('');
    return 'Signed in with Supabase. Your session is separate from your PocketBase session.';
  }

  async function signOut() {
    if (!client) throw new Error('Supabase is not configured.');
    const { error: authError } = await client.auth.signOut();
    if (authError) throw authError;
    setUser(null);
    setProfile(null);
    return 'Signed out of the Supabase development account.';
  }

  async function claimHandle() {
    if (!client) throw new Error('Supabase is not configured.');
    const candidate = handle.trim().toLowerCase();
    if (!/^[a-z0-9_/-]{3,40}$/.test(candidate)) {
      throw new Error('Handle must be 3–40 lowercase letters, digits, underscores, hyphens or slashes.');
    }
    const { data, error: authError } = await client.auth.getUser();
    if (authError || !data.user) throw new Error('Sign in with a confirmed account first.');
    const { error: insertError } = await client.from('ghost_profiles').insert({
      owner_id: data.user.id,
      handle: candidate,
      display_name: displayName.slice(0, 100),
      bio: bio.slice(0, 2000),
      location_disclosure: 'undisclosed',
      location_country: '',
    });
    if (insertError) throw insertError;
    await refreshProfile();
    return 'Your Ghost identity was created. Only public display fields can be edited by the account owner.';
  }

  async function saveProfile() {
    if (!client || !profile) throw new Error('Create your Ghost identity first.');
    const { error: updateError } = await client.from('ghost_profiles')
      .update({ display_name: displayName.slice(0, 100), bio: bio.slice(0, 2000) })
      .eq('id', profile.id);
    if (updateError) throw updateError;
    await refreshProfile();
    return 'Profile update accepted. Public fields refreshed from Supabase.';
  }

  async function checkPolicies() {
    if (!client || !profile) throw new Error('Sign in and claim a profile before checking its permissions.');
    // This request MUST fail because owner_id is intentionally not readable.
    const ownerCheck = await client.from('ghost_profiles').select('owner_id').eq('id', profile.id);
    if (!ownerCheck.error) throw new Error('SECURITY FAILURE: the public API disclosed the private account owner ID.');
    // The persistent handle MUST NOT be user-editable even on the user's row.
    const updateCheck = await client.from('ghost_profiles')
      .update({ handle: profile.handle + '-altered' })
      .eq('id', profile.id);
    if (!updateCheck.error) throw new Error('SECURITY FAILURE: the persistent handle could be changed by a member.');
    return 'Permission checks passed: owner ID cannot be selected and handle cannot be changed through the client.';
  }

  const configured = client !== null;

  function onLogin(e: FormEvent) {
    e.preventDefault();
    void run(signIn);
  }
  function onClaim(e: FormEvent) {
    e.preventDefault();
    void run(profile ? saveProfile : claimHandle);
  }

  return (
    <main className="rail section-space" style={{ maxWidth: 860 }}>
      <span className="eyebrow"><span className="tiny-dot" /> PRIVATE DEVELOPMENT / SUPABASE</span>
      <h1>Ghost identity lab<span className="accent-period">.</span></h1>
      <p className="muted-note">
        Development-only integration test. Your live site and ordinary LGN sign-in still use PocketBase.
        Do not create real accounts or enter production credentials here.
      </p>
      {!configured && (
        <div className="form-panel">
          <h2>Configuration required</h2>
          <p>Set LGN_SUPABASE_LAB=true and the VITE_LGN_SUPABASE_URL /
          VITE_LGN_SUPABASE_PUBLISHABLE_KEY environment variables before starting the dev server.</p>
          <p>See docs/supabase/identity-test-plan.md. Never put a secret or service-role key in VITE_ variables.</p>
        </div>
      )}
      {configured && (
        <>
          <div className="form-panel">
            <h2>1. Supabase authentication</h2>
            {!user ? (
              <form onSubmit={onLogin}>
                <div className="field">
                  <label htmlFor="lab-email">Private test email</label>
                  <input id="lab-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="lab-password">Password (12+ characters)</label>
                  <input id="lab-password" type="password" autoComplete="current-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button className="button button-light" type="submit" disabled={busy}>Sign in</button>
                <button className="button button-outline" type="button" disabled={busy}
                  onClick={() => { void run(signUp); }}>Create test account</button>
                <p className="muted-note">With email confirmation enabled, finish verification before signing in.</p>
              </form>
            ) : (
              <>
                <p>Signed in to the Supabase development project as <strong>{user.email}</strong>.</p>
                <button className="button button-outline" type="button" disabled={busy}
                  onClick={() => { void run(signOut); }}>Sign out of Supabase</button>
              </>
            )}
          </div>
          {user && (
            <div className="form-panel">
              <h2>2. Ghost identity</h2>
              {profile && <p>Existing public handle: <strong>@{profile.handle}</strong></p>}
              <form onSubmit={onClaim}>
                {!profile && (
                  <div className="field">
                    <label htmlFor="lab-handle">Permanent public handle</label>
                    <input id="lab-handle" required minLength={3} maxLength={40} value={handle}
                      onChange={e => setHandle(e.target.value)} placeholder="test_ghost" />
                    <small>Handles cannot be changed or reused after deletion.</small>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="lab-display-name">Optional public display name</label>
                  <input id="lab-display-name" maxLength={100} value={displayName}
                    onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="lab-bio">Public bio</label>
                  <textarea id="lab-bio" maxLength={2000} value={bio}
                    onChange={e => setBio(e.target.value)} />
                </div>
                <button type="submit" className="button button-light" disabled={busy}>
                  {profile ? 'Save public profile' : 'Claim handle'}
                </button>
              </form>
            </div>
          )}
          {user && profile && (
            <div className="form-panel">
              <h2>3. Negative authorization checks</h2>
              <p>Attempt to select the private account ID and to rename the persistent handle.
                Both operations must be denied by the database.</p>
              <button type="button" className="button button-outline" disabled={busy}
                onClick={() => { void run(checkPolicies); }}>Run permission tests</button>
            </div>
          )}
          {error && <p role="alert" className="status-message error-message">{error}</p>}
          {message && <p role="status" className="status-message">{message}</p>}
        </>
      )}
    </main>
  );
}

async function findOwnProfile(client: SupabaseClient<Database>): Promise<GhostPublic | null> {
  const { data: link, error: linkError } = await client.from('ghost_profile_links')
    .select('profile_id')
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) return null;

  // Never select owner_id: it is not exposed to browser clients.
  const { data: profile, error: profileError } = await client.from('ghost_profiles')
    .select('id,handle,display_name,bio,location_disclosure,location_country')
    .eq('id', link.profile_id)
    .maybeSingle();
  if (profileError) throw profileError;
  return profile;
}
