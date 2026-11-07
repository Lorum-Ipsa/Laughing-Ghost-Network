import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';

export function NetworkStory() {
	return (
		<div className="about-layout rail">
			<div>
				<blockquote className="editorial-quote">
					Anonymity is not the absence of identity.<br />
					<span>It’s the choice of what you make public.</span>
				</blockquote>

				<section className="prose-section">
					<h2>A collective, not a showcase.</h2>
					<p>Laughing Ghost Network connects cybersecurity practitioners around one principle: skills are demonstrated through public, documented, and verifiable work. The network is independent, technical, and collaborative. It requires neither prestigious affiliation nor civil identity.</p>
				</section>

				<section className="prose-section">
					<h2>A home for the whole field.</h2>
					<p>Laughing Ghost Network is not built around one cybersecurity specialty. It exists for practitioners across defensive security, offensive security, engineering, research, governance, privacy, intelligence, critical infrastructure, education, and emerging fields.</p>
					<p>Research. Build. Investigate. Detect. Defend. Test. Review. Teach. The network connects the work across disciplines instead of separating it into isolated communities.</p>
				</section>

				<section className="prose-section">
					<h2>A pseudonym that lasts.</h2>
					<p>Each Ghost builds a persistent identity through their handle. This handle gathers their research, detections, writeups, projects, and exercise debriefs. It is not a disposable mask: contributions stay attributed, methods stay debatable, and responsibility remains.</p>
				</section>

				<section className="prose-section">
					<h2>Reputation, without the numbers race.</h2>
					<p>We don’t count followers, likes, or karma. We don’t rank members. Discovery happens by specialty, topic, and artifact. The network’s value comes from contributions others can understand, validate, and reuse.</p>
				</section>

				<section className="prose-section">
					<h2>An ethical practice, by design.</h2>
					<p>Work happens within authorized scopes. Confidentiality, coordinated disclosure, and respect for authors are requirements, not options. Contributions go through review before publication. Exercises favor reasoning and debrief over competition.</p>
					<Link className="text-link" to="/code" style={{ marginTop: 20 }}>Read our code of conduct <ArrowUpRight size={15} /></Link>
				</section>

				<section className="prose-section">
					<h2>An international network by design.</h2>
					<p>Cybersecurity does not belong to one country or one language. Ghosts may publish in the language they work and think in. Original work remains authoritative, while translation helps the rest of the network understand and discover it.</p>
					<p>Write in your language. Share with the network.</p>
				</section>

				<section className="prose-section">
					<h2>Location, on your terms.</h2>
					<p>Ghosts control their location disclosure. Country-level location is sufficient. Members may instead display “Remote” or “Undisclosed.” City, state/province, and precise location are optional and should never be required.</p>
					<p>Discovery supports country, region, remote, and undisclosed — never exposing more location data than a Ghost has chosen to publish. Recruiters and collaborators never need a precise location unless the Ghost voluntarily provides it.</p>
				</section>

				<section className="prose-section">
					<h2>Built in public.</h2>
					<p>Laughing Ghost Network is still being built. The first profiles, artifacts, research, and exercises are examples of the structure we are creating. As real Ghosts join, those examples give way to real work, real collaboration, and a living record of the cybersecurity community.</p>
					<p>The network gives the individual visibility. The individual’s work gives the network credibility.</p>
				</section>
			</div>

			<aside className="about-panel">
				<GhostMark />
				<span className="mono">LAUGHING GHOST NETWORK</span>
				<p>Open Network.<br />Private Identities.<br />Public Work.</p>
				<Link className="button button-light full-width" to="/join">Join the network <ArrowUpRight size={15} /></Link>
			</aside>
		</div>
	);
}
