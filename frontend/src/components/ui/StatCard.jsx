import Card from './Card';

export default function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  className = '',
}) {
  return (
    <Card accent={accent} className={`fade-in px-5 py-[18px] ${className}`.trim()}>
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-bold text-text-muted">{label}</span>
      </div>
      <p className="m-0 text-[1.15rem] font-extrabold text-text-primary">{value}</p>
      {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
    </Card>
  );
}
