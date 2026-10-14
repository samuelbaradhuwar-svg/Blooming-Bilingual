/** A circular score indicator (0–100). The number is in the text, so it never relies on colour alone. */
export default function ProgressRing({ value = 0, size = 76, stroke = 7, label, color = 'var(--plum)' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label ? label + ': ' : ''}${v} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft-pink)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-fill" />
      </svg>
      <span className="ring-num">{v}%</span>
    </div>
  );
}
