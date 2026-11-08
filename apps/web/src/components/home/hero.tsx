import { Link } from 'react-router';
import { ArrowUpRight, ArrowDown, Fingerprint } from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';
import { useI18n } from '@/lib/i18n';
export function Hero() {
  const { t } = useI18n();
  return <section className="hero"><div className="hero-grid" aria-hidden="true"/><div className="hero-ghost"><GhostMark className="hero-mark" decorative={false} /></div><div className="hero-content rail"><div className="eyebrow hero-eyebrow"><span className="tiny-dot"/> {t('hero.eyebrow')}</div><h1>{t('hero.title1')}<br/>The work is <span>{t('hero.title2')}</span></h1><p className="hero-tagline">{t('hero.tagline')}</p><p className="hero-description">{t('hero.desc')}</p><div className="hero-actions"><Link to="/research" className="button button-light">{t('hero.explore')} <ArrowUpRight size={18}/></Link><Link to="/join" className="button button-outline">{t('hero.become')} <ArrowUpRight size={18}/></Link></div><div className="identity-note"><Fingerprint size={21}/><span>{t('hero.note1')}<br/><strong>{t('hero.note2')}</strong></span></div><a href="#contributions" className="hero-scroll">{t('hero.scroll')} <ArrowDown size={14}/></a></div><div className="hero-bottom rail"><span><span className="tiny-dot"/> {t('hero.bottom1')}</span><span>{t('hero.bottom2')}</span></div></section>;
}
