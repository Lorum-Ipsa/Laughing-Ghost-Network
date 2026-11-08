import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { findMyGhostProfile } from '@/lib/supabase-ghost-profile';
import { supabaseBrowser } from '@/lib/supabase-browser';

const menuItems = [
  { to: '/ghost-space', label: 'Dashboard' },
  { to: '/ghost-space?section=profile', label: 'My profile' },
  { to: '/ghost-space?section=contributions', label: 'Contributions' },
  { to: '/ghost-space?section=projects', label: 'Projects' },
  { to: '/ghost-space?section=table-talks', label: 'Table Talks' },
  { to: '/ghost-space?section=notifications', label: 'Notifications' },
  { to: '/ghost-space?section=settings', label: 'Settings' },
];

/** Uses the same Supabase session as Join, Login and Ghost Space. */
export function GhostSpaceMenu({ variant='header', onNavigate }: {variant?: 'header' | 'mobile'; onNavigate?: () => void}) {
  const { user, isAuthed, isLoading } = useSupabaseAuth();
  const [handle, setHandle] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) { setHandle(''); return; }
    let active = true;
    void findMyGhostProfile().then(profile => {
      if (active) setHandle(profile?.handle || '');
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  useEffect(() => {
    if (!open) return;
    function click(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);

  function signOut() {
    void supabaseBrowser().auth.signOut().finally(() => {
      setOpen(false);
      onNavigate?.();
      navigate('/login', { replace: true });
    });
  }
  const authed = isAuthed && !isLoading;
  if (variant === 'mobile') {
    if (!authed) return <Link to="/login" onClick={() => onNavigate?.()}>Ghost Space ↗</Link>;
    return <div className="mobile-ghost-space">
      <span className="mobile-ghost-space-heading">Ghost Space</span>
      {menuItems.map(item => <Link key={item.to} to={item.to} onClick={() => onNavigate?.()}>{item.label}</Link>)}
      <button type="button" onClick={signOut}>Sign out</button>
    </div>;
  }
  if (!authed) return <Link to="/login" className="ghost-space-trigger ghost-space-link" aria-label="Ghost Space — member sign-in">
    <Sparkles size={14} strokeWidth={1.5}/><span>Ghost Space</span></Link>;
  return <div className="ghost-space" ref={ref}>
    <button type="button" className="ghost-space-trigger" onClick={() => setOpen(!open)}
      aria-haspopup="menu" aria-expanded={open}>
      <span className="ghost-space-dot" aria-hidden="true"/>
      <Sparkles size={14} strokeWidth={1.5}/>
      <span>Ghost Space</span>
      <ChevronDown size={13} className={open ? 'open' : ''}/>
    </button>
    {open && <div className="ghost-space-menu" role="menu">
      <div className="ghost-space-menu-head">
        <span className="ghost-space-menu-label">Signed in</span>
        <span className="ghost-space-menu-handle">{handle || 'Ghost member'}</span>
      </div>
      {menuItems.map(item => <Link key={item.to} className="ghost-space-item" role="menuitem"
        to={item.to} onClick={() => setOpen(false)}>{item.label}</Link>)}
      <button type="button" className="ghost-space-item ghost-space-signout" role="menuitem" onClick={signOut}>
        <LogOut size={14}/><span>Sign out</span></button>
    </div>}
  </div>;
}
