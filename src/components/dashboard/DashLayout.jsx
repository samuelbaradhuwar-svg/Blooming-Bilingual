import { useState } from 'react';
import Sidebar from './Sidebar';

export default function DashLayout({ activeView, onSwitch, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dash-layout">
      <Sidebar
        activeView={activeView}
        onSwitch={onSwitch}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dash-content">
        {/* Inject burger toggle into children via a wrapper header */}
        <DashHeaderWrapper onBurger={() => setSidebarOpen(o => !o)}>
          {children}
        </DashHeaderWrapper>
      </div>
    </div>
  );
}

/* Wraps the active view and injects a burger button into the first .dash-header via React context */
import { createContext, useContext } from 'react';
const BurgerCtx = createContext(() => {});
export const useBurger = () => useContext(BurgerCtx);

function DashHeaderWrapper({ onBurger, children }) {
  return <BurgerCtx.Provider value={onBurger}>{children}</BurgerCtx.Provider>;
}
