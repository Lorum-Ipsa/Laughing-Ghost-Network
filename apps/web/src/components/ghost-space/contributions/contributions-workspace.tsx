import { useEffect, useMemo, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Work, WorkKind, WorkStatus } from '@/lib/network';
import { ContributionCard, type ContributionTab } from '@/components/ghost-space/contributions/contribution-card';
import { ContributionEditor } from '@/components/ghost-space/contributions/contribution-editor';
import { ContributionPreview } from '@/components/ghost-space/contributions/contribution-preview';
import { ReviewFeedback } from '@/components/ghost-space/contributions/review-feedback';

const TABS: { key: ContributionTab; label: string; statuses: WorkStatus[] }[] = [
	{ key: 'drafts', label: 'Drafts', statuses: ['draft'] },
	{ key: 'in_review', label: 'In Review', statuses: ['submitted'] },
	{ key: 'needs_revision', label: 'Needs Revision', statuses: ['revision_requested', 'rejected'] },
	{ key: 'published', label: 'Published', statuses: ['published'] },
	{ key: 'archived', label: 'Archived', statuses: ['archived'] },
];

type EditorState = { mode: 'create' | 'edit'; work: Work | null; kind: WorkKind } | null;

/**
 * The Contributions workspace — the core of Ghost Space. It turns a member
 * from a profile into a publisher: a tabbed view of every contribution by
 * workflow state, a prominent creation entry point, and the full
 * Draft → Review → Revision → Published → Future revisions lifecycle.
 *
 * No likes, popularity scores, or rankings appear anywhere. The only signal of
 * a contribution's standing is its review status and the qualitative feedback
 * reviewers leave on it.
 */
export function ContributionsWorkspace({
	profile,
	work,
	onRefresh,
}: {
	profile: GhostProfile | null;
	work: Work[];
	onRefresh: () => void;
}) {
	const [tab, setTab] = useState<ContributionTab>('drafts');
	const [editor, setEditor] = useState<EditorState>(null);
	const [preview, setPreview] = useState<Work | null>(null);
	const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});

	useEffect(() => {
		if (!work.length) { setReviewCounts({}); return; }
		let active = true;
		const filter = work.map((w) => `work = "${w.id}"`).join(' || ');
		pb.collection('ghost_reviews')
			.getFullList<{ work: string }>({ filter: filter || 'id = ""', requestKey: null })
			.then((rows) => {
				if (!active) return;
				const counts: Record<string, number> = {};
				for (const r of rows) counts[r.work] = (counts[r.work] || 0) + 1;
				setReviewCounts(counts);
			})
			.catch(() => { /* reviews optional */ });
		return () => { active = false; };
	}, [work]);

	const counts = useMemo(() => {
		const map: Record<ContributionTab, number> = { drafts: 0, in_review: 0, needs_revision: 0, published: 0, archived: 0 };
		for (const w of work) {
			const t = TABS.find((tb) => tb.statuses.includes(w.status));
			if (t) map[t.key] += 1;
		}
		return map;
	}, [work]);

	const visible = useMemo(() => {
		const statuses = TABS.find((t) => t.key === tab)!.statuses;
		return work.filter((w) => statuses.includes(w.status));
	}, [work, tab]);

	async function transition(workItem: Work, target: WorkStatus, label: string) {
		setError('');
		try {
			await pb.collection('ghost_work').update(workItem.id, { status: target });
			onRefresh();
		} catch {
			setError(`Could not ${label.toLowerCase()} this contribution.`);
		}
	}

	if (editor) {
		return (
			<ContributionEditor
				profile={profile}
				existing={editor.mode === 'edit' ? editor.work : null}
				defaultKind={editor.kind}
				onDone={(saved) => {
					setEditor(null);
					if (saved) onRefresh();
				}}
			/>
		);
	}

	return (
		<div className="gs-contributions">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / CONTRIBUTIONS</span>
					<h1>Contributions</h1>
					<p className="gs-section-lede">Your work is your signature. Draft, submit for review, revise on feedback, and publish — then keep revising. Version history preserves every change.</p>
				</div>
				<button type="button" className="button button-light gs-create-btn" onClick={() => setEditor({ mode: 'create', work: null, kind: 'research' })}>
					<Plus size={15} strokeWidth={1.5} /> Create Contribution
				</button>
			</header>

			{error && <div className="status-message error-message" role="alert">{error}</div>}

			<nav className="gs-tabs" role="tablist" aria-label="Contribution workflow states">
				{TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						role="tab"
						aria-selected={tab === t.key}
						className={`gs-tab ${tab === t.key ? 'active' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
						{counts[t.key] > 0 && <span className="gs-tab-count">{counts[t.key]}</span>}
					</button>
				))}
			</nav>

			{visible.length === 0 ? (
				<div className="gs-empty-state">
					<FileText size={28} strokeWidth={1} />
					<p>{emptyMessage(tab)}</p>
					<button type="button" className="button button-outline" onClick={() => setEditor({ mode: 'create', work: null, kind: 'research' })}>
						<Plus size={14} strokeWidth={1.5} /> Start a contribution
					</button>
				</div>
			) : (
				<ul className="gs-card-list">
					{visible.map((item) => (
						<li key={item.id}>
							<ContributionCard
								work={item}
								reviewCount={reviewCounts[item.id] || 0}
								onEdit={() => setEditor({ mode: 'edit', work: item, kind: item.kind })}
								onPreview={() => setPreview(item)}
								onViewFeedback={() => setFeedbackFor(item.id)}
								onSubmit={() => transition(item, 'submitted', 'Submit')}
								onWithdraw={() => transition(item, 'draft', 'Withdraw')}
								onRevise={() => transition(item, 'submitted', 'Resubmit')}
								onArchive={() => transition(item, 'archived', 'Archive')}
								onRestore={() => transition(item, 'draft', 'Restore')}
							/>
						</li>
					))}
				</ul>
			)}

			{preview && <ContributionPreview work={preview} onClose={() => setPreview(null)} />}
			{feedbackFor && <ReviewFeedback workId={feedbackFor} onClose={() => setFeedbackFor(null)} />}
		</div>
	);
}

function emptyMessage(tab: ContributionTab): string {
	switch (tab) {
		case 'drafts': return 'No drafts yet. Create a contribution and save it as a draft to work on it before submitting.';
		case 'in_review': return 'Nothing in review. When you submit a draft, it appears here while reviewers assess it.';
		case 'needs_revision': return 'Nothing needs revision. Reviewers can request changes or raise concerns; that feedback lands here.';
		case 'published': return 'Nothing published yet. Published contributions appear here and on the public network.';
		case 'archived': return 'No archived contributions. Archived work is kept but hidden from the public network.';
	}
}
