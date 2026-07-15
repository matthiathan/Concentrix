import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LoaderCircle, RefreshCw, Upload, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type CsvRow = Record<string, string>;
type ImportJob = {
  id: string;
  file_name: string;
  status: string;
  total_rows: number;
  uploaded_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_at: string;
  error_message?: string | null;
};

type Props = { organizationId?: string; onClose: () => void };

const TARGET_FIELDS = [
  ['employee_number', 'Employee number'],
  ['first_name', 'First name'],
  ['last_name', 'Last name'],
  ['preferred_name', 'Preferred name'],
  ['work_email', 'Work email'],
  ['phone', 'Phone'],
  ['department', 'Department'],
  ['team', 'Team'],
  ['primary_site', 'Primary site'],
  ['employment_status', 'Employment status'],
  ['benefit_eligible', 'Benefit eligible'],
  ['card_uid', 'Security card UID'],
  ['external_hr_reference', 'External HR reference'],
  ['external_access_reference', 'External access reference'],
] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  employee_number: ['employee number','employee no','employee id','staff number','staff no','personnel number','personnel no','emp number','emp no','sap id'],
  first_name: ['first name','firstname','given name','forename'],
  last_name: ['last name','lastname','surname','family name'],
  preferred_name: ['preferred name','known as','display name'],
  work_email: ['work email','email','email address','business email'],
  phone: ['phone','phone number','mobile','mobile number','cell','cellphone'],
  department: ['department','dept','division','business unit'],
  team: ['team','cost centre','cost center'],
  primary_site: ['primary site','site','location','office','branch'],
  employment_status: ['employment status','employee status','status'],
  benefit_eligible: ['benefit eligible','coffee benefit','eligible','entitled'],
  card_uid: ['card uid','card id','card number','security card','badge number','badge id','credential'],
  external_hr_reference: ['hr reference','hr id','external hr reference'],
  external_access_reference: ['access reference','access id','external access reference'],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ');
}

function inferMapping(headers: string[]) {
  const mapping: Record<string, string> = {};
  for (const [target] of TARGET_FIELDS) {
    const aliases = FIELD_ALIASES[target] ?? [];
    const match = headers.find(header => aliases.includes(normalizeHeader(header)));
    if (match) mapping[target] = match;
  }
  return mapping;
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      record.push(field); field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      record.push(field); field = '';
      if (record.some(value => value.trim() !== '')) records.push(record);
      record = [];
    } else field += character;
  }
  record.push(field);
  if (record.some(value => value.trim() !== '')) records.push(record);
  if (!records.length) throw new Error('The CSV file is empty.');

  const headers = records[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  if (new Set(headers.map(normalizeHeader)).size !== headers.length) throw new Error('The CSV contains duplicate column headings.');
  const rows = records.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? '').trim()])));
  return { headers, rows };
}

function normalizeBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (['yes','y','true','1','active','eligible'].includes(normalized)) return true;
  if (['no','n','false','0','inactive','not eligible'].includes(normalized)) return false;
  return value || null;
}

function normalizedRow(row: CsvRow, mapping: Record<string, string>) {
  const output: Record<string, unknown> = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (!source) continue;
    output[target] = target === 'benefit_eligible' ? normalizeBoolean(row[source] ?? '') : (row[source] ?? '').trim() || null;
  }
  return output;
}

function validateRow(row: CsvRow, mapping: Record<string, string>) {
  const errors: string[] = [];
  for (const required of ['employee_number','first_name','last_name']) {
    const source = mapping[required];
    if (source && !(row[source] ?? '').trim()) errors.push(`${required.replace(/_/g,' ')} is blank`);
  }
  const emailSource = mapping.work_email;
  const email = emailSource ? (row[emailSource] ?? '').trim() : '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('work email is invalid');
  return errors;
}

