import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './account-security.css';

type Props = {
  email: string;
  forced?: boolean;
  onComplete?: () => Promise<void> | void;
};

export function AccountSecurity({ email, forced = false, onComplete }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (forced) {
      if (password.toLowerCase() === 'password') {
        setError('Choose a password different from the temporary password.');
        return;
      }
      if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setError('Use at least 12 characters with uppercase, lowercase, a number and a symbol.');
        return;
      }
    } else if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setMessage(forced ? 'Password changed. Preparing your account…' : 'Password updated successfully. Use the new password the next time you sign in.');

    if (forced) {
      await new Promise(resolve => setTimeout(resolve, 350));
      await onComplete?.();
    }
    setSubmitting(false);
  }

  return (
    <section className="security-panel">
      <div className="security-heading">
        <div className="security-icon"><ShieldCheck size={24}/></div>
        <div>
          <p className="eyebrow">{forced ? 'First login security' : 'Account security'}</p>
          <h2>{forced ? 'Create your permanent password' : 'Change your password'}</h2>
          <p>Signed in as <strong>{email}</strong></p>
          {forced && <p>Your temporary password has expired. You must replace it before accessing the operations portal.</p>}
        </div>
      </div>
      <form className="security-form" onSubmit={handleSubmit}>
        <label>
          <span>New password</span>
          <div className="auth-input"><KeyRound size={18}/><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={forced ? 12 : 8}/></div>
        </label>
        <label>
          <span>Confirm new password</span>
          <div className="auth-input"><KeyRound size={18}/><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={forced ? 12 : 8}/></div>
        </label>
        {forced && <p className="password-guidance">Minimum 12 characters including uppercase, lowercase, a number and a symbol.</p>}
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Updating…' : forced ? 'Set permanent password' : 'Update password'}</button>
      </form>
    </section>
  );
}
