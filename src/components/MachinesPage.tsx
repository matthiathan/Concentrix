import { useMemo, useState } from 'react';
import { Plus, QrCode, RefreshCw } from 'lucide-react';
import type { OperationsData, Row } from '../hooks/useOperationsData';
import { MachineDetailsPage } from './MachineDetailsPage';

type Props = {
  data: OperationsData;
  search: string;
  error: string | null;
  refresh: () => Promise<void>;
  create: (table: string, values: Row) => Promise<void>;
  update: (table: string, id: string, changes: Row) => Promise<void>;
};

const label = (value: string) => value.replace(/_/g,' ').replace(/\b\w/g, letter => letter.toUpperCase());
const when = (value: unknown) => value ? new Date(String(value)).toLocaleString('en-ZA') : '—';

export function MachinesPage({ data, search, error, refresh, create, update }: Props) {
  const [selected, setSelected] = useState<Row | null | undefined>(undefined);
  const rows = useMemo(() => data.machines.filter(machine => !search || JSON.stringify(machine).toLowerCase().includes(search.toLowerCase())), [data.machines, search]);

  if (selected !== undefined) return <MachineDetailsPage machine={selected} data={data} create={create} update={update} onClose={() => setSelected(undefined)}/>;

  return <>
    <div className="page-toolbar"><div><p className="eyebrow">Asset register</p><h2>Machines</h2><p>{rows.length} visible machine{rows.length === 1 ? '' : 's'}. The asset number is the machine QR-code value.</p></div><div><button onClick={() => setSelected(null)}><Plus size={16}/>Add machine</button><button onClick={() => void refresh()}><RefreshCw size={16}/>Refresh</button></div></div>
    {error && <p className="auth-error">{error}</p>}
    <section className="panel operations-table">
      <div className="table-wrap"><table><thead><tr><th>QR / Asset</th><th>Machine</th><th>Model</th><th>Site and location</th><th>Status</th><th>Last communication</th><th>Next service</th><th/></tr></thead><tbody>
        {rows.length ? rows.map(machine => <tr key={machine.id}>
          <td><strong className="asset-qr"><QrCode size={15}/>{machine.asset_number}</strong><small>QR value</small></td>
          <td><strong>{machine.display_name}</strong><small>{machine.serial_number || 'No serial number'}</small></td>
          <td>{machine.model ? `${machine.model.manufacturer} ${machine.model.model_name}` : '—'}<small>{machine.model?.machine_type ?? ''}</small></td>
          <td>{machine.site?.name ?? '—'}<small>{[machine.area?.building?.name,machine.area?.floor_name,machine.area?.area_name,machine.exact_location].filter(Boolean).join(' · ')}</small></td>
          <td><span className={`status ${machine.status}`}>{label(machine.status)}</span></td>
          <td>{when(machine.last_communication_at)}</td><td>{when(machine.next_service_due_at)}</td>
          <td><button className="mini-button" onClick={() => setSelected(machine)}>View details</button></td>
        </tr>) : <tr><td colSpan={8} className="empty-state">No machines found.</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
