import { Link } from 'react-router-dom';
import { BRAND } from '../../data/brand';

/**
 * TEMPORARY logo mark: a simple generic hibiscus on a plum tile.
 * The official logo has not been finalised. When it is, replace the SVG inside this one
 * component and every place the brand appears (nav, footer, sidebar, sign-in, favicon art) updates.
 */
export function BrandMark({ size = 36, tone = 'plum', className = '' }) {
  const light = tone === 'light';   // light tile for use on dark backgrounds
  return (
    <span className={`brand-mark ${light ? 'is-light' : ''} ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size * 0.66} height={size * 0.66}>
        {[0, 72, 144, 216, 288].map(a => (
          <path key={a} transform={`rotate(${a} 20 20)`} d="M20,20 C14,17 9,11 11,6 C13,3 17,3 20,5 C23,3 27,3 29,6 C31,11 26,17 20,20 Z" fill="currentColor" opacity={a % 144 === 0 ? 1 : 0.82} />
        ))}
        <circle cx="20" cy="20" r="2.6" className="brand-mark-eye" />
      </svg>
    </span>
  );
}

/** Mark + name. `tone="light"` is for dark backgrounds. `as="div"` when it must not be a link. */
export default function Brand({ to = '/', tone = 'dark', size = 36, showName = true, name = BRAND.name, as, onClick, className = '' }) {
  const inner = (
    <>
      <BrandMark size={size} tone={tone === 'light' ? 'light' : 'plum'} />
      {showName && <span className="brand-name">{name}</span>}
    </>
  );
  const cls = `brand ${tone === 'light' ? 'brand-light' : ''} ${className}`.trim();
  if (as === 'div') return <div className={cls}>{inner}</div>;
  return <Link to={to} className={cls} onClick={onClick} aria-label={`${BRAND.name}, home`}>{inner}</Link>;
}
