import { useApp } from '../../context/AppContext';
import Icon from './Icon';

const ICONS = { success: 'success', error: 'error', info: 'info' };

export default function Toast() {
  const { toast } = useApp();
  return (
    <div role="status" aria-live="polite" className={`toast ${toast.type} ${toast.visible ? 'show' : ''}`}>
      <Icon name={ICONS[toast.type] || 'info'} weight="fill" />
      <span>{toast.msg}</span>
    </div>
  );
}
