import { useMemo, useState } from 'react';
import { KeyRound, Network, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import type { OperationsData } from '../hooks/useOperationsData';
import { AccountSecurity } from './AccountSecurity';
import './administration-page.css';

type Props = {
  email: string;
  data: OperationsData;
  error: string | null;
  refresh: () => Promise<void>;
  onOpenNayax: () => void;
};

type Tab = 'overview' | 'roles' | 'security';

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

export function AdministrationPage({ email, data, error, refresh, onOpenNayax }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const roleSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const membership of data.memberships) {
      if (!membership.is_active) continue;
      counts.set(membership.role, (counts.get(membership.role) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.memberships]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="administration-page">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Access and platform control</p>
          <h2>Administration</h2>
          <p>Manage administrator access, account security and platform readiness.</p>
        </div>
        <button onClick={() => void handleRefresh()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''}/>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="data-error"><strong>Some administration data could not be loaded.</strong><span>{error}</span></div>}

      <div className="admin-tabs" role="tablist" aria-label="Administration sections">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><ShieldCheck size={17}/>Overview</button>
        <button className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}><Users size={17}/>Roles</button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}><KeyRound size={17}/>Account security</button>
      </div>

      {tab === 'overview' && <>
        <div className="admin-summary">
          <article><span>Active memberships</span><strong>{data.memberships.filter(item => item.is_active).length}</strong><small>Across all visible organisations</small></article>
          <article><span>Employees</span><strong>{data.employees.length}</strong><small>{data.employees.filter(item => item.employment_status === 'active').length} active</small></article>
          <article><span>Registered cards</span><strong>{data.cards.length}</strong><small>{data.cards.filter(item => item.status === 'active').length} active</small></article>
          <article><span>Integration exceptions</span><strong>{data.integrationOutbox.filter(item => item.status === 'failed_review').length}</strong><small>Require administrator review</small></article>
        </div>

        <div className="admin-grid">
          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">Current account</p><h3>Administrator identity</h3></div><ShieldCheck size={20}/></div>
            <dl className="admin-details">
              <div><dt>Email</dt><dd>{email}</dd></div>
              <div><dt>Visible organisations</dt><dd>{new Set(data.memberships.map(item => item.organization_id)).size}</dd></div>
              <div><dt>Highest role</dt><dd>{titleCase(data.memberships.find(item => item.role === 'platform_admin')?.role ?? data.memberships[0]?.role ?? 'unknown')}</dd></div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">Integration</p><h3>Nayax control</h3></div><Network size={20}/></div>
            <p>Review Lynx provisioning, Cortina readiness, failed synchronisation and queued card operations.</p>
            <button className="admin-action" onClick={onOpenNayax}><Network size={16}/>Open Nayax Integration</button>
          </section>
        </div>
      </>}

      {tab === 'roles' && <section className="panel">
        <div className="panel-head"><div><p className="eyebrow">Role-based access</p><h3>Active memberships</h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>Active memberships</th><th>Access level</th></tr></thead>
            <tbody>
              {roleSummary.length ? roleSummary.map(([role, count]) => <tr key={role}><td><strong>{titleCase(role)}</strong></td><td>{count}</td><td>{role === 'employee' ? 'Staff self-service' : ['site_operator','technician','senior_technician'].includes(role) ? 'Technician portal' : 'Administrative console'}</td></tr>) : <tr><td colSpan={3} className="empty-state">No active memberships were returned.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {tab === 'security' && <AccountSecurity email={email}/>} 
    </div>
  );
}
