import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Row = Record<string, any>;
export type OperationsData = {
  employees: Row[]; cards: Row[]; sites: Row[]; machines: Row[];
  machineModels: Row[]; siteAreas: Row[];
  tasks: Row[]; incidents: Row[]; transactions: Row[]; memberships: Row[];
};
const empty: OperationsData = { employees: [], cards: [], sites: [], machines: [], machineModels: [], siteAreas: [], tasks: [], incidents: [], transactions: [], memberships: [] };

export function useOperationsData(enabled: boolean) {
  const [data, setData] = useState<OperationsData>(empty);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    const results = await Promise.all([
      supabase.from('employees').select('id,organization_id,employee_number,first_name,last_name,work_email,phone,employment_status,benefit_eligible,primary_site:sites(name),updated_at').order('last_name').limit(500),
      supabase.from('access_cards').select('id,organization_id,credential_reference,masked_identifier,card_type,technology,frequency,status,issued_at,expires_at,last_used_at,updated_at,assignments:employee_card_assignments(id,assignment_status,valid_from,valid_to,employee:employees(id,employee_number,first_name,last_name,work_email))').order('updated_at',{ascending:false}).limit(500),
      supabase.from('sites').select('id,client_organization_id,provider_organization_id,code,name,address_line_1,address_line_2,suburb,city,province,postal_code,country_code,client_contact_name,client_contact_email,client_contact_phone,is_active,updated_at').order('name').limit(500),
      supabase.from('machines').select('id,provider_organization_id,client_organization_id,site_id,site_area_id,machine_model_id,asset_number,serial_number,display_name,exact_location,installation_date,commissioned_at,warranty_expires_on,status,last_transaction_at,last_communication_at,last_service_at,next_service_due_at,qr_version,is_active,site:sites(id,code,name),model:machine_models(manufacturer,model_name,machine_type),area:site_areas(floor_name,area_name,location_description),updated_at').order('updated_at',{ascending:false}).limit(500),
      supabase.from('machine_models').select('id,manufacturer,model_name,machine_type,required_skill_level,documentation').order('manufacturer').order('model_name'),
      supabase.from('site_areas').select('id,building_id,floor_name,area_name,location_description,is_active,building:buildings(id,site_id,name,code)').eq('is_active',true).order('area_name'),
      supabase.from('service_tasks').select('id,task_number,provider_organization_id,client_organization_id,site_id,machine_id,title,description,priority,status,fault_category,created_at,assigned_at,resolved_at,assignee:employees!service_tasks_assigned_employee_id_fkey(first_name,last_name),site:sites(name),machine:machines(asset_number)').order('created_at',{ascending:false}).limit(500),
      supabase.from('incidents').select('id,incident_number,provider_organization_id,client_organization_id,site_id,machine_id,title,description,severity,status,detected_at,resolved_at,site:sites(name),machine:machines(asset_number)').order('detected_at',{ascending:false}).limit(500),
      supabase.from('nayax_transactions').select('id,nayax_transaction_id,occurred_at,product_name,quantity,gross_amount,benefit_amount,paid_amount,currency,benefit_type,result,vend_success,employee:employees(first_name,last_name),machine:machines(asset_number)').order('occurred_at',{ascending:false}).limit(500),
      supabase.from('organization_memberships').select('id,organization_id,role,is_active,organization:organizations(code,name)').eq('is_active',true),
    ]);
    const firstError = results.find(result => result.error)?.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    setData({
      employees: results[0].data ?? [], cards: results[1].data ?? [], sites: results[2].data ?? [], machines: results[3].data ?? [],
      machineModels: results[4].data ?? [], siteAreas: results[5].data ?? [],
      tasks: results[6].data ?? [], incidents: results[7].data ?? [], transactions: results[8].data ?? [], memberships: results[9].data ?? [],
    });
    setLoading(false);
  }, [enabled]);

  const update = useCallback(async (table: string, id: string, changes: Row) => {
    const { error: updateError } = await supabase.from(table).update(changes).eq('id', id);
    if (updateError) throw updateError;
    await load();
  }, [load]);

  const create = useCallback(async (table: string, values: Row) => {
    const { error: insertError } = await supabase.from(table).insert(values);
    if (insertError) throw insertError;
    await load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const channel = supabase.channel('concentrix-operations')
      .on('postgres_changes',{event:'*',schema:'public',table:'employees'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'access_cards'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'employee_card_assignments'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'sites'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'machines'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'machine_models'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'site_areas'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'service_tasks'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'incidents'},()=>void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, load]);

  return { data, loading, error, refresh: load, update, create };
}
