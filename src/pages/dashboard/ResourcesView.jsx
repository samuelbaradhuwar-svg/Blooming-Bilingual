import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../components/dashboard/DashHeader';
import { UploadForm, FileList } from '../../components/FileExchange';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

// Student: your private file exchange with Neeliën.
// Tutor: every student's exchange, filtered by student (and a shortcut to each student's page).
export default function ResourcesView({ admin = false }) {
  const { currentUser, showToast } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [pick, setPick] = useState('');

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
    return (
      <>
        <DashHeader title="Resources" />
        <div className="dash-main">
          {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : (
            <>
              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 4 }}>From Neeliën</div>
                <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Material Neeliën sends just to you.</p>
                <FileList items={fromTutor} who={() => 'From Neeliën'} canDelete={() => false} onChange={load} empty="Nothing from Neeliën yet." />
              </div>
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 4 }}>Send to Neeliën</div>
                <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Essays, homework or questions. Only you and Neeliën can see your files.</p>
                <UploadForm studentId={currentUser.id} onDone={load} label="⬆ Send" />
                <FileList items={mine} who={() => 'Sent by you'} canDelete={() => true} onChange={load} empty="You haven't sent anything yet." />
              </div>
            </>
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
        <div className="form-group" style={{ maxWidth: 320 }}>
          <label>Show files for</label>
          <select value={pick} onChange={e => setPick(e.target.value)}>
            <option value="">All students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
        </div>
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
