import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import type { OperationsData, Row } from '../hooks/useOperationsData';
import { supabase } from '../lib/supabase';
import { CardAssignmentModal } from './CardAssignmentModal';

type Props={page:string;data:OperationsData;search:string;error:string|null;refresh:()=>Promise<void>;update:(table:string,id:string,changes:Row)=>Promise<void>;create:(table:string,values:Row)=>Promise<void>};
const label=(value:string)=>value.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const when=(value:unknown)=>value?new Date(String(value)).toLocaleString('en-ZA'):'—';
const matches=(row:Row,q:string)=>!q||JSON.stringify(row).toLowerCase().includes(q.toLowerCase());

function CsvButton({rows,name}:{rows:Row[];name:string}){
 function download(){if(!rows.length)return;const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r).filter(k=>typeof r[k]!=='object'))));const csv=[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`${name}-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
 return <button onClick={download} disabled={!rows.length}><Download size={16}/>Export CSV</button>;
}

function StatusSelect({value,options,onChange}:{value:string;options:string[];onChange:(v:string)=>Promise<void>}){
 const[busy,setBusy]=useState(false);
 return <select value={value} disabled={busy} onChange={async e=>{setBusy(true);try{await onChange(e.target.value)}finally{setBusy(false)}}}>{options.map(v=><option key={v} value={v}>{label(v)}</option>)}</select>;
}

function QuickCreate({page,data,create,refresh,onClose}:{page:string;data:OperationsData;create:Props['create'];refresh:Props['refresh'];onClose:()=>void}){
 const[saving,setSaving]=useState(false);const[error,setError]=useState<string|null>(null);const[success,setSuccess]=useState<{email:string;role:string;organization:string}|null>(null);const provider=data.memberships[0]?.organization_id;
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError(null);const v=Object.fromEntries(new FormData(e.currentTarget).entries());try{
  if(!provider)throw new Error('No active organisation membership was found.');
  if(page==='Employees'){
   const role=String(v.role||'employee');
   const{data:result,error:functionError}=await supabase.functions.invoke('provision-employee',{body:{employee_number:v.employee_number,first_name:v.first_name,last_name:v.last_name,work_email:v.work_email,primary_site_id:v.primary_site_id||null,employment_status:'active',benefit_eligible:role==='employee',role,source_system:'portal'}});
   if(functionError)throw new Error(functionError.message);if(result?.error)throw new Error(result.error);await refresh();setSuccess({email:String(v.work_email),role:result.role,organization:result.organization_code});return;
  }
  if(page==='Sites')await create('sites',{provider_organization_id:provider,client_organization_id:provider,code:v.code,name:v.name,city:v.city||null,province:v.province||null,is_active:true});
  if(page==='Tasks')await create('service_tasks',{provider_organization_id:provider,client_organization_id:provider,site_id:v.site_id,machine_id:v.machine_id||null,title:v.title,description:v.description||null,priority:v.priority||'p3_medium',status:'new',source:'manual_report'});
  if(page==='Incidents')await create('incidents',{provider_organization_id:provider,client_organization_id:provider,site_id:v.site_id,machine_id:v.machine_id||null,title:v.title,description:v.description||null,severity:v.severity||'warning',status:'open',detected_at:new Date().toISOString()});
  onClose();
 }catch(err){setError(err instanceof Error?err.message:'Could not save record')}finally{setSaving(false)}}
 const siteOptions=<select name="site_id" required><option value="">Select site</option>{data.sites.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select>;
 return <div className="modal-backdrop"><section className="modal-card"><div className="panel-head"><div><p className="eyebrow">New record</p><h3>Add {page}</h3></div><button onClick={onClose}>Close</button></div>{success?<div className="provision-success"><p className="auth-success">User and authentication account created successfully.</p><p><strong>Username:</strong> {success.email}</p><p><strong>Role:</strong> {label(success.role)}</p><p><strong>Organisation:</strong> {success.organization}</p><p><strong>Temporary password:</strong> password</p><button onClick={onClose}>Done</button></div>:<form className="record-form" onSubmit={submit}>
  {page==='Employees'&&<><select name="role" required><option value="employee">Normal staff member</option><option value="site_operator">Onsite technician</option><option value="technician">Field technician</option><option value="senior_technician">Senior technician</option></select><input name="employee_number" placeholder="Employee number" required/><input name="first_name" placeholder="First name" required/><input name="last_name" placeholder="Last name" required/><input name="work_email" type="email" placeholder="Work email (login username)" required/><select name="primary_site_id"><option value="">No primary site</option>{data.sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></>}
  {page==='Sites'&&<><input name="code" placeholder="Site code" required/><input name="name" placeholder="Site name" required/><input name="city" placeholder="City"/><input name="province" placeholder="Province"/></>}
  {page==='Tasks'&&<><input name="title" placeholder="Task title" required/><textarea name="description" placeholder="Description"/>{siteOptions}<select name="machine_id"><option value="">No machine</option>{data.machines.map(m=><option key={m.id} value={m.id}>{m.asset_number} · {m.display_name}</option>)}</select><select name="priority"><option value="p1_critical">P1 Critical</option><option value="p2_high">P2 High</option><option value="p3_medium">P3 Medium</option><option value="p4_low">P4 Low</option></select></>}
  {page==='Incidents'&&<><input name="title" placeholder="Incident title" required/><textarea name="description" placeholder="Description"/>{siteOptions}<select name="machine_id"><option value="">No machine</option>{data.machines.map(m=><option key={m.id} value={m.id}>{m.asset_number} · {m.display_name}</option>)}</select><select name="severity"><option value="critical">Critical</option><option value="high">High</option><option value="warning">Warning</option><option value="info">Info</option></select></>}
  {error&&<p className="auth-error">{error}</p>}<button type="submit" disabled={saving}>{saving?'Saving…':'Save record'}</button>
 </form>}</section></div>;
}

export function OperationsPage({page,data,search,error,refresh,update,create}:Props){
 const[showCreate,setShowCreate]=useState(false);
 const rows=useMemo(()=>({Employees:data.employees,'Cards & Benefits':data.cards,Sites:data.sites,Tasks:data.tasks,Incidents:data.incidents} as Record<string,Row[]>)[page]?.filter(r=>matches(r,search))??[],[page,data,search]);
 if(page==='Reports'){
  const approved=data.transactions.filter(t=>t.result==='approved');const revenue=approved.reduce((s,t)=>s+Number(t.gross_amount||0),0);const benefit=approved.reduce((s,t)=>s+Number(t.benefit_amount||0),0);
  return <><div className="page-toolbar"><div><p className="eyebrow">Live reporting</p><h2>Operational reports</h2></div><CsvButton rows={data.transactions} name="nayax-transactions"/></div><div className="report-grid"><article className="report-card"><span>Transactions</span><strong>{data.transactions.length}</strong></article><article className="report-card"><span>Gross value</span><strong>R {revenue.toFixed(2)}</strong></article><article className="report-card"><span>Benefit value</span><strong>R {benefit.toFixed(2)}</strong></article><article className="report-card"><span>Open work</span><strong>{data.tasks.filter(t=>!['closed','cancelled'].includes(t.status)).length}</strong></article></div></>;
 }
 const canCreate=['Employees','Cards & Benefits','Sites','Tasks','Incidents'].includes(page);
 return <><div className="page-toolbar"><div><p className="eyebrow">Supabase live data</p><h2>{page}</h2><p>{rows.length} visible records</p></div><div>{canCreate&&<button onClick={()=>setShowCreate(true)}><Plus size={16}/>{page==='Cards & Benefits'?'Assign card':'Add'}</button>}<button onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh</button><CsvButton rows={rows} name={page.toLowerCase().replace(/\W+/g,'-')}/></div></div>{error&&<p className="auth-error">{error}</p>}<section className="panel operations-table">
  {page==='Employees'&&<Table headers={['Employee','Email','Status','Benefit','Site']} rows={rows.map(r=>[`${r.first_name} ${r.last_name}`,r.work_email??r.employee_number,<StatusSelect value={r.employment_status} options={['pending','active','suspended','on_leave','terminated','contract_ended','archived']} onChange={v=>update('employees',r.id,{employment_status:v})}/>,<button className="mini-button" onClick={()=>void update('employees',r.id,{benefit_eligible:!r.benefit_eligible})}>{r.benefit_eligible?'Eligible':'Not eligible'}</button>,r.primary_site?.name??'—'])}/>}
  {page==='Cards & Benefits'&&<Table headers={['Card','Assigned employee','Employee no.','Type','Status','Last used']} rows={rows.map(r=>{const assignment=(r.assignments??[]).find((a:Row)=>['pending','active'].includes(a.assignment_status)&&!a.valid_to);const employee=assignment?.employee;return [<><strong>{r.masked_identifier}</strong><small>{r.credential_reference??'No reference'}</small></>,employee?`${employee.first_name} ${employee.last_name}`:'Unassigned',employee?.employee_number??'—',label(r.card_type??'employee'),<StatusSelect value={r.status} options={['unassigned','pending_activation','active','suspended','lost','stolen','replaced','expired','revoked','archived']} onChange={v=>update('access_cards',r.id,{status:v})}/>,when(r.last_used_at)]})}/>}
  {page==='Sites'&&<Table headers={['Code','Site','Location','Contact','Active']} rows={rows.map(r=>[r.code,r.name,[r.suburb,r.city,r.province].filter(Boolean).join(', ')||'—',r.client_contact_name??r.client_contact_email??'—',<button className="mini-button" onClick={()=>void update('sites',r.id,{is_active:!r.is_active})}>{r.is_active?'Active':'Inactive'}</button>])}/>}
  {page==='Tasks'&&<Table headers={['Task','Title','Priority','Status','Site','Assigned']} rows={rows.map(r=>[`WO-${r.task_number}`,r.title,label(r.priority),<StatusSelect value={r.status} options={['new','awaiting_triage','assigned','accepted','en_route','on_site','in_progress','awaiting_client_access','awaiting_parts','awaiting_specialist','resolved','pending_verification','closed','cancelled']} onChange={v=>update('service_tasks',r.id,{status:v})}/>,r.site?.name??r.machine?.asset_number??'—',r.assignee?`${r.assignee.first_name} ${r.assignee.last_name}`:'Unassigned'])}/>}
  {page==='Incidents'&&<Table headers={['Incident','Title','Severity','Status','Machine','Detected']} rows={rows.map(r=>[`INC-${r.incident_number}`,r.title,label(r.severity),<StatusSelect value={r.status} options={['open','acknowledged','investigating','mitigated','resolved','closed','cancelled']} onChange={v=>update('incidents',r.id,{status:v})}/>,r.machine?.asset_number??r.site?.name??'—',when(r.detected_at)])}/>} 
 </section>{showCreate&&(page==='Cards & Benefits'?<CardAssignmentModal data={data} onClose={()=>setShowCreate(false)} onSaved={refresh}/>:<QuickCreate page={page} data={data} create={create} refresh={refresh} onClose={()=>setShowCreate(false)}/>)}</>;
}

function Table({headers,rows}:{headers:string[];rows:ReactNode[][]}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>):<tr><td colSpan={headers.length} className="empty-state">No records found.</td></tr>}</tbody></table></div>}
