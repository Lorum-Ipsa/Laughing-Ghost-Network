import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Inbox, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { CollaborationRequest, CollaborationRequestStatus } from '@/lib/network';
import { COLLAB_REQUEST_LABELS } from '@/lib/network';

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diff = Date.now() - then;
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return `${Math.round(days / 30)}mo ago`;
}

/**
 * The collaboration requests panel. A member sees requests they have received
 * (with accept / decline) and requests they have sent (with withdraw). No open
 * DM inbox — only structured, moderatable requests tied to a request type.
 */
export function CollaborationRequests({ revision }: { revision: number }) {
	const { user } = useAuth();
	const [requests, setRequests] = useState<CollaborationRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!user) return;
		let active = true;
		setLoading(true);
		pb.collection('ghost_collaboration_requests')
			.getFullList<CollaborationRequest>({
				expand: 'recipient',
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => { if (active) setRequests(rows); })
			.catch(() => { if (active) setError('Could not load collaboration requests.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [user, revision]);

	async function setStatus(id: string, status: CollaborationRequestStatus) {
		setError('');
		try {
			await pb.collection('ghost_collaboration_requests').update(id, { status });
			setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
		} catch {
			setError('Could not update the request.');
		}
	}

	async function withdraw(id: string) {
		setError('');
		try {
			await pb.collection('ghost_collaboration_requests').delete(id);
			setRequests((prev) => prev.filter((r) => r.id !== id));
		} catch {
			setError('Could not withdraw the request.');
		}
	}

	const received = requests.filter((r) => r.recipient && r.expand?.recipient?.owner === user?.id);
	const sent = requests.filter((r) => r.owner === user?.id);

	if (loading) return <section className="gs-panel"><p className="muted-note">Loading requests…</p></section>;

	return (
		<section className="gs-panel gs-collab-requests">
			<div className="gs-panel-head">
				<span className="gs-panel-title"><Inbox size={13} strokeWidth={1.5} style={{ display: 'inline', marginRight: 7, verticalAlign: '-2px' }} />Collaboration requests</span>
			</div>
			{error && <div className="status-message error-message" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
			{received.length === 0 && sent.length === 0 ? (
				<p className="muted-note" style={{ fontSize: 12 }}>Structured requests appear here — no open DM inbox. When a Ghost wants to work with you, you can accept or decline here.</p>
			) : (
				<div className="gs-collab-sections">
					{received.length > 0 && (
						<div className="gs-collab-section">
							<h3 className="gs-collab-subtitle">Received <span className="gs-tab-count">{received.length}</span></h3>
							<ul className="gs-collab-list">
								{received.map((r) => (
									<li key={r.id} className="gs-collab-item">
										<div className="gs-collab-item-head">
											<span className="gs-collab-type">{COLLAB_REQUEST_LABELS[r.request_type]}</span>
											<span className="gs-collab-date">{relativeTime(r.created)}</span>
										</div>
										<p className="gs-collab-message">{r.message}</p>
										{r.status === 'pending' ? (
											<div className="gs-collab-actions">
												<button type="button" className="gs-icon-btn gs-accept" aria-label="Accept" onClick={() => setStatus(r.id, 'accepted')}><Check size={13} strokeWidth={1.5} /></button>
												<button type="button" className="gs-icon-btn" aria-label="Decline" onClick={() => setStatus(r.id, 'declined')}><X size={13} strokeWidth={1.5} /></button>
											</div>
										) : <span className={`gs-status gs-status-${r.status}`}>{r.status}</span>}
									</li>
								))}
							</ul>
						</div>
					)}
					{sent.length > 0 && (
						<div className="gs-collab-section">
							<h3 className="gs-collab-subtitle">Sent <span className="gs-tab-count">{sent.length}</span></h3>
							<ul className="gs-collab-list">
								{sent.map((r) => {
									const recipient = r.expand?.recipient;
									return (
										<li key={r.id} className="gs-collab-item">
											<div className="gs-collab-item-head">
												<span className="gs-collab-type">{COLLAB_REQUEST_LABELS[r.request_type]}</span>
												<span className="gs-collab-date">{relativeTime(r.created)}</span>
											</div>
											{recipient && <Link to={`/ghosts/${encodeURIComponent(recipient.handle)}`} className="gs-collab-recipient">→ {recipient.handle}</Link>}
											<p className="gs-collab-message">{r.message}</p>
											<div className="gs-collab-actions">
												<span className={`gs-status gs-status-${r.status}`}>{r.status}</span>
												{r.status === 'pending' && <button type="button" className="gs-icon-btn" aria-label="Withdraw" onClick={() => withdraw(r.id)}><Trash2 size={13} strokeWidth={1.5} /></button>}
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
