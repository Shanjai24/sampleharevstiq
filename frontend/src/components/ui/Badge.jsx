const VARIANT_CLASS = {
  live: 'badge-live',
  estimated: 'badge-estimated',
  fallback: 'badge-fallback',
  'fit-strong': 'badge-fit-strong',
  'fit-good': 'badge-fit-good',
  'fit-moderate': 'badge-fit-moderate',
  'fit-low': 'badge-fit-low',
  'risk-low': 'badge-fit-strong',
  'risk-moderate': 'badge-fit-moderate',
  'risk-high': 'badge-fit-low',
};

export default function Badge({ variant = 'live', children, className = '' }) {
  const cls = VARIANT_CLASS[variant] || VARIANT_CLASS.estimated;

  return (
    <span className={`${cls} ${className}`.trim()}>
      {variant === 'live' && <span className="badge-live-dot" />}
      {children}
    </span>
  );
}
