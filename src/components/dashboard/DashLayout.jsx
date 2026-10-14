import { createContext, useContext, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Sidebar, { STUDENT_NAV } from './Sidebar';
import Icon from '../ui/Icon';

// Short labels for the phone tab bar (the sidebar keeps the longer ones).
const TAB_LABELS = { home: 'Home', booking: 'Book', lessons: 'Lessons', resources: 'Files', credits: 'Credits', progress: 'Progress' };

const BurgerCtx = createContext(() => {});
export const useBurger = () => useContext(BurgerCtx);

export default function DashLayout({ activeView, onSwitch, children }) {
  const { currentUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStudent = currentUser?.role !== 'admin';

  return (
    <div className={`dash-layout ${isStudent ? 'has-tabs' : ''}`}>
      <Sidebar
        activeView={activeView}
        onSwitch={onSwitch}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dash-content">
        <BurgerCtx.Provider value={() => setSidebarOpen(o => !o)}>
          {children}
        </BurgerCtx.Provider>
      </div>

      {/* Students on a phone get one-tap navigation along the bottom */}
      {isStudent && (
        <nav className="bottom-tabs" aria-label="Student sections">
          {STUDENT_NAV.map(item => (
            <button
              key={item.view}
              className={`tab-link ${activeView === item.view ? 'active' : ''}`}
              onClick={() => onSwitch(item.view)}
              aria-current={activeView === item.view ? 'page' : undefined}
            >
              <Icon name={item.icon} weight={activeView === item.view ? 'fill' : 'regular'} />
              {TAB_LABELS[item.view]}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
