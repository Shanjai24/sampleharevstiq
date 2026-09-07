export default function SkeletonBlock({ height = 120, width = '100%', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}
