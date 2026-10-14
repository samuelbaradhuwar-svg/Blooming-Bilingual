import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useEffect } from 'react';
import { downloadResource, previewResource, uploadResource, deleteResource } from '../lib/resources';
import Icon from './ui/Icon';
import EmptyState from './ui/EmptyState';

const CATEGORIES = ['', 'Grammar', 'Vocabulary', 'IELTS', 'Listening', 'Writing', 'Homework', 'Other'];

// Upload box: sends a file into ONE student's private exchange with the tutor.
export function UploadForm({ studentId, onDone, label = 'Upload', wide = false }) {
  const { currentUser, showToast } = useApp();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !studentId) return;
    setBusy(true);
    const err = await uploadResource({ file, title: title.trim(), category, uploaderId: currentUser.id, studentId });
    setBusy(false);
    if (err) { showToast(err, 'error'); return; }
    showToast('File sent.', 'success');
    setFile(null); setTitle(''); setCategory(''); e.target.reset(); onDone();
  };

  return (
    <form onSubmit={submit} className={`upload-form ${wide ? 'is-wide' : ''}`}>
      <label className="upload-drop">
        <Icon name="upload" />
        <span className="upload-drop-text"><strong>{file ? file.name : 'Choose a file'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Up to 10 MB'}</small></span>
        <input type="file" className="sr-only" onChange={e => { const f = e.target.files[0]; setFile(f || null); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '')); }} />
      </label>
      <label className="upload-field">Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Essay draft" autoComplete="off" />
      </label>
      <label className="upload-field">Category
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || 'None'}</option>)}
        </select>
      </label>
      <button className="btn btn-primary" disabled={!file || busy || !studentId}>{busy ? 'Sending…' : <><Icon name="upload" /> {label}</>}</button>
    </form>
  );
}

// In-page preview (no new tab, so nothing for a pop-up blocker to stop).
function Preview({ file }) {
  const { showToast } = useApp();
  const [p, setP] = useState(null);

  useEffect(() => {
    let url;
    previewResource(file).then(res => {
      if (res.error) { showToast(res.error, 'error'); setP({ kind: 'error' }); return; }
      url = res.url; setP(res);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file, showToast]);

  const save = async () => { const err = await downloadResource(file); if (err) showToast(err, 'error'); };

  if (!p) return <p style={{ fontSize: '.85rem' }}>Loading…</p>;
  return (
    <div>
      {p.kind === 'image' && <img src={p.url} alt={file.title} style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: '0 auto 14px', borderRadius: 8 }} />}
      {p.kind === 'pdf' && <iframe src={p.url} title={file.title} style={{ width: '100%', height: '60vh', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14 }} />}
      {p.kind === 'text' && <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '55vh', overflow: 'auto', background: 'var(--off-white)', padding: 14, borderRadius: 8, fontSize: '.85rem', marginBottom: 14 }}>{p.text}</pre>}
      {(p.kind === 'other' || p.kind === 'error') && <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: 14 }}>{p.kind === 'error' ? 'This file could not be opened.' : 'This type of file can\'t be previewed here. Use Download to open it on your device.'}</p>}
      <button className="btn btn-primary btn-full" onClick={save}><Icon name="download" /> Download</button>
    </div>
  );
}

// A list of files. `who` says how to describe the sender; `canDelete(r)` decides who may delete.
export function FileList({ items, who, canDelete, onChange, empty, showStudent }) {
  const { showToast, openModal } = useApp();
  const download = async (r) => { const err = await downloadResource(r); if (err) showToast(err, 'error'); };
  const view = (r) => openModal(r.title, <Preview file={r} />);
  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const err = await deleteResource(r);
    if (err) showToast(err, 'error'); else onChange();
  };
  if (items.length === 0) return <EmptyState compact title={empty}>Files appear here as soon as they are shared.</EmptyState>;
  const extOf = (r) => ((r.storage_path || '').split('.').pop() || 'file').slice(0, 4).toUpperCase();
  return items.map(r => (
    <div key={r.id} className="file-row">
      <span className="file-ico" aria-hidden="true">{extOf(r)}</span>
      <div className="file-info">
        <strong>{r.title}</strong>
        <span>{[who(r), showStudent && r.student?.full_name, r.category, new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="file-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => view(r)}><Icon name="view" /> View</button>
        <button className="btn btn-ghost btn-sm" onClick={() => download(r)}><Icon name="download" /> Download</button>
        {canDelete(r) && <button className="btn btn-ghost btn-sm" onClick={() => remove(r)} aria-label={`Delete ${r.title}`}><Icon name="trash" /></button>}
      </div>
    </div>
  ));
}
