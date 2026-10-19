import { useNavigate } from 'react-router-dom';
import { useBurger } from './DashLayout';
import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';

export default function DashHeader({ title, children }) {
  const toggleSidebar = useBurger();
  const navigate = useNavigate();
  const { currentUser, chatUnread } = useApp();
  const isTutor = currentUser?.role === 'admin';
  const label = isTutor ? 'Messages' : 'Chat with Neeliën';

  return (
    <div className="dash-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <button className="dash-burger" onClick={toggleSidebar} aria-label="Open menu"><Icon name="menu" /></button>
        <h1>{title}</h1>
      </div>
      <div className="dash-header-actions">
        {currentUser && (
          <button
            type="button"
            className={`bell ${chatUnread > 0 ? 'has-unread' : ''}`}
            onClick={() => navigate(isTutor ? '/dashboard/admin-messages' : '/dashboard/chat')}
            aria-label={chatUnread > 0 ? `${label}: ${chatUnread} unread message${chatUnread > 1 ? 's' : ''}` : label}
            title={label}
          >
            <Icon name="chat" weight={chatUnread > 0 ? 'fill' : 'regular'} />
            {chatUnread > 0 && <span className="bell-badge" aria-hidden="true">{chatUnread > 9 ? '9+' : chatUnread}</span>}
          </button>
        )}
        {currentUser && (
          <button type="button" className="header-avatar" onClick={() => navigate('/dashboard/profile')} aria-label="Your profile" title="Your profile" style={{ background: currentUser.color }}>
            {currentUser.initials}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
