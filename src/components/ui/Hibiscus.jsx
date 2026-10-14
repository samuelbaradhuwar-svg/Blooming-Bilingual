import { useId } from 'react';

// One hibiscus flower, drawn as vector art so it stays sharp at any size and can be recoloured.
//   variant "full"       – the painted flower (hero and auth artwork)
//   variant "line"       – fine botanical outline in the current text colour
//   variant "silhouette" – a flat single-colour shape in the current text colour (soft backgrounds)
// Decorative by default: hidden from screen readers.

const PETAL =
  'M100,100 C76,88 50,60 58,34 C62,20 68,12 74,12 C82,12 84,22 88,22 C92,22 94,8 100,8 ' +
  'C106,8 108,22 112,22 C116,22 118,12 126,12 C132,12 138,20 142,34 C150,60 124,88 100,100 Z';
const ANGLES = [0, 72, 144, 216, 288];

export default function Hibiscus({ variant = 'full', size = 200, className = '', style, label }) {
  const uid = useId().replace(/:/g, '');
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  const common = { viewBox: '0 0 200 200', width: size, height: size, className: `hibiscus ${className}`.trim(), style, ...a11y };

  if (variant === 'silhouette') {
    return (
      <svg {...common}>
        {ANGLES.map(a => <path key={a} d={PETAL} fill="currentColor" transform={`rotate(${a} 100 100)`} />)}
      </svg>
    );
  }

  if (variant === 'line') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {ANGLES.map(a => (
          <g key={a} transform={`rotate(${a} 100 100)`}>
            <path d={PETAL} />
            <path d="M100,100 L100,26 M100,100 L78,40 M100,100 L122,40" opacity=".55" />
          </g>
        ))}
        <path d="M100,100 C104,80 112,62 126,46" strokeWidth="2" />
        <circle cx="126" cy="46" r="3" />
        <circle cx="100" cy="100" r="5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <defs>
        <radialGradient id={`${uid}p`} cx="100" cy="100" r="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4A1450" />
          <stop offset=".2" stopColor="#7A1F5C" />
          <stop offset=".5" stopColor="#C23E80" />
          <stop offset=".8" stopColor="#E8709F" />
          <stop offset="1" stopColor="#F4B0C8" />
        </radialGradient>
        <radialGradient id={`${uid}q`} cx="100" cy="100" r="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3A0F3D" />
          <stop offset=".22" stopColor="#8A2466" />
          <stop offset=".55" stopColor="#D2518F" />
          <stop offset=".85" stopColor="#EE8CB2" />
          <stop offset="1" stopColor="#F8C9DA" />
        </radialGradient>
        <radialGradient id={`${uid}t`} cx="100" cy="100" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#280E2D" />
          <stop offset="1" stopColor="#7A1F5C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* back row of petals, then the front row, so the flower has depth */}
      {ANGLES.map((a, i) => (
        <g key={a} transform={`rotate(${a + 36} 100 100) translate(100 100) scale(.97) translate(-100 -100)`}>
          <path d={PETAL} fill={`url(#${uid}q)`} opacity=".92" />
        </g>
      ))}
      {ANGLES.map(a => (
        <g key={`f${a}`} transform={`rotate(${a} 100 100)`}>
          <path d={PETAL} fill={`url(#${uid}p)`} />
          <path d="M100,100 L100,30 M100,100 L80,44 M100,100 L120,44 M100,100 L68,56 M100,100 L132,56" stroke="#4A1450" strokeOpacity=".28" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={PETAL} fill="none" stroke="#FBE3EC" strokeOpacity=".35" strokeWidth="1" />
        </g>
      ))}
      <circle cx="100" cy="100" r="34" fill={`url(#${uid}t)`} />
      {/* stamen column with pollen and the five-lobed stigma */}
      <path d="M100,100 C104,80 112,62 126,46" stroke="#F8E9ED" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M100,100 C104,80 112,62 126,46" stroke="#E898B7" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".7" />
      {[[110, 70], [114, 63], [118, 58], [107, 76], [121, 53]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill="#FFE9B8" />)}
      {[[126, 46], [131, 43], [130, 50], [124, 40], [121, 46]].map(([x, y]) => <circle key={`s${x}${y}`} cx={x} cy={y} r="2.6" fill="#7A1F5C" />)}
    </svg>
  );
}
