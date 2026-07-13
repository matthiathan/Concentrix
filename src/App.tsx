import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bell, Coffee, CreditCard, Gauge, LayoutDashboard, LogOut, MapPin, Menu, QrCode, Search, Settings, ShieldCheck, Users, Wrench } from 'lucide-react';
import { Loader } from './components/Loader';

type NavItem = { label: string; icon: typeof LayoutDashboard };
const nav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Employees', icon: Users }, { label: 'Cards & Benefits', icon: CreditCard },
  { label: 'Sites', icon: MapPin }, { label: 'Machines', icon: Coffee }, { label: 'Tasks', icon: Wrench },
  { label: 'Incidents', icon: AlertTriangle }, { label: 'Reports', icon: Gauge }, { label: 'Administration', icon: Settings },
];
const kpis: Array<[string, string, string, typeof Activity]> = [
  ['Machine uptime', '98.7%', '+0.8%', Activity], ['Active machines', '126', '121 online', Coffee],
  ['Open incidents', '7', '2 critical', AlertTriangle], ['SLA compliance', '94.3%', '+2.1%', ShieldCheck],
  ['Active cards', '4,892', '98 pending', CreditCard], ['Coffee benefits today', '6,284', '71% redeemed', Gauge],
];
const machines = [
  ['CX-JHB-014', 'Soweto Campus · Floor 2', 'Online', '99.8%', 'Sipho Dlamini'],
  ['CX-JHB-027', 'Sandton Campus · Canteen', 'Warning', '96.1%', 'Thabo Mokoena'],
  ['CX-DBN-006', 'Umhlanga · Floor 4', 'Offline', '91.4%', 'Lerato Khumalo'],
  ['CX-CPT-019', 'Century City · Floor 1', 'Maintenance', '97.0%', 'Anele Jacobs'],
];
const tasks = [
  ['WO-10482', 'Reader communication lost', 'P1 Critical', '12 min', 'Unassigned'],
  ['WO-10477', 'Milk system fault', 'P2 High', '48 min', 'Thabo Mokoena'],
  ['WO-10464', 'Preventative maintenance', 'P3 Medium', '3 hr', 'Anele Jacobs'],
];

export default function App() {
  const [loading, setLoading] = useState(true); const [active, setActive] = useState('Dashboard'); const [open, setOpen] = useState(false);
  useEffect(() => { const id = setTimeout(() => setLoading(false), 1800); return () => clearTimeout(id); }, []);
  if (loading) return <Loader />;
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Coffee size={22}/></div><div><strong>Concentrix</strong><span>Coffee Operations</span></div></div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={active===label?'active':''} onClick={()=>{setActive(label);setOpen(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><button><QrCode size={19}/>Scan machine</button><button><LogOut size={19}/>Sign out</button></div>
    </aside>
    <main>
      <header><button className="menu" onClick={()=>setOpen(v=>!v)}><Menu/></button><div><p className="eyebrow">Dallmayr × Concentrix</p><h1>{active}</h1></div><div className="header-actions"><label className="search"><Search size={17}/><input placeholder="Search machines, cards, tasks…"/></label><button className="icon-button"><Bell size={19}/><span/></button><div className="avatar">MC</div></div></header>
      <section className="content">
        <div className="hero"><div><span className="live"><i/>Live operations</span><h2>Smart coffee, secure access and service control.</h2><p>One operational view across employee entitlements, Nayax-enabled machines, incidents and field service.</p></div><button><QrCode size={18}/>Scan machine QR</button></div>
        <div className="kpi-grid">{kpis.map(([title,value,detail,Icon])=><article className="kpi" key={title as string}><div className="kpi-icon"><Icon size={21}/></div><div><p>{title}</p><h3>{value}</h3><span>{detail}</span></div></article>)}</div>
        <div className="dashboard-grid">
          <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">Estate health</p><h3>Machine status</h3></div><button>View all</button></div><div className="table-wrap"><table><thead><tr><th>Machine</th><th>Location</th><th>Status</th><th>Uptime</th><th>Owner</th></tr></thead><tbody>{machines.map(m=><tr key={m[0]}><td><strong>{m[0]}</strong></td><td>{m[1]}</td><td><span className={'status '+m[2].toLowerCase()}>{m[2]}</span></td><td>{m[3]}</td><td>{m[4]}</td></tr>)}</tbody></table></div></section>
          <section className="panel"><div className="panel-head"><div><p className="eyebrow">Benefits</p><h3>Today’s usage</h3></div></div><div className="donut"><div><strong>71%</strong><span>redeemed</span></div></div><div className="legend"><span><i className="free"/>Free allowance <b>4,921</b></span><span><i className="reward"/>Rewards <b>802</b></span><span><i className="paid"/>Paid <b>561</b></span></div></section>
          <section className="panel wide"><div className="panel-head"><div><p className="eyebrow">SLA control</p><h3>Priority tasks</h3></div><button>Open task board</button></div><div className="task-list">{tasks.map(t=><div className="task" key={t[0]}><div><strong>{t[0]}</strong><span>{t[1]}</span></div><span className={'priority '+t[2].split(' ')[0].toLowerCase()}>{t[2]}</span><span>{t[3]}</span><span>{t[4]}</span><button aria-label="Open task">→</button></div>)}</div></section>
          <section className="panel"><div className="panel-head"><div><p className="eyebrow">Integrations</p><h3>System health</h3></div></div><div className="integration"><span><i className="ok"/>Nayax event stream</span><b>Operational</b></div><div className="integration"><span><i className="ok"/>Concentrix HR sync</span><b>12 min ago</b></div><div className="integration"><span><i className="warn"/>Access control</span><b>3 exceptions</b></div><div className="integration"><span><i className="ok"/>Notifications</span><b>Operational</b></div></section>
        </div>
      </section>
    </main>
  </div>;
}
