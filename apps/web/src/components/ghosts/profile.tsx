import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { WorkCard } from '@/components/work-card';
import { GhostAvatar } from '@/components/ghost-avatar';
import {
  KIND_ORDER, evidenceLabels, featuredIds, kindLabels, locationDisplay, parseExternalLinks,
  safeExternal, tagsOf, type GhostProfile, type Work,
} from '@/lib/network';
import { contentLanguageLabel } from '@/lib/languages';
import { useI18n } from '@/lib/i18n';

function FactRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="profile-fact">
      <span className="meta-label">{label}</span>
      <span className="profile-fact-value">{value}</span>
    </div>
  );
}

export function Profile({ profile, work, avatarUrlOverride }: { profile: GhostProfile; work: Work[]; avatarUrlOverride?: string }) {
  const { t } = useI18n();
  const external = safeExternal(profile.portfolio);
  const langLabel = contentLanguageLabel(profile.language);
  const showIdentities = profile.show_external_identities !== false;
  const showLanguages = profile.show_language_proficiency !== false;
  const skills = tagsOf(profile.skills || '');
  const tools = tagsOf(profile.tools || '');
  const platforms = tagsOf(profile.platform || '');
  const industries = tagsOf(profile.industry || '');
  const languages = tagsOf(profile.languages || '');
  const specialties = tagsOf(profile.specialties);
  const developing = tagsOf(profile.developing_specialties || '');
  const interests = tagsOf(profile.collaboration_interests || '');
  const identities = parseExternalLinks(profile.external_links);

  // Evidence counts — only categories with published work are shown.
  const counts = KIND_ORDER.map((kind) => ({ kind, items: work.filter((w) => w.kind === kind) })).filter((g) => g.items.length > 0);
  const totalWork = work.length;

  // Featured work resolves the member's chosen IDs against their published work.
  const featured = featuredIds(profile.featured_work)
    .map((id) => work.find((w) => w.id === id))
    .filter((w): w is Work => Boolean(w));

  // Recent activity is derived from published work — no manual entry, always honest.
  const recent = [...work].sort((a, b) => (a.created < b.created ? 1 : -1)).slice(0, 6);

  const availability = [
    profile.available_for_work && 'Available for work',
    profile.open_to_collaboration && 'Open to collaboration',
    profile.open_to_research && 'Open to research',
    profile.open_to_mentorship && 'Open to mentorship',
  ].filter(Boolean) as string[];

  return (
    <>
      <section className="profile-overview rail">
        <div>
          <span className="eyebrow"><span className="tiny-dot" />About</span>
          <p className="profile-bio">{profile.bio || 'This Ghost has not added a bio yet.'}</p>

          {totalWork > 0 && (
            <div className="evidence-summary">
              <span className="evidence-label">Evidence</span>
              <div className="evidence-counts">
                {counts.map(({ kind, items }) => (
                  <a key={kind} href={`#proof-${kind}`} className="evidence-count">
                    <strong>{items.length}</strong> {evidenceLabels[kind]}
                  </a>
                ))}
              </div>
            </div>
          )}

          <dl className="profile-facts">
            {specialties.length > 0 && <FactRow label="Specialties" value={specialties.join(' · ')} />}
            {developing.length > 0 && <FactRow label="Developing" value={developing.join(' · ')} />}
            {skills.length > 0 && <FactRow label="Skills" value={skills.join(' · ')} />}
            {tools.length > 0 && <FactRow label="Tools" value={tools.join(' · ')} />}
            {platforms.length > 0 && <FactRow label="Platforms" value={platforms.join(' · ')} />}
            {industries.length > 0 && <FactRow label="Industries / Domains" value={industries.join(' · ')} />}
          </dl>

          {profile.example && <div className="callout" style={{ marginTop: 25 }}>Fictional demo profile. The contributions below illustrate educational formats and are not the work of a real member.</div>}
        </div>

        <aside className="profile-aside">
          {avatarUrlOverride ? (
            <span className="profile-avatar-wrap">
              <img src={avatarUrlOverride} alt={`${profile.handle} avatar`} className="profile-avatar" loading="lazy" />
            </span>
          ) : (
            <span className="profile-avatar-wrap">
              <GhostAvatar profile={profile} size={96} className="profile-avatar" forceShow />
            </span>
          )}
          <span className="mono">IDENTITY / {profile.handle}</span>
          <span className="item-status">{profile.example ? 'DEMO PROFILE' : 'MEMBER'}</span>
          {langLabel && <span className="mono">{t('profile.language').toUpperCase()} / {langLabel}</span>}
          {showLanguages && languages.length > 0 && <span className="mono">LANGUAGES / {languages.join(', ')}</span>}
          <span className="mono">LOCATION / {locationDisplay(profile)}</span>
          {availability.length > 0 && (
            <div className="directory-status" style={{ marginTop: 4 }}>
              {availability.map((a) => <span key={a} className="status-pill">{a}</span>)}
            </div>
          )}
          <p>The handle is persistent. Civil identity and email address remain private.</p>
          {external ? <a className="text-link" href={external} target="_blank" rel="noopener noreferrer">External portfolio <ArrowUpRight size={15} /></a> : <span className="muted-note">No external portfolio provided.</span>}
          <Link to="/code" className="text-link">Our ethical framework <ArrowUpRight size={15} /></Link>
        </aside>
      </section>

      {showIdentities && identities.length > 0 && (
        <section className="profile-section rail">
          <div className="profile-section-head">
            <span className="eyebrow"><span className="tiny-dot" />External links / self-declared</span>
            <h2>Member-provided external links</h2>
          </div>
          <ul className="identity-list">
            {identities.map((id) => (
              <li key={id.url} className="identity-item">
                <a href={id.url} target="_blank" rel="noopener noreferrer" className="identity-link">
                  <span className="identity-platform">{id.platform}</span>
                  <ArrowUpRight size={14} />
                </a>
                <span className="ownership-badge">Unverified link</span>
              </li>
            ))}
          </ul>
          <p className="muted-note">These links are supplied by the member. LGN has not independently verified account control or legal identity.</p>
        </section>
      )}

      {featured.length > 0 && (
        <section className="profile-section rail">
          <div className="profile-section-head">
            <span className="eyebrow"><span className="tiny-dot" />Featured work</span>
            <h2>Selected by the Ghost</h2>
          </div>
          <div className="work-grid">{featured.map((w) => <WorkCard work={w} key={w.id} />)}</div>
        </section>
      )}

      <section className="profile-works rail">
        <div className="profile-section-head">
          <span className="eyebrow"><span className="tiny-dot" />Proofs of work</span>
          <h2>Demonstrated skill</h2>
        </div>
        {counts.length > 0 ? counts.map(({ kind, items }) => (
          <div className="work-type-group" id={`proof-${kind}`} key={kind}>
            <h3>{evidenceLabels[kind]} · {items.length}</h3>
            <div className="work-grid">{items.map((item) => <WorkCard work={item} key={item.id} />)}</div>
          </div>
        )) : <p className="muted-note">No published contribution yet. Reputation here comes from visible work, not popularity.</p>}
      </section>

      {recent.length > 0 && (
        <section className="profile-section rail">
          <div className="profile-section-head">
            <span className="eyebrow"><span className="tiny-dot" />Recent activity</span>
            <h2>What this Ghost has been doing</h2>
          </div>
          <ul className="activity-list">
            {recent.map((item) => (
              <li key={item.id} className="activity-item">
                <Link to={`/work/${item.id}`} className="activity-action">Published a {kindLabels[item.kind].toLowerCase()}</Link>
                <span className="activity-meta">{item.title}</span>
                <span className="activity-date">{new Date(item.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {interests.length > 0 && (
        <section className="profile-section rail">
          <div className="profile-section-head">
            <span className="eyebrow"><span className="tiny-dot" />Looking for</span>
            <h2>What this Ghost wants to do next</h2>
          </div>
          <div className="tags profile-interests">{interests.map((i) => <span key={i}>{i}</span>)}</div>
        </section>
      )}
    </>
  );
}
