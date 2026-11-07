const MARK =
  'https://horizons-cdn.hostinger.com/10773295-e010-4811-a2c6-4d11540001ee/6c0fc34b80dea891b36261613eb86347.png';

export function GhostMark({ className = '', decorative = true }: { className?: string; decorative?: boolean }) {
  const hero = className.includes('hero-mark');
  return (
    <img
      className={`ghost-mark ${className}`}
      src={MARK}
      alt={decorative ? '' : 'Laughing Ghost Network primary mascot'}
      aria-hidden={decorative ? true : undefined}
      width={hero ? 1024 : 64}
      height={hero ? 1024 : 64}
      decoding="async"
    />
  );
}
