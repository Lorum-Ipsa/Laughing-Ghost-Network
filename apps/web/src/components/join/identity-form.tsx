import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile } from '@/lib/network';
import { LOCATION_DISCLOSURES, type LocationDisclosure } from '@/lib/network';
import { ALL_SPECIALTIES } from '@/data/specialties';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';

/**
 * Open-membership identity creation. Anyone who accepts the Code can create a
 * Ghost identity — no prior proof of work required. Moderation governs
 * contributions, verification, and trust-sensitive functions, not basic
 * membership. On success the member is sent straight to Ghost Space.
 */
export function IdentityForm() {
  const { user, isLoading, signup } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<GhostProfile | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [practice, setPractice] = useState<string[]>([]);
  const [developing, setDeveloping] = useState<string[]>([]);
  const [disclosure, setDisclosure] = useState<LocationDisclosure>('undisclosed');

  useEffect(() => {
    if (!user || busy) return;
    let active = true;
    setChecking(true);
    pb.collection('ghost_profiles').getFullList<GhostProfile>({ filter: pb.filter('owner = {:id}', { id: user.id }), requestKey: null })
      .then((records) => { if (active) setProfile(records[0] || null); })
      .catch(() => { if (active) setError('Could not load your profile. Reload this page before continuing.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [user, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    const handle = String(data.get('handle') || '').trim().toLowerCase();
    try {
      if (!/^[a-z0-9_/-]{3,40}$/.test(handle)) throw new Error('Use a handle of 3 to 40 characters: lowercase letters, digits, hyphens, underscores, or slashes.');
      if (!user) {
        const password = String(data.get('password'));
        if (password !== data.get('passwordConfirm')) throw new Error('Passwords do not match.');
        await signup(String(data.get('email')), password, { name: handle });
      }
      const owner = pb.authStore.record?.id;
      if (!owner) throw new Error('Sign in to continue.');
      await pb.collection('ghost_profiles').create<GhostProfile>({
        owner,
        handle,
        specialties: practice.join(', '),
        developing_specialties: developing.join(', '),
        portfolio: data.get('portfolio') || '',
        bio: '',
        example: false,
        member: true,
        location_disclosure: disclosure,
        location_country: data.get('location_country') || '',
      });
      // Request the verification email. A successful API response is not
      // proof of SMTP delivery. Surface request errors on the next page.
      const signupEmail = String(data.get('email') || pb.authStore.record?.email || '');
      let verifyError = '';
      if (signupEmail) {
        try {
          await pb.collection('users').requestVerification(signupEmail);
        } catch (err) {
          verifyError = err instanceof Error ? err.message : 'The verification email could not be sent. You can resend it from the next page.';
        }
      }
      navigate('/verify-email', { state: { email: signupEmail, error: verifyError } });
    } catch (err) {
      const message = err instanceof Error && !('status' in err) ? err.message : 'The identity could not be created. This handle or email may already be in use. If the account was created, sign in to resume.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || checking) return <div className="form-panel"><div className="loading-state"><div className="loading-bar" />Loading…</div></div>;

  if (profile) return (
    <div className="form-panel application-status">
      <span className="eyebrow">IDENTITY / {profile.handle}</span>
      <h2 style={{ marginTop: 20 }}>You're already part of the network.</h2>
      <p>Your Ghost identity exists. Build your profile, connect existing work, propose contributions, and join projects from your Ghost Space.</p>
      <Link className="button button-light full-width" to="/ghost-space">Open Ghost Space <ArrowUpRight size={17} /></Link>
    </div>
  );

  return (
    <form className="form-panel" onSubmit={submit}>
      <h2>{user ? 'Create your Ghost identity' : 'Your Ghost identity starts here.'}</h2>
      <p>{user ? 'Choose a persistent handle and describe your practice. No civil name required.' : 'Create a private account and a Ghost identity. No civil name is required, and no prior work is expected — you can build your first public contribution through Laughing Ghost.'}</p>

      <div className="field">
        <label htmlFor="join-handle">Persistent handle *</label>
        <input id="join-handle" name="handle" required minLength={3} maxLength={40} pattern="[a-z0-9_/-]+" placeholder="your_handle" />
        <small>Your handle is intended to be persistent. Handle changes are exceptional and may require moderation so attribution remains intact.</small>
      </div>

      {!user && <>
        <div className="field"><label htmlFor="join-email">Private email address *</label><input id="join-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /><small>For account access only. Never shown on your public profile.</small></div>
        <div className="field"><label htmlFor="join-password">Password *</label><input id="join-password" name="password" type="password" required minLength={12} autoComplete="new-password" placeholder="12 characters minimum" /></div>
        <div className="field"><label htmlFor="join-confirm">Confirm password *</label><input id="join-confirm" name="passwordConfirm" type="password" required minLength={12} autoComplete="new-password" /></div>
      </>}

      <div className="field">
        <label>Specialties and interests</label>
        <small>Choose what you practice and what you are developing. Both are optional — you can build your first public contribution through Laughing Ghost.</small>
        <div style={{ display: 'grid', gap: 14, marginTop: 4 }}>
          <SearchableMultiSelect label="Practice" options={ALL_SPECIALTIES} selected={practice} onChange={setPractice} placeholder="Select specialties" />
          <SearchableMultiSelect label="Developing" options={ALL_SPECIALTIES} selected={developing} onChange={setDeveloping} placeholder="Select areas" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="join-location">Location disclosure</label>
        <select id="join-location" name="location_disclosure" value={disclosure} onChange={(e) => setDisclosure(e.target.value as LocationDisclosure)}>
          {LOCATION_DISCLOSURES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <small>Country is sufficient. Choose “Remote” or “Undisclosed” to reveal nothing. City and state/province are never required.</small>
      </div>
      {disclosure === 'country' && <div className="field"><label htmlFor="join-country">Country</label><input id="join-country" name="location_country" maxLength={100} placeholder="Germany, Romania, United States, Japan…" /></div>}

      <div className="field">
        <label htmlFor="join-portfolio">Existing work — optional</label>
        <input id="join-portfolio" type="url" name="portfolio" placeholder="https://…" />
        <small>Link a repository, paper, writeup, portfolio, project, talk, certification profile, lab, or other work if you have one. You can also build your first public contribution through Laughing Ghost.</small>
      </div>

      <label className="checkbox-field"><input type="checkbox" required /><span>I accept the <Link to="/code">code of conduct</Link> and commit to working only within authorized scopes.</span></label>

      {error && <p role="alert" className="status-message error-message">{error}</p>}
      <button disabled={busy} className="button button-light full-width">{busy ? 'Creating…' : 'Enter Ghost Space'}<ArrowUpRight size={17} /></button>
      {!user && <div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>}
    </form>
  );
}
