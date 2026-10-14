import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import ChatThread from '../../../components/ChatThread';
import Field from '../../../components/ui/Field';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { shortDateIn, timeIn, dateKeyIn } from '../../../lib/time';

const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// Neeliën's inbox: every learner conversation, newest first, with unread counts. `id` is the open student (from the address).
export default function AdminChat({ id }) {
  const { currentUser, showToast } = useApp();
  const navigate = useNavigate();
  const tz = currentUser?.timezone || 'UTC';
  const [convos, setConvos] = useState(null);
  const [students, setStudents] = useState([]);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([supabase.rpc('chat_overview'), supabase.rpc('admin_student_overview')]);
    if (c.error) { showToast('Could not load the messages.', 'error'); setConvos([]); return; }
    setConvos(c.data);
    setStudents(s.data || []);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  // Keep the list fresh as messages arrive or get read.
  useEffect(() => {
    const ch = supabase.channel('chat-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => load())
      .subscribe();
    const poll = setInterval(load, 30000);
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [load]);

  const open = (sid) => navigate(`/dashboard/admin-messages/${sid}`);
  const person = useMemo(() => {
    const c = (convos || []).find(x => x.student_id === id);
    const s = students.find(x => x.id === id);
    return { name: c?.full_name || s?.full_name || 'Student', email: c?.email || s?.email || '' };
  }, [convos, students, id]);
  const withoutChat = students.filter(s => !(convos || []).some(c => c.student_id === s.id));

  const when = (iso) => {
    const d = new Date(iso);
    return dateKeyIn(tz, d) === dateKeyIn(tz, new Date()) ? timeIn(tz, d) : shortDateIn(tz, d);
  };

  return (
    <>
      <DashHeader title="Messages" />
      <div className="dash-main">
        <div className={`inbox ${id ? 'has-thread' : ''}`}>
          <div>
            <div className="convo-list" aria-label="Conversations">
              {convos === null ? <div style={{ padding: 14 }}><SkeletonRows rows={3} h={56} /></div>
                : convos.length === 0 ? (
                  <EmptyState compact title="No conversations yet">When a student writes to you, it appears here.</EmptyState>
                ) : convos.map(c => (
                  <button key={c.student_id} type="button" className={`convo ${c.unread ? 'unread' : ''} ${c.student_id === id ? 'active' : ''}`} onClick={() => open(c.student_id)} aria-current={c.student_id === id ? 'true' : undefined}>
                    <span className="avatar" aria-hidden="true">{initials(c.full_name || c.email)}</span>
                    <span className="convo-name">{c.full_name || c.email}</span>
                    <span className="convo-time">{when(c.last_at)}</span>
                    <span className="convo-preview">{c.last_from_student ? '' : 'You: '}{c.last_body}</span>
                    {c.unread > 0 && <span className="convo-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                  </button>
                ))}
            </div>
            {withoutChat.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Field label="Start a new conversation">
                  {fid => (
                    <select id={fid} value="" onChange={e => e.target.value && open(e.target.value)}>
                      <option value="">Choose a student…</option>
                      {withoutChat.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
                    </select>
                  )}
                </Field>
              </div>
            )}
          </div>

          <div className="thread-pane">
            {id ? (
              <>
                <div className="thread-head">
                  <button type="button" className="btn btn-ghost btn-sm btn-back" onClick={() => navigate('/dashboard/admin-messages')} aria-label="Back to all conversations"><Icon name="back" /> All</button>
                  <span className="avatar" aria-hidden="true">{initials(person.name)}</span>
                  <h2>{person.name}<small>{person.email}</small></h2>
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/dashboard/admin-students/${id}`)}>View profile</button>
                </div>
                <ChatThread key={id} studentId={id} otherName={person.name} />
              </>
            ) : (
              <div className="card card-pad"><EmptyState title="Select a conversation">Choose a student on the left to read and reply.</EmptyState></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
