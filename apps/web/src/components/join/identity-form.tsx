import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabaseBrowser, verifyEmailRedirect } from '@/lib/supabase-browser';
import { validNewGhostHandle } from '@/lib/ghost-handle';
import { LOCATION_DISCLOSURES, type LocationDisclosure } from '@/lib/network';
import { ALL_SPECIALTIES } from '@/data/specialties';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';

/** The normal visitor signup now creates a Supabase Auth account.
 * The selected public profile is claimed after email confirmation. */
export function IdentityForm() {
  const { user, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [practice, setPractice] = useState<string[]>([]);
  const [developing, setDeveloping] = useState<string[]>([]);
  const [disclosure, setDisclosure] = useState<LocationDisclosure>('undisclosed');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const handle = String(data.get('handle') || '').trim();
    const email = String(data.get('email') || '').trim();
    setBusy(true);
    setError('');
    try {
      if (user?.email_confirmed_at) { navigate('/ghost-space'); return; }
      if (!validNewGhostHandle(handle)) throw new Error('Use 3–40 characters starting with a letter or digit. Allowed punctuation: . _ - ! @ # $ & + ~ and the LGN double slash //. Single slashes and /// are not allowed.');
      const password = String(data.get('password') || '');
      if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
      if (password !== String(data.get('passwordConfirm') || '')) throw new Error('Passwords do not match.');
      const specialties = practice.join(', ');
      const developing_specialties = developing.join(', ');
      if (specialties.length > 250 || developing_specialties.length > 250) {
        throw new Error('Choose fewer specialties; each list must be at most 250 characters.');
      }
      const api = supabaseBrowser();
      // Uniqueness is enforced case-insensitively by the server's permanent
      // handle ledger after confirmation; a client-side check cannot reserve it.
      const country = disclosure === 'country' ? String(data.get('location_country') || '').trim() : '';
      const { data: registration, error: signupError } = await api.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: verifyEmailRedirect(),
          data: {
            lgn_handle: handle,
            lgn_specialties: specialties,
            lgn_developing_specialties: developing_specialties,
            lgn_portfolio: String(data.get('portfolio') || ''),
            lgn_location_disclosure: disclosure,
            lgn_location_country: country,
          },
        },
      });
      if (signupError) throw signupError;
      if (registration.session && registration.user?.email_confirmed_at) {
        navigate('/ghost-space', { replace: true });
      } else {
        navigate('/verify-email', { state: { email, justRegistered: true } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div className="form-panel loading-state">Checking your session…</div>;
  if (user?.email_confirmed_at) return (
    <div className="form-panel">
      <h2>Your Ghost account is active.</h2>
      <p>Continue to Ghost Space to manage your profile.</p>
      <Link className="button button-light full-width" to="/ghost-space">Open Ghost Space <ArrowUpRight size={17} /></Link>
    </div>
  );

  return (
    <form className="form-panel" onSubmit={submit}>
      <h2>Your Ghost identity starts here.</h2>
      <p>Your email stays private. After registering, confirm your email before your chosen public Ghost identity is activated.</p>
      <div className="field">
        <label htmlFor="join-handle">Persistent Ghost handle *</label>
        <input id="join-handle" name="handle" required minLength={3} maxLength={40}
          pattern="[A-Za-z0-9](?!.*///)(?:[A-Za-z0-9._!@#$&+~\-]|//){1,39}" autoComplete="off" placeholder="Ghost!One" />
        <small>LGN handles can include //, as in Laughing//Ghost, plus capitals and . _ - ! @ # $ &amp; + ~. A single slash and /// are not allowed. Capitalization is kept; reservations are case-insensitive and permanent.</small>
      </div>
      <div className="field">
        <label htmlFor="join-email">Private email address *</label>
        <input id="join-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="field">
        <label htmlFor="join-password">Password *</label>
        <input id="join-password" name="password" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="join-confirm">Confirm password *</label>
        <input id="join-confirm" name="passwordConfirm" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <div className="field">
        <label>Specialties and interests</label>
        <small>Optional—describe what you practice and what you are learning.</small>
        <div style={{ display: 'grid', gap: 14, marginTop: 4 }}>
          <SearchableMultiSelect label="Practice" options={ALL_SPECIALTIES} selected={practice} onChange={setPractice} placeholder="Select specialties" />
          <SearchableMultiSelect label="Developing" options={ALL_SPECIALTIES} selected={developing} onChange={setDeveloping} placeholder="Select areas" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="join-location">Location disclosure</label>
        <select id="join-location" name="location_disclosure" value={disclosure}
          onChange={(e) => setDisclosure(e.target.value as LocationDisclosure)}>
          {LOCATION_DISCLOSURES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <small>Your country is optional. City and state/province are not requested.</small>
      </div>
      {disclosure === 'country' && <div className="field">
        <label htmlFor="join-country">Country (optional)</label>
        <input id="join-country" name="location_country" maxLength={100} />
      </div>}
      <div className="field">
        <label htmlFor="join-portfolio">Existing work (optional)</label>
        <input id="join-portfolio" type="url" name="portfolio" placeholder="https://…" />
      </div>
      <label className="checkbox-field">
        <input type="checkbox" required />
        <span>I accept the <Link to="/code">code of conduct</Link> and commit to authorized activity and responsible publication.</span>
      </label>
      {error && <p className="status-message error-message" role="alert">{error}</p>}
      <button className="button button-light full-width" disabled={busy}>
        {busy ? 'Creating account…' : 'Create Ghost Account'} <ArrowUpRight size={17} />
      </button>
      <div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>
    </form>
  );
}
