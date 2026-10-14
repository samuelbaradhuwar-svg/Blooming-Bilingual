import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminMessages() {
  const { showToast } = useApp();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('unread');
  const [open, setOpen] = useState(null);

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
  const shown = (rows || []).filter(m => filter === 'all' || (filter === 'unread' ? !m.is_read : m.is_read));
  const counts = { unread, read: (rows || []).length - unread, all: (rows || []).length };

  return (
    <>
      <DashHeader title="Messages" />
      <div className="dash-main">
        <div className="tabs" role="tablist" aria-label="Filter messages">
          {[['unread', 'Unread'], ['read', 'Read'], ['all', 'All']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
              {label}<span className="tab-count">{rows ? counts[k] : '–'}</span>
            </button>
          ))}
        </div>
        <div className="card card-pad">
          {rows === null ? <SkeletonRows rows={3} h={70} />
            : shown.length === 0 ? (
              <EmptyState compact title={filter === 'unread' ? 'You are all caught up' : 'No messages here'}>New messages from the Contact page appear here.</EmptyState>
            ) : shown.map(m => (
              <article key={m.id} className={`msg ${m.is_read ? '' : 'unread'}`}>
                <div className="msg-head">
                  <span className="msg-from">{!m.is_read && <span className="msg-dot" title="Unread" />}{m.name} <small style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>{m.email}</small></span>
                  <time className="fine-print" style={{ margin: 0 }} dateTime={m.created_at}>{when(m.created_at)}</time>
                </div>
                <div className="msg-subject">{m.subject}</div>
                <p className={`msg-body ${open === m.id ? '' : 'is-clamped'}`}>{m.message}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => reply(m)}><Icon name="mail" /> Reply</button>
                  {m.message.length > 110 && <button className="btn btn-ghost btn-sm" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? 'Show less' : 'Read all'}</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleRead(m)}>{m.is_read ? 'Mark as new' : 'Mark as read'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(m)} aria-label={`Delete message from ${m.name}`}><Icon name="trash" /> Delete</button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </>
  );
}
