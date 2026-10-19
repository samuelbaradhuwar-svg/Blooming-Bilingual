import { useEffect, useState, useId } from 'react';
import { supabase } from '../../lib/supabase';
import { tutorBadge, tutorAvatarById, DEFAULT_TUTOR_AVATAR } from './tutorArt';

// Friendly characters people can pick as their picture. Ten original characters (two rows of five) in a
// sweet, round "kawaii" style. Each one grows through five levels as a student takes lessons:
//   level 1  the character
//   level 2  + a hibiscus flower
//   level 3  + a scarf
//   level 4  + a graduation cap
//   level 5  + a golden crown and sparkles
// The tutor does not pick from these: she has her own set of five (see tutorArt.js).

export const AVATAR_LEVELS = [
  { level: 1, min: 0,  name: 'Sprout' },
  { level: 2, min: 5,  name: 'Bud' },
  { level: 3, min: 10, name: 'Bloom' },
  { level: 4, min: 20, name: 'Scholar' },
  { level: 5, min: 40, name: 'Superstar' },
];

/** Which level a student has reached after finishing this many lessons. */
export const levelFor = (lessons = 0) => AVATAR_LEVELS.reduce((lvl, l) => (lessons >= l.min ? l.level : lvl), 1);

export const AVATARS = [
  { id: 'bunny',   name: 'Bonbon',  kind: 'Bunny',   group: 'girls', bg: '#FDE4EC', blurb: 'Loves new words and carrot cake.' },
  { id: 'kitten',  name: 'Mochi',   kind: 'Kitten',  group: 'girls', bg: '#FFF0DD', blurb: 'Curious, cuddly and always learning.' },
  { id: 'bear',    name: 'Honey',   kind: 'Bear',    group: 'girls', bg: '#FFE9D6', blurb: 'Warm hugs and brave answers.' },
  { id: 'lamb',    name: 'Cloud',   kind: 'Lamb',    group: 'girls', bg: '#EDE7FB', blurb: 'Soft, calm and super smart.' },
  { id: 'fox',     name: 'Ember',   kind: 'Fox',     group: 'girls', bg: '#FFEAD2', blurb: 'Quick, clever and full of ideas.' },
  { id: 'puppy',   name: 'Biscuit', kind: 'Puppy',   group: 'boys',  bg: '#E1F0FB', blurb: 'Never gives up. Fetches new words!' },
  { id: 'panda',   name: 'Boba',    kind: 'Panda',   group: 'boys',  bg: '#E6EDF8', blurb: 'Calm, cool and loves a challenge.' },
  { id: 'dino',    name: 'Rex',     kind: 'Dino',    group: 'boys',  bg: '#DFF4E8', blurb: 'Roars out loud when speaking English.' },
  { id: 'penguin', name: 'Waddle',  kind: 'Penguin', group: 'boys',  bg: '#E2F1FA', blurb: 'Slides into every lesson with a smile.' },
  { id: 'owl',     name: 'Hoot',    kind: 'Owl',     group: 'boys',  bg: '#F1E9FA', blurb: 'Wise, curious and a bit sleepy.' },
];

export const avatarById = (id) => AVATARS.find(a => a.id === id) || null;

// ─── shared drawing pieces (everything is drawn on a 120 x 120 canvas) ───
const OUTLINE = '#55264F';
const INK = '#2A0F30';
const HEAD = 'M14 66 C14 40 34 27 60 27 C86 27 106 40 106 66 C106 90 86 103 60 103 C34 103 14 90 14 66 Z';
const sw = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' };

const GIRL = { flower: '#F2679C', flowerMid: '#FFE08A', scarf: '#7A1F5C', scarfStripe: '#F4A6C4', cap: '#3A1342', cheek: '#FF8FB0' };
const BOY = { flower: '#47B2E6', flowerMid: '#FFE08A', scarf: '#2A7FA6', scarfStripe: '#9DDCF4', cap: '#25356B', cheek: '#FF9DB8' };

