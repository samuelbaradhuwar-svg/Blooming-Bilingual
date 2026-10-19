// Artwork for the tutor's five characters. Each is drawn on a 120 x 120 canvas inside a plum badge with a gold studded
// ring, so she always looks different from the students' pastel animals. The markup is built here from fixed strings
// (nothing a user types ever reaches it), and `uid` keeps each picture's gradient ids unique on the page.

export const TUTOR_AVATARS = [
  { id: 'hibiscus', name: 'Hibiscus Teacher', blurb: 'The logo flower in glasses and a graduation cap.' },
  { id: 'bloom',    name: 'Madame Bloom',     blurb: 'The teacher with her bun, gold glasses and a hibiscus.' },
  { id: 'leona',    name: 'Leona the Lioness', blurb: 'A golden lioness with a crown and a bow at the ear.' },
  { id: 'lulu',     name: 'Lulu the Bunny',   blurb: 'A long-eared bunny in gold glasses with a gold bow.' },
  { id: 'plume',    name: 'Professor Plume',  blurb: 'A lilac owl in gold glasses with a hibiscus on her tuft.' },
];
export const DEFAULT_TUTOR_AVATAR = 'hibiscus';
export const tutorAvatarById = (id) => TUTOR_AVATARS.find(a => a.id === id) || null;

const O = '#55264F', INK = '#2A0F30';
const sw = `stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

const face = (nose = true) => [-1, 1].map(s => `<ellipse cx="${60 + s * 19}" cy="68" rx="2.9" ry="3.7" fill="${INK}"/>`).join('')
  + (nose ? '<ellipse cx="60" cy="72" rx="4.2" ry="2.9" fill="#FFC93C" stroke="#E0A21C" stroke-width="1"/>' : '');
const blush = (y = 76, d = 31) => [-1, 1].map(s => `<ellipse cx="${60 + s * d}" cy="${y}" rx="6" ry="3.4" fill="#FF8FB0" opacity=".55"/>`).join('');
const glasses = (u, r = 11) => `<g fill="#fff" fill-opacity=".25" stroke="url(#gd${u})" stroke-width="2.4"><circle cx="41" cy="68" r="${r}"/><circle cx="79" cy="68" r="${r}"/></g><path d="M${41 + r} 67 Q60 64 ${79 - r} 67" fill="none" stroke="url(#gd${u})" stroke-width="2.2"/>`;
const flower = (x, y, s = 1) => `<g transform="translate(${x} ${y}) rotate(-12) scale(${s})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-6.5" rx="5" ry="6.4" fill="#F2679C" stroke="#fff" stroke-width="1.2" transform="rotate(${a})"/>`).join('')}<circle r="3.4" fill="#FFE08A"/><circle r="1.2" fill="#E2A33B"/></g>`;
const bow = (x, y, s, c1, c2) => `<g transform="translate(${x} ${y}) rotate(-14) scale(${s})"><path d="M0 0 C-6 -9 -17 -9 -17 -1 C-17 8 -6 7 0 0 Z M0 0 C6 -9 17 -9 17 -1 C17 8 6 7 0 0 Z" fill="${c1}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><circle r="3.6" fill="${c2}" stroke="#fff" stroke-width="1.2"/></g>`;
const head = (fill, ry = 29) => `<ellipse cx="60" cy="66" rx="40" ry="${ry}" fill="${fill}" ${sw}/>`;

const ART = {
  hibiscus: (u) => `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="60" cy="32" rx="22" ry="29" fill="url(#pk${u})" stroke="#fff" stroke-width="1.8" transform="rotate(${a} 60 62)"/>`).join('')}${head('#FFF1F4')}${glasses(u)}${face()}${blush()}
<path d="M44 42 L44 52 Q60 61 76 52 L76 42 Z" fill="#3A1342" ${sw}/><path d="M24 38 L60 21 L96 38 L60 55 Z" fill="#3A1342" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/><path d="M60 38 L93 41 L93 58" fill="none" stroke="url(#gd${u})" stroke-width="2.2" stroke-linecap="round"/><rect x="90" y="56" width="6" height="10" rx="2" fill="url(#gd${u})" stroke="${O}" stroke-width="1.4"/><circle cx="60" cy="38" r="3.2" fill="url(#gd${u})" stroke="${O}" stroke-width="1.2"/>`,

  bloom: (u) => `<path d="M10 124 C10 102 34 96 60 96 C86 96 110 102 110 124 Z" fill="#F2A9C4" ${sw}/><path d="M47 97 L60 113 L73 97 Z" fill="#F7F3F3" ${sw}/><circle cx="60" cy="108" r="3.4" fill="url(#gd${u})" stroke="#8F6428" stroke-width="1.4"/><circle cx="60" cy="26" r="14" fill="#5A3425" ${sw}/>${head('#FFE3CF', 31)}<path d="M21 62 Q24 32 60 32 Q96 32 99 62 Q84 44 60 47 Q36 44 21 62 Z" fill="#5A3425" ${sw}/>${glasses(u)}${face()}${blush()}${flower(86, 34, 1.25)}`,

  leona: (u) => `${[...Array(12).keys()].map(i => `<ellipse cx="60" cy="24" rx="12" ry="18" fill="#EBB45C" stroke="${O}" stroke-width="2.6" transform="rotate(${i * 30} 60 64)"/>`).join('')}${[-1, 1].map(s => `<circle cx="${60 + s * 31}" cy="42" r="9.5" fill="#FFE2A8" ${sw}/><circle cx="${60 + s * 31}" cy="43" r="4.6" fill="#FFB5C8"/>`).join('')}${head('#FFE2A8')}${[-1, 1].map(s => [[-2, 0], [4, 5], [10, 10]].map(([dy, dx]) => `<path d="M${60 + s * 34} ${72 + dx * .4 + dy * .5} L${60 + s * 47} ${70 + dx * .9 + dy}" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`).join('')).join('')}${face()}${blush()}
