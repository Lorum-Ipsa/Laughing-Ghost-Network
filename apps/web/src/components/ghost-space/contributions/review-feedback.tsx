import { useEffect, useState } from 'react';
import { X, MessageSquare, CheckCircle2, AlertTriangle, Edit3 } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';

export type Review = {
	id: string;
	owner: string;
	work: string;
	profile: string;
	verdict: 'endorse' | 'needs_revision' | 'concerns';
	body: string;
	status: 'draft' | 'published';
	created: string;
	updated: string;
	expand?: { profile?: { handle: string } };
};

const VERDICTS = {
	endorse: { label: 'Endorse', icon: CheckCircle2, cls: 'gs-verdict-endorse' },
	needs_revision: { label: 'Needs revision', icon: Edit3, cls: 'gs-verdict-revision' },
	concerns: { label: 'Concerns', icon: AlertTriangle, cls: 'gs-verdict-concerns' },
} as const;

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Reviewer feedback for a contribution. Shows every published review left on
 * the work — reviewer handle, verdict, findings, and date. No scores, no
 * rankings: a review is structured qualitative feedback, not a rating.
 */
export function ReviewFeedback({ workId, onClose }: { workId: string; onClose: () => void }) {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setLoading(true);
		pb.collection('ghost_reviews')
			.getFullList<Review>({
				filter: pb.filter('work = {:id}', { id: workId }),
				expand: 'profile',
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => { if (active) { setReviews(rows); setError(''); } })
			.catch(() => { if (active) setError('Could not load reviewer feedback.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [workId]);

	return (
		<div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Reviewer feedback">
			<div className="gs-overlay-panel">
				<header className="gs-overlay-head">
					<div>
						<span className="eyebrow"><span className="tiny-dot" /> REVIEWER FEEDBACK</span>
						<h2>Feedback on this contribution</h2>
					</div>
					<button type="button" className="gs-overlay-close" onClick={onClose} aria-label="Close feedback">
						<X size={18} strokeWidth={1.5} />
					</button>
				</header>
				{error && <div className="status-message error-message" role="alert">{error}</div>}
				{loading ? (
					<div className="loading-state">Loading feedback…</div>
				) : reviews.length === 0 ? (
					<div className="gs-empty">
						<p>No published reviews yet. Reviewers leave structured feedback — endorse, needs revision, or concerns — which appears here.</p>
					</div>
				) : (
					<ul className="gs-review-list">
						{reviews.map((review) => {
							const verdict = VERDICTS[review.verdict];
							const Icon = verdict.icon;
							return (
								<li key={review.id} className="gs-review">
									<div className="gs-review-head">
										<span className={`gs-verdict ${verdict.cls}`}>
											<Icon size={13} strokeWidth={1.5} />
											{verdict.label}
										</span>
										<span className="gs-review-author">
											{review.expand?.profile?.handle || 'A Ghost'}
										</span>
										<span className="gs-review-date">{formatDate(review.created)}</span>
									</div>
									<p className="gs-review-body">{review.body}</p>
								</li>
							);
						})}
					</ul>
				)}
				<div className="gs-overlay-foot">
					<MessageSquare size={13} strokeWidth={1.5} />
					<span>Reviews are qualitative. No scores or rankings are assigned.</span>
				</div>
			</div>
		</div>
	);
}
