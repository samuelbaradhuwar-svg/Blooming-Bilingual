import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../components/dashboard/DashHeader';
import { UploadForm, FileList } from '../../components/FileExchange';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import Field from '../../components/ui/Field';
import Icon from '../../components/ui/Icon';
import { SkeletonRows } from '../../components/ui/Skeleton';

// Student: your private file exchange with Neeliën.
// Tutor: every student's exchange, filtered by student (and a shortcut to each student's page).
export default function ResourcesView({ admin = false }) {
  const { currentUser, showToast } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [pick, setPick] = useState('');
  const [tab, setTab] = useState('tutor');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('resources')
      .select('id, uploader_id, student_id, title, category, storage_path, created_at, student:profiles!resources_student_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Could not load files.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!admin) return;
    supabase.rpc('admin_student_overview').then(({ data }) => setStudents(data || []));
  }, [admin]);

  const shown = useMemo(() => (rows || []).filter(r => !admin || !pick || r.student_id === pick), [rows, admin, pick]);

  if (!admin) {
    const fromTutor = shown.filter(r => r.uploader_id !== currentUser.id);
    const mine = shown.filter(r => r.uploader_id === currentUser.id);
    const list = tab === 'tutor' ? fromTutor : mine;
    return (
      <>
        <DashHeader title="Files" />
        <div className="dash-main">
          <p className="fine-print" style={{ margin: '0 0 14px' }}><Icon name="lock" /> Private: only you and Neeliën can see these files.</p>
          <div className="tabs" role="tablist" aria-label="Files">
            {[['tutor', 'From Neeliën', fromTutor.length], ['mine', 'Shared with Neeliën', mine.length]].map(([k, label, n]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                {label}<span className="tab-count">{rows ? n : '–'}</span>
              </button>
            ))}
          </div>
          {rows === null ? <SkeletonRows rows={3} h={64} /> : (
            <div className="card card-pad" role="tabpanel">
              {tab === 'mine' && (
                <>
                  <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', marginBottom: 12 }}>Send Neeliën essays, homework or questions.</p>
                  <UploadForm studentId={currentUser.id} onDone={load} label="Send" wide />
                </>
              )}
              <FileList items={list} who={() => (tab === 'tutor' ? 'From Neeliën' : 'Sent by you')} canDelete={() => tab === 'mine'} onChange={load}
                empty={tab === 'tutor' ? 'Nothing from Neeliën yet' : 'You have not shared anything yet'} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <DashHeader title="Student files" />
      <div className="dash-main">
        <p style={{ fontSize: '.82rem', color: 'var(--ink-muted)', marginBottom: 12 }}>
          Every file is private between one student and you. To send a file to a student, open the student from the Students list.
        </p>
        <Field label="Show files for" style={{ maxWidth: 320 }}>
          {id => (
            <select id={id} value={pick} onChange={e => setPick(e.target.value)}>
              <option value="">All students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
            </select>
          )}
        </Field>
        <div className="card card-pad">
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : (
            <FileList items={shown} showStudent who={r => r.uploader_id === currentUser.id ? 'Sent by you' : 'From student'}
              canDelete={() => true} onChange={load} empty="No files yet." />
          )}
        </div>
        {pick && <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate(`/dashboard/admin-students/${pick}`)}>Open this student →</button>}
      </div>
    </>
  );
}
