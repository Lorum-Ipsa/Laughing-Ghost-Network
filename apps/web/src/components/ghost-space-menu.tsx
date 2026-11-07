import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, LayoutDashboard, User, FileText, FolderGit2, MessagesSquare, Settings, LogOut, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile } from '@/lib/network';

/**
 * Ghost Space — the entry point to a member's private area.
 *
 * For a logged-out visitor it is a link to the member sign-in page. For a
 * signed-in Ghost it becomes a dropdown into the private space: dashboard,
 * profile, contributions, projects, Table Talks, messages, settings, and
 * sign-out. "Join the network" stays a separate CTA for new members.
 *
 * Auth lives in localStorage, so the server renders the logged-out control
 * and the client swaps in the member menu after hydration.
 */
export function GhostSpaceMenu({ variant = 'header', onNavigate }: { variant?: 'header' | 'mobile'; onNavigate?: () => void }) {
  const { user, isAuthed, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<GhostProfile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    pb.collection('ghost_profiles')
      .getFullList<GhostProfile>({ filter: pb.filter('owner = {:owner}', { owner: user.id }), requestKey: null })
      .then((records) => { if (active) setProfile(records[0] || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function signOut() {
    logout();
    setOpen(false);
    onNavigate?.();
    navigate('/login');
  }

  // While the session is still resolving on the client, render the logged-out
  // control so SSR output and first paint match.
  const authed = isAuthed && !isLoading;

  if (variant === 'mobile') {
    if (!authed) {
      return <Link to="/login" onClick={() => onNavigate?.()}>Ghost Space ↗</Link>;
    }
    const go = () => onNavigate?.();
    return (
      <div className="mobile-ghost-space">
        <span className="mobile-ghost-space-heading">Ghost Space</span>
        <Link to="/ghost-space" onClick={go}>Dashboard</Link>
        <Link to="/ghost-space?section=profile" onClick={go}>My profile</Link>
        <Link to="/ghost-space?section=contributions" onClick={go}>My contributions</Link>
        <Link to="/ghost-space?section=projects" onClick={go}>My projects</Link>
        <Link to="/ghost-space?section=table-talks" onClick={go}>Table Talks</Link>
        <Link to="/ghost-space?section=notifications" onClick={go}>Messages / notifications</Link>
        <Link to="/ghost-space?section=settings" onClick={go}>Settings</Link>
        {user?.role === 'admin' && <Link to="/admin" onClick={go}>Admin dashboard</Link>}
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  if (!authed) {
    return (
      <Link to="/login" className="ghost-space-trigger ghost-space-link" aria-label="Ghost Space — member sign-in">
        <Sparkles size={14} strokeWidth={1.5} />
        <span>Ghost Space</span>
      </Link>
    );
  }

  const items = [
    { to: '/ghost-space', label: 'Dashboard', icon: LayoutDashboard },
    { to: profile ? `/ghosts/${profile.handle}` : '/ghost-space?section=profile', label: 'My profile', icon: User },
    { to: '/ghost-space?section=contributions', label: 'My contributions', icon: FileText },
    { to: '/ghost-space?section=projects', label: 'My projects', icon: FolderGit2 },
    { to: '/ghost-space?section=table-talks', label: 'Table Talks', icon: MessagesSquare },
    { to: '/ghost-space?section=notifications', label: 'Messages / notifications', icon: MessagesSquare },
    { to: '/ghost-space?section=settings', label: 'Settings', icon: Settings },
  ];
  if (user?.role === 'admin') {
    items.push({ to: '/admin', label: 'Admin dashboard', icon: ShieldCheck });
  }

  return (
    <div className="ghost-space" ref={ref}>
      <button
        type="button"
        className="ghost-space-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ghost-space-dot" aria-hidden="true" />
        <Sparkles size={14} strokeWidth={1.5} />
        <span>Ghost Space</span>
        <ChevronDown size={13} className={`ghost-space-chevron ${open ? 'open' : ''}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="ghost-space-menu" role="menu">
          <div className="ghost-space-menu-head">
            <span className="ghost-space-menu-label">Signed in</span>
            <span className="ghost-space-menu-handle">{profile?.handle || user?.email}</span>
          </div>
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={label} to={to} className="ghost-space-item" role="menuitem" onClick={() => setOpen(false)}>
              <Icon size={14} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          ))}
          <button type="button" className="ghost-space-item ghost-space-signout" role="menuitem" onClick={signOut}>
            <LogOut size={14} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
