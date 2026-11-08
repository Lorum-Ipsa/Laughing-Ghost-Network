import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { SupabaseProfileEditor } from '@/components/ghost-space/profile/supabase-profile-editor';
import { SupabaseContributions } from '@/components/ghost-space/contributions/supabase-contributions';
import { SupabaseTableTalks } from '@/components/ghost-space/table-talks/supabase-table-talks';
import { SupabaseProjects } from '@/components/ghost-space/projects/supabase-projects';
import { SupabaseReviewQueue } from '@/components/ghost-space/review/supabase-review-queue';
import { ghostProfilePath, validNewGhostHandle } from '@/lib/ghost-handle';
import {
  claimGhostProfile, findMyGhostProfile, signupDetails,
  type GhostIdentity,
} from '@/lib/supabase-ghost-profile';
import { GhostSpaceLayout, type GhostSpaceSection } from '@/components/ghost-space/ghost-space-layout';

const sections: GhostSpaceSection[] = [
  'dashboard', 'profile', 'contributions', 'review', 'projects', 'table-talks',
  'network', 'notifications', 'settings',
];
const pendingTitles: Record<string, string> = {
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
  const [canReview,setCanReview] = useState(false);

  useEffect(() => {
    if (!user?.id) { setCanReview(false); return; }
    let active=true;
    void Promise.resolve(supabaseBrowser().rpc('can_review_contributions')).then(({data,error}) => {
      if (active) setCanReview(!error && data===true);
    }).catch(()=>{if(active)setCanReview(false);});
    return()=>{active=false;};
  }, [user?.id]);

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
        if (!current && validNewGhostHandle(initial.handle)) {
          // A handle chosen on /join is only claimed after email confirmation.
          current = await claimGhostProfile(user, initial.handle, initial);
        }
        if (!active) return;
        setProfile(current);
      } catch (e) {
        if (!active) return;
        setClaimError(e instanceof Error ? e.message : 'Could not create your Ghost profile.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user?.id]);


  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const handle = newHandle.trim();
    if (!validNewGhostHandle(handle)) { setClaimError('Handles need 3–40 characters starting with a letter/digit. Use . _ - ! @ # $ & + ~ or //; single slashes and /// are invalid.'); return; }
    setBusy(true);
    setClaimError('');
    try {
      const current = await claimGhostProfile(user, handle, signupDetails(user));
      setProfile(current);
      setNotice('Your Ghost identity is active.');
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Could not claim handle.');
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
    <GhostSpaceLayout section={section} canReview={canReview} handle={profile?.handle || 'New Ghost'}
      publicProfilePath={profile ? ghostProfilePath(profile.handle) : ""} onSignOut={() => { void signOut(); }}>
      {notice && <p role="status" className="status-message">{notice}</p>}
      {error && <p role="alert" className="status-message error-message">{error}</p>}
      {!profile ? (
        <div className="gs-placeholder">
          <span className="eyebrow"><span className="tiny-dot"/> COMPLETE YOUR GHOST IDENTITY</span>
          <h1>Claim your handle.</h1>
          <p>Your email is verified. Choose your permanent public handle. If the name you selected was taken (including a different capitalization), choose another. The exact capitalization you claim will be preserved.</p>
          <form className="form-panel" onSubmit={claim}>
            <div className="field"><label htmlFor="new-handle">Permanent Ghost handle</label>
              <input id="new-handle" required minLength={3} maxLength={40} pattern="[A-Za-z0-9](?!.*///)(?:[A-Za-z0-9._!@#$&+~\-]|//){1,39}"
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
                <p>Registration, email confirmation, the complete Ghost profile editor, and contribution drafting/revision history are connected to Supabase.</p>
                <p className="muted-note">Contributions support private drafts, direct publication, and deletion. A screening concern sends work to the Review queue. Projects supports briefs, membership requests, and tasks. Table Talks supports exercises, participant decisions and debriefs. Notifications, custom avatar uploads and advanced settings remain in development.</p>
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
        <SupabaseProfileEditor profile={profile} onSaved={(updated) => {
          setProfile(updated);
          setNotice('Profile updated successfully.');
          setError('');
        }} />
      ) : section === 'contributions' ? (
        <SupabaseContributions profile={profile} userId={user.id} />
      ) : section === 'projects' ? (
        <SupabaseProjects profileId={profile.id} />
      ) : section === 'table-talks' ? (
        <SupabaseTableTalks profileId={profile.id} />
      ) : section === 'review' ? (
        <SupabaseReviewQueue profile={profile} />
      ) : section === 'settings' ? (
        <div className="gs-placeholder"><span className="eyebrow">GHOST SPACE / SETTINGS</span><h1>Account settings.</h1>
          <p>Your account is authenticated through Supabase. Email confirmation is required, and your public handle cannot be changed directly.</p>
          <p>More private preferences, account recovery controls, session management and multi-factor settings are scheduled for the next migration stage.</p>
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
