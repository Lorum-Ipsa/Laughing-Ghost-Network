import { Mail, ShieldAlert, LifeBuoy, Building2, ArrowUpRight } from 'lucide-react';

type Channel = {
	icon: typeof Mail;
	address: string;
	label: string;
	purpose: string;
	detail: string;
};

const CHANNELS: Channel[] = [
	{
		icon: Building2,
		address: 'contact@laughingghost.net',
		label: 'Contact',
		purpose: 'General inquiries, partnerships, and press.',
		detail: 'Reach the network for anything that is not support or a security report.',
	},
	{
		icon: LifeBuoy,
		address: 'support@laughingghost.net',
		label: 'Support',
		purpose: 'Account access, login trouble, and member questions.',
		detail: 'Use this for help signing in, verification issues, or profile problems. This is also the reply-to address for automated emails.',
	},
	{
		icon: ShieldAlert,
		address: 'security@laughingghost.net',
		label: 'Security',
		purpose: 'Vulnerability reports and responsible disclosure.',
		detail: 'Report a security issue affecting Laughing Ghost Network. We honor authorized scopes and responsible disclosure.',
	},
];

export function ContactChannels() {
	return (
		<section className="rail section-space" style={{ paddingBottom: 85 }}>
			<div className="section-heading">
				<h2>Which address to use</h2>
				<p>Each inbox is read by the right people. Pick the one that matches your message.</p>
			</div>

			<div className="ghost-directory">
				{CHANNELS.map((channel) => (
					<article key={channel.address} className="directory-card">
						<div className="directory-card-header">
							<span className="eyebrow"><span className="tiny-dot" /> {channel.label.toUpperCase()}</span>
							<channel.icon size={18} style={{ color: 'hsl(var(--primary))' }} />
						</div>
						<h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 18 }}>{channel.address}</h2>
						<p className="directory-specialties">{channel.purpose}</p>
						<p className="directory-bio">{channel.detail}</p>
						<div className="directory-link">
							<a className="text-link" href={`mailto:${channel.address}`}>
								Email {channel.label} <ArrowUpRight size={15} />
							</a>
						</div>
					</article>
				))}
			</div>

			<p className="muted-note" style={{ marginTop: 40, maxWidth: 640 }}>
				For a faster response to a security report, include affected URLs, reproduction steps, and your authorized scope. Do not send account passwords — we will never ask for them.
			</p>
		</section>
	);
}
