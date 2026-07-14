import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Activity, AlertTriangle, Bell, Coffee, CreditCard, Gauge, LayoutDashboard, LogOut, MapPin, Menu, QrCode, RefreshCw, Search, Settings, ShieldCheck, Users, Wrench, X } from 'lucide-react';
import { AccountSecurity } from './components/AccountSecurity';
import { AuthGate } from './components/AuthGate';
import { Loader } from './components/Loader';
import { MachineLookup } from './components/MachineLookup';
import { OperationsPage } from './components/OperationsPage';
import { useDashboardData } from './hooks/useDashboardData';
import { useOperationsData } from './hooks/useOperationsData';
import { supabase } from './lib/supabase';

type NavItem = { label: string; icon: typeof LayoutDashboard };
const nav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Employees', icon: Users }, { label: 'Cards & Benefits', icon: CreditCard },
  { label: 'Sites', icon: MapPin }, { label: 'Machines', icon: Coffee }, { label: 'Tasks', icon: Wrench },
  { label: 'Incidents', icon: AlertTriangle }, { label: 'Reports', icon: Gauge }, { label: 'Administration', icon: Settings },
];
const operationalPages = new Set(['Employees','Cards & Benefits','Sites','Machines','Tasks','Incidents','Reports']);

function titleCase(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
function elapsed(iso: string) { const minutes=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000)); if(minutes<60)return `${minutes} min`;const hours=Math.floor(minutes/60);return hours<24?`${hours} hr`:`${Math.floor(hours/24)} d`; }

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [active, setActive] = useState('Dashboard');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [scannerOpen,setScannerOpen]=useState(false);
  const dashboard = useDashboardData(Boolean(session));
  const operations = useOperationsData(Boolean(session));

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthLoading(false); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const uptime = dashboard.data.totalMachines ? Math.round((dashboard.data.activeMachines / dashboard.data.totalMachines) * 1000) / 10 : 0;
  const benefitUsage = dashboard.data.eligibleEmployees ? Math.min(100, Math.round((dashboard.data.coffeesToday / dashboard.data.eligibleEmployees) * 100)) : 0;
  const initials = useMemo(() => (session?.user.email ?? 'User').split('@')[0].split(/[._-]/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), [session]);
  const openIncidents=operations.data.incidents.filter(i=>!['closed','cancelled','resolved'].includes(i.status));

  if (authLoading) return <Loader />;
  if (!session) return <AuthGate onAuthenticated={() => undefined} />;
  if (dashboard.loading || operations.loading) return <Loader />;

  const kpis: Array<[string, string, string, typeof Activity]> = [
    ['Machine availability', `${uptime}%`, `${dashboard.data.activeMachines} of ${dashboard.data.totalMachines} active`, Activity],
    ['Active machines', dashboard.data.activeMachines.toLocaleString(), `${dashboard.data.totalMachines} registered`, Coffee],
    ['Open incidents', dashboard.data.openIncidents.toLocaleString(), `${dashboard.data.criticalIncidents} critical`, AlertTriangle],
    ['SLA compliance', `${dashboard.data.slaCompliance}%`, 'Based on completed clocks', ShieldCheck],
    ['Active cards', dashboard.data.activeCards.toLocaleString(), `${dashboard.data.eligibleEmployees} eligible staff`, CreditCard],
    ['Benefit coffees today', dashboard.data.coffeesToday.toLocaleString(), 'Approved Nayax transactions', Gauge],
  ];

  function navigate(page:string){setActive(page);setOpen(false);if(page==='Dashboard'||page==='Administration')setSearch('');}
  function showMachine(machine:Record<string,any>){setScannerOpen(false);setSearch(machine.asset_number);setActive('Machines');}

  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Coffee size={22}/></div><div><strong>Concentrix</strong><span>Coffee Operations</span></div></div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={active===label?'active':''} onClick={()=>navigate(label)}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><button onClick={()=>setScannerOpen(true)}><QrCode size={19}/>Scan machine</button><button onClick={() => void supabase.auth.signOut()}><LogOut size={19}/>Sign out</button></div>
    </aside>
    <main>
      <header><button className="menu" onClick={()=>setOpen(value=>!value)}><Menu/></button><div><p className="eyebrow">Dallmayr × Concentrix</p><h1>{active}</h1></div><div className="header-actions">
        <label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search current page…"/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={14}/></button>}</label>
        <button className="icon-button" title="Refresh live data" onClick={() => {void dashboard.refresh();void operations.refresh();}}><RefreshCw size={18}/></button>
        <button className="icon-button" title="Open incidents" onClick={()=>setNotificationsOpen(v=>!v)}><Bell size={19}/>{openIncidents.length>0&&<span/>}</button>
        <div className="avatar" title={session.user.email}>{initials}</div>
      </div>{notificationsOpen&&<div className="notification-panel"><div className="panel-head"><div><p className="eyebrow">Notifications</p><h3>Open incidents</h3></div><button onClick={()=>setNotificationsOpen(false)}><X size={16}/></button></div>{openIncidents.length?openIncidents.slice(0,8).map(i=><button key={i.id} className="notification-item" onClick={()=>{setNotificationsOpen(false);setActive('Incidents');setSearch(i.title)}}><strong>{i.title}</strong><span>{titleCase(i.severity)} · {elapsed(i.detected_at)}</span></button>):<p className="empty-state">No open incidents.</p>}</div>}</header>
      <section className="content">
        {active === 'Administration' ? <AccountSecurity email={session.user.email ?? 'Unknown account'} /> : operationalPages.has(active) ? (
          <OperationsPage page={active} data={operations.data} search={search} error={operations.error} refresh={operations.refresh} update={operations.update} create={operations.create}/>
        ) : <>
          {(dashboard.error||operations.error)&&<div className="data-error"><AlertTriangle size={18}/><div><strong>Supabase could not return all operational data.</strong><span>{dashboard.error??operations.error}</span></div><button onClick={()=>{void dashboard.refresh();void operations.refresh()}}>Retry</button></div>}
          <div className="hero"><div><span className="live"><i/>Connected to Concentrix Supabase</span><h2>Smart coffee, secure access and service control.</h2><p>Live operational data from employee entitlements, security cards, Nayax transactions, machines, incidents and field service.</p>{dashboard.lastUpdated&&<small>Last refreshed {dashboard.lastUpdated.toLocaleTimeString('en-ZA')}</small>}</div><button onClick={()=>setScannerOpen(true)}><QrCode size={18}/>Scan machine QR</button></div>
          <div className="kpi-grid">{kpis.map(([title,value,detail,Icon])=><article className="kpi" key={title}><div className="kpi-icon"><Icon size={21}/></div><div><p>{title}</p><h3>{value}</h3><span>{detail}</span></div></article>)}</div>
          <div className="dashboard-grid">
            <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">Estate health</p><h3>Machine status</h3></div><button onClick={()=>navigate('Machines')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>Machine</th><th>Location</th><th>Status</th><th>Last communication</th></tr></thead><tbody>{dashboard.data.machines.length?dashboard.data.machines.map(machine=><tr key={machine.id}><td><strong>{machine.asset_number}</strong><small>{machine.display_name}</small></td><td>{machine.site?.name??'No site'}{machine.exact_location?` · ${machine.exact_location}`:''}</td><td><span className={`status ${machine.status}`}>{titleCase(machine.status)}</span></td><td>{machine.last_communication_at?new Date(machine.last_communication_at).toLocaleString('en-ZA'):'Never'}</td></tr>):<tr><td colSpan={4} className="empty-state">No machines have been loaded into Supabase yet.</td></tr>}</tbody></table></div></section>
            <section className="panel"><div className="panel-head"><div><p className="eyebrow">Benefits</p><h3>Today’s usage</h3></div></div><div className="donut" style={{background:`conic-gradient(var(--green) 0 ${benefitUsage}%,#29302b ${benefitUsage}% 100%)`}}><div><strong>{benefitUsage}%</strong><span>coffees per eligible staff</span></div></div><div className="legend"><span><i className="free"/>Benefit coffees <b>{dashboard.data.coffeesToday}</b></span><span><i className="reward"/>Eligible employees <b>{dashboard.data.eligibleEmployees}</b></span><span><i className="paid"/>Active cards <b>{dashboard.data.activeCards}</b></span></div></section>
            <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">SLA control</p><h3>Priority tasks</h3></div><button onClick={()=>navigate('Tasks')}>Open task board</button></div><div className="task-list">{dashboard.data.tasks.length?dashboard.data.tasks.map(task=><div className="task" key={task.id}><div><strong>WO-{task.task_number}</strong><span>{task.title}</span></div><span className={`priority ${task.priority.slice(0,2)}`}>{titleCase(task.priority)}</span><span>{elapsed(task.created_at)}</span><span>{task.assignee?`${task.assignee.first_name} ${task.assignee.last_name}`:'Unassigned'}</span><button onClick={()=>{setActive('Tasks');setSearch(String(task.task_number))}}>→</button></div>):<div className="empty-state">No open service tasks.</div>}</div></section>
            <section className="panel"><div className="panel-head"><div><p className="eyebrow">Integrations</p><h3>System health</h3></div></div>{dashboard.data.integrations.length?dashboard.data.integrations.map(integration=><div className="integration" key={integration.id}><span><i className={integration.status==='operational'||integration.status==='configured'?'ok':'warn'}/>{integration.integration_name}</span><b>{integration.last_error?'Error':integration.last_success_at?new Date(integration.last_success_at).toLocaleString('en-ZA'):titleCase(integration.status)}</b></div>):<div className="empty-state">No integration connections configured.</div>}</section>
          </div></>}
      </section>
    </main>
    {scannerOpen&&<MachineLookup machines={operations.data.machines} onClose={()=>setScannerOpen(false)} onFound={showMachine}/>} 
  </div>;
}
