import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AccountSecurity({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setMessage('Password updated successfully. Use the new password the next time you sign in.');
  }

  return (
    <section className="security-panel">
      <div className="security-heading">
        <div className="security-icon"><ShieldCheck size={24}/></div>
        <div>
          <p className="eyebrow">Account security</p>
          <h2>Change your password</h2>
          <p>Signed in as <strong>{email}</strong></p>
        </div>
      </div>
      <form className="security-form" onSubmit={handleSubmit}>
        <label>
          <span>New password</span>
          <div className="auth-input"><KeyRound size={18}/><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={8}/></div>
        </label>
        <label>
          <span>Confirm new password</span>
          <div className="auth-input"><KeyRound size={18}/><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={8}/></div>
        </label>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'}</button>
      </form>
    </section>
  );
}
