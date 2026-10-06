import { useApp } from '../../context/AppContext';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function Toast() {
  const { toast } = useApp();
  return (
    <div role="status" aria-live="polite" className={`toast ${toast.type} ${toast.visible ? 'show' : ''}`}>
      {ICONS[toast.type] || 'ℹ️'} {toast.msg}
    </div>
  );
}
