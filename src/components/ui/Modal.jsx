import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function Modal() {
  const { modal, closeModal } = useApp();

  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal.open, closeModal]);

  return (
    <div
      className={`modal-overlay ${modal.open ? 'open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
      aria-hidden={!modal.open}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={modal.title}>
        <div className="modal-header">
          <span className="modal-title">{modal.title}</span>
          <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
        </div>
        {modal.open && modal.content}
      </div>
    </div>
  );
}
