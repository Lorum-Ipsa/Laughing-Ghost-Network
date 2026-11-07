import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/**
 * A "Back to Ghost Space" control shown on the public Ghost profile page when a
 * signed-in member is viewing it. The public profile is server-rendered and
 * visible to everyone; this control only appears after hydration, once the
 * member's session (in localStorage) has been restored. Anonymous visitors and
 * the loading frame render nothing, so SSR output and first paint match.
 */
export function BackToGhostSpace() {
	const { isAuthed, isLoading } = useAuth();

	if (isLoading || !isAuthed) return null;

	return (
		<div className="rail" style={{ paddingTop: 18 }}>
			<Link to="/ghost-space" className="gs-back">
				<ArrowLeft size={14} strokeWidth={1.5} />
				<span>Back to Ghost Space</span>
			</Link>
		</div>
	);
}
