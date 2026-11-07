import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';
import { LanguageSelector } from '@/components/language-selector';
import { GhostSpaceMenu } from '@/components/ghost-space-menu';
import { navigation } from '@/data/navigation';
import { useI18n } from '@/lib/i18n';

const navKeys: Record<string, string> = {
  '/ghosts': 'nav.ghosts',
  '/research': 'nav.research',
  '/arsenal': 'nav.arsenal',
  '/projects': 'nav.projects',
  '/table-talks': 'nav.tableTalks',
  '/about': 'nav.about',
};

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return <header className="site-header"><div className="header-inner"><Link to="/" className="brand" onClick={() => setOpen(false)} aria-label="Laughing Ghost Network — Home"><GhostMark/><span>LAUGHING GHOST<span className="brand-sub">NETWORK</span></span></Link><nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <NavLink key={item.path} to={item.path}>{t(navKeys[item.path] || item.label)}</NavLink>)}</nav><div className="header-actions"><LanguageSelector/><GhostSpaceMenu/><Link className="header-join" to="/join">{t('header.join')} <ArrowUpRight size={15}/></Link></div><button className="mobile-menu icon-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>{open && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{navigation.map(item => <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}>{t(navKeys[item.path] || item.label)}</NavLink>)}<Link to="/code" onClick={() => setOpen(false)}>Code of conduct</Link><GhostSpaceMenu variant="mobile" onNavigate={() => setOpen(false)}/><Link to="/join" onClick={() => setOpen(false)}>{t('header.join')} ↗</Link><div className="mobile-lang"><LanguageSelector variant="mobile"/></div></nav>}</header>;
}
