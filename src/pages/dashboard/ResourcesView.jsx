import { useCallback, useEffect, useState } from 'react';
import DashHeader from '../../components/dashboard/DashHeader';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { openResource, uploadResource, deleteResource } from '../../lib/resources';

const CATEGORIES = ['', 'Grammar', 'Vocabulary', 'IELTS', 'Listening', 'Writing', 'Homework', 'Other'];

function UploadForm({ visibility, onDone }) {
  const { currentUser, showToast } = useApp();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    const err = await uploadResource({ file, title: title.trim(), category, uploaderId: currentUser.id, visibility });
    setBusy(false);
    if (err) { showToast(err, 'error'); return; }
    showToast('File uploaded.', 'success');
    setFile(null); setTitle(''); setCategory(''); e.target.reset(); onDone();
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
      <label style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>File (max 10 MB)<br />
        <input type="file" onChange={e => { const f = e.target.files[0]; setFile(f || null); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '')); }} />
      </label>
      <label style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>Title<br />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Essay draft" style={{ maxWidth: 220 }} />
      </label>
      <label style={{ fontSize: '.75rem', color: 'var(--ink-muted)' }}>Category<br />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ maxWidth: 160 }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
        </select>
      </label>
      <button className="btn btn-primary btn-sm" disabled={!file || busy}>{busy ? 'Uploading…' : '⬆ Upload'}</button>
    </form>
  );
}

function List({ items, canDelete, showOwner, onChange, empty }) {
  const { showToast } = useApp();
  const open = async (r) => { const err = await openResource(r); if (err) showToast(err, 'error'); };
  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const err = await deleteResource(r);
    if (err) showToast(err, 'error'); else onChange();
  };
  if (items.length === 0) return <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>{empty}</p>;
  return items.map(r => (
    <div key={r.id} className="hw-item">
      <div className="hw-info" style={{ flex: 1 }}>
        <strong>{r.title}</strong>
        <span>{[r.category, showOwner && r.profiles?.full_name, new Date(r.created_at).toLocaleDateString()].filter(Boolean).join(' · ')}</span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => open(r)}>{r.external_url ? 'Open' : '↓ Download'}</button>
      {canDelete(r) && <button className="btn btn-ghost btn-sm" onClick={() => remove(r)}>Delete</button>}
    </div>
  ));
}

export default function ResourcesView({ admin = false }) {
  const { currentUser, showToast } = useApp();
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('resources')
      .select('id, uploader_id, title, category, storage_path, external_url, visibility, created_at, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Could not load resources.', 'error'); setRows([]); return; }
    setRows(data);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const mine = (r) => r.uploader_id === currentUser.id;
  const shared = (rows || []).filter(r => r.visibility === 'all_students');
  const fromStudents = (rows || []).filter(r => r.visibility === 'private' && !mine(r));
  const myUploads = (rows || []).filter(r => r.visibility === 'private' && mine(r));

  return (
    <>
      <DashHeader title="Resources" />
      <div className="dash-main">
        {rows === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : admin ? (
          <>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 4 }}>Shared with all students</div>
              <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Every student can see and download these.</p>
              <UploadForm visibility="all_students" onDone={load} />
              <List items={shared} canDelete={() => true} onChange={load} empty="Nothing shared yet." />
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 4 }}>Uploaded by students ({fromStudents.length})</div>
              <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Only you can see these.</p>
              <List items={fromStudents} showOwner canDelete={() => false} onChange={load} empty="No student uploads yet." />
            </div>
          </>
        ) : (
          <>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>From Neeliën</div>
              <List items={shared} canDelete={() => false} onChange={load} empty="Neeliën hasn't shared anything yet." />
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 4 }}>My uploads</div>
              <p style={{ fontSize: '.8rem', color: 'var(--ink-muted)', marginBottom: 12 }}>Send essays, homework or questions to Neeliën. Only you and she can see these.</p>
              <UploadForm visibility="private" onDone={load} />
              <List items={myUploads} canDelete={() => true} onChange={load} empty="You haven't uploaded anything yet." />
            </div>
          </>
        )}
      </div>
    </>
  );
}
