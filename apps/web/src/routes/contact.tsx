import type { Route } from './+types/contact';
import { seo } from '@/lib/seo';
import { PageHeading } from '@/components/page-heading';
import { ContactChannels } from '@/components/contact/contact-channels';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Contact — Laughing Ghost Network',
		description: 'Contact Laughing Ghost Network: contact@ for general inquiries, support@ for account help, and security@ for vulnerability reports and responsible disclosure.',
	});
}

export default function Contact() {
	return (
		<main>
			<PageHeading
				title="Contact"
				number="09"
				eyebrow="Reach the network"
				description="Three public inboxes, each with a purpose. Choose the address that fits your message so it reaches the right people quickly."
			/>
			<ContactChannels />
		</main>
	);
}
