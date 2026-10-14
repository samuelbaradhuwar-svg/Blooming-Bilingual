import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from './Icon';

export default function Modal() {
  const { modal, closeModal } = useApp();
  const panel = useRef(null);

  useEffect(() => {
    if (!modal.open) return undefined;
    const opener = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    // Move keyboard focus into the dialog, and give it back when it closes.
    const t = setTimeout(() => panel.current?.querySelector('input, select, textarea, button:not(.modal-close)')?.focus({ preventScroll: true })
      ?? panel.current?.querySelector('.modal-close')?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, [modal.open, closeModal]);

  return (
    <div
      className={`modal-overlay ${modal.open ? 'open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
      aria-hidden={!modal.open}
    >
      <div className="modal" ref={panel} role="dialog" aria-modal="true" aria-label={modal.title}>
        <div className="modal-header">
          <span className="modal-title">{modal.title}</span>
          <button className="modal-close" onClick={closeModal} aria-label="Close"><Icon name="close" /></button>
        </div>
        {modal.open && modal.content}
      </div>
    </div>
  );
}
