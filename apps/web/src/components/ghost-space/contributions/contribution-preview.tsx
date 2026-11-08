import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import type { Work } from '@/lib/network';
import { kindLabels, reviewStatusLabel, validationStatusLabel, tagsOf, paragraphs } from '@/lib/network';
import { contentLanguageLabel } from '@/lib/languages';

/**
 * Read-only preview of a contribution as it will appear to a reader. The
 * author sees exactly what a reviewer or visitor sees — original language,
 * structured body, code, and metadata — before submitting or publishing.
 */
export function ContributionPreview({ work, onClose }: { work: Work; onClose: () => void }) {
	const tags = tagsOf(work.tags);
	return (
		<div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Preview contribution">
			<div className="gs-overlay-panel gs-preview">
				<header className="gs-overlay-head">
					<div>
						<span className="eyebrow"><span className="tiny-dot" /> PREVIEW</span>
						<h2>{work.title}</h2>
					</div>
					<button type="button" className="gs-overlay-close" onClick={onClose} aria-label="Close preview">
						<X size={18} strokeWidth={1.5} />
					</button>
				</header>
				<div className="gs-preview-meta">
					<span>{kindLabels[work.kind] || work.kind}</span>
					{work.domain && <span>{work.domain}</span>}
					{work.language && <span>{contentLanguageLabel(work.language)}</span>}
					{work.version && <span>v{work.version}</span>}
					<span>{reviewStatusLabel(work.review_status)}</span>
					{work.validation_status && <span>{validationStatusLabel(work.validation_status)}</span>}
				</div>
				<p className="gs-preview-summary">{work.summary}</p>
				<div className="gs-preview-body">
					{paragraphs(work.body).map((para, i) => <p key={i}>{para}</p>)}
				</div>
				{work.code && (
					<div className="code-block">
						<div className="code-toolbar"><div><span>{work.format || 'code'}</span></div></div>
						<pre>{work.code}</pre>
					</div>
				)}
				{tags.length > 0 && (
					<div className="tags">
						{tags.map((tag) => <span key={tag}>{tag}</span>)}
					</div>
				)}
				{work.status === 'published' && (
					<Link to={`/work/${work.id}`} className="button button-outline" style={{ marginTop: 20 }}>
						<ExternalLink size={14} strokeWidth={1.5} /> Open public page
					</Link>
				)}
			</div>
		</div>
	);
}
