import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://sugqeyuqzimxaswmuayr.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ElQeVlvaVZ7s2QHzzEpwbg_ReVBCylv';

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Concentrix Supabase configuration is missing.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
