import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminMessages() {
  const { showToast } = useApp();
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('contact_messages')
      .select('id, name, email, subject, message, is_read, created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) { showToast('Could not load messages.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const toggleRead = async (m) => {
    const { error } = await supabase.from('contact_messages').update({ is_read: !m.is_read }).eq('id', m.id);
    if (error) { showToast(error.message, 'error'); return; }
    setRows(rs => rs.map(r => r.id === m.id ? { ...r, is_read: !m.is_read } : r));
    window.dispatchEvent(new Event('messages-changed'));
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', m.id);
    if (error) { showToast(error.message, 'error'); return; }
    setRows(rs => rs.filter(r => r.id !== m.id));
    window.dispatchEvent(new Event('messages-changed'));
  };

  const reply = (m) => {
    const subject = encodeURIComponent(`Re: ${m.subject}`);
    window.location.href = `mailto:${m.email}?subject=${subject}`;
    if (!m.is_read) toggleRead(m);
  };

  const unread = (rows || []).filter(m => !m.is_read).length;

  return (
    <>
      <DashHeader title="Messages" />
      <div className="dash-main">
        <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)', marginBottom: 12 }}>
          Messages from the Contact page. Click <strong>Reply</strong> to answer by email.
        </p>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 8 }}>Inbox{rows ? ` (${rows.length}${unread ? ` · ${unread} new` : ''})` : ''}</div>
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p>
            : rows.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No messages yet. ✨</p>
            : rows.map(m => (
              <div key={m.id} style={{ padding: '14px 0', borderTop: '1px solid var(--border-soft, rgba(0,0,0,.07))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div>
                    <strong style={{ fontSize: '.92rem' }}>{!m.is_read && <span title="New" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--rose, #D4608A)', marginRight: 6 }} />}{m.name}</strong>
                    <span style={{ fontSize: '.8rem', color: 'var(--ink-muted)' }}> · {m.email}</span>
                  </div>
                  <span style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>{when(m.created_at)}</span>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--ink-muted)', margin: '2px 0 6px' }}>{m.subject}</div>
                <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', margin: '0 0 10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.message}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => reply(m)}>✉️ Reply</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleRead(m)}>{m.is_read ? 'Mark as new' : 'Mark as read'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(m)}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
