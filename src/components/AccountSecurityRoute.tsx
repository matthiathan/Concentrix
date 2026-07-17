import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AccountSecurity } from './AccountSecurity';
import './account-security-route.css';

type Props = {
  email: string;
  onBack: () => void;
};

export function AccountSecurityRoute({ email, onBack }: Props) {
  return (
    <div className="account-security-route">
      <div className="page-toolbar security-route-toolbar">
        <div>
          <p className="eyebrow">Personal account protection</p>
          <h2>Account security</h2>
          <p>Change the password for the currently signed-in administrator account.</p>
        </div>
        <button type="button" onClick={onBack}><ArrowLeft size={16}/>Back to Admin Console</button>
      </div>

      <div className="security-route-layout">
        <aside className="security-route-note">
          <ShieldCheck size={24}/>
          <div>
            <strong>Secure password update</strong>
            <p>The password change is handled by Supabase Auth and is not stored in the website database.</p>
          </div>
        </aside>
        <AccountSecurity email={email}/>
      </div>
    </div>
  );
}
