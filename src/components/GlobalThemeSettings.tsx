import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ThemeSettingsLauncher } from './ThemeSettingsLauncher';

export function GlobalThemeSettings() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return userId ? <ThemeSettingsLauncher userId={userId}/> : null;
}
