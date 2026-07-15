import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertTriangle, Coffee, LogOut, QrCode, RefreshCw, Send, ShieldCheck, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AccountSecurity } from './AccountSecurity';
import { MachineLookup } from './MachineLookup';

type Row = Record<string, any>;
type Props = { session: Session; role: string };
const techRoles = new Set(['site_operator','technician','senior_technician']);
const label = (value: string) => value.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export function RolePortal({ session, role }: Props) {
  const isTech = techRoles.has(role);
  const [employee,setEmployee]=useState<Row|null>(null);
  const [balances,setBalances]=useState<Row[]>([]);
  const [machines,setMachines]=useState<Row[]>([]);
  const [incidents,setIncidents]=useState<Row[]>([]);
  const [tasks,setTasks]=useState<Row[]>([]);
  const [escalations,setEscalations]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [scannerOpen,setScannerOpen]=useState(false);
  const [selectedMachine,setSelectedMachine]=useState<Row|null>(null);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [showSecurity,setShowSecurity]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    const {data:employeeData,error:employeeError}=await supabase.from('employees').select('id,organization_id,employee_number,first_name,last_name,work_email,primary_site_id,benefit_eligible,primary_site:sites(id,name,code)').eq('auth_user_id',session.user.id).maybeSingle();
    if(employeeError||!employeeData){setError(employeeError?.message??'No employee profile is linked to this account.');setLoading(false);return}
    setEmployee(employeeData);
    if(isTech){
      const [taskResult,escResult]=await Promise.all([
        supabase.from('service_tasks').select('id,task_number,title,description,priority,status,created_at,site:sites(name),machine:machines(id,asset_number,display_name)').eq('assigned_employee_id',employeeData.id).order('created_at',{ascending:false}),
        supabase.from('escalation_requests').select('id,subject,message,priority,status,created_at,task:service_tasks(task_number,title)').eq('requested_by_user_id',session.user.id).order('created_at',{ascending:false}).limit(50)
      ]);
      if(taskResult.error||escResult.error)setError(taskResult.error?.message??escResult.error?.message??null);
      setTasks(taskResult.data??[]);setEscalations(escResult.data??[]);
      const machineRows=(taskResult.data??[]).map((t:any)=>t.machine).filter(Boolean);
      setMachines(Array.from(new Map(machineRows.map((m:any)=>[m.id,m])).values()));
    }else{
      const [balanceResult,machineResult,incidentResult]=await Promise.all([
        supabase.from('benefit_period_balances').select('id,period_start,period_end,base_allowance,base_used,reward_allowance,reward_used,adjustment_quantity,policy:benefit_policies(name,free_item_limit,reset_period)').eq('employee_id',employeeData.id).order('period_start',{ascending:false}).limit(12),
        employeeData.primary_site_id?supabase.from('machines').select('id,provider_organization_id,client_organization_id,site_id,asset_number,display_name,exact_location,status,site:sites(name)').eq('site_id',employeeData.primary_site_id).eq('is_active',true).order('display_name'):Promise.resolve({data:[],error:null}),
        supabase.from('incidents').select('id,incident_number,title,status,severity,detected_at,machine:machines(asset_number,display_name)').eq('reported_by_user_id',session.user.id).order('detected_at',{ascending:false}).limit(50)
      ]);
      if(balanceResult.error||machineResult.error||incidentResult.error)setError(balanceResult.error?.message??machineResult.error?.message??incidentResult.error?.message??null);
      setBalances(balanceResult.data??[]);setMachines(machineResult.data??[]);setIncidents(incidentResult.data??[]);
    }
    setLoading(false);
  },[isTech,session.user.id]);

  useEffect(()=>{void load()},[load]);
  const currentBalance=balances[0];
  const available=useMemo(()=>currentBalance?Math.max(0,Number(currentBalance.base_allowance)+Number(currentBalance.reward_allowance)+Number(currentBalance.adjustment_quantity)-Number(currentBalance.base_used)-Number(currentBalance.reward_used)):0,[currentBalance]);

  async function reportIssue(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!employee||!selectedMachine)return;setSaving(true);setError(null);setMessage(null);const v=Object.fromEntries(new FormData(e.currentTarget).entries());
    const {error:insertError}=await supabase.from('incidents').insert({provider_organization_id:selectedMachine.provider_organization_id,client_organization_id:selectedMachine.client_organization_id,site_id:selectedMachine.site_id,machine_id:selectedMachine.id,title:v.title,description:v.description||null,severity:'warning',status:'open',reported_by_user_id:session.user.id,client_visible_summary:v.description||String(v.title)});
    setSaving(false);if(insertError){setError(insertError.message);return}setMessage('Issue reported. The operations team can now track it.');setSelectedMachine(null);(e.currentTarget as HTMLFormElement).reset();await load();
  }

  async function updateTask(id:string,status:string){setError(null);const stamps:Row={};if(status==='accepted')stamps.accepted_at=new Date().toISOString();if(status==='en_route')stamps.travel_started_at=new Date().toISOString();if(status==='on_site')stamps.arrived_at=new Date().toISOString();if(status==='in_progress')stamps.work_started_at=new Date().toISOString();if(status==='resolved')stamps.resolved_at=new Date().toISOString();const {error:updateError}=await supabase.from('service_tasks').update({status,...stamps}).eq('id',id);if(updateError)setError(updateError.message);else await load()}

  async function sendEscalation(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!employee)return;setSaving(true);setError(null);setMessage(null);const v=Object.fromEntries(new FormData(e.currentTarget).entries());const task=tasks.find(t=>t.id===v.task_id);const {error:insertError}=await supabase.from('escalation_requests').insert({organization_id:employee.organization_id,requested_by_user_id:session.user.id,employee_id:employee.id,task_id:v.task_id||null,machine_id:task?.machine?.id||null,subject:v.subject,message:v.message,priority:v.priority||'p2_high'});setSaving(false);if(insertError){setError(insertError.message);return}setMessage('Escalation sent to Dallmayr operations.');(e.currentTarget as HTMLFormElement).reset();await load()}

  if(loading)return <div className="loader-screen"><p>Loading your portal…</p></div>;
  return <main className="role-portal">
    <header className="portal-header"><div><p className="eyebrow">Dallmayr × Concentrix</p><h1>{isTech?'Onsite technician portal':'My coffee benefit'}</h1><p>Welcome, {employee?.first_name} {employee?.last_name}</p></div><div className="portal-actions"><button onClick={()=>void load()}><RefreshCw size={17}/>Refresh</button><button onClick={()=>setShowSecurity(v=>!v)}><ShieldCheck size={17}/>Security</button><button onClick={()=>void supabase.auth.signOut()}><LogOut size={17}/>Sign out</button></div></header>
    <section className="portal-content">{error&&<p className="auth-error">{error}</p>}{message&&<p className="auth-success">{message}</p>}{showSecurity&&<AccountSecurity email={session.user.email??''}/>} 
    {isTech?<>
      <div className="portal-hero"><div><Wrench size={28}/><p className="eyebrow">Assigned work</p><h2>{tasks.filter(t=>!['closed','cancelled','resolved'].includes(t.status)).length} open maintenance task(s)</h2><p>Update each task as you clean, service or repair the machine. Only work assigned to you is visible.</p></div></div>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Work queue</p><h3>My tasks</h3></div></div><div className="portal-task-list">{tasks.length?tasks.map(t=><article key={t.id} className="portal-task"><div><strong>WO-{t.task_number} · {t.title}</strong><span>{t.machine?.asset_number??'No machine'} · {t.site?.name??'No site'} · {label(t.priority)}</span><p>{t.description||'No description supplied.'}</p></div><select value={t.status} onChange={e=>void updateTask(t.id,e.target.value)}><option value="assigned">Assigned</option><option value="accepted">Accepted</option><option value="en_route">En route</option><option value="on_site">On site</option><option value="in_progress">In progress</option><option value="awaiting_parts">Awaiting parts</option><option value="awaiting_specialist">Awaiting specialist</option><option value="resolved">Resolved</option></select></article>):<p className="empty-state">No tasks are currently assigned to you.</p>}</div></section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Need assistance?</p><h3>Escalate to Dallmayr</h3></div></div><form className="record-form" onSubmit={sendEscalation}><select name="task_id"><option value="">General escalation</option>{tasks.filter(t=>!['closed','cancelled'].includes(t.status)).map(t=><option key={t.id} value={t.id}>WO-{t.task_number} · {t.title}</option>)}</select><input name="subject" placeholder="Escalation subject" required/><textarea name="message" placeholder="Explain what you need from the operations team" required/><select name="priority"><option value="p2_high">High</option><option value="p1_critical">Critical</option><option value="p3_medium">Medium</option></select><button disabled={saving}><Send size={17}/>{saving?'Sending…':'Send escalation'}</button></form><div className="history-list">{escalations.map(x=><div key={x.id}><strong>{x.subject}</strong><span>{label(x.status)} · {new Date(x.created_at).toLocaleString('en-ZA')}</span></div>)}</div></section>
    </>:<>
      <div className="portal-kpis"><article><Coffee size={24}/><span>Coffees remaining</span><strong>{available}</strong><small>{currentBalance?.policy?.name??'No active policy loaded'}</small></article><article><span>Used this period</span><strong>{Number(currentBalance?.base_used??0)+Number(currentBalance?.reward_used??0)}</strong><small>{currentBalance?`${new Date(currentBalance.period_start).toLocaleDateString('en-ZA')} – ${new Date(currentBalance.period_end).toLocaleDateString('en-ZA')}`:'No current balance'}</small></article><article><span>Primary site</span><strong>{employee?.primary_site?.name??'Not assigned'}</strong><small>{machines.length} machine(s) available</small></article></div>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Machine support</p><h3>Report an issue</h3></div><button onClick={()=>setScannerOpen(true)}><QrCode size={17}/>Scan machine QR</button></div><form className="record-form" onSubmit={reportIssue}><div className="selected-machine">{selectedMachine?<><strong>{selectedMachine.asset_number} · {selectedMachine.display_name}</strong><span>{selectedMachine.site?.name} {selectedMachine.exact_location?`· ${selectedMachine.exact_location}`:''}</span></>:<span>Scan a QR code or select a machine below.</span>}</div><select value={selectedMachine?.id??''} onChange={e=>setSelectedMachine(machines.find(m=>m.id===e.target.value)??null)} required><option value="">Select machine</option>{machines.map(m=><option key={m.id} value={m.id}>{m.asset_number} · {m.display_name}</option>)}</select><input name="title" placeholder="What is wrong?" required/><textarea name="description" placeholder="Describe the problem and what you observed" required/><button disabled={saving||!selectedMachine}><AlertTriangle size={17}/>{saving?'Sending…':'Report issue'}</button></form></section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">My reports</p><h3>Issue history</h3></div></div><div className="history-list">{incidents.length?incidents.map(i=><div key={i.id}><strong>INC-{i.incident_number} · {i.title}</strong><span>{i.machine?.asset_number??'Machine'} · {label(i.status)} · {new Date(i.detected_at).toLocaleString('en-ZA')}</span></div>):<p className="empty-state">You have not reported any machine issues.</p>}</div></section>
    </>}</section>
    {scannerOpen&&<MachineLookup machines={machines} onClose={()=>setScannerOpen(false)} onFound={machine=>{setSelectedMachine(machine);setScannerOpen(false)}}/>}
  </main>;
}