export function StaffImportPage({ organizationId, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const validation = useMemo(() => rows.map(row => validateRow(row, mapping)), [rows, mapping]);
  const invalidCount = validation.filter(errors => errors.length).length;
  const requiredMapped = ['employee_number','first_name','last_name'].every(field => Boolean(mapping[field]));

  async function loadJobs() {
    if (!organizationId) return;
    setLoadingJobs(true);
    const { data, error: queryError } = await supabase.from('staff_import_jobs').select('id,file_name,status,total_rows,uploaded_rows,valid_rows,invalid_rows,created_at,error_message').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20);
    setLoadingJobs(false);
    if (queryError) setError(queryError.message);
    else setJobs((data ?? []) as ImportJob[]);
  }

  useEffect(() => { void loadJobs(); }, [organizationId]);

  async function readFile(selected: File) {
    setError(null);
    if (!selected.name.toLowerCase().endsWith('.csv')) { setError('Choose a .csv file.'); return; }
    if (selected.size > 50 * 1024 * 1024) { setError('The CSV exceeds the 50 MB browser import limit.'); return; }
    try {
      const parsed = parseCsv((await selected.text()).replace(/^\uFEFF/, ''));
      if (parsed.rows.length > 100000) throw new Error('This importer supports up to 100,000 rows per file.');
      setFile(selected); setHeaders(parsed.headers); setRows(parsed.rows); setMapping(inferMapping(parsed.headers)); setProgress(0);
    } catch (parseError) { setError(parseError instanceof Error ? parseError.message : 'Could not parse the CSV file.'); }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) { const selected = event.target.files?.[0]; if (selected) void readFile(selected); }
  function dropFile(event: DragEvent<HTMLDivElement>) { event.preventDefault(); const selected = event.dataTransfer.files?.[0]; if (selected) void readFile(selected); }

  async function stageImport() {
    if (!organizationId || !file || !rows.length) return;
    if (!requiredMapped) { setError('Map employee number, first name and last name before staging the file.'); return; }
    setUploading(true); setError(null); setProgress(0);
    let jobId: string | null = null;
    try {
      const { data: job, error: jobError } = await supabase.from('staff_import_jobs').insert({
        organization_id: organizationId,
        file_name: file.name,
        file_size_bytes: file.size,
        detected_headers: headers,
        column_mapping: mapping,
        status: 'uploading',
        total_rows: rows.length,
        valid_rows: rows.length - invalidCount,
        invalid_rows: invalidCount,
      }).select('id').single();
      if (jobError) throw jobError;
      jobId = job.id;

      const chunkSize = 250;
      for (let start = 0; start < rows.length; start += chunkSize) {
        const chunk = rows.slice(start, start + chunkSize).map((row, offset) => {
          const rowErrors = validation[start + offset];
          return {
            import_job_id: jobId,
            row_number: start + offset + 2,
            raw_data: row,
            normalized_data: normalizedRow(row, mapping),
            validation_errors: rowErrors,
            import_status: rowErrors.length ? 'invalid' : 'valid',
          };
        });
        const { error: rowsError } = await supabase.from('staff_import_rows').insert(chunk);
        if (rowsError) throw rowsError;
        const uploadedRows = Math.min(start + chunk.length, rows.length);
        setProgress(Math.round((uploadedRows / rows.length) * 100));
        const { error: progressError } = await supabase.from('staff_import_jobs').update({ uploaded_rows: uploadedRows, updated_at: new Date().toISOString() }).eq('id', jobId);
        if (progressError) throw progressError;
      }

      const { error: completeError } = await supabase.from('staff_import_jobs').update({ status: invalidCount ? 'staged' : 'ready', uploaded_rows: rows.length, updated_at: new Date().toISOString() }).eq('id', jobId);
      if (completeError) throw completeError;
      setFile(null); setHeaders([]); setRows([]); setMapping({}); setProgress(100);
      await loadJobs();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'The import could not be staged.';
      setError(message);
      if (jobId) await supabase.from('staff_import_jobs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', jobId);
    } finally { setUploading(false); }
  }

  return <div className="import-workspace">
    <div className="page-toolbar"><div><p className="eyebrow">Bulk onboarding</p><h2>Staff CSV import</h2><p>Stage variable-format staff files safely before the final Concentrix mapping is confirmed.</p></div><button onClick={onClose}>Back to employees</button></div>
    {!organizationId && <div className="data-error"><AlertTriangle size={18}/><span>No active organisation membership was found.</span></div>}
    {error && <div className="data-error"><AlertTriangle size={18}/><span>{error}</span></div>}

    <section className="panel import-panel">
      <div className="import-dropzone" onDragOver={event=>event.preventDefault()} onDrop={dropFile}>
        <FileSpreadsheet size={36}/><h3>{file ? file.name : 'Drop the staff CSV here'}</h3><p>{file ? `${rows.length.toLocaleString()} data rows · ${(file.size/1024/1024).toFixed(2)} MB` : 'CSV files up to 50 MB and 100,000 rows'}</p>
        <label className="upload-button"><Upload size={17}/>Choose CSV<input type="file" accept=".csv,text/csv" onChange={chooseFile}/></label>
      </div>
    </section>

    {rows.length > 0 && <>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Column mapping</p><h3>Match CSV columns to staff fields</h3></div><span className={requiredMapped?'mapping-ok':'mapping-warning'}>{requiredMapped?<><CheckCircle2 size={16}/>Required fields mapped</>:<><AlertTriangle size={16}/>Required fields missing</>}</span></div>
        <div className="mapping-grid">{TARGET_FIELDS.map(([target,label])=><label key={target}><span>{label}{['employee_number','first_name','last_name'].includes(target)&&' *'}</span><select value={mapping[target]??''} onChange={event=>setMapping(current=>({...current,[target]:event.target.value}))}><option value="">Not mapped</option>{headers.map(header=><option key={header} value={header}>{header}</option>)}</select></label>)}</div>
      </section>

      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Validation preview</p><h3>{(rows.length-invalidCount).toLocaleString()} valid · {invalidCount.toLocaleString()} need review</h3></div><button disabled={uploading||!organizationId||!requiredMapped} onClick={()=>void stageImport()}>{uploading?<><LoaderCircle className="spin" size={17}/>Staging {progress}%</>:<><Upload size={17}/>Stage {rows.length.toLocaleString()} rows</>}</button></div>
        {uploading&&<div className="progress-track"><div style={{width:`${progress}%`}}/></div>}
        <div className="table-wrap"><table><thead><tr><th>CSV row</th>{headers.slice(0,6).map(header=><th key={header}>{header}</th>)}<th>Validation</th></tr></thead><tbody>{rows.slice(0,10).map((row,index)=><tr key={index}><td>{index+2}</td>{headers.slice(0,6).map(header=><td key={header}>{row[header]||'—'}</td>)}<td>{validation[index].length?<span className="import-invalid"><XCircle size={14}/>{validation[index].join(', ')}</span>:<span className="import-valid"><CheckCircle2 size={14}/>Valid</span>}</td></tr>)}</tbody></table></div><p className="preview-note">Showing the first 10 rows. The complete file is validated and staged in batches of 250.</p>
      </section>
    </>}

    <section className="panel"><div className="panel-head"><div><p className="eyebrow">Import history</p><h3>Recent staff files</h3></div><button onClick={()=>void loadJobs()} disabled={loadingJobs}><RefreshCw className={loadingJobs?'spin':''} size={16}/>Refresh</button></div>
      <div className="table-wrap"><table><thead><tr><th>File</th><th>Status</th><th>Rows</th><th>Valid</th><th>Invalid</th><th>Uploaded</th><th>Created</th></tr></thead><tbody>{jobs.length?jobs.map(job=><tr key={job.id}><td><strong>{job.file_name}</strong>{job.error_message&&<small>{job.error_message}</small>}</td><td><span className={`import-status ${job.status}`}>{job.status}</span></td><td>{job.total_rows.toLocaleString()}</td><td>{job.valid_rows.toLocaleString()}</td><td>{job.invalid_rows.toLocaleString()}</td><td>{job.uploaded_rows.toLocaleString()}</td><td>{new Date(job.created_at).toLocaleString('en-ZA')}</td></tr>):<tr><td colSpan={7} className="empty-state">No staff files have been staged yet.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
