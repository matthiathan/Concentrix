import { FormEvent, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Search, UserRound, X } from 'lucide-react';
import type { OperationsData, Row } from '../hooks/useOperationsData';
import { supabase } from '../lib/supabase';

type Props = { data: OperationsData; onClose: () => void; onSaved: () => Promise<void> };

const normalizeUid = (value: string) => value.trim().replace(/[\s:-]/g, '').toUpperCase();
const maskUid = (value: string) => {
  const uid = normalizeUid(value);
  return uid ? `•••• •••• ${uid.slice(-4)}` : 'Waiting for card';
};

export function CardAssignmentModal({ data, onClose, onSaved }: Props) {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ employee: string; masked: string } | null>(null);
  const uidRef = useRef<HTMLInputElement>(null);

  const employees = useMemo(() => data.employees
    .filter(employee => ['active', 'pending', 'on_leave'].includes(employee.employment_status))
    .filter(employee => {
      const query = employeeQuery.trim().toLowerCase();
      return !query || [employee.first_name, employee.last_name, employee.employee_number, employee.work_email]
        .some(value => String(value ?? '').toLowerCase().includes(query));
    })
    .slice(0, 100), [data.employees, employeeQuery]);

  const selectedEmployee = data.employees.find(employee => employee.id === employeeId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const uid = normalizeUid(cardUid);
    if (!selectedEmployee) { setError('Select the employee who owns this card.'); return; }
    if (uid.length < 4) { setError('Scan or enter a valid card UID.'); return; }

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    const { data: result, error: functionError } = await supabase.functions.invoke('assign-access-card', { body: {
      employee_id: selectedEmployee.id,
      card_uid: uid,
      credential_reference: values.credential_reference,
      card_type: values.card_type,
      technology: values.technology,
      frequency: values.frequency,
      expires_at: values.expires_at || null,
      external_access_reference: values.external_access_reference,
      assignment_reason: values.assignment_reason,
      activate_immediately: values.activate_immediately === 'on',
    }});
    setSaving(false);
    if (functionError) { setError(functionError.message); return; }
    if (result?.error) { setError(result.error); return; }
    await onSaved();
    setSuccess({ employee: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`, masked: result.card.masked_identifier });
  }

  return <div className="modal-backdrop"><section className="modal-card card-assignment-modal">
    <div className="panel-head"><div><p className="eyebrow">Card onboarding</p><h3>Assign a security card</h3></div><button onClick={onClose}><X size={17}/>Close</button></div>
    {success ? <div className="assignment-success"><CheckCircle2 size={40}/><h3>Card assigned</h3><p><strong>{success.masked}</strong> now belongs to <strong>{success.employee}</strong>.</p><button onClick={onClose}>Done</button></div> : <form className="record-form card-assignment-form" onSubmit={submit}>
      <section className="assignment-step"><div className="step-number">1</div><div className="step-content"><div className="step-title"><UserRound size={18}/><div><strong>Choose the employee</strong><span>Search by name, employee number or email.</span></div></div><div className="auth-input"><Search size={17}/><input value={employeeQuery} onChange={event => setEmployeeQuery(event.target.value)} placeholder="Search employees…"/></div><select value={employeeId} onChange={event => setEmployeeId(event.target.value)} required><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {employee.employee_number}{employee.work_email ? ` · ${employee.work_email}` : ''}</option>)}</select>{selectedEmployee && <div className="employee-preview"><strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong><span>{selectedEmployee.employee_number} · {selectedEmployee.primary_site?.name ?? 'No primary site'}</span></div>}</div></section>
      <section className="assignment-step"><div className="step-number">2</div><div className="step-content"><div className="step-title"><CreditCard size={18}/><div><strong>Scan or enter the card</strong><span>A USB reader can type the UID directly into this field.</span></div></div><input ref={uidRef} name="card_uid" value={cardUid} onChange={event => setCardUid(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} placeholder="Tap card or enter UID" autoFocus required/><div className="card-preview"><CreditCard size={24}/><div><span>Card preview</span><strong>{maskUid(cardUid)}</strong></div></div></div></section>
      <section className="assignment-step"><div className="step-number">3</div><div className="step-content"><div className="step-title"><div><strong>Card details</strong><span>Optional metadata for access-control and support teams.</span></div></div><div className="form-grid"><input name="credential_reference" placeholder="Credential reference (optional)"/><select name="card_type" defaultValue="employee"><option value="employee">Employee card</option><option value="contractor">Contractor card</option><option value="temporary">Temporary card</option><option value="visitor">Visitor card</option></select><input name="technology" placeholder="Technology, e.g. MIFARE"/><input name="frequency" placeholder="Frequency, e.g. 13.56 MHz"/><input name="external_access_reference" placeholder="Access-control reference"/><label><span>Expiry date</span><input name="expires_at" type="datetime-local"/></label></div><textarea name="assignment_reason" defaultValue="New card issued" placeholder="Assignment reason"/><label className="checkbox-row"><input name="activate_immediately" type="checkbox" defaultChecked/><span>Activate this card immediately</span></label></div></section>
      {error && <p className="auth-error">{error}</p>}
      <div className="assignment-summary"><span>Assigning</span><strong>{maskUid(cardUid)}</strong><span>to</span><strong>{selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'No employee selected'}</strong></div>
      <button type="submit" disabled={saving || !selectedEmployee || normalizeUid(cardUid).length < 4}>{saving ? 'Assigning card…' : 'Assign card to employee'}</button>
    </form>}
  </section></div>;
}
