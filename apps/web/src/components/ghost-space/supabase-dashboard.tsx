import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  claimGhostProfile, findMyGhostProfile, HANDLE_PATTERN, signupDetails,
  type GhostIdentity,
} from '@/lib/supabase-ghost-profile';
import { GhostSpaceLayout, type GhostSpaceSection } from '@/components/ghost-space/ghost-space-layout';

const sections: GhostSpaceSection[] = [
  'dashboard', 'profile', 'contributions', 'projects', 'table-talks',
  'network', 'notifications', 'settings',
];
const pendingTitles: Record<string, string> = {
  contributions: 'Contributions', projects: 'Projects', 'table-talks': 'Table Talks',
  network: 'Network', notifications: 'Notifications',
};

export function SupabaseGhostSpaceDashboard() {
  const { user, isLoading, error: sessionError } = useSupabaseAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const section = sections.includes(params.get('section') as GhostSpaceSection)
    ? (params.get('section') as GhostSpaceSection) : 'dashboard';

  const [profile, setProfile] = useState<GhostIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimError, setClaimError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [locationDisclosure, setLocationDisclosure] = useState('undisclosed');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (!user?.email_confirmed_at) return;
    let active = true;
    const initial = signupDetails(user);
    setNewHandle(initial.handle);
    setClaimError('');
    setLoading(true);
    void (async () => {
      try {
        let current = await findMyGhostProfile();
        if (!current && HANDLE_PATTERN.test(initial.handle)) {
          // A handle chosen on /join is only claimed after email confirmation.
          current = await claimGhostProfile(user, initial.handle, initial);
        }
        if (!active) return;
        setProfile(current);
        if (current) fill(current);
      } catch (e) {
        if (!active) return;
        setClaimError(e instanceof Error ? e.message : 'Could not create your Ghost profile.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user?.id]);

  function fill(current: GhostIdentity) {
    setName(current.display_name);
    setPronouns(current.pronouns);
    setBio(current.bio);
    setPortfolio(current.portfolio);
    setLocationDisclosure(current.location_disclosure);
    setCountry(current.location_country);
  }

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const handle = newHandle.trim().toLowerCase();
    if (!HANDLE_PATTERN.test(handle)) { setClaimError('Handle must be 3–40 lowercase letters, digits, underscores, hyphens or slashes.'); return; }
    setBusy(true);
    setClaimError('');
    try {
      const current = await claimGhostProfile(user, handle, signupDetails(user));
      setProfile(current);
      fill(current);
      setNotice('Your Ghost identity is active.');
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Could not claim handle.');
    } finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: updateError } = await supabaseBrowser().from('ghost_profiles').update({
        display_name: name.slice(0,100),
        pronouns: pronouns.slice(0,40),
        bio: bio.slice(0,2000),
        portfolio: portfolio.slice(0,2048),
        location_disclosure: locationDisclosure,
        location_country: locationDisclosure === 'country' ? country.slice(0,100) : '',
      }).eq('id', profile.id);
      if (updateError) throw updateError;
      const saved = await findMyGhostProfile();
      if (saved) setProfile(saved);
      setNotice('Public Ghost profile saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    navigate('/login', { replace: true });
  }

  if (isLoading || loading) return <main className="rail loading-state" style={{ padding: '60px 0' }}>Loading Ghost Space…</main>;
  if (!user?.email_confirmed_at) return <main className="login-wrap form-panel">
    <p>{sessionError || 'Email confirmation is required before entering Ghost Space.'}</p>
    <Link to="/login" className="button button-light">Sign in</Link>
  </main>;

  return (
    <GhostSpaceLayout section={section} handle={profile?.handle || 'New Ghost'}
      publicProfilePath="" onSignOut={() => { void signOut(); }}>
      {notice && <p role="status" className="status-message">{notice}</p>}
      {error && <p role="alert" className="status-message error-message">{error}</p>}
      {!profile ? (
        <div className="gs-placeholder">
          <span className="eyebrow"><span className="tiny-dot"/> COMPLETE YOUR GHOST IDENTITY</span>
          <h1>Claim your handle.</h1>
          <p>Your email is verified. Choose your permanent public handle. If the one you selected when joining has since been taken, choose another.</p>
          <form className="form-panel" onSubmit={claim}>
            <div className="field"><label htmlFor="new-handle">Permanent Ghost handle</label>
              <input id="new-handle" required minLength={3} maxLength={40} pattern="[a-z0-9_/-]+"
                value={newHandle} onChange={e => setNewHandle(e.target.value)} /></div>
            <button disabled={busy} className="button button-light">{busy ? 'Claiming…' : 'Claim Ghost handle'}</button>
            {claimError && <p role="alert" className="status-message error-message">{claimError}</p>}
          </form>
        </div>
      ) : section === 'dashboard' ? (
        <section className="gs-dashboard">
          <span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / DASHBOARD</span>
          <h1>Welcome, {profile.display_name || profile.handle}<span className="accent-period">.</span></h1>
          <p className="gs-section-lede">Your Ghost identity is now stored in Supabase. Your email is private and your handle is permanent.</p>
          <div className="gs-grid">
            <div className="gs-grid-main">
              <div className="form-panel"><h2>Public Ghost identity</h2>
                <p><strong>@{profile.handle}</strong></p>
                <p>{profile.bio || 'Add a bio to tell the network about your practice.'}</p>
                <Link className="button button-light" to="/ghost-space?section=profile">Edit my profile <ArrowUpRight size={15}/></Link>
              </div>
              <div className="form-panel"><h2>What's available now</h2>
                <p>Registration, email verification, account sign-in, profile creation, and profile editing are connected to Supabase.</p>
                <p className="muted-note">Contributions, projects, Table Talks and notifications are not yet migrated. The previous PocketBase experience remains in the development branch for comparison, but these features cannot be used through this new account yet.</p>
              </div>
            </div>
            <div className="gs-grid-side">
              <div className="form-panel"><h2>Account status</h2>
                <p>Email <strong>verified</strong></p>
                <p>Profile <strong>active</strong></p>
                <p className="muted-note">Ghost account details stay private; only the chosen profile fields are public.</p>
              </div>
            </div>
          </div>
        </section>
      ) : section === 'profile' ? (
        <section className="gs-placeholder">
          <span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / PROFILE</span>
          <h1>My Ghost profile.</h1>
          <p>Your public handle is permanent: <strong>@{profile.handle}</strong>. Only the information you choose below is public.</p>
          <form className="form-panel" onSubmit={saveProfile}>
            <div className="field"><label htmlFor="gs-display-name">Display name (optional)</label>
              <input id="gs-display-name" maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></div>
            <div className="field"><label htmlFor="gs-pronouns">Pronouns (optional)</label>
              <input id="gs-pronouns" maxLength={40} value={pronouns} onChange={e=>setPronouns(e.target.value)}/></div>
            <div className="field"><label htmlFor="gs-bio">About your work</label>
              <textarea id="gs-bio" maxLength={2000} value={bio} onChange={e=>setBio(e.target.value)}/></div>
            <div className="field"><label htmlFor="gs-portfolio">Portfolio link</label>
              <input id="gs-portfolio" type="url" maxLength={2048} value={portfolio} onChange={e=>setPortfolio(e.target.value)}/></div>
            <div className="field"><label htmlFor="gs-disclosure">Location disclosure</label>
              <select id="gs-disclosure" value={locationDisclosure} onChange={e=>setLocationDisclosure(e.target.value)}>
                <option value="undisclosed">Undisclosed</option>
                <option value="remote">Remote</option>
                <option value="country">Country</option>
              </select></div>
            {locationDisclosure==='country' && <div className="field"><label htmlFor="gs-country">Country (optional)</label>
              <input id="gs-country" maxLength={100} value={country} onChange={e=>setCountry(e.target.value)}/></div>}
            <button disabled={busy} className="button button-light">{busy ? 'Saving…' : 'Save profile'}</button>
          </form>
        </section>
      ) : section === 'settings' ? (
        <div className="gs-placeholder"><span className="eyebrow">GHOST SPACE / SETTINGS</span><h1>Account settings.</h1>
          <p>Your account is authenticated through Supabase. Email confirmation is required, and your public handle cannot be changed directly.</p>
          <p>More privacy, language, session and multi-factor settings are scheduled for the next migration stage.</p>
          <Link className="button button-outline" to="/ghost-space?section=profile">Edit public profile</Link>
        </div>
      ) : (
        <div className="gs-placeholder">
          <span className="eyebrow"><span className="tiny-dot"/> MIGRATION IN PROGRESS</span>
          <h1>{pendingTitles[section] || 'Ghost Space'}.</h1>
          <p>This workspace still needs its PocketBase data model and permissions migrated to Supabase. It is temporarily unavailable for Supabase accounts rather than allowing a misleading or unauthenticated operation.</p>
          <Link className="button button-outline" to="/ghost-space">Return to dashboard</Link>
        </div>
      )}
    </GhostSpaceLayout>
  );
}
