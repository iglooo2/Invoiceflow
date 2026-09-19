export function JobEmptyIllustration() {
  return (
    <div className="relative mx-auto grid size-28 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-primary/15" />
      <span className="relative grid size-[4.5rem] place-items-center rounded-2xl bg-card shadow-[0_18px_36px_-20px_rgba(28,25,23,0.5)] ring-1 ring-border">
        <svg viewBox="0 0 64 48" className="h-12 w-16" fill="none">
          <rect x="8" y="12" width="40" height="28" rx="3" fill="#fffbf6" stroke="#d9d0c4" />
          <rect x="16" y="8" width="40" height="28" rx="3" fill="#fff7f1" stroke="#c45c26" />
          <path d="M24 18h24M24 24h16" stroke="#1f4e46" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="48" cy="32" r="8" fill="#c45c26" />
          <path d="M45 32.5 47.2 35l4.3-5" stroke="#fff7f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
