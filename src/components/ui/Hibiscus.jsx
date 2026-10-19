import { useId } from 'react';
import { FLOWER_DETAIL, FLOWER_SIMPLE } from './logoPaths';

// The site's hibiscus is the flower from the logo (same shape, veins, stamen and leaf), as vector art that stays sharp at
// any size and can be recoloured.
//   variant "full"       - blush petals with a champagne-gold pollen (hero and auth artwork)
//   variant "line"       - the same flower as a fine outline in the current text colour
//   variant "silhouette" - a flat single-colour shape in the current text colour (soft backgrounds)
// Small sizes use the logo's simplified flower so it stays clear. Decorative by default: hidden from screen readers.

const parts = FLOWER_DETAIL.split(/(?=M)/);
const POLLEN = parts.slice(0, 7).join('');   // the seven pollen dots at the tip of the stamen
const BODY = parts.slice(7).join('');        // petals, stamen, leaf and veins
// A square frame centred on the flower, so it drops into the same places as any square artwork.
const VIEW = '8.7 46.1 318 318';

export default function Hibiscus({ variant = 'full', size = 200, className = '', style, label, detail }) {
  const uid = useId().replace(/:/g, '');
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  const common = { viewBox: VIEW, width: size, height: size, className: `hibiscus ${className}`.trim(), style, ...a11y };
  const detailed = detail ?? (typeof size !== 'number' || size >= 72);
  const body = detailed ? BODY : FLOWER_SIMPLE;
  const pollen = detailed ? POLLEN : '';

  if (variant === 'silhouette') {
    return (
      <svg {...common}>
        <path fillRule="evenodd" clipRule="evenodd" d={body} fill="currentColor" />
        {pollen && <path d={pollen} fill="currentColor" />}
      </svg>
    );
  }

  if (variant === 'line') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
        <path d={body} strokeWidth={detailed ? 1.5 : 1.3} vectorEffect="non-scaling-stroke" />
        {pollen && <path d={pollen} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />}
      </svg>
    );
  }

  return (
    <svg {...common}>
      <defs>
        <linearGradient id={`${uid}p`} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#F9C2D6" />
          <stop offset="0.45" stopColor="#E898B7" />
          <stop offset="1" stopColor="#CF6B9A" />
        </linearGradient>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3E3B3" />
          <stop offset="0.55" stopColor="#D9B96C" />
          <stop offset="1" stopColor="#B88A36" />
        </linearGradient>
      </defs>
      <path fillRule="evenodd" clipRule="evenodd" d={body} fill={`url(#${uid}p)`} />
      {pollen && <path d={pollen} fill={`url(#${uid}g)`} />}
    </svg>
  );
}
