import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Activity, AlertTriangle, Bell, Coffee, CreditCard, Gauge, LayoutDashboard, LogOut, MapPin, Menu, QrCode, RefreshCw, Search, Settings, ShieldCheck, Users, Wrench } from 'lucide-react';
import { AccountSecurity } from './components/AccountSecurity';
import { AuthGate } from './components/AuthGate';
import { Loader } from './components/Loader';
import { useDashboardData } from './hooks/useDashboardData';
import { supabase } from './lib/supabase';

type NavItem = { label: string; icon: typeof LayoutDashboard };
const nav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Employees', icon: Users }, { label: 'Cards & Benefits', icon: CreditCard },
  { label: 'Sites', icon: MapPin }, { label: 'Machines', icon: Coffee }, { label: 'Tasks', icon: Wrench },
  { label: 'Incidents', icon: AlertTriangle }, { label: 'Reports', icon: Gauge }, { label: 'Administration', icon: Settings },
];

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function elapsed(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  return `${Math.floor(hours / 24)} d`;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [active, setActive] = useState('Dashboard');
  const [open, setOpen] = useState(false);
  const { data, loading, error, lastUpdated, refresh } = useDashboardData(Boolean(session));

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const uptime = data.totalMachines ? Math.round((data.activeMachines / data.totalMachines) * 1000) / 10 : 0;
  const benefitUsage = data.eligibleEmployees ? Math.min(100, Math.round((data.coffeesToday / data.eligibleEmployees) * 100)) : 0;
  const initials = useMemo(() => {
    const email = session?.user.email ?? 'User';
    return email.split('@')[0].split(/[._-]/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }, [session]);

  if (authLoading) return <Loader />;
  if (!session) return <AuthGate onAuthenticated={() => undefined} />;
  if (loading) return <Loader />;

  const kpis: Array<[string, string, string, typeof Activity]> = [
    ['Machine availability', `${uptime}%`, `${data.activeMachines} of ${data.totalMachines} active`, Activity],
    ['Active machines', data.activeMachines.toLocaleString(), `${data.totalMachines} registered`, Coffee],
    ['Open incidents', data.openIncidents.toLocaleString(), `${data.criticalIncidents} critical`, AlertTriangle],
    ['SLA compliance', `${data.slaCompliance}%`, 'Based on completed clocks', ShieldCheck],
    ['Active cards', data.activeCards.toLocaleString(), `${data.eligibleEmployees} eligible staff`, CreditCard],
    ['Benefit coffees today', data.coffeesToday.toLocaleString(), 'Approved Nayax transactions', Gauge],
  ];

  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Coffee size={22}/></div><div><strong>Concentrix</strong><span>Coffee Operations</span></div></div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={active===label?'active':''} onClick={()=>{setActive(label);setOpen(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><button><QrCode size={19}/>Scan machine</button><button onClick={() => void supabase.auth.signOut()}><LogOut size={19}/>Sign out</button></div>
    </aside>
    <main>
      <header><button className="menu" onClick={()=>setOpen(value=>!value)}><Menu/></button><div><p className="eyebrow">Dallmayr × Concentrix</p><h1>{active}</h1></div><div className="header-actions"><label className="search"><Search size={17}/><input placeholder="Search machines, cards, tasks…"/></label><button className="icon-button" title="Refresh live data" onClick={() => void refresh()}><RefreshCw size={18}/></button><button className="icon-button"><Bell size={19}/>{data.openIncidents > 0 && <span/>}</button><div className="avatar" title={session.user.email}>{initials}</div></div></header>
      <section className="content">
        {active === 'Administration' ? (
          <AccountSecurity email={session.user.email ?? 'Unknown account'} />
        ) : (
          <>
            {error && <div className="data-error"><AlertTriangle size={18}/><div><strong>Supabase could not return operational data.</strong><span>{error}. Confirm this user has an active organisation membership.</span></div><button onClick={() => void refresh()}>Retry</button></div>}
            <div className="hero"><div><span className="live"><i/>Connected to Concentrix Supabase</span><h2>Smart coffee, secure access and service control.</h2><p>Live operational data from employee entitlements, security cards, Nayax transactions, machines, incidents and field service.</p>{lastUpdated && <small>Last refreshed {lastUpdated.toLocaleTimeString('en-ZA')}</small>}</div><button><QrCode size={18}/>Scan machine QR</button></div>
            <div className="kpi-grid">{kpis.map(([title,value,detail,Icon])=><article className="kpi" key={title}><div className="kpi-icon"><Icon size={21}/></div><div><p>{title}</p><h3>{value}</h3><span>{detail}</span></div></article>)}</div>
            <div className="dashboard-grid">
              <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">Estate health</p><h3>Machine status</h3></div><button onClick={() => setActive('Machines')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>Machine</th><th>Location</th><th>Status</th><th>Last communication</th></tr></thead><tbody>{data.machines.length ? data.machines.map(machine=><tr key={machine.id}><td><strong>{machine.asset_number}</strong><small>{machine.display_name}</small></td><td>{machine.site?.name ?? 'No site'}{machine.exact_location ? ` · ${machine.exact_location}` : ''}</td><td><span className={`status ${machine.status}`}>{titleCase(machine.status)}</span></td><td>{machine.last_communication_at ? new Date(machine.last_communication_at).toLocaleString('en-ZA') : 'Never'}</td></tr>) : <tr><td colSpan={4} className="empty-state">No machines have been loaded into Supabase yet.</td></tr>}</tbody></table></div></section>
              <section className="panel"><div className="panel-head"><div><p className="eyebrow">Benefits</p><h3>Today’s usage</h3></div></div><div className="donut" style={{background:`conic-gradient(var(--green) 0 ${benefitUsage}%,#29302b ${benefitUsage}% 100%)`}}><div><strong>{benefitUsage}%</strong><span>coffees per eligible staff</span></div></div><div className="legend"><span><i className="free"/>Benefit coffees <b>{data.coffeesToday}</b></span><span><i className="reward"/>Eligible employees <b>{data.eligibleEmployees}</b></span><span><i className="paid"/>Active cards <b>{data.activeCards}</b></span></div></section>
              <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">SLA control</p><h3>Priority tasks</h3></div><button onClick={() => setActive('Tasks')}>Open task board</button></div><div className="task-list">{data.tasks.length ? data.tasks.map(task=><div className="task" key={task.id}><div><strong>WO-{task.task_number}</strong><span>{task.title}</span></div><span className={`priority ${task.priority.slice(0,2)}`}>{titleCase(task.priority)}</span><span>{elapsed(task.created_at)}</span><span>{task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Unassigned'}</span><button aria-label="Open task">→</button></div>) : <div className="empty-state">No open service tasks.</div>}</div></section>
              <section className="panel"><div className="panel-head"><div><p className="eyebrow">Integrations</p><h3>System health</h3></div></div>{data.integrations.length ? data.integrations.map(integration=><div className="integration" key={integration.id}><span><i className={integration.status === 'operational' || integration.status === 'configured' ? 'ok' : 'warn'}/>{integration.integration_name}</span><b>{integration.last_error ? 'Error' : integration.last_success_at ? new Date(integration.last_success_at).toLocaleString('en-ZA') : titleCase(integration.status)}</b></div>) : <div className="empty-state">No integration connections configured.</div>}</section>
            </div>
          </>
        )}
      </section>
    </main>
  </div>;
}
