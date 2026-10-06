import { supabase } from './supabase';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;   // matches the bucket limit

// Original file name: the storage path is <student>/<36-char uuid>-<name>.
const fileNameOf = (r) => r.storage_path.split('/').pop().slice(37) || r.title;

// Save the file to the user's device. Fetches the bytes and triggers a normal download,
// so there is no pop-up for a browser to block.
export async function downloadResource(r) {
  const { data, error } = await supabase.storage.from('resources').download(r.storage_path);
  if (error) return error.message;
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = fileNameOf(r);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return null;
}

// Show the file in a new tab (images, PDFs and text display; others download).
// The tab is opened immediately on the click, before the slow part, so pop-up blockers allow it.
export async function viewResource(r) {
  const w = window.open('', '_blank');
  const { data, error } = await supabase.storage.from('resources').createSignedUrl(r.storage_path, 120);
  if (error) { if (w) w.close(); return error.message; }
  if (!w) return 'Your browser blocked the new tab. Please allow pop-ups for this site, or use Download.';
  w.location.href = data.signedUrl;
  return null;
}

// Upload a file into one student's private exchange: <student>/<random>-<name>, then record it.
// uploaderId is whoever is sending (the student or the tutor). Cleans up the file if the record fails.
export async function uploadResource({ file, title, category, uploaderId, studentId }) {
  if (file.size > MAX_UPLOAD_BYTES) return 'Files can be at most 10 MB.';
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${studentId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from('resources').upload(path, file);
  if (up.error) return up.error.message;
  const { error } = await supabase.from('resources').insert({
    uploader_id: uploaderId, student_id: studentId, title: title || file.name, category: category || null, storage_path: path,
  });
  if (error) { await supabase.storage.from('resources').remove([path]); return error.message; }
  return null;
}

export async function deleteResource(r) {
  const { error } = await supabase.from('resources').delete().eq('id', r.id);
  if (error) return error.message;
  if (r.storage_path) await supabase.storage.from('resources').remove([r.storage_path]);
  return null;
}
