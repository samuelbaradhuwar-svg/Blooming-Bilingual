import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { dateKeyIn, longDateIn, timeIn } from '../lib/time';
import Icon from './ui/Icon';
import EmptyState from './ui/EmptyState';
import { SkeletonRows } from './ui/Skeleton';

const MAX = 2000;

/**
 * One student <-> tutor conversation. Used by the student's Chat tab, the tutor's Messages tab and the
 * chat card on a student's profile. `studentId` is whose conversation it is (a student's own id, from their side).
 * New messages arrive live; if live updates are ever unavailable it quietly checks every few seconds instead.
 */
export default function ChatThread({ studentId, otherName, compact = false }) {
  const { currentUser, showToast, refreshChatUnread } = useApp();
  const me = currentUser.id;
  const isTutor = currentUser.role === 'admin';
  const tz = currentUser.timezone || 'UTC';
  const [msgs, setMsgs] = useState(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const listRef = useRef(null);
  const boxRef = useRef(null);
  const stick = useRef(true);   // keep the view pinned to the newest message while the reader is at the bottom

  const markRead = useCallback(async () => {
    const { error } = await supabase.rpc('mark_chat_read', isTutor ? { p_student_id: studentId } : {});
    if (!error) refreshChatUnread();
  }, [isTutor, studentId, refreshChatUnread]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('chat_messages')
      .select('id, sender_id, body, created_at, read_at')
      .eq('student_id', studentId).order('created_at', { ascending: false }).limit(200);
    if (error) { setFailed(true); setMsgs(cur => cur ?? []); return; }
    setFailed(false);
    setMsgs([...data].reverse());
    return data;
  }, [studentId]);

  // Open the conversation: load it, then mark what the other person sent as read.
  useEffect(() => {
    setMsgs(null); stick.current = true;
    let alive = true;
    load().then(d => { if (alive && d?.some(m => m.sender_id !== me && !m.read_at)) markRead(); });
    return () => { alive = false; };
  }, [studentId, load, markRead, me]);

  // Live delivery.
  useEffect(() => {
    const filter = `student_id=eq.${studentId}`;
    const channel = supabase.channel(`chat-thread-${studentId}-${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter }, ({ new: m }) => {
        setMsgs(cur => (cur && !cur.some(x => x.id === m.id) ? [...cur, m] : cur));
        if (m.sender_id !== me && document.visibilityState === 'visible') markRead();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter }, ({ new: m }) => {
        setMsgs(cur => cur && cur.map(x => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [studentId, me, markRead]);

  // Safety net: without a live connection, check for news every few seconds; also when the tab is revisited.
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const d = await load();
      if (d?.some(m => m.sender_id !== me && !m.read_at)) markRead();
    };
    const timer = live ? null : setInterval(tick, 6000);
    document.addEventListener('visibilitychange', tick);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [live, load, markRead, me]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && msgs && (stick.current || msgs[msgs.length - 1]?.sender_id === me)) el.scrollTop = el.scrollHeight;
  }, [msgs, me]);

  // Grow the box as people type, up to a limit.
  useEffect(() => {
    const el = boxRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }
  }, [text]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.rpc('send_chat_message', isTutor ? { p_body: body, p_student_id: studentId } : { p_body: body });
    setSending(false);
    if (error) { showToast(error.message || 'Your message could not be sent.', 'error'); return; }
    setText(''); stick.current = true;
    await load();
    boxRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const onScroll = (e) => {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // The last of my messages that the other person has read gets a small "Seen".
  const lastSeenId = msgs ? [...msgs].reverse().find(m => m.sender_id === me && m.read_at)?.id : null;

  let lastDay = null;
  return (
    <div className={`chat ${compact ? 'is-compact' : ''}`}>
      <div className="chat-list" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label={`Conversation${otherName ? ` with ${otherName}` : ''}`}>
        {msgs === null ? <SkeletonRows rows={3} h={46} />
          : failed && msgs.length === 0 ? (
            <EmptyState compact title="Chat is being set up">Please check back soon.</EmptyState>
          ) : msgs.length === 0 ? (
            <EmptyState compact title={isTutor ? 'No messages yet' : 'Ask Neeliën anything'}>
              {isTutor ? 'Say hello below to start the conversation.' : 'Questions about a lesson, your homework or your goals? Write below and she will reply here.'}
            </EmptyState>
          ) : msgs.map(m => {
            const d = new Date(m.created_at);
            const day = dateKeyIn(tz, d);
            const sep = day !== lastDay ? <div className="chat-day"><span>{longDateIn(tz, d)}</span></div> : null;
            lastDay = day;
            const mine = m.sender_id === me;
            return (
              <div key={m.id}>
                {sep}
                <div className={`bubble-row ${mine ? 'mine' : ''}`}>
                  <div className="bubble">
                    <p>{m.body}</p>
                    <time dateTime={m.created_at}>{timeIn(tz, d)}</time>
                  </div>
                </div>
                {m.id === lastSeenId && <div className="seen" aria-label="Seen"><Icon name="check" weight="bold" /> Seen</div>}
              </div>
            );
          })}
      </div>

      <div className="chat-composer">
        <label htmlFor={`chat-box-${studentId}`} className="sr-only">Write a message</label>
        <textarea
          id={`chat-box-${studentId}`}
          ref={boxRef}
          rows={1}
          value={text}
          maxLength={MAX}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isTutor ? 'Write a reply…' : 'Write your question…'}
          autoComplete="off"
        />
        <button type="button" className="btn btn-primary chat-send" onClick={send} disabled={sending || !text.trim()} aria-label="Send message">
          {sending ? 'Sending…' : <><Icon name="send" weight="fill" /> <span className="chat-send-text">Send</span></>}
        </button>
      </div>
      <div className="chat-hint">
        <span>Enter to send · Shift + Enter for a new line</span>
        {text.length > MAX - 300 && <span className={text.length >= MAX ? 'is-limit' : ''}>{text.length}/{MAX}</span>}
      </div>
    </div>
  );
}
