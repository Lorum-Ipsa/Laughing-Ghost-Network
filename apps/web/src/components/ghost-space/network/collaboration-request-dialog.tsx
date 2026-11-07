import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { CollaborationRequestType, GhostProfile, Work } from '@/lib/network';
import { COLLAB_REQUEST_LABELS } from '@/lib/network';

const REQUEST_TYPES = Object.keys(COLLAB_REQUEST_LABELS) as CollaborationRequestType[];

/**
 * Structured collaboration request overlay. A Ghost picks a request type and
 * writes a short note — no free-form DM. The request is stored against the
 * recipient profile (and an optional related work) so the recipient can accept
 * or decline it from their own Network workspace. This keeps collaboration
 * intentional and easy to moderate, and reduces spam.
 */
export function CollaborationRequestDialog({
	recipient,
	relatedWork,
	myProjects,
	onClose,
	onSent,
}: {
	recipient: GhostProfile;
	relatedWork?: Work | null;
	myProjects?: Work[];
	onClose: () => void;
	onSent: () => void;
}) {
	const { user } = useAuth();
	const [requestType, setRequestType] = useState<CollaborationRequestType>(
		relatedWork?.kind === 'exercise' ? 'table_talk' : relatedWork?.kind === 'project' ? 'project_collaboration' : 'general',
	);
	const [message, setMessage] = useState('');
	const [relatedWorkId, setRelatedWorkId] = useState<string>(relatedWork?.id || '');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [done, setDone] = useState(false);

	async function submit() {
		if (!user || !message.trim()) return;
		setBusy(true);
		setError('');
		try {
			await pb.collection('ghost_collaboration_requests').create({
				owner: user.id,
				recipient: recipient.id,
				request_type: requestType,
				message: message.trim(),
				related_work: relatedWorkId || '',
				status: 'pending',
			});
			setDone(true);
			onSent();
		} catch {
			setError('The request could not be sent. You may have already sent one to this Ghost.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-overlay" role="dialog" aria-modal="true" aria-label={`Collaboration request to ${recipient.handle}`} onClick={onClose}>
			<div className="gs-overlay-panel" onClick={(e) => e.stopPropagation()}>
				<div className="gs-overlay-head">
					<div>
						<span className="eyebrow"><span className="tiny-dot" /> COLLABORATION REQUEST</span>
						<h2>Work with {recipient.handle}</h2>
					</div>
					<button type="button" className="gs-overlay-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={1.5} /></button>
				</div>

				{done ? (
					<div className="status-message">Your request was sent. {recipient.handle} will see it in their Network workspace.</div>
				) : (
					<>
						<p className="muted-note" style={{ marginBottom: 18 }}>Structured requests keep collaboration intentional and reduce spam. The recipient can accept or decline — no open DM inbox.</p>
						<div className="field">
							<label htmlFor="collab-type">Request type</label>
							<select id="collab-type" value={requestType} onChange={(e) => setRequestType(e.target.value as CollaborationRequestType)}>
								{REQUEST_TYPES.map((t) => <option key={t} value={t}>{COLLAB_REQUEST_LABELS[t]}</option>)}
							</select>
						</div>
						{myProjects && myProjects.length > 0 && (requestType === 'project_collaboration' || requestType === 'peer_review' || requestType === 'table_talk') && (
							<div className="field">
								<label htmlFor="collab-work">Related project (optional)</label>
								<select id="collab-work" value={relatedWorkId} onChange={(e) => setRelatedWorkId(e.target.value)}>
									<option value="">None</option>
									{myProjects.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
								</select>
							</div>
						)}
						<div className="field">
							<label htmlFor="collab-message">Message</label>
							<textarea id="collab-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} minLength={20} required placeholder="Short note describing what you want to work on — the project, the research question, the role, or the talk." />
							<small>Describe what you want to work on. Visible to the recipient and moderation.</small>
						</div>
						{error && <div className="status-message error-message" role="alert">{error}</div>}
						<div className="gs-editor-actions">
							<button type="button" className="button button-light" disabled={busy || message.trim().length < 20} onClick={submit}>
								<Send size={14} strokeWidth={1.5} /> {busy ? 'Sending…' : 'Send request'}
							</button>
							<button type="button" className="button button-outline" onClick={onClose}><X size={13} strokeWidth={1.5} /> Cancel</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