<path d="M44 40 L47 20 L54 30 L60 15 L66 30 L73 20 L76 40 Z" fill="url(#gd${u})" stroke="#8F6428" stroke-width="2.4" stroke-linejoin="round"/><rect x="44" y="38" width="32" height="6" rx="3" fill="url(#gd${u})" stroke="#8F6428" stroke-width="2.2"/>${[[47, 19, '#F2679C'], [60, 14, '#47B2E6'], [73, 19, '#F2679C']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c}" stroke="#fff" stroke-width="1.1"/>`).join('')}${bow(86, 48, 1.1, '#7A1F5C', '#E2B85A')}`,

  lulu: (u) => `${[-1, 1].map(s => `<g transform="rotate(${s * 9} ${60 + s * 20} 40)"><ellipse cx="${60 + s * 20}" cy="20" rx="11.5" ry="26" fill="#FFF6F9" ${sw}/><ellipse cx="${60 + s * 20}" cy="22" rx="5.5" ry="17" fill="#FFB5CC"/></g>`).join('')}${head('#FFF6F9')}${glasses(u)}${face()}${blush()}${bow(88, 48, 1.1, '#E2B85A', '#7A1F5C')}<path d="M46 44 Q60 36 74 44" fill="none" stroke="#F2A9C4" stroke-width="2.4" stroke-linecap="round"/>`,

  plume: (u) => `${[-1, 1].map(s => `<path d="M${60 + s * 34} 50 L${60 + s * 40} 18 L${60 + s * 14} 38 Z" fill="#B58BD8" ${sw}/>`).join('')}${head('#D9C2EC', 31)}<path d="M60 96 C44 94 36 86 38 80 Q60 70 82 80 C84 86 76 94 60 96 Z" fill="#F2E6FA" opacity=".9"/>${[-1, 1].map(s => `<circle cx="${60 + s * 19}" cy="68" r="12" fill="#fff" ${sw}/>`).join('')}${glasses(u, 12.5)}${[-1, 1].map(s => `<circle cx="${60 + s * 19}" cy="68" r="5.4" fill="${INK}"/><circle cx="${60 + s * 19 + 1.6}" cy="66.2" r="1.7" fill="#fff"/>`).join('')}<path d="M55 76 L65 76 L60 85 Z" fill="#FFC93C" stroke="#E0A21C" stroke-width="1.4" stroke-linejoin="round"/>${blush(82, 33)}${flower(88, 40, 1.1)}${[[50, 92], [60, 95], [70, 92]].map(([x, y]) => `<path d="M${x - 3} ${y} Q${x} ${y + 3} ${x + 3} ${y}" fill="none" stroke="#B58BD8" stroke-width="1.6" stroke-linecap="round"/>`).join('')}`,
};

/** The full badge (ring, studs, sparkles and the character) as SVG markup for a 120 x 120 canvas. */
export function tutorBadge(id, uid) {
  const art = ART[id] || ART[DEFAULT_TUTOR_AVATAR];
  return `<defs>
<radialGradient id="bg${uid}" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#9B3A78"/><stop offset="1" stop-color="#280E2D"/></radialGradient>
<linearGradient id="gd${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBEAB4"/><stop offset=".5" stop-color="#E2B85A"/><stop offset="1" stop-color="#B88A36"/></linearGradient>
<linearGradient id="pk${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FAD0E0"/><stop offset=".5" stop-color="#F2A9C4"/><stop offset="1" stop-color="#DE7FA8"/></linearGradient>
<clipPath id="cl${uid}"><circle cx="60" cy="60" r="56"/></clipPath></defs>
<circle cx="60" cy="60" r="60" fill="url(#gd${uid})"/><circle cx="60" cy="60" r="56.5" fill="url(#bg${uid})"/>
<g clip-path="url(#cl${uid})">${art(uid)}</g>
<circle cx="60" cy="60" r="56.5" fill="none" stroke="#FBEAB4" stroke-width=".8" opacity=".8"/>
${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<circle cx="60" cy="3.2" r="1.5" fill="#FFF3C9" transform="rotate(${a} 60 60)"/>`).join('')}
<path d="M95 20 q1 -4 5 -5 q-4 -1 -5 -5 q-1 4 -5 5 q4 1 5 5z" fill="#FFF3C9" opacity=".9"/>
<path d="M22 28 q.7 -2.6 3.2 -3.2 q-2.5 -.7 -3.2 -3.2 q-.7 2.5 -3.2 3.2 q2.5 .6 3.2 3.2z" fill="#FFF3C9" opacity=".8"/>`;
}
