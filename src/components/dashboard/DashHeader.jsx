import { useBurger } from './DashLayout';
import Icon from '../ui/Icon';

export default function DashHeader({ title, children }) {
  const toggleSidebar = useBurger();
  return (
    <div className="dash-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <button className="dash-burger" onClick={toggleSidebar} aria-label="Open menu"><Icon name="menu" /></button>
        <h1>{title}</h1>
      </div>
      {children && <div className="dash-header-actions">{children}</div>}
    </div>
  );
}
