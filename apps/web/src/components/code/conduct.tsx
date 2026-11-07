import { conductSections, moderationProcess } from '@/data/code';
import { ReportForm } from '@/components/code/report-form';

export function Conduct() {
  return (
    <div className="rail content-narrow" style={{ paddingBottom: 75 }}>
      <div className="callout" style={{ marginTop: 35 }}>
        This framework applies to all spaces of the network: profiles, contributions, collaborations, exchanges, and exercises. Pseudonymity does not exempt you from responsibility.
      </div>
      {conductSections.map((section) => (
        <section className="prose-section" key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <section className="prose-section">
        <h2>Moderation process</h2>
        <p>{moderationProcess.intro}</p>
        <p style={{ marginTop: 16 }}>Possible actions:</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {moderationProcess.actions.map((action) => (
            <li key={action} style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, lineHeight: 1.85, marginTop: 6, paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'hsl(var(--primary))' }}>—</span>
              {action}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 18 }}>{moderationProcess.closing}</p>
      </section>
      <ReportForm />
    </div>
  );
}
