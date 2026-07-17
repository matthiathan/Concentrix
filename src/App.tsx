import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Activity, AlertTriangle, Bell, Coffee, CreditCard, FileSpreadsheet, Gauge, LayoutDashboard, LogOut, MapPin, Menu, Network, QrCode, RefreshCw, Search, Settings, ShieldCheck, Users, Wrench, X } from 'lucide-react';
import { AccountSecurity } from './components/AccountSecurity';
import { AuthGate } from './components/AuthGate';
import { IntegrationControlPage } from './components/IntegrationControlPage';
import { Loader } from './components/Loader';
import { MachineLookup } from './components/MachineLookup';
import { MachinesPage } from './components/MachinesPage';
import { OperationsPage } from './components/OperationsPage';
import { RolePortal } from './components/RolePortal';
import { StaffImportPage } from './components/StaffImportPage';
import { useDashboardData } from './hooks/useDashboardData';
import { useOperationsData } from './hooks/useOperationsData';
import { supabase } from './lib/supabase';

type NavItem={label:string;icon:typeof LayoutDashboard};
type Membership={organization_id:string;role:string;is_active:boolean};
const nav:NavItem[]=[
 {label:'Dashboard',icon:LayoutDashboard},{label:'Employees',icon:Users},{label:'Staff Imports',icon:FileSpreadsheet},
 {label:'Cards & Benefits',icon:CreditCard},{label:'Sites',icon:MapPin},{label:'Machines',icon:Coffee},
 {label:'Tasks',icon:Wrench},{label:'Incidents',icon:AlertTriangle},{label:'Reports',icon:Gauge},
 {label:'Nayax Integration',icon:Network},{label:'Administration',icon:Settings}
];
const operationalPages=new Set(['Employees','Cards & Benefits','Sites','Tasks','Incidents','Reports']);
const adminRoles=new Set(['platform_admin','provider_admin','operations_manager','client_admin']);
const techRoles=new Set(['site_operator','technician','senior_technician']);
const titleCase=(value:string)=>value.replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
const elapsed=(iso:string)=>{const minutes=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));if(minutes<60)return`${minutes} min`;const hours=Math.floor(minutes/60);return hours<24?`${hours} hr`:`${Math.floor(hours/24)} d`};

