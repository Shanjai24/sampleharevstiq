export default function ErrorBanner({ children, className = '' }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className={`rounded-xl border border-accent-border bg-accent-soft px-5 py-3.5 text-[0.86rem] leading-snug text-accent ${className}`.trim()}
    >
      ⚠️ {children}
    </div>
  );
}
