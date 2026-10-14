import Hibiscus from './Hibiscus';

/** A calm empty state: tells people what belongs here and what to do next. */
export default function EmptyState({ title, children, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'is-compact' : ''}`}>
      <Hibiscus variant="line" size={compact ? 52 : 72} className="empty-art" />
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
