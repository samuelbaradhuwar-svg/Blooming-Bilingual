import { supabase } from './supabase';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;   // matches the bucket limit

// Open a resource: external links directly, stored files through a short-lived signed URL.
export async function openResource(r) {
  if (r.external_url) { window.open(r.external_url, '_blank', 'noopener'); return null; }
  const { data, error } = await supabase.storage.from('resources').createSignedUrl(r.storage_path, 60);
  if (error) return error.message;
  window.open(data.signedUrl, '_blank', 'noopener');
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
