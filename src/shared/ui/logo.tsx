/** Знак «Лад»: жовта плитка з літерою «Л», намальованою як нота. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Лад" className={className}>
      <rect width="64" height="64" rx="16" fill="#FFC800" />
      <path
        d="M23 38 L32 18 H45 V46"
        fill="none"
        stroke="#2A2724"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="44" r="6.5" fill="#2A2724" />
    </svg>
  );
}
