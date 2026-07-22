import { Brush, Image, Monitor, Moon, Palette, Settings, Sun, X } from 'lucide-react';
import type { Accent, Appearance, Background, ThemeColor, ThemePreferences } from '../hooks/useUserTheme';
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
  { value: 'gold', label: 'Gold' }, { value: 'green', label: 'Green' }, { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' }, { value: 'orange', label: 'Orange' }, { value: 'red', label: 'Red' }, { value: 'teal', label: 'Teal' },
];
const appearances: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor }, { value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon },
];
const backgrounds: Array<{ value: Background; label: string }> = [
  { value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'aurora', label: 'Aurora' },
  { value: 'mesh', label: 'Mesh' }, { value: 'midnight', label: 'Midnight' }, { value: 'sunrise', label: 'Sunrise' },
];
const themeColors: Array<{ value: ThemeColor; label: string }> = [
  { value: 'neutral', label: 'Neutral' }, { value: 'slate', label: 'Slate' }, { value: 'navy', label: 'Navy' },
  { value: 'forest', label: 'Forest' }, { value: 'plum', label: 'Plum' }, { value: 'coffee', label: 'Coffee' }, { value: 'sand', label: 'Sand' },
];

export function SettingsMenu({ open, preferences, saving, error, onClose, onSave }: Props) {
  if (!open) return null;
  return <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-menu" role="dialog" aria-modal="true" aria-label="Display settings">
      <div className="settings-menu-head"><div><p className="eyebrow">Personal preferences</p><h2><Settings size={21}/>Settings</h2><p>Build a colour scheme that feels like yours.</p></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18}/></button></div>

      <div className="settings-group"><div className="settings-label"><Palette size={18}/><div><strong>Accent colour</strong><span>Changes buttons, active navigation, highlights, focus rings and key icons.</span></div></div><div className="accent-picker">{accents.map(option => <button key={option.value} className={preferences.accent === option.value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, accent: option.value })} disabled={saving}><i data-accent-swatch={option.value}/><span>{option.label}</span></button>)}</div></div>

      <div className="settings-group"><div className="settings-label"><Brush size={18}/><div><strong>Theme colour</strong><span>Controls panels, navigation, cards and form surfaces.</span></div></div><div className="theme-picker">{themeColors.map(option => <button key={option.value} className={preferences.theme_color === option.value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, theme_color: option.value })} disabled={saving}><i data-theme-swatch={option.value}/><span>{option.label}</span></button>)}</div></div>

      <div className="settings-group"><div className="settings-label"><Image size={18}/><div><strong>Background</strong><span>Choose a calm solid background or a more playful visual treatment.</span></div></div><div className="background-picker">{backgrounds.map(option => <button key={option.value} className={preferences.background === option.value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, background: option.value })} disabled={saving}><i data-background-swatch={option.value}/><span>{option.label}</span></button>)}</div></div>

      <div className="settings-group"><div className="settings-label"><Monitor size={18}/><div><strong>Appearance</strong><span>Follow your device or choose a fixed light or dark mode.</span></div></div><div className="appearance-picker">{appearances.map(({ value, label, icon: Icon }) => <button key={value} className={preferences.appearance === value ? 'selected' : ''} onClick={() => void onSave({ ...preferences, appearance: value })} disabled={saving}><Icon size={18}/><span>{label}</span></button>)}</div></div>

      {error && <p className="auth-error">{error}</p>}
      <div className="settings-foot"><span>{saving ? 'Saving preference…' : 'Changes apply immediately and follow your account.'}</span><button onClick={onClose}>Done</button></div>
    </section>
  </div>;
}
