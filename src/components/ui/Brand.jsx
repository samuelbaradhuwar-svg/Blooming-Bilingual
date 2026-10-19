import { Link } from 'react-router-dom';
import { BRAND } from '../../data/brand';
import {
  MARK_B, FLOWER_DETAIL, FLOWER_SIMPLE, BUBBLES, MARK_WIDTH, MARK_HEIGHT, BUBBLES_WIDTH, BUBBLES_HEIGHT,
} from './logoPaths';

/**
 * The official logo (from the Figma brand file): a B with a hibiscus, a spaced wordmark, and an optional tagline.
 * The artwork itself lives in logoPaths.js. Every place the brand appears uses these components, so a logo change
 * is made once, there.
 *
 * Colour pairs [the B, the flower] follow the brand sheet:
 *   plum  - for light backgrounds (cream, white, soft pink)
 *   light - for dark backgrounds (deep plum): cream B
 *   ink   - deep plum B with a cream flower, for blush backgrounds
 *   blush - blush B with a cream flower, for plum backgrounds
 */
const SCHEMES = {
  plum: ['#7A1F5C', '#E898B7'],
  light: ['#F7F3F3', '#E898B7'],
  ink: ['#280E2D', '#F7F3F3'],
  blush: ['#E898B7', '#F7F3F3'],
};

/** The mark on its own. `size` is its height in pixels; the detailed flower is used when it is large enough to be seen. */
export function BrandMark({ size = 40, tone = 'plum', detail, className = '', title }) {
  const [b, flower] = SCHEMES[tone] || SCHEMES.plum;
  const detailed = detail ?? size >= 72;
  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}
      height={size}
      width={(size * MARK_WIDTH) / MARK_HEIGHT}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={MARK_B} fill={b} />
      <path fillRule="evenodd" clipRule="evenodd" d={detailed ? FLOWER_DETAIL : FLOWER_SIMPLE} fill={flower} />
    </svg>
  );
}

/** The little "translate" speech-bubble symbol. Takes the colour of the text around it. */
export function TranslateBubbles({ height = 16, className = '' }) {
  return (
    <svg className={`brand-bubbles ${className}`.trim()} viewBox={`0 0 ${BUBBLES_WIDTH} ${BUBBLES_HEIGHT}`} height={height} width={(height * BUBBLES_WIDTH) / BUBBLES_HEIGHT} aria-hidden="true" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d={BUBBLES} fill="currentColor" />
    </svg>
  );
}

/**
 * The horizontal lockup: mark, then THE / BLOOMING / BILINGUAL. `size` is the mark's height in pixels, and the words
 * scale with it. Small lockups (nav, sidebar) drop the tiny "THE" so everything stays readable; `tagline` adds the
 * "Learn . Connect . Succeed" line and is meant for large placements such as the footer.
 * `tone="light"` is for dark backgrounds. `as="div"` when it must not be a link.
 */
export default function Brand({ to = '/', tone = 'dark', size = 46, showName = true, tagline = false, as, onClick, className = '' }) {
  const light = tone === 'light';
  const compact = size < 60;
  const inner = (
    <>
      <BrandMark size={size} tone={light ? 'light' : 'plum'} />
      {showName && (
        <>
          {!compact && <span className="brand-rule" aria-hidden="true" />}
          <span className="brand-words" aria-hidden="true">
            {!compact && <span className="bw-the">THE</span>}
            <span className="bw-main">BLOOMING</span>
            <span className="bw-sub">BILINGUAL</span>
            {tagline && (
              <span className="bw-tag"><TranslateBubbles height={size * 0.127} /> LEARN <i>·</i> CONNECT <i>·</i> SUCCEED</span>
            )}
          </span>
        </>
      )}
    </>
  );
  const cls = `brand ${light ? 'brand-light' : ''} ${compact ? 'is-compact' : ''} ${className}`.trim();
  const style = { '--h': `${size}px` };
  if (as === 'div') return <div className={cls} style={style} role="img" aria-label={BRAND.name}>{inner}</div>;
  return <Link to={to} className={cls} style={style} onClick={onClick} aria-label={`${BRAND.name}, home`}>{inner}</Link>;
}
