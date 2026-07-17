import { AlertTriangle, CheckCircle2, CircleDashed, RefreshCw, ShieldCheck } from 'lucide-react';
import type { OperationsData } from '../hooks/useOperationsData';

type Props={data:OperationsData;error:string|null;refresh:()=>Promise<void>};
const label=(v:string)=>v.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const when=(v:unknown)=>v?new Date(String(v)).toLocaleString('en-ZA'):'Never';

export function IntegrationControlPage({data,error,refresh}:Props){
 const lynx=data.integrationConnections.find(x=>String(x.integration_name).toLowerCase().includes('lynx')||String(x.integration_type).toLowerCase().includes('lynx'));
 const cortina=data.integrationConnections.find(x=>String(x.integration_name).toLowerCase().includes('cortina')||String(x.integration_type).toLowerCase().includes('cortina'));
 const linked=data.nayaxCardLinks.filter(x=>x.link_status==='active').length;
 const pending=data.nayaxCardLinks.filter(x=>x.link_status==='pending'||x.last_sync_status==='processing').length;
 const failed=data.nayaxCardLinks.filter(x=>x.last_sync_error||x.last_sync_status==='failed').length;
 const successfulVends=data.transactions.filter(x=>x.result==='approved'&&x.vend_success===true).length;
 return <div className="integration-control">
  <div className="page-toolbar"><div><p className="eyebrow">Website + Lynx + Cortina</p><h2>Nayax integration control</h2><p>Local assignment, management synchronisation and real-time entitlement are tracked as separate states.</p></div><button onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh</button></div>
  {error&&<p className="auth-error">{error}</p>}
  <div className="integration-summary">
   <article><span>Cards confirmed in Lynx</span><strong>{linked}</strong><small>{pending} pending · {failed} failed review</small></article>
   <article><span>Cortina successful vends</span><strong>{successfulVends}</strong><small>Only successful eligible dispenses consume allowance</small></article>
   <article><span>Local card assignments</span><strong>{data.cards.filter(c=>(c.assignments??[]).some((a:any)=>['active','pending'].includes(a.assignment_status))).length}</strong><small>Local assignment does not by itself confirm Nayax readiness</small></article>
  </div>
  <div className="integration-grid">
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">Control plane</p><h3>Nayax Lynx</h3></div>{lynx?.status==='operational'?<CheckCircle2/>:<CircleDashed/>}</div><p>Creates, updates, suspends and reconciles Nayax card and terminal records.</p><dl><div><dt>Status</dt><dd>{lynx?label(lynx.status):'Not configured'}</dd></div><div><dt>Last success</dt><dd>{when(lynx?.last_success_at)}</dd></div><div><dt>Last error</dt><dd>{lynx?.last_error??'None recorded'}</dd></div></dl></section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">Transaction plane</p><h3>Nayax Cortina</h3></div>{cortina?.status==='operational'?<CheckCircle2/>:<CircleDashed/>}</div><p>Requests a real-time approve or decline decision for each closed-loop card transaction.</p><dl><div><dt>Status</dt><dd>{cortina?label(cortina.status):'Not configured'}</dd></div><div><dt>Last success</dt><dd>{when(cortina?.last_success_at)}</dd></div><div><dt>Last error</dt><dd>{cortina?.last_error??'None recorded'}</dd></div></dl></section>
  </div>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">Card lifecycle</p><h3>Local-to-Nayax status</h3></div></div><div className="table-wrap"><table><thead><tr><th>Card</th><th>Local owner</th><th>Local status</th><th>Lynx link</th><th>Last sync</th><th>Exception</th></tr></thead><tbody>{data.cards.length?data.cards.map(card=>{const owner=(card.assignments??[]).find((a:any)=>['active','pending'].includes(a.assignment_status))?.employee;const link=data.nayaxCardLinks.find(x=>x.access_card_id===card.id);return <tr key={card.id}><td><strong>{card.masked_identifier}</strong><small>{card.credential_reference}</small></td><td>{owner?`${owner.first_name} ${owner.last_name}`:'Unassigned'}</td><td>{label(card.status)}</td><td>{link?label(link.link_status):'Not provisioned'}</td><td>{link?.last_sync_status?label(link.last_sync_status):'No sync recorded'}</td><td>{link?.last_sync_error??'—'}</td></tr>}):<tr><td colSpan={6} className="empty-state">No cards loaded.</td></tr>}</tbody></table></div></section>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">Production gates</p><h3>Required confirmations</h3></div><ShieldCheck/></div><div className="gate-list">
   {['Exact MIFARE family, identifier and key ownership','Nayax reader model, firmware and closed-loop compatibility','Cortina Prepaid availability and certification requirements','Lynx card permissions, fields, limits and commercial access'].map((x,i)=><div key={x}><AlertTriangle size={17}/><strong>{i<2?'Blocking':'High priority'}</strong><span>{x}</span></div>)}
  </div></section>
 </div>
}
