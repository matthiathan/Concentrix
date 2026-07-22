import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Appearance = 'system' | 'light' | 'dark';
export type Accent = 'gold' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'teal';
export type ThemePreferences = { appearance: Appearance; accent: Accent };

const fallback: ThemePreferences = { appearance: 'system', accent: 'gold' };

function applyTheme(preferences: ThemePreferences) {
  const root = document.documentElement;
  const resolved = preferences.appearance === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : preferences.appearance;
  root.dataset.theme = resolved;
  root.dataset.appearance = preferences.appearance;
  root.dataset.accent = preferences.accent;
  root.style.colorScheme = resolved;
}

export function useUserTheme(userId?: string) {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    try { return { ...fallback, ...JSON.parse(localStorage.getItem('concentrix-theme') ?? '{}') }; }
    catch { return fallback; }
  });
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { applyTheme(preferences); localStorage.setItem('concentrix-theme', JSON.stringify(preferences)); }, [preferences]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const listener = () => { if (preferences.appearance === 'system') applyTheme(preferences); };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [preferences]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    void supabase.from('user_interface_preferences').select('appearance,accent').eq('user_id', userId).maybeSingle().then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      if (data) setPreferences(data as ThemePreferences);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback(async (next: ThemePreferences) => {
    if (!userId) return;
    setPreferences(next);
    setSaving(true); setError(null);
    const { error: saveError } = await supabase.from('user_interface_preferences').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (saveError) setError(saveError.message);
    setSaving(false);
  }, [userId]);

  return { preferences, loading, saving, error, save };
}
