import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True when the site was built without its Supabase settings (see .env.example). main.jsx then shows a
// readable message instead of a blank page.
export const configMissing = !url || !anonKey;

export const supabase = createClient(url || 'https://missing-config.invalid', anonKey || 'missing-config');
