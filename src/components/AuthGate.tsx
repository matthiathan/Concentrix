import { FormEvent, useState } from 'react';
import { Coffee, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthGateProps = { onAuthenticated: () => void };

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('matt@dallmayr.co.za');
  const [password, setPassword] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    if (createMode) {
      if (email.toLowerCase() !== 'matt@dallmayr.co.za') {
        setSubmitting(false);
        setError('The initial administrator must use matt@dallmayr.co.za.');
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) {
        setMessage('Account created. Check matt@dallmayr.co.za for the Supabase confirmation email, then sign in.');
        setCreateMode(false);
        return;
      }
      onAuthenticated();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    onAuthenticated();
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-mark"><Coffee size={24} /></div>
        <p className="eyebrow">Secure operations portal</p>
        <h1>{createMode ? 'Create initial administrator' : 'Concentrix Coffee Operations'}</h1>
        <p className="auth-copy">{createMode ? 'Create the first Supabase account. The database will automatically assign matt@dallmayr.co.za the platform administrator role.' : 'Sign in with an authorised Supabase account. Access is controlled by organisation memberships and database Row Level Security.'}</p>
        <form onSubmit={handleSubmit}>
          <label><span>Email address</span><div className="auth-input"><Mail size={18}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" readOnly={createMode} /></div></label>
          <label><span>Password</span><div className="auth-input"><LockKeyhole size={18}/><input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={createMode ? 'new-password' : 'current-password'} /></div></label>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}
          <button type="submit" disabled={submitting}>{submitting ? (createMode ? 'Creating…' : 'Signing in…') : (createMode ? 'Create admin account' : 'Sign in')}</button>
        </form>
        <button className="auth-mode-button" type="button" onClick={() => { setCreateMode(value => !value); setError(null); setMessage(null); setPassword(''); }}>
          {createMode ? 'Back to sign in' : 'Create the initial admin account'}
        </button>
      </section>
    </main>
  );
}
