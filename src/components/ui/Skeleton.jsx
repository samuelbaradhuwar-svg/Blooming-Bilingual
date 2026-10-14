/** Loading placeholder with the same footprint as the content it stands in for. */
export default function Skeleton({ w = '100%', h = 16, r = 8, style, className = '' }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

/** A few stacked rows, announced once to screen readers. */
export function SkeletonRows({ rows = 3, h = 54 }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={h} r={12} />)}
    </div>
  );
}
