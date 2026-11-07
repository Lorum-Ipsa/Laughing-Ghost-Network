import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { GhostAvatar } from '@/components/ghost-avatar';
import { evidenceLabels, KIND_ORDER, locationDisplay, tagsOf, type DirectoryGhost } from '@/lib/network';

const EVIDENCE_ORDER = KIND_ORDER;

export function DirectoryCard({ ghost }: { ghost: DirectoryGhost }) {
  const { profile, evidence } = ghost;
  const specialties = tagsOf(profile.specialties);
  const tags = [...tagsOf(profile.skills || ''), ...tagsOf(profile.tools || ''), ...tagsOf(profile.industry || '')].slice(0, 6);
  const languages = tagsOf(profile.languages || '');
  const evidenceItems = EVIDENCE_ORDER.filter((kind) => evidence[kind] > 0);
  const hasStatus = profile.available_for_work || profile.open_to_collaboration || profile.open_to_research || profile.open_to_mentorship || profile.open_to_speaking;

  return (
    <article className="directory-card">
      <div className="directory-card-header">
        <GhostAvatar profile={profile} size={48} className="directory-avatar" />
        <span className="example-badge">{profile.example ? 'EXAMPLE' : profile.member ? 'MEMBER' : 'CONTRIBUTOR'}</span>
      </div>
      <h2>{profile.handle}</h2>
      {specialties.length > 0 && <p className="directory-specialties">{specialties.join(' · ')}</p>}
      {tags.length > 0 && <div className="tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      <p className="directory-bio">{profile.bio || 'This Ghost has not added a bio yet.'}</p>
      {evidenceItems.length > 0 && (
        <div className="directory-evidence">
          <span className="evidence-label">Recent evidence</span>
          <ul>
            {evidenceItems.map((kind) => (
              <li key={kind}><strong>{evidence[kind]}</strong> {evidenceLabels[kind]}</li>
            ))}
          </ul>
        </div>
      )}
      {languages.length > 0 && (
        <div className="directory-meta"><span className="meta-label">Languages</span><span>{languages.join(' · ')}</span></div>
      )}
      <div className="directory-meta"><span className="meta-label">Location</span><span>{locationDisplay(profile)}</span></div>
      {hasStatus && (
        <div className="directory-status">
          {profile.available_for_work && <span className="status-pill">Available for work</span>}
          {profile.open_to_collaboration && <span className="status-pill">Open to collaboration</span>}
          {profile.open_to_research && <span className="status-pill">Open to research</span>}
          {profile.open_to_mentorship && <span className="status-pill">Open to mentorship</span>}
          {profile.open_to_speaking && <span className="status-pill">Open to speaking</span>}
        </div>
      )}
      <Link to={`/ghosts/${encodeURIComponent(profile.handle)}`} className="text-link directory-link">Profile and proofs of work <ArrowUpRight size={15} /></Link>
    </article>
  );
}
