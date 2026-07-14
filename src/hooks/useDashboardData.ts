import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type MachineRow = {
  id: string;
  asset_number: string;
  display_name: string;
  exact_location: string | null;
  status: string;
  last_communication_at: string | null;
  site: { name: string } | null;
};

export type TaskRow = {
  id: string;
  task_number: number;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  assignee: { first_name: string; last_name: string } | null;
};

export type IntegrationRow = {
  id: string;
  integration_name: string;
  status: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
};

export type DashboardData = {
  totalMachines: number;
  activeMachines: number;
  openIncidents: number;
  criticalIncidents: number;
  activeCards: number;
  eligibleEmployees: number;
  coffeesToday: number;
  slaCompliance: number;
  machines: MachineRow[];
  tasks: TaskRow[];
  integrations: IntegrationRow[];
};

const emptyData: DashboardData = {
  totalMachines: 0,
  activeMachines: 0,
  openIncidents: 0,
  criticalIncidents: 0,
  activeCards: 0,
  eligibleEmployees: 0,
  coffeesToday: 0,
  slaCompliance: 100,
  machines: [],
  tasks: [],
  integrations: [],
};

export function useDashboardData(enabled: boolean) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      machineCount,
      activeMachineCount,
      incidentCount,
      criticalIncidentCount,
      cardCount,
      employeeCount,
      coffeeRows,
      slaRows,
      machinesResult,
      tasksResult,
      integrationsResult,
    ] = await Promise.all([
      supabase.from('machines').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('machines').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'active'),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).not('status', 'in', '(closed,cancelled)'),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('severity', 'critical').not('status', 'in', '(closed,cancelled)'),
      supabase.from('access_cards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('employment_status', 'active').eq('benefit_eligible', true),
      supabase.from('nayax_transactions').select('quantity').gte('occurred_at', today.toISOString()).eq('result', 'approved').neq('benefit_type', 'paid'),
      supabase.from('task_sla_clocks').select('breached_at,completed_at,target_at'),
      supabase.from('machines').select('id,asset_number,display_name,exact_location,status,last_communication_at,site:sites(name)').eq('is_active', true).order('updated_at', { ascending: false }).limit(8),
      supabase.from('service_tasks').select('id,task_number,title,priority,status,created_at,assignee:employees!service_tasks_assigned_employee_id_fkey(first_name,last_name)').not('status', 'in', '(closed,cancelled)').order('created_at', { ascending: false }).limit(6),
      supabase.from('integration_connections').select('id,integration_name,status,last_success_at,last_failure_at,last_error').eq('is_active', true).order('integration_name'),
    ]);

    const results = [machineCount, activeMachineCount, incidentCount, criticalIncidentCount, cardCount, employeeCount, coffeeRows, slaRows, machinesResult, tasksResult, integrationsResult];
    const firstError = results.find(result => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const sla = slaRows.data ?? [];
    const completedSla = sla.filter(clock => clock.completed_at || new Date(clock.target_at) < new Date());
    const compliantSla = completedSla.filter(clock => !clock.breached_at);
    const slaCompliance = completedSla.length ? Math.round((compliantSla.length / completedSla.length) * 1000) / 10 : 100;
    const coffeesToday = (coffeeRows.data ?? []).reduce((sum, transaction) => sum + (transaction.quantity ?? 0), 0);

    setData({
      totalMachines: machineCount.count ?? 0,
      activeMachines: activeMachineCount.count ?? 0,
      openIncidents: incidentCount.count ?? 0,
      criticalIncidents: criticalIncidentCount.count ?? 0,
      activeCards: cardCount.count ?? 0,
      eligibleEmployees: employeeCount.count ?? 0,
      coffeesToday,
      slaCompliance,
      machines: (machinesResult.data ?? []) as unknown as MachineRow[],
      tasks: (tasksResult.data ?? []) as unknown as TaskRow[],
      integrations: (integrationsResult.data ?? []) as IntegrationRow[],
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const channel = supabase
      .channel('concentrix-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tasks' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nayax_transactions' }, () => void load())
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, load]);

  return { data, loading, error, lastUpdated, refresh: load };
}
