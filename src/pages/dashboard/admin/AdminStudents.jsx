import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { shortDateIn, timeIn } from '../../../lib/time';
import AdjustCredits from './AdjustCredits';

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

  return (
    <>
      <DashHeader title="Students" />
      <div className="dash-main">
        <div className="form-group" style={{ maxWidth: 360 }}>
          <input placeholder="Search by name, email or country" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="card card-pad">
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : shown.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>{rows.length ? 'No matches.' : 'No students have signed up yet.'}</p>
          ) : shown.map(r => (
            <div key={r.id} className="hw-item" style={{ flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin-students/${r.id}`)}>
              <div className="hw-info" style={{ flex: 1, minWidth: 200 }}>
                <strong>{r.full_name || '(no name)'} {r.english_level && <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: 'var(--green-bg)', color: '#15803d', marginLeft: 6 }}>{r.english_level}</span>}</strong>
                <span>{r.email} · {r.country || 'Country not set'} · {(r.timezone || '').replace(/_/g, ' ')}</span>
                <span>
                  {r.lessons_booked} lesson{r.lessons_booked === 1 ? '' : 's'}
                  {r.next_lesson && ` · next ${shortDateIn(tz, new Date(r.next_lesson))} ${timeIn(tz, new Date(r.next_lesson))}`}
                </span>
              </div>
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, color: r.credits > 0 ? 'var(--navy)' : 'var(--red)' }}>{r.credits}</div>
                <div style={{ fontSize: '.66rem', color: 'var(--ink-muted)' }}>credits</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openModal('Adjust credits', <AdjustCredits student={r} onDone={load} />); }}>Adjust</button>
              <span style={{ color: 'var(--ink-muted)' }}>→</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
