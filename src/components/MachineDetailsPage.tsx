import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, QrCode, Save } from 'lucide-react';
import type { OperationsData, Row } from '../hooks/useOperationsData';

type Props = {
  machine?: Row | null;
  data: OperationsData;
  create: (table: string, values: Row) => Promise<void>;
  update: (table: string, id: string, changes: Row) => Promise<void>;
  onClose: () => void;
};

const statuses = ['planned','installing','active','warning','offline','faulted','under_maintenance','awaiting_parts','decommissioned','removed'];
const clean = (value: FormDataEntryValue | null) => value ? String(value) : null;

export function MachineDetailsPage({ machine, data, create, update, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(String(machine?.site_id ?? ''));
  const site = data.sites.find(row => row.id === siteId);
  const areas = useMemo(() => data.siteAreas.filter(area => area.building?.site_id === siteId), [data.siteAreas, siteId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (!site) throw new Error('Select a valid site.');
      const values: Row = {
        provider_organization_id: site.provider_organization_id,
        client_organization_id: site.client_organization_id,
        site_id: site.id,
        site_area_id: clean(form.get('site_area_id')),
        machine_model_id: clean(form.get('machine_model_id')),
        asset_number: String(form.get('asset_number') ?? '').trim(),
        serial_number: clean(form.get('serial_number')),
        display_name: String(form.get('display_name') ?? '').trim(),
        exact_location: clean(form.get('exact_location')),
        installation_date: clean(form.get('installation_date')),
        commissioned_at: clean(form.get('commissioned_at')) ? new Date(String(form.get('commissioned_at'))).toISOString() : null,
        warranty_expires_on: clean(form.get('warranty_expires_on')),
        status: String(form.get('status') ?? 'planned'),
        last_transaction_at: clean(form.get('last_transaction_at')) ? new Date(String(form.get('last_transaction_at'))).toISOString() : null,
        last_communication_at: clean(form.get('last_communication_at')) ? new Date(String(form.get('last_communication_at'))).toISOString() : null,
        last_service_at: clean(form.get('last_service_at')) ? new Date(String(form.get('last_service_at'))).toISOString() : null,
        next_service_due_at: clean(form.get('next_service_due_at')) ? new Date(String(form.get('next_service_due_at'))).toISOString() : null,
        qr_version: Number(form.get('qr_version') || 1),
        is_active: form.get('is_active') === 'on',
      };
      if (!values.asset_number) throw new Error('The asset number / QR code is required.');
      if (!values.display_name) throw new Error('The display name is required.');
      if (machine?.id) await update('machines', machine.id, values);
      else await create('machines', values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the machine.');
    } finally {
      setSaving(false);
    }
  }

  const dt = (value: unknown) => value ? new Date(String(value)).toISOString().slice(0,16) : '';

  return <section className="machine-details-page">
    <div className="page-toolbar"><div><button className="mini-button" onClick={onClose}><ArrowLeft size={16}/>Back to machines</button><p className="eyebrow">Asset register</p><h2>{machine ? 'Machine details' : 'Add machine'}</h2><p>The machine asset number is also the QR-code value used by staff and technicians.</p></div></div>
    <form className="machine-details-form" onSubmit={submit}>
      <section className="panel detail-section"><div className="panel-head"><div><p className="eyebrow">Identity</p><h3>Machine identification</h3></div><QrCode size={24}/></div>
        <div className="detail-grid">
          <label><span>Asset number / QR code *</span><input name="asset_number" defaultValue={machine?.asset_number ?? ''} required autoFocus/><small>Scanning the physical QR code must return this exact value.</small></label>
          <label><span>Display name *</span><input name="display_name" defaultValue={machine?.display_name ?? ''} required/></label>
          <label><span>Serial number</span><input name="serial_number" defaultValue={machine?.serial_number ?? ''}/></label>
          <label><span>QR version</span><input name="qr_version" type="number" min="1" defaultValue={machine?.qr_version ?? 1}/></label>
          <label><span>Machine model</span><select name="machine_model_id" defaultValue={machine?.machine_model_id ?? ''}><option value="">Not specified</option>{data.machineModels.map(model => <option key={model.id} value={model.id}>{model.manufacturer} · {model.model_name}{model.machine_type ? ` · ${model.machine_type}` : ''}</option>)}</select></label>
          <label><span>Status</span><select name="status" defaultValue={machine?.status ?? 'planned'}>{statuses.map(status => <option key={status} value={status}>{status.replace(/_/g,' ')}</option>)}</select></label>
        </div>
      </section>

      <section className="panel detail-section"><div className="panel-head"><div><p className="eyebrow">Placement</p><h3>Site and exact location</h3></div></div>
        <div className="detail-grid">
          <label><span>Site *</span><select name="site_id" value={siteId} onChange={event => setSiteId(event.target.value)} required><option value="">Select site</option>{data.sites.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label>
          <label><span>Building area</span><select name="site_area_id" defaultValue={machine?.site_area_id ?? ''}><option value="">Not specified</option>{areas.map(area => <option key={area.id} value={area.id}>{area.building?.name} · {area.floor_name ?? 'Floor not set'} · {area.area_name}</option>)}</select></label>
          <label className="wide-field"><span>Exact location description</span><input name="exact_location" defaultValue={machine?.exact_location ?? ''} placeholder="Example: Ground floor, east canteen, next to reception"/></label>
        </div>
      </section>

      <section className="panel detail-section"><div className="panel-head"><div><p className="eyebrow">Lifecycle</p><h3>Installation, warranty and service</h3></div></div>
        <div className="detail-grid">
          <label><span>Installation date</span><input name="installation_date" type="date" defaultValue={machine?.installation_date ?? ''}/></label>
          <label><span>Commissioned at</span><input name="commissioned_at" type="datetime-local" defaultValue={dt(machine?.commissioned_at)}/></label>
          <label><span>Warranty expires</span><input name="warranty_expires_on" type="date" defaultValue={machine?.warranty_expires_on ?? ''}/></label>
          <label><span>Last service</span><input name="last_service_at" type="datetime-local" defaultValue={dt(machine?.last_service_at)}/></label>
          <label><span>Next service due</span><input name="next_service_due_at" type="datetime-local" defaultValue={dt(machine?.next_service_due_at)}/></label>
          <label><span>Last communication</span><input name="last_communication_at" type="datetime-local" defaultValue={dt(machine?.last_communication_at)}/></label>
          <label><span>Last transaction</span><input name="last_transaction_at" type="datetime-local" defaultValue={dt(machine?.last_transaction_at)}/></label>
          <label className="checkbox-field"><input name="is_active" type="checkbox" defaultChecked={machine?.is_active ?? true}/><span>Machine is active in the estate</span></label>
        </div>
      </section>
      {error && <p className="auth-error">{error}</p>}
      <div className="detail-actions"><button type="button" className="mini-button" onClick={onClose}>Cancel</button><button type="submit" disabled={saving}><Save size={17}/>{saving ? 'Saving…' : machine ? 'Save machine details' : 'Create machine'}</button></div>
    </form>
  </section>;
}
