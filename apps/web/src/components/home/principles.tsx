import { Fingerprint, ScanLine, GitBranch, Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type PrincipleKey = 'private' | 'public' | 'open' | 'language';

const principles: { key: PrincipleKey; Icon: typeof Fingerprint }[] = [
  { key: 'private', Icon: Fingerprint },
  { key: 'public', Icon: ScanLine },
  { key: 'open', Icon: GitBranch },
  { key: 'language', Icon: Languages },
];

export function Principles() {
  const { t } = useI18n();
  return (
    <section className="principles rail" aria-label="The principles of the network">
      {principles.map(({ key, Icon }) => (
        <div key={key}>
          <Icon strokeWidth={1.2} />
          <span>
            <h2>{t(`principle.${key}.title`)}</h2>
            <p>{t(`principle.${key}.desc`)}</p>
          </span>
        </div>
      ))}
    </section>
  );
}
