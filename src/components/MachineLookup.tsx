import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Search, X } from 'lucide-react';
import type { Row } from '../hooks/useOperationsData';

type Props={machines:Row[];onClose:()=>void;onFound:(machine:Row)=>void};
export function MachineLookup({machines,onClose,onFound}:Props){
  const [query,setQuery]=useState(''); const [message,setMessage]=useState<string|null>(null); const video=useRef<HTMLVideoElement>(null);
  function find(value:string){const q=value.trim().toLowerCase();const machine=machines.find(m=>[m.id,m.asset_number,m.serial_number,m.display_name].some(v=>String(v??'').toLowerCase()===q)||String(m.asset_number??'').toLowerCase().includes(q));if(machine)onFound(machine);else setMessage('No authorised machine matched that QR value or asset number.');}
  function submit(e:FormEvent){e.preventDefault();find(query)}
  useEffect(()=>()=>{const stream=video.current?.srcObject as MediaStream|null;stream?.getTracks().forEach(track=>track.stop())},[]);
  async function scan(){setMessage(null);try{const Detector=(window as any).BarcodeDetector;if(!Detector){setMessage('Camera QR scanning is not supported by this browser. Use the asset lookup field.');return;}const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});if(!video.current)return;video.current.srcObject=stream;await video.current.play();const detector=new Detector({formats:['qr_code']});const timer=window.setInterval(async()=>{if(!video.current)return;const codes=await detector.detect(video.current);if(codes[0]?.rawValue){window.clearInterval(timer);stream.getTracks().forEach(t=>t.stop());find(codes[0].rawValue)}},500);}catch(err){setMessage(err instanceof Error?err.message:'Camera could not be started.')}}
  return <div className="modal-backdrop"><section className="modal-card scanner-card"><div className="panel-head"><div><p className="eyebrow">Machine verification</p><h3>Scan or find machine</h3></div><button onClick={onClose}><X size={17}/>Close</button></div><video ref={video} className="scanner-video" muted playsInline/><button onClick={()=>void scan()}><Camera size={17}/>Start QR camera</button><div className="divider"><span>or</span></div><form className="lookup-form" onSubmit={submit}><div className="auth-input"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Asset, serial number or QR value" required/></div><button type="submit">Find machine</button></form>{message&&<p className="auth-error">{message}</p>}</section></div>;
}