export default function App(){
 const[session,setSession]=useState<Session|null>(null);
 const[authLoading,setAuthLoading]=useState(true);
 const[securityLoading,setSecurityLoading]=useState(true);
 const[mustChangePassword,setMustChangePassword]=useState(false);
 const[roleLoading,setRoleLoading]=useState(true);
 const[memberships,setMemberships]=useState<Membership[]>([]);
 const[active,setActive]=useState('Dashboard');
 const[open,setOpen]=useState(false);
 const[search,setSearch]=useState('');
 const[notificationsOpen,setNotificationsOpen]=useState(false);
 const[scannerOpen,setScannerOpen]=useState(false);
 const primaryRole=useMemo(()=>memberships.find(m=>m.role==='platform_admin')?.role??memberships.find(m=>adminRoles.has(m.role))?.role??memberships.find(m=>techRoles.has(m.role))?.role??memberships[0]?.role??'employee',[memberships]);
 const isAdmin=adminRoles.has(primaryRole);
 const operationsEnabled=Boolean(session)&&!securityLoading&&!mustChangePassword&&!roleLoading&&isAdmin;
 const dashboard=useDashboardData(operationsEnabled);
 const operations=useOperationsData(operationsEnabled);

 useEffect(()=>{void supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthLoading(false)});const{data:listener}=supabase.auth.onAuthStateChange((_event,nextSession)=>{setSession(nextSession);setAuthLoading(false)});return()=>listener.subscription.unsubscribe()},[]);
 const loadSecurityState=useCallback(async()=>{if(!session?.user.id){setMustChangePassword(false);setSecurityLoading(false);return}setSecurityLoading(true);const{data,error}=await supabase.from('user_security_state').select('must_change_password').eq('user_id',session.user.id).maybeSingle();setMustChangePassword(!error&&data?.must_change_password===true);setSecurityLoading(false)},[session?.user.id]);
 const loadRoles=useCallback(async()=>{if(!session?.user.id){setMemberships([]);setRoleLoading(false);return}setRoleLoading(true);const{data,error}=await supabase.from('organization_memberships').select('organization_id,role,is_active').eq('user_id',session.user.id).eq('is_active',true);setMemberships(error?[]:(data??[]) as Membership[]);setRoleLoading(false)},[session?.user.id]);
 useEffect(()=>{void loadSecurityState();void loadRoles()},[loadSecurityState,loadRoles]);

 if(authLoading)return<Loader/>;
 if(!session)return<AuthGate onAuthenticated={()=>undefined}/>;
 if(securityLoading||roleLoading)return<Loader/>;
 if(mustChangePassword)return<main className="auth-screen"><AccountSecurity email={session.user.email??'Unknown account'} forced onComplete={loadSecurityState}/></main>;
 if(!isAdmin)return<RolePortal session={session} role={primaryRole}/>;
 if(dashboard.loading||operations.loading)return<Loader/>;

 const uptime=dashboard.data.totalMachines?Math.round((dashboard.data.activeMachines/dashboard.data.totalMachines)*1000)/10:0;
 const benefitUsage=dashboard.data.eligibleEmployees?Math.min(100,Math.round((dashboard.data.coffeesToday/dashboard.data.eligibleEmployees)*100)):0;
 const initials=(session.user.email??'User').split('@')[0].split(/[._-]/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
 const openIncidents=operations.data.incidents.filter(i=>!['closed','cancelled','resolved'].includes(i.status));
 const organizationId=operations.data.memberships[0]?.organization_id as string|undefined;
 const kpis:Array<[string,string,string,typeof Activity]>=[
  ['Machine availability',`${uptime}%`,`${dashboard.data.activeMachines} of ${dashboard.data.totalMachines} active`,Activity],
  ['Active machines',dashboard.data.activeMachines.toLocaleString(),`${dashboard.data.totalMachines} registered`,Coffee],
  ['Open incidents',dashboard.data.openIncidents.toLocaleString(),`${dashboard.data.criticalIncidents} critical`,AlertTriangle],
  ['SLA compliance',`${dashboard.data.slaCompliance}%`,'Based on completed clocks',ShieldCheck],
  ['Active cards',dashboard.data.activeCards.toLocaleString(),`${dashboard.data.eligibleEmployees} eligible staff`,CreditCard],
  ['Benefit coffees today',dashboard.data.coffeesToday.toLocaleString(),'Approved Nayax transactions',Gauge]
 ];
 function navigate(page:string){setActive(page);setOpen(false);if(['Dashboard','Administration','Staff Imports','Nayax Integration'].includes(page))setSearch('')}
 function showMachine(machine:Record<string,any>){setScannerOpen(false);setSearch(machine.asset_number);setActive('Machines')}

 return <div className="app-shell">
  <aside className={open?'sidebar open':'sidebar'}><div className="brand"><div className="brand-mark"><Coffee size={22}/></div><div><strong>Concentrix</strong><span>Coffee Operations</span></div></div><nav>{nav.map(({label,icon:Icon})=><button key={label} className={active===label?'active':''} onClick={()=>navigate(label)}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="sidebar-foot"><button onClick={()=>setScannerOpen(true)}><QrCode size={19}/>Scan machine</button><button onClick={()=>void supabase.auth.signOut()}><LogOut size={19}/>Sign out</button></div></aside>
  <main><header><button className="menu" onClick={()=>setOpen(v=>!v)}><Menu/></button><div><p className="eyebrow">Dallmayr × Concentrix</p><h1>{active}</h1></div><div className="header-actions"><label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search current page…" disabled={['Staff Imports','Nayax Integration','Administration'].includes(active)}/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={14}/></button>}</label><button className="icon-button" title="Refresh live data" onClick={()=>{void dashboard.refresh();void operations.refresh()}}><RefreshCw size={18}/></button><button className="icon-button" title="Open incidents" onClick={()=>setNotificationsOpen(v=>!v)}><Bell size={19}/>{openIncidents.length>0&&<span/>}</button><div className="avatar" title={session.user.email}>{initials}</div></div>{notificationsOpen&&<div className="notification-panel"><div className="panel-head"><div><p className="eyebrow">Notifications</p><h3>Open incidents</h3></div><button onClick={()=>setNotificationsOpen(false)}><X size={16}/></button></div>{openIncidents.length?openIncidents.slice(0,8).map(i=><button key={i.id} className="notification-item" onClick={()=>{setNotificationsOpen(false);setActive('Incidents');setSearch(i.title)}}><strong>{i.title}</strong><span>{titleCase(i.severity)} · {elapsed(i.detected_at)}</span></button>):<p className="empty-state">No open incidents.</p>}</div>}</header>
  <section className="content">
   {active==='Administration'?<AccountSecurity email={session.user.email??'Unknown account'}/>
   :active==='Nayax Integration'?<IntegrationControlPage data={operations.data} error={operations.error} refresh={operations.refresh}/>
   :active==='Staff Imports'?<StaffImportPage organizationId={organizationId} onClose={()=>navigate('Employees')}/>
   :active==='Machines'?<MachinesPage data={operations.data} search={search} error={operations.error} refresh={operations.refresh} update={operations.update} create={operations.create}/>
   :operationalPages.has(active)?<OperationsPage page={active} data={operations.data} search={search} error={operations.error} refresh={operations.refresh} update={operations.update} create={operations.create}/>
   :<>{(dashboard.error||operations.error)&&<div className="data-error"><AlertTriangle size={18}/><div><strong>Supabase could not return all operational data.</strong><span>{dashboard.error??operations.error}</span></div><button onClick={()=>{void dashboard.refresh();void operations.refresh()}}>Retry</button></div>}<div className="hero"><div><span className="live"><i/>Connected to Concentrix Supabase</span><h2>Smart coffee, secure access and service control.</h2><p>Live operational data from employee entitlements, security cards, Nayax transactions, machines, incidents and field service.</p></div><button onClick={()=>setScannerOpen(true)}><QrCode size={18}/>Scan machine QR</button></div><div className="kpi-grid">{kpis.map(([title,value,detail,Icon])=><article className="kpi" key={title}><div className="kpi-icon"><Icon size={21}/></div><div><p>{title}</p><h3>{value}</h3><span>{detail}</span></div></article>)}</div><div className="dashboard-grid"><section className="panel wide"><div className="panel-head"><div><p className="eyebrow">Estate health</p><h3>Machine status</h3></div><button onClick={()=>navigate('Machines')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>QR / Asset</th><th>Location</th><th>Status</th><th>Last communication</th></tr></thead><tbody>{dashboard.data.machines.length?dashboard.data.machines.map(machine=><tr key={machine.id}><td><strong>{machine.asset_number}</strong><small>{machine.display_name}</small></td><td>{machine.site?.name??'No site'}</td><td><span className={`status ${machine.status}`}>{titleCase(machine.status)}</span></td><td>{machine.last_communication_at?new Date(machine.last_communication_at).toLocaleString('en-ZA'):'Never'}</td></tr>):<tr><td colSpan={4} className="empty-state">No machines loaded.</td></tr>}</tbody></table></div></section><section className="panel"><div className="panel-head"><div><p className="eyebrow">Benefits</p><h3>Today’s usage</h3></div></div><div className="donut" style={{background:`conic-gradient(var(--green) 0 ${benefitUsage}%,#29302b ${benefitUsage}% 100%)`}}><div><strong>{benefitUsage}%</strong><span>coffees per eligible staff</span></div></div></section><section className="panel wide"><div className="panel-head"><div><p className="eyebrow">SLA control</p><h3>Priority tasks</h3></div><button onClick={()=>navigate('Tasks')}>Open task board</button></div><div className="task-list">{dashboard.data.tasks.length?dashboard.data.tasks.map(task=><div className="task" key={task.id}><div><strong>WO-{task.task_number}</strong><span>{task.title}</span></div><span className={`priority ${task.priority.slice(0,2)}`}>{titleCase(task.priority)}</span><span>{elapsed(task.created_at)}</span><span>{task.assignee?`${task.assignee.first_name} ${task.assignee.last_name}`:'Unassigned'}</span><button onClick={()=>{setActive('Tasks');setSearch(String(task.task_number))}}>→</button></div>):<div className="empty-state">No open service tasks.</div>}</div></section></div></>}
  </section></main>
  {scannerOpen&&<MachineLookup machines={operations.data.machines} onClose={()=>setScannerOpen(false)} onFound={showMachine}/>} 
 </div>
}
