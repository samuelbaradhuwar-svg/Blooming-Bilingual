import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { shortDateIn, timeIn } from '../../../lib/time';
import AdjustCredits from './AdjustCredits';
import Field from '../../../components/ui/Field';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonRows } from '../../../components/ui/Skeleton';

export default function AdminStudents() {
  const { currentUser, openModal, showToast } = useApp();
  const navigate = useNavigate();
  const tz = currentUser?.timezone || 'UTC';
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_student_overview');
    if (error) { showToast('Could not load students.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter(r => !s || `${r.full_name} ${r.email} ${r.country || ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const open = (r) => navigate(`/dashboard/admin-students/${r.id}`);

  return (
    <>
      <DashHeader title="Students" />
      <div className="dash-main">
        <Field label="Search students" style={{ maxWidth: 380 }}>
          {id => <input id={id} type="search" placeholder="Name, email or country…" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" spellCheck={false} />}
        </Field>
        <div className="card card-pad">
          {rows === null ? <SkeletonRows rows={3} h={64} /> : shown.length === 0 ? (
            <EmptyState compact title={rows.length ? 'No matches' : 'No students yet'}>{rows.length ? 'Try a different name, email or country.' : 'Students appear here as soon as they create an account.'}</EmptyState>
          ) : shown.map(r => (
            <div key={r.id} className="student-row" role="link" tabIndex={0} aria-label={`Open ${r.full_name || r.email}`}
              onClick={() => open(r)}
              onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(r); } }}>
              <span className="avatar" aria-hidden="true">{initials(r.full_name || r.email)}</span>
              <div className="hw-info" style={{ minWidth: 0 }}>
                <strong>{r.full_name || '(no name)'} {r.english_level && <span className="chip chip-green" style={{ marginLeft: 6 }}>{r.english_level}</span>}</strong>
                <span>{r.email} · {r.country || 'Country not set'} · {(r.timezone || '').replace(/_/g, ' ')}</span>
                <span>
                  {r.lessons_booked} lesson{r.lessons_booked === 1 ? '' : 's'} booked
                  {r.next_lesson && ` · next ${shortDateIn(tz, new Date(r.next_lesson))} ${timeIn(tz, new Date(r.next_lesson))}`}
                </span>
              </div>
              <span className={`credit-pill ${r.credits > 0 ? '' : 'is-empty'}`}>{r.credits}<small>credits</small></span>
              <span className="row-actions">
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openModal('Adjust credits', <AdjustCredits student={r} onDone={load} />); }}>Adjust</button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
