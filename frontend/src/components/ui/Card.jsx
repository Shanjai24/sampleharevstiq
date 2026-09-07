const VARIANT_CLASS = {
  default: 'card-standard',
  glass: 'glass-card',
  static: 'glass-card-static',
  hero: 'card-hero',
  well: 'card-well',
};

export default function Card({
  children,
  className = '',
  variant = 'default',
  accent,
  as,
  style,
  ...rest
}) {
  const Tag = as || 'div';
  const accentStyle = accent ? { borderLeft: `4px solid ${accent}` } : undefined;

  return (
    <Tag
      className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.default} ${className}`.trim()}
      style={{ ...accentStyle, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
