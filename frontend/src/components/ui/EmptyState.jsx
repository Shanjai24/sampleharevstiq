import Card from './Card';

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionClassName = 'btn-accent',
}) {
  return (
    <Card variant="static" className="mx-auto max-w-[520px] px-7 py-11 text-center">
      {icon != null && <div className="mb-4 text-[3.6rem] leading-none">{icon}</div>}
      {title && (
        <h2 className="mb-2.5 text-[1.6rem] font-extrabold text-text-primary">{title}</h2>
      )}
      {description && (
        <p className="mb-7 text-[0.92rem] leading-relaxed text-text-secondary">{description}</p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={`${actionClassName} w-full px-6 py-3 text-[0.95rem]`}>
          {actionLabel}
        </button>
      )}
    </Card>
  );
}
