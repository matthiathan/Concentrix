import { FormEvent, useState } from 'react';
import { Coffee, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthGateProps = { onAuthenticated: () => void };

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

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
        <h1>Concentrix Coffee Operations</h1>
        <p className="auth-copy">Sign in with an authorised Supabase account. Access is controlled by organisation memberships and database Row Level Security.</p>
        <form onSubmit={handleSubmit}>
          <label><span>Email address</span><div className="auth-input"><Mail size={18}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></div></label>
          <label><span>Password</span><div className="auth-input"><LockKeyhole size={18}/><input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" /></div></label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
