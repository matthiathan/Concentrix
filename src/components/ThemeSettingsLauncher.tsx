import { Settings } from 'lucide-react';
import { useState } from 'react';
import { useUserTheme } from '../hooks/useUserTheme';
import { SettingsMenu } from './SettingsMenu';
import './theme-settings-launcher.css';

type Props = { userId: string };

export function ThemeSettingsLauncher({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const theme = useUserTheme(userId);

  return <>
    <button className="theme-settings-launcher" onClick={() => setOpen(true)} title="Appearance settings" aria-label="Open appearance settings">
      <Settings size={19}/><span>Settings</span>
    </button>
    <SettingsMenu open={open} preferences={theme.preferences} saving={theme.saving} error={theme.error} onClose={() => setOpen(false)} onSave={theme.save}/>
  </>;
}
