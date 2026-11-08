import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';
import { useI18n } from '@/lib/i18n';

export function SiteFooter() {
  const { t } = useI18n();
  return <footer className="site-footer"><div className="footer-top"><Link to="/" className="brand"><GhostMark/><span>LAUGHING GHOST<span className="brand-sub">NETWORK</span></span></Link><p>{t('footer.tagline')}</p><Link className="text-link" to="/join">{t('footer.getInTouch')} <ArrowUpRight size={15}/></Link></div><div className="footer-bottom"><span>{t('footer.copyright')}</span><span>{t('footer.motto')}</span><div><Link to="/about">{t('footer.about')}</Link><Link to="/code">{t('footer.code')}</Link><Link to="/contact">{t('footer.contact')}</Link><Link to="/login">{t('footer.space')}</Link></div></div></footer>;
}
