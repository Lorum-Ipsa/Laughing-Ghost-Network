import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Work } from '@/lib/network';
import { GhostSpaceLayout, type GhostSpaceSection } from '@/components/ghost-space/ghost-space-layout';
import { Welcome } from '@/components/ghost-space/welcome';
import { ProfileStatus } from '@/components/ghost-space/profile-status';
import { QuickActions } from '@/components/ghost-space/quick-actions';
import { EvidenceSummary } from '@/components/ghost-space/evidence-summary';
import { ActiveWork } from '@/components/ghost-space/active-work';
import { NetworkActivity } from '@/components/ghost-space/network-activity';
import { SectionPlaceholder } from '@/components/ghost-space/section-placeholder';
import { ProfileWorkspace } from '@/components/ghost-space/profile/profile-workspace';
import { ContributionsWorkspace } from '@/components/ghost-space/contributions/contributions-workspace';
import { ProjectsWorkspace } from '@/components/ghost-space/projects/projects-workspace';
import { TableTalksWorkspace } from '@/components/ghost-space/table-talks/table-talks-workspace';
import { NetworkWorkspace } from '@/components/ghost-space/network/network-workspace';
import { NotificationsWorkspace } from '@/components/ghost-space/notifications/notifications-workspace';
import { SettingsWorkspace } from '@/components/ghost-space/settings/settings-workspace';
import { VerificationBanner } from '@/components/ghost-space/verification-banner';
import { ReactivationBanner } from '@/components/ghost-space/reactivation-banner';

const VALID_SECTIONS: GhostSpaceSection[] = [
	'dashboard', 'profile', 'contributions', 'projects', 'table-talks', 'network', 'notifications', 'settings',
];

function readSection(value: string | null): GhostSpaceSection {
	return VALID_SECTIONS.includes(value as GhostSpaceSection) ? (value as GhostSpaceSection) : 'dashboard';
}

/**
 * The Ghost Space dashboard. Fetches the signed-in Ghost's profile, their
 * contributions, and recent network activity, then composes the dashboard
 * panels. Non-dashboard sections render a placeholder while they are built one
 * at a time.
 */
export function GhostSpaceDashboard() {
	const { user, logout, isLoading } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const section = readSection(searchParams.get('section'));

	const [profile, setProfile] = useState<GhostProfile | null>(null);
	const [work, setWork] = useState<Work[]>([]);
	const [networkWork, setNetworkWork] = useState<Work[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		if (!user) return;
		let active = true;
		setLoading(true);
		const ownerFilter = pb.filter('owner = {:id}', { id: user.id });
		Promise.all([
			pb.collection('ghost_profiles').getFullList<GhostProfile>({ filter: ownerFilter, requestKey: null }),
			pb.collection('ghost_work').getFullList<Work>({ filter: ownerFilter, sort: '-updated', requestKey: null }),
			pb.collection('ghost_work').getFullList<Work>({
				filter: "status = 'published'",
				expand: 'author',
				sort: '-created',
				requestKey: null,
			}),
		])
			.then(([profiles, works, network]) => {
				if (!active) return;
				setProfile(profiles[0] || null);
				setWork(works);
				setNetworkWork(network.filter((w) => w.owner !== user.id));
				setError('');
			})
			.catch(() => {
				if (!active) return;
				setError('Could not load your Ghost Space. Try again in a moment.');
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => { active = false; };
	}, [user, revision]);

	function signOut() {
		logout();
		navigate('/login');
	}

	if (isLoading) {
		return <div className="rail loading-state" style={{ padding: '60px 0' }}>Loading Ghost Space…</div>;
	}

	const publicProfilePath = profile ? `/ghosts/${profile.handle}` : '/ghosts';

	return (
		<GhostSpaceLayout
			section={section}
			handle={profile?.handle || user?.email || 'Ghost'}
			publicProfilePath={publicProfilePath}
			onSignOut={signOut}
		>
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			<VerificationBanner />
			{profile && <ReactivationBanner profile={profile} onReactivated={() => setRevision((r) => r + 1)} />}
			{section === 'dashboard' ? (
				<div className="gs-dashboard">
					<Welcome profile={profile} />
					<div className="gs-grid">
						<div className="gs-grid-main">
							<QuickActions />
							<ActiveWork work={work} />
							<NetworkActivity work={networkWork} />
						</div>
						<div className="gs-grid-side">
							<ProfileStatus profile={profile} />
							<EvidenceSummary work={work} />
						</div>
					</div>
				</div>
			) : section === 'profile' ? (
			<ProfileWorkspace profile={profile} work={work} onRefresh={() => setRevision((r) => r + 1)} />
		) : section === 'contributions' ? (
				<ContributionsWorkspace
					profile={profile}
					work={work}
					onRefresh={() => setRevision((r) => r + 1)}
				/>
			) : section === 'projects' ? (
				<ProjectsWorkspace
					profile={profile}
					work={work}
					onRefresh={() => setRevision((r) => r + 1)}
				/>
			) : section === 'table-talks' ? (
				<TableTalksWorkspace
					profile={profile}
					work={work}
					onRefresh={() => setRevision((r) => r + 1)}
				/>
			) : section === 'network' ? (
				<NetworkWorkspace profile={profile} work={work} onRefresh={() => setRevision((r) => r + 1)} />
			) : section === 'notifications' ? (
				<NotificationsWorkspace />
			) : section === 'settings' ? (
				<SettingsWorkspace profile={profile} onRefresh={() => setRevision((r) => r + 1)} />
			) : (
				<SectionPlaceholder section={section} />
			)}
		</GhostSpaceLayout>
	);
}
