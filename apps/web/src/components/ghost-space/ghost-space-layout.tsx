import { Link } from 'react-router';
import {
	LayoutDashboard,
	User,
	FileText,
	FolderGit2,
	MessagesSquare,
	Network as NetworkIcon,
	Bell,
	Settings,
	ShieldCheck,
	ArrowUpRight,
	LogOut,
} from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';

export type GhostSpaceSection =
	| 'dashboard'
	| 'profile'
	| 'contributions'
	| 'review'
	| 'projects'
	| 'table-talks'
	| 'network'
	| 'messages'
	| 'notifications'
	| 'settings';

const NAV: { section: GhostSpaceSection; label: string; icon: typeof LayoutDashboard }[] = [
	{ section: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ section: 'profile', label: 'My Profile', icon: User },
	{ section: 'contributions', label: 'Contributions', icon: FileText },
	{ section: 'review', label: 'Review queue', icon: ShieldCheck },
	{ section: 'projects', label: 'Projects', icon: FolderGit2 },
	{ section: 'table-talks', label: 'Table Talks', icon: MessagesSquare },
	{ section: 'network', label: 'Network', icon: NetworkIcon },
	{ section: 'messages', label: 'Messages', icon: MessagesSquare },
	{ section: 'notifications', label: 'Notifications', icon: Bell },
	{ section: 'settings', label: 'Settings', icon: Settings },
];

/**
 * The Ghost Space application shell. A persistent member navigation replaces
 * the public site nav inside the logged-in layer: Dashboard, My Profile,
 * Contributions, Projects, Table Talks, Network, Messages, Notifications,
 * Settings, and an exit to the public profile.
 */
export function GhostSpaceLayout({
	section,
	canReview=false,
	handle,
	publicProfilePath,
	onSignOut,
	children,
}: {
	section: GhostSpaceSection;
	canReview?: boolean;
	handle: string;
	publicProfilePath: string;
	onSignOut: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="ghost-space-shell">
			<aside className="ghost-space-sidebar" aria-label="Ghost Space navigation">
				<div className="ghost-space-identity">
					<GhostMark />
					<div className="ghost-space-identity-text">
						<span className="ghost-space-handle">{handle}</span>
						<span className="ghost-space-layer">GHOST SPACE</span>
					</div>
				</div>
				<nav className="ghost-space-nav">
					{NAV.filter(item=>item.section!=='review'||canReview).map(({ section: key, label, icon: Icon }) => (
						<Link
							key={key}
							to={`/ghost-space?section=${key}`}
							className={`ghost-space-nav-item ${section === key ? 'active' : ''}`}
							aria-current={section === key ? 'page' : undefined}
						>
							<Icon size={15} strokeWidth={1.5} />
							<span>{label}</span>
						</Link>
					))}
				</nav>
				<div className="ghost-space-sidebar-foot">
					{publicProfilePath && <Link to={publicProfilePath} className="ghost-space-nav-item ghost-space-public">
						<ArrowUpRight size={15} strokeWidth={1.5} />
						<span>View Public Profile</span>
					</Link>}
					<button type="button" className="ghost-space-nav-item ghost-space-signout" onClick={onSignOut}>
						<LogOut size={15} strokeWidth={1.5} />
						<span>Sign out</span>
					</button>
				</div>
			</aside>
			<div className="ghost-space-content">{children}</div>
		</div>
	);
}