function Eyes({ y = 66, gap = 17, rx = 3.6, ry = 4.8, color = INK }) {
  return [-1, 1].map(s => (
    <g key={s}>
      <ellipse cx={60 + s * gap} cy={y} rx={rx} ry={ry} fill={color} />
      <circle cx={60 + s * gap + 1.4} cy={y - 1.9} r="1.5" fill="#fff" />
      <circle cx={60 + s * gap - 1.2} cy={y + 2.3} r="0.8" fill="#fff" />
    </g>
  ));
}
const Cheeks = ({ color, y = 77, x = 31 }) => [-1, 1].map(s => <ellipse key={s} cx={60 + s * (60 - x)} cy={y} rx="7.5" ry="4.6" fill={color} opacity=".6" />);
const Smile = ({ y = 79, color = INK }) => <path d={`M53.5 ${y} Q56.8 ${y + 4.5} 60 ${y + 0.5} Q63.2 ${y + 4.5} 66.5 ${y}`} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
const Shine = () => <ellipse cx="42" cy="42" rx="17" ry="7.5" fill="#fff" opacity=".3" transform="rotate(-22 42 42)" />;
const Head = ({ fill }) => <path d={HEAD} fill={fill} {...sw} />;

// ─── the ten characters: `back` is drawn behind the head, `front` is the face ───
const CHARS = {
  bunny: {
    pal: GIRL,
    back: () => [-1, 1].map(s => (
      <g key={s} transform={`rotate(${s * 11} ${60 + s * 18} 40)`}>
        <ellipse cx={60 + s * 18} cy="25" rx="11" ry="24" fill="#FFF6F9" {...sw} />
        <ellipse cx={60 + s * 18} cy="27" rx="5.2" ry="16" fill="#FFC0D5" />
      </g>
    )),
    front: pal => (<><Head fill="#FFF6F9" /><Shine /><Cheeks color={pal.cheek} /><Eyes /><ellipse cx="60" cy="72" rx="3.6" ry="2.6" fill="#FF8FB0" /><Smile /></>),
  },
  kitten: {
    pal: GIRL,
    back: () => (
      <>
        <polygon points="19,60 25,20 55,36" fill="#FFE2C6" {...sw} /><polygon points="26,50 29,31 45,39" fill="#FFB5C8" />
        <polygon points="101,60 95,20 65,36" fill="#FFE2C6" {...sw} /><polygon points="94,50 91,31 75,39" fill="#FFB5C8" />
      </>
    ),
    front: pal => (
      <>
        <Head fill="#FFE2C6" /><Shine />
        {[-8, 0, 8].map(dx => <path key={dx} d={`M${60 + dx} 35 Q${60 + dx * 0.9} 40 ${60 + dx * 0.7} 44`} fill="none" stroke="#EDA56C" strokeWidth="2.6" strokeLinecap="round" />)}
        {[[24, 74], [27, 79], [96, 74], [93, 79]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" fill="#E5A06A" />)}
        <Cheeks color={pal.cheek} /><Eyes /><path d="M57 71 L63 71 L60 75 Z" fill="#FF8FB0" stroke="#FF8FB0" strokeWidth="1.4" strokeLinejoin="round" /><Smile y={80} />
      </>
    ),
  },
  bear: {
    pal: GIRL,
    back: () => [-1, 1].map(s => (
      <g key={s}><circle cx={60 + s * 33} cy="37" r="14" fill="#EDBC8C" {...sw} /><circle cx={60 + s * 33} cy="38" r="7" fill="#FFD6BF" /></g>
    )),
    front: pal => (
      <>
        <Head fill="#EDBC8C" /><Shine />
        <ellipse cx="60" cy="79" rx="17" ry="12.5" fill="#FFF0DE" /><Cheeks color={pal.cheek} /><Eyes />
        <ellipse cx="60" cy="73" rx="4.6" ry="3.2" fill="#6B3A2A" />
        <path d="M60 76 L60 80 M60 80 Q55.5 85 52.5 81.5 M60 80 Q64.5 85 67.5 81.5" fill="none" stroke="#6B3A2A" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  lamb: {
    pal: GIRL,
    back: () => (
      <>
        {[[-1, 1].map(s => <ellipse key={s} cx={60 + s * 44} cy="64" rx="13" ry="7" fill="#FFD4CC" {...sw} transform={`rotate(${s * 22} ${60 + s * 44} 64)`} />)]}
        {[[34, 36, 14], [60, 29, 15], [86, 36, 14], [24, 52, 12], [96, 52, 12]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#fff" {...sw} />)}
      </>
    ),
    front: pal => (
      <>
        <Head fill="#FFEEE6" /><Shine />
        {[[44, 36, 10], [60, 33, 11], [76, 36, 10]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="#fff" {...sw} />)}
        <Cheeks color={pal.cheek} /><Eyes y={68} /><ellipse cx="60" cy="74" rx="3.4" ry="2.4" fill="#F29BB1" /><Smile y={80} />
      </>
    ),
  },
  fox: {
    pal: GIRL,
    back: () => (
      <>
        <polygon points="18,62 22,18 56,36" fill="#FFAE62" {...sw} /><polygon points="22,31 22,18 33,24" fill="#6B3A2A" /><polygon points="26,52 28,32 46,41" fill="#FFE0C2" />
        <polygon points="102,62 98,18 64,36" fill="#FFAE62" {...sw} /><polygon points="98,31 98,18 87,24" fill="#6B3A2A" /><polygon points="94,52 92,32 74,41" fill="#FFE0C2" />
      </>
    ),
    front: pal => (
      <>
        <Head fill="#FFAE62" /><Shine />
        <path d="M17 74 Q38 64 60 80 Q82 64 103 74 Q98 98 60 103 Q22 98 17 74 Z" fill="#FFF7EE" />
        <Cheeks color={pal.cheek} /><Eyes y={65} /><ellipse cx="60" cy="76" rx="4" ry="2.9" fill={INK} />
        <path d="M60 79 L60 82 M60 82 Q56 86 53 83 M60 82 Q64 86 67 83" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  puppy: {
    pal: BOY,
    back: () => [-1, 1].map(s => (
      <ellipse key={s} cx={60 + s * 42} cy="56" rx="12" ry="23" fill="#B98550" {...sw} transform={`rotate(${s * -16} ${60 + s * 42} 56)`} />
    )),
    front: pal => (
      <>
        <Head fill="#F2E0C4" /><Shine />
        <ellipse cx="78" cy="66" rx="12" ry="11" fill="#B98550" opacity=".9" />
        <ellipse cx="60" cy="80" rx="16" ry="11" fill="#FFF7EA" /><Cheeks color={pal.cheek} /><Eyes />
        <ellipse cx="60" cy="73" rx="5" ry="3.4" fill="#3A1F2B" />
        <path d="M60 76 L60 80 M60 80 Q55 85 52 82 M60 80 Q65 85 68 82" fill="none" stroke="#3A1F2B" strokeWidth="2" strokeLinecap="round" />
        <path d="M57 83 Q60 91 63 83 Z" fill="#FF8FA8" stroke="#3A1F2B" strokeWidth="1.4" strokeLinejoin="round" />
      </>
    ),
  },
  panda: {
    pal: BOY,
    back: () => [-1, 1].map(s => <circle key={s} cx={60 + s * 33} cy="37" r="13.5" fill="#33283A" {...sw} />),
    front: pal => (
      <>
        <Head fill="#FFFFFF" /><Shine />
        {[-1, 1].map(s => <ellipse key={s} cx={60 + s * 17} cy="67" rx="9.5" ry="11.5" fill="#33283A" transform={`rotate(${s * -22} ${60 + s * 17} 67)`} />)}
        <Cheeks color={pal.cheek} />
        {[-1, 1].map(s => (<g key={s}><ellipse cx={60 + s * 17} cy="66.5" rx="3.6" ry="4.8" fill="#fff" /><ellipse cx={60 + s * 17} cy="66.8" rx="2.6" ry="3.6" fill={INK} /><circle cx={60 + s * 17 + 1} cy="65.2" r="1.2" fill="#fff" /></g>))}
        <ellipse cx="60" cy="76" rx="4.6" ry="3" fill="#33283A" /><path d="M60 79 L60 82 M60 82 Q56 86 53 83 M60 82 Q64 86 67 83" fill="none" stroke="#33283A" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  dino: {
    pal: BOY,
    back: () => [[-22, 30, 9], [0, 24, 10], [22, 30, 9]].map(([dx, y, r]) => (
      <polygon key={dx} points={`${60 + dx - r},${y + 10} ${60 + dx},${y - r} ${60 + dx + r},${y + 10}`} fill="#5CBF8A" {...sw} />
    )),
    front: pal => (
      <>
        <Head fill="#A9E6C2" /><Shine />
        {[[38, 46, 3.2], [80, 44, 2.6], [68, 38, 2]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="#7FD0A2" />)}
        <Cheeks color={pal.cheek} /><Eyes />
        {[-1, 1].map(s => <circle key={s} cx={60 + s * 5} cy="72" r="1.2" fill="#3F8F68" />)}
        <path d="M45 78 Q60 94 75 78" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M45 78 Q60 86 75 78" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
  penguin: {
    pal: BOY,
    back: () => [-1, 1].map(s => <ellipse key={s} cx={60 + s * 49} cy="72" rx="8" ry="15" fill="#3F4E7F" {...sw} transform={`rotate(${s * -14} ${60 + s * 49} 72)`} />),
    front: pal => (
      <>
        <Head fill="#3F4E7F" /><ellipse cx="42" cy="42" rx="17" ry="7.5" fill="#fff" opacity=".18" transform="rotate(-22 42 42)" />
        <path d="M60 99 C37 90 29 73 38 62 C47 53 57 58 60 65 C63 58 73 53 82 62 C91 73 83 90 60 99 Z" fill="#FFFFFF" />
        <Cheeks color={pal.cheek} y={78} x={33} /><Eyes y={67} gap={16} />
        <path d="M52 74 Q60 70 68 74 Q66 83 60 84 Q54 83 52 74 Z" fill="#FFA94D" stroke="#E58A2E" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M55 36 Q60 24 65 36" fill="none" stroke="#3F4E7F" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  owl: {
    pal: BOY,
    back: () => (
      <>
        <polygon points="20,56 22,18 52,34" fill="#A9825D" {...sw} />
        <polygon points="100,56 98,18 68,34" fill="#A9825D" {...sw} />
      </>
    ),
    front: pal => (
      <>
        <Head fill="#CDA67F" /><Shine />
        <path d="M60 99 C40 94 32 82 38 74 Q60 64 82 74 C88 82 80 94 60 99 Z" fill="#F1DFC6" opacity=".9" />
        {[-1, 1].map(s => (<g key={s}><circle cx={60 + s * 18} cy="64" r="15" fill="#fff" {...sw} /><circle cx={60 + s * 18 + s * -1} cy="65" r="7.2" fill={INK} /><circle cx={60 + s * 18 + 1.5} cy="62" r="2.4" fill="#fff" /></g>))}
        <path d="M54 76 L66 76 L60 87 Z" fill="#FFA94D" stroke="#E58A2E" strokeWidth="1.4" strokeLinejoin="round" />
        <Cheeks color={pal.cheek} y={82} x={27} />
      </>
    ),
  },
};

// ─── level extras, drawn on top of the character ───
function Flower({ pal, x = 90, y = 44 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-10)`}>
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-6.5" rx="5" ry="6.4" fill={pal.flower} stroke="#fff" strokeWidth="1.2" transform={`rotate(${a})`} />)}
      <circle r="3.4" fill={pal.flowerMid} /><circle r="1.2" fill="#E2A33B" />
    </g>
  );
}
const Scarf = ({ pal }) => (
  <g>
    <path d="M24 92 Q60 112 96 92 L99 103 Q60 125 21 103 Z" fill={pal.scarf} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M30 98 L34 109 M44 103 L47 114 M58 105 L60 116" stroke={pal.scarfStripe} strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M80 104 L86 119 Q92 118 91 111 L88 100 Z" fill={pal.scarf} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
  </g>
);
const Cap = ({ pal }) => (
  <g>
    <path d="M42 36 L42 46 Q60 56 78 46 L78 36 Z" fill={pal.cap} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M26 33 L60 17 L94 33 L60 49 Z" fill={pal.cap} stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M60 33 L92 35 L92 52" fill="none" stroke="#E2B85A" strokeWidth="2" strokeLinecap="round" />
    <rect x="89" y="50" width="6" height="9" rx="2" fill="#E2B85A" stroke={OUTLINE} strokeWidth="1.4" />
    <circle cx="60" cy="33" r="3" fill="#E2B85A" stroke={OUTLINE} strokeWidth="1.2" />
  </g>
);
function Crown({ uid }) {
  return (
    <g>
      <path d="M36 40 L40 14 L51 27 L60 9 L69 27 L80 14 L84 40 Z" fill={`url(#${uid}g)`} stroke="#8F6428" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="36" y="38" width="48" height="7" rx="3" fill={`url(#${uid}g)`} stroke="#8F6428" strokeWidth="2.2" />
      {[[40, 12, '#F2679C'], [60, 7, '#47B2E6'], [80, 12, '#F2679C']].map(([x, y, c]) => <circle key={x} cx={x} cy={y} r="3.1" fill={c} stroke="#fff" strokeWidth="1.2" />)}
      {[48, 60, 72].map(x => <circle key={x} cx={x} cy="41.5" r="1.9" fill="#fff" opacity=".85" />)}
    </g>
  );
}
const Sparkle = ({ x, y, s = 1, color = '#F6E3A6' }) => (
  <path d={`M${x} ${y - 6 * s} Q${x + 1 * s} ${y - 1 * s} ${x + 6 * s} ${y} Q${x + 1 * s} ${y + 1 * s} ${x} ${y + 6 * s} Q${x - 1 * s} ${y + 1 * s} ${x - 6 * s} ${y} Q${x - 1 * s} ${y - 1 * s} ${x} ${y - 6 * s} Z`} fill={color} stroke="#C9A55C" strokeWidth=".8" strokeLinejoin="round" />
);

/**
 * One character at one level, as a round badge. `size` is in pixels.
 * Decorative by default; pass `label` when the picture is the only thing naming it.
 */
export function Avatar({ id, level = 1, size = 48, label, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const meta = avatarById(id);
  const ch = CHARS[id];
  if (!meta || !ch) return null;
  const lv = Math.max(1, Math.min(5, level));
  const { pal } = ch;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  return (
    <svg className={`avatar-art ${className}`.trim()} viewBox="0 0 120 120" width={size} height={size} {...a11y}>
      <defs>
        <clipPath id={`${uid}c`}><circle cx="60" cy="60" r="60" /></clipPath>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FBEAB4" /><stop offset=".5" stopColor="#E9C66B" /><stop offset="1" stopColor="#C9A04A" /></linearGradient>
        <radialGradient id={`${uid}r`} cx=".5" cy=".42" r=".6"><stop offset="0" stopColor="#FFF3C9" stopOpacity=".95" /><stop offset="1" stopColor="#FFF3C9" stopOpacity="0" /></radialGradient>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <rect width="120" height="120" fill={meta.bg} />
        {lv === 5 && <circle cx="60" cy="58" r="58" fill={`url(#${uid}r)`} />}
        {ch.back(pal)}
        {ch.front(pal)}
        {lv >= 3 && <Scarf pal={pal} />}
        {lv === 4 && <Cap pal={pal} />}
        {lv >= 5 && <Crown uid={uid} />}
        {lv >= 2 && <Flower pal={pal} x={lv >= 4 ? 93 : 90} y={lv >= 4 ? 58 : 46} />}
        {lv >= 5 && (<><Sparkle x={16} y={22} s={1.1} /><Sparkle x={104} y={26} s={0.9} /><Sparkle x={101} y={66} s={0.7} /><Sparkle x={19} y={64} s={0.6} /></>)}
      </g>
      {lv >= 5 && <circle cx="60" cy="60" r="58" fill="none" stroke={`url(#${uid}g)`} strokeWidth="4" />}
    </svg>
  );
}

/**
 * A person's picture wherever the app shows one: their character at the level their lessons have reached, or their
 * initials if they have not chosen one yet. `className` is the circle's own class (it sets the size).
 */
export function PersonAvatar({ avatar, lessons = 0, tutor = false, initials = '?', className = 'avatar', style, label }) {
  if (tutor) {
    return <span className={`${className} has-art`} style={style}><TutorAvatar id={avatar} size={96} label={label} /></span>;
  }
  if (avatarById(avatar)) {
    return <span className={`${className} has-art`} style={style}><Avatar id={avatar} level={levelFor(lessons)} size={96} label={label} /></span>;
  }
  return <span className={className} style={style} aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>{initials}</span>;
}

/** For the tutor's pages: every student's chosen character and finished-lesson count, keyed by student id. Quietly empty if the database script has not been run. */
export function useStudentAvatars() {
  const [map, setMap] = useState({});
  useEffect(() => {
    let live = true;
    supabase.rpc('admin_avatars').then(({ data, error }) => {
      if (!live || error || !data) return;
      setMap(Object.fromEntries(data.map(r => [r.student_id, { avatar: r.avatar, lessons: r.lessons_done }])));
    });
    return () => { live = false; };
  }, []);
  return map;
}

/**
 * One of the tutor's five characters (see tutorArt.js): a plum badge with a gold studded ring, deliberately different
 * from the students' pastel animals. Falls back to the Hibiscus Teacher if nothing is chosen yet.
 */
export function TutorAvatar({ id, size = 48, label, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  const key = tutorAvatarById(id) ? id : DEFAULT_TUTOR_AVATAR;
  return <svg className={`avatar-art ${className}`.trim()} viewBox="0 0 120 120" width={size} height={size} {...a11y} dangerouslySetInnerHTML={{ __html: tutorBadge(key, uid) }} />;
}

/** The tutor's chosen character, for students to see in the chat. */
export function useTutorAvatar() {
  const [avatar, setAvatar] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.rpc('tutor_avatar').then(({ data, error }) => { if (live && !error) setAvatar(data || null); });
    return () => { live = false; };
  }, []);
  return avatar;
}
