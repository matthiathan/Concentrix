import { Monitor, Moon, Palette, Settings, Sun, X } from 'lucide-react';
import type { Accent, Appearance, ThemePreferences } from '../hooks/useUserTheme';
import './settings-menu.css';

type Props = {
  open: boolean;
  preferences: ThemePreferences;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (preferences: ThemePreferences) => Promise<void>;
};

const accents: Array<{ value: Accent; label: string }> = [
  { value: 'gold', label: 'Gold' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
  { value: 'teal', label: 'Teal' },
];

const appearances: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function SettingsMenu({ open, preferences, saving, error, onClose, onSave }: Props) {
  if (!open) return null;

  return <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-menu" role="dialog" aria-modal="true" aria-label="Display settings">
      <div className="settings-menu-head">
        <div><p className="eyebrow">Personal preferences</p><h2><Settings size={21}/>Settings</h2><p>Choose how the website looks for your account.</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18}/></button>
      </div>

      <div className="settings-group">
        <div className="settings-label"><Palette size={18}/><div><strong>Accent colour</strong><span>Used for buttons, active navigation and highlights.</span></div></div>
        <div className="accent-picker">
          {accents.map(option => <button key={option.value} className={preferences.accent === option.value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, accent: option.value })} disabled={saving} aria-label={`Use ${option.label} accent`}>
            <i data-accent-swatch={option.value}/><span>{option.label}</span>
          </button>)}
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label"><Monitor size={18}/><div><strong>Appearance</strong><span>Follow your device or choose a fixed mode.</span></div></div>
        <div className="appearance-picker">
          {appearances.map(({ value, label, icon: Icon }) => <button key={value} className={preferences.appearance === value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, appearance: value })} disabled={saving}><Icon size={18}/><span>{label}</span></button>)}
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}
      <div className="settings-foot"><span>{saving ? 'Saving preference…' : 'Changes apply immediately and follow your account.'}</span><button onClick={onClose}>Done</button></div>
    </section>
  </div>;
}
