import { FormEvent, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import type { OperationsData, Row } from '../hooks/useOperationsData';

type Props = {
  page: string; data: OperationsData; search: string; error: string | null;
  refresh: () => Promise<void>; update: (table:string,id:string,changes:Row)=>Promise<void>; create: (table:string,values:Row)=>Promise<void>;
};

function text(value: unknown) { return value == null || value === '' ? '—' : String(value); }
function date(value: unknown) { return value ? new Date(String(value)).toLocaleString('en-ZA') : '—'; }
function title(value: string) { return value.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function includesSearch(row: Row, query: string) { return !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()); }

function CsvButton({ rows, name }: { rows: Row[]; name: string }) {
  function download() {
    if (!rows.length) return;
    const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row).filter(key => typeof row[key] !== 'object'))));
    const csv = [keys.join(','), ...rows.map(row => keys.map(key => `"${String(row[key] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a = document.createElement('a'); a.href=url; a.download=`${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <button onClick={download} disabled={!rows.length}><Download size={16}/>Export CSV</button>;
}

function StatusSelect({ value, options, onChange }: { value:string; options:string[]; onChange:(value:string)=>Promise<void> }) {
  const [busy,setBusy]=useState(false);
  return <select value={value} disabled={busy} onChange={async e=>{setBusy(true);try{await onChange(e.target.value)}finally{setBusy(false)}}}>{options.map(o=><option key={o} value={o}>{title(o)}</option>)}</select>;
}

function QuickCreate({ page, data, create, onClose }: { page:string; data:OperationsData; create:Props['create']; onClose:()=>void }) {
  const [saving,setSaving]=useState(false); const [error,setError]=useState<string|null>(null);
  const membership=data.memberships[0]; const provider=membership?.organization_id;
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError(null);const form=new FormData(e.currentTarget);const v=Object.fromEntries(form.entries());
    try{
      if(page==='Employees') await create('employees',{organization_id:provider,employee_number:v.employee_number,first_name:v.first_name,last_name:v.last_name,work_email:v.work_email||null,employment_status:'active',benefit_eligible:true});
      if(page==='Sites') await create('sites',{provider_organization_id:provider,client_organization_id:provider,code:v.code,name:v.name,city:v.city||null,province:v.province||null,is_active:true});
      if(page==='Machines') await create('machines',{provider_organization_id:provider,client_organization_id:provider,site_id:v.site_id||null,asset_number:v.asset_number,display_name:v.display_name,status:'active',is_active:true});
      if(page==='Tasks') await create('service_tasks',{provider_organization_id:provider,client_organization_id:provider,title:v.title,description:v.description||null,priority:v.priority||'p3_medium',status:'open',source:'manual'});
      if(page==='Incidents') await create('incidents',{provider_organization_id:provider,client_organization_id:provider,title:v.title,description:v.description||null,severity:v.severity||'medium',status:'open',detected_at:new Date().toISOString()});
      if(page==='Cards & Benefits') await create('access_cards',{organization_id:provider,credential_reference:v.credential_reference,masked_identifier:v.masked_identifier||null,card_type:v.card_type||'employee',status:'active'});
      onClose();
    }catch(err){setError(err instanceof Error?err.message:'Could not save record');}finally{setSaving(false)}
  }
  return <div className="modal-backdrop"><section className="modal-card"><div className="panel-head"><div><p className="eyebrow">New record</p><h3>Add {page}</h3></div><button onClick={onClose}>Close</button></div><form className="record-form" onSubmit={submit}>
    {page==='Employees'&&<><input name="employee_number" placeholder="Employee number" required/><input name="first_name" placeholder="First name" required/><input name="last_name" placeholder="Last name" required/><input name="work_email" type="email" placeholder="Work email"/></>}
    {page==='Sites'&&<><input name="code" placeholder="Site code" required/><input name="name" placeholder="Site name" required/><input name="city" placeholder="City"/><input name="province" placeholder="Province"/></>}
    {page==='Machines'&&<><input name="asset_number" placeholder="Asset number" required/><input name="display_name" placeholder="Display name" required/><select name="site_id"><option value="">No site</option>{data.sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></>}
    {page==='Tasks'&&<><input name="title" placeholder="Task title" required/><textarea name="description" placeholder="Description"/><select name="priority"><option value="p1_critical">P1 Critical</option><option value="p2_high">P2 High</option><option value="p3_medium">P3 Medium</option><option value="p4_low">P4 Low</option></select></>}
    {page==='Incidents'&&<><input name="title" placeholder="Incident title" required/><textarea name="description" placeholder="Description"/><select name="severity"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></>}
    {page==='Cards & Benefits'&&<><input name="credential_reference" placeholder="Credential reference" required/><input name="masked_identifier" placeholder="Masked identifier"/><input name="card_type" placeholder="Card type"/></>}
    {error&&<p className="auth-error">{error}</p>}<button type="submit" disabled={saving}>{saving?'Saving…':'Save record'}</button>
  </form></section></div>;
}

export function OperationsPage({page,data,search,error,refresh,update,create}:Props){
  const [showCreate,setShowCreate]=useState(false);
  const rows=useMemo(()=>({
    Employees:data.employees,'Cards & Benefits':data.cards,Sites:data.sites,Machines:data.machines,Tasks:data.tasks,Incidents:data.incidents
  } as Record<string,Row[]>)[page]?.filter(r=>includesSearch(r,search))??[],[page,data,search]);

  if(page==='Reports'){
    const approved=data.transactions.filter(t=>t.result==='approved'); const revenue=approved.reduce((s,t)=>s+Number(t.gross_amount||0),0); const benefit=approved.reduce((s,t)=>s+Number(t.benefit_amount||0),0);
    return <><div className="page-toolbar"><div><p className="eyebrow">Live reporting</p><h2>Operational reports</h2></div><CsvButton rows={data.transactions} name="nayax-transactions"/></div><div className="report-grid">
      <article className="report-card"><span>Transactions</span><strong>{data.transactions.length}</strong><small>{approved.length} approved</small></article>
      <article className="report-card"><span>Gross value</span><strong>R {revenue.toFixed(2)}</strong><small>Loaded transaction window</small></article>
      <article className="report-card"><span>Benefit value</span><strong>R {benefit.toFixed(2)}</strong><small>Employee coffee benefit</small></article>
      <article className="report-card"><span>Open work</span><strong>{data.tasks.filter(t=>!['closed','cancelled'].includes(t.status)).length}</strong><small>{data.incidents.filter(i=>!['closed','cancelled'].includes(i.status)).length} incidents</small></article>
    </div><section className="panel"><div className="panel-head"><div><p className="eyebrow">Nayax</p><h3>Recent transactions</h3></div></div><Table headers={['Date','Employee','Machine','Product','Benefit','Result']} rows={data.transactions.slice(0,50).map(t=>[date(t.occurred_at),t.employee?`${t.employee.first_name} ${t.employee.last_name}`:'—',t.machine?.asset_number??'—',t.product_name??'—',`R ${Number(t.benefit_amount||0).toFixed(2)}`,title(t.result)])}/></section></>;
  }

  const canCreate=['Employees','Cards & Benefits','Sites','Machines','Tasks','Incidents'].includes(page);
  return <><div className="page-toolbar"><div><p className="eyebrow">Supabase live data</p><h2>{page}</h2><p>{rows.length} visible record{rows.length===1?'':'s'}</p></div><div>{canCreate&&<button onClick={()=>setShowCreate(true)}><Plus size={16}/>Add</button>}<button onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh</button><CsvButton rows={rows} name={page.toLowerCase().replace(/\W+/g,'-')}/></div></div>{error&&<p className="auth-error">{error}</p>}
    <section className="panel operations-table">{page==='Employees'&&<Table headers={['Employee','Email','Status','Benefit','Site']} rows={rows.map(r=>[`${r.first_name} ${r.last_name}`,r.work_email??r.employee_number,<StatusSelect value={r.employment_status} options={['active','inactive','suspended','terminated']} onChange={v=>update('employees',r.id,{employment_status:v})}/>,<button className="mini-button" onClick={()=>void update('employees',r.id,{benefit_eligible:!r.benefit_eligible})}>{r.benefit_eligible?'Eligible':'Not eligible'}</button>,r.primary_site?.name??'—'])}/>} 
    {page==='Cards & Benefits'&&<Table headers={['Reference','Identifier','Type','Status','Last used']} rows={rows.map(r=>[r.credential_reference,r.masked_identifier??'—',r.card_type??'—',<StatusSelect value={r.status} options={['active','inactive','suspended','lost','stolen','expired']} onChange={v=>update('access_cards',r.id,{status:v})}/>,date(r.last_used_at)])}/>} 
    {page==='Sites'&&<Table headers={['Code','Site','Location','Contact','Active']} rows={rows.map(r=>[r.code,r.name,[r.suburb,r.city,r.province].filter(Boolean).join(', ')||'—',r.client_contact_name??r.client_contact_email??'—',<button className="mini-button" onClick={()=>void update('sites',r.id,{is_active:!r.is_active})}>{r.is_active?'Active':'Inactive'}</button>])}/>} 
    {page==='Machines'&&<Table headers={['Asset','Machine','Site','Status','Last communication','Next service']} rows={rows.map(r=>[r.asset_number,r.display_name,r.site?.name??'—',<StatusSelect value={r.status} options={['active','inactive','offline','maintenance','decommissioned']} onChange={v=>update('machines',r.id,{status:v})}/>,date(r.last_communication_at),date(r.next_service_due_at)])}/>} 
    {page==='Tasks'&&<Table headers={['Task','Title','Priority','Status','Site','Assigned']} rows={rows.map(r=>[`WO-${r.task_number}`,r.title,title(r.priority),<StatusSelect value={r.status} options={['open','acknowledged','assigned','accepted','in_progress','resolved','verified','closed','cancelled']} onChange={v=>update('service_tasks',r.id,{status:v,...(v==='resolved'?{resolved_at:new Date().toISOString()}:{}),...(v==='closed'?{closed_at:new Date().toISOString()}:{} )})}/>,r.site?.name??r.machine?.asset_number??'—',r.assignee?`${r.assignee.first_name} ${r.assignee.last_name}`:'Unassigned'])}/>} 
    {page==='Incidents'&&<Table headers={['Incident','Title','Severity','Status','Machine','Detected']} rows={rows.map(r=>[`INC-${r.incident_number}`,r.title,title(r.severity),<StatusSelect value={r.status} options={['open','acknowledged','investigating','mitigated','resolved','closed','cancelled']} onChange={v=>update('incidents',r.id,{status:v,...(v==='resolved'?{resolved_at:new Date().toISOString()}:{} )})}/>,r.machine?.asset_number??r.site?.name??'—',date(r.detected_at)])}/>}</section>
    {showCreate&&<QuickCreate page={page} data={data} create={create} onClose={()=>setShowCreate(false)}/>}</>;
}

function Table({headers,rows}:{headers:string[];rows:(unknown|JSX.Element)[][]}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{typeof c==='string'||typeof c==='number'?text(c):c as JSX.Element}</td>)}</tr>):<tr><td colSpan={headers.length} className="empty-state">No records found.</td></tr>}</tbody></table></div>}
