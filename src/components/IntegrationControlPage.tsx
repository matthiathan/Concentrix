import { AlertTriangle, CheckCircle2, CircleDashed, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { OperationsData } from '../hooks/useOperationsData';
import { supabase } from '../lib/supabase';
import './integration-control.css';

type Props={data:OperationsData;error:string|null;refresh:()=>Promise<void>};
const label=(v:string)=>v.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const when=(v:unknown)=>v?new Date(String(v)).toLocaleString('en-ZA'):'Never';

export function IntegrationControlPage({data,error,refresh}:Props){
 const[retrying,setRetrying]=useState<string|null>(null);
 const[actionError,setActionError]=useState<string|null>(null);
 const lynx=data.integrationConnections.find(x=>String(x.integration_name).toLowerCase().includes('lynx')||String(x.integration_type).toLowerCase().includes('lynx'));
 const cortina=data.integrationConnections.find(x=>String(x.integration_name).toLowerCase().includes('cortina')||String(x.integration_type).toLowerCase().includes('cortina'));
 const linked=data.nayaxCardLinks.filter(x=>x.link_status==='active').length;
 const pending=data.integrationOutbox.filter(x=>['pending','processing'].includes(x.status)).length;
 const failed=data.integrationOutbox.filter(x=>x.status==='failed_review').length;
 const successfulVends=data.transactions.filter(x=>x.result==='approved'&&x.vend_success===true).length;
 async function retry(id:string){setRetrying(id);setActionError(null);const{error:retryError}=await supabase.from('integration_outbox').update({status:'pending',attempts:0,next_retry_at:new Date().toISOString(),last_error:null,processed_at:null}).eq('id',id);setRetrying(null);if(retryError){setActionError(retryError.message);return}await refresh()}
 return <div className="integration-control">
  <div className="page-toolbar"><div><p className="eyebrow">Website + Lynx + Cortina</p><h2>Nayax integration control</h2><p>Local assignment, management synchronisation and real-time entitlement are tracked as separate states.</p></div><button onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh</button></div>
  {(error||actionError)&&<p className="auth-error">{error??actionError}</p>}
  <div className="integration-summary">
   <article><span>Cards confirmed in Lynx</span><strong>{linked}</strong><small>{pending} queued or processing · {failed} failed review</small></article>
   <article><span>Cortina successful vends</span><strong>{successfulVends}</strong><small>Only successful eligible dispenses consume allowance</small></article>
   <article><span>Local card assignments</span><strong>{data.cards.filter(c=>(c.assignments??[]).some((a:any)=>['active','pending'].includes(a.assignment_status))).length}</strong><small>Local assignment does not by itself confirm Nayax readiness</small></article>
  </div>
  <div className="integration-grid">
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">Control plane</p><h3>Nayax Lynx</h3></div>{lynx?.status==='operational'?<CheckCircle2/>:<CircleDashed/>}</div><p>Creates, updates, suspends and reconciles Nayax card and terminal records.</p><dl><div><dt>Status</dt><dd>{lynx?label(lynx.status):'Not configured'}</dd></div><div><dt>Last success</dt><dd>{when(lynx?.last_success_at)}</dd></div><div><dt>Last error</dt><dd>{lynx?.last_error??'None recorded'}</dd></div></dl></section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">Transaction plane</p><h3>Nayax Cortina</h3></div>{cortina?.status==='operational'?<CheckCircle2/>:<CircleDashed/>}</div><p>Requests a real-time approve or decline decision for each closed-loop card transaction.</p><dl><div><dt>Status</dt><dd>{cortina?label(cortina.status):'Not configured'}</dd></div><div><dt>Last success</dt><dd>{when(cortina?.last_success_at)}</dd></div><div><dt>Last error</dt><dd>{cortina?.last_error??'None recorded'}</dd></div></dl></section>
  </div>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">Durable workflow</p><h3>Lynx work queue</h3></div></div><div className="table-wrap"><table><thead><tr><th>Operation</th><th>State</th><th>Attempts</th><th>Created</th><th>Next retry</th><th>Correlation</th><th>Action</th></tr></thead><tbody>{data.integrationOutbox.length?data.integrationOutbox.map(item=><tr key={item.id}><td><strong>{label(item.operation)}</strong><small>{item.aggregate_type}</small></td><td><span className={`import-status ${item.status}`}>{label(item.status)}</span>{item.last_error&&<small>{item.last_error}</small>}</td><td>{item.attempts}</td><td>{when(item.created_at)}</td><td>{when(item.next_retry_at)}</td><td><code>{String(item.correlation_id).slice(0,8)}</code></td><td>{item.status==='failed_review'?<button className="mini-button" disabled={retrying===item.id} onClick={()=>void retry(item.id)}><RotateCcw size={14}/>{retrying===item.id?'Retrying…':'Retry'}</button>:'—'}</td></tr>):<tr><td colSpan={7} className="empty-state">No integration work has been queued yet.</td></tr>}</tbody></table></div></section>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">Card lifecycle</p><h3>Local-to-Nayax status</h3></div></div><div className="table-wrap"><table><thead><tr><th>Card</th><th>Local owner</th><th>Local status</th><th>Lynx link</th><th>Queued operation</th><th>Exception</th></tr></thead><tbody>{data.cards.length?data.cards.map(card=>{const owner=(card.assignments??[]).find((a:any)=>['active','pending'].includes(a.assignment_status))?.employee;const link=data.nayaxCardLinks.find(x=>x.access_card_id===card.id);const work=data.integrationOutbox.find(x=>x.aggregate_id===card.id&&['pending','processing','failed_review'].includes(x.status));return <tr key={card.id}><td><strong>{card.masked_identifier}</strong><small>{card.credential_reference}</small></td><td>{owner?`${owner.first_name} ${owner.last_name}`:'Unassigned'}</td><td>{label(card.status)}</td><td>{link?label(link.link_status):'Not provisioned'}</td><td>{work?`${label(work.operation)} · ${label(work.status)}`:'No open work'}</td><td>{work?.last_error??link?.last_sync_error??'—'}</td></tr>}):<tr><td colSpan={6} className="empty-state">No cards loaded.</td></tr>}</tbody></table></div></section>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">Production gates</p><h3>Required confirmations</h3></div><ShieldCheck/></div><div className="gate-list">
   {['Exact MIFARE family, identifier and key ownership','Nayax reader model, firmware and closed-loop compatibility','Cortina Prepaid availability and certification requirements','Lynx card permissions, fields, limits and commercial access'].map((x,i)=><div key={x}><AlertTriangle size={17}/><strong>{i<2?'Blocking':'High priority'}</strong><span>{x}</span></div>)}
  </div></section>
 </div>
}
