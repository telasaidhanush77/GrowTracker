import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DailyLog, DailyTask } from '../types';
import type { Json } from '../db/types';

export const logKeys = {
  all: ['dailyLogs'] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToLog(row: any): DailyLog {
  return {
    id:         row.id,
    employeeId: row.employee_id,
    date:       row.date,
    tasks:      (row.tasks as DailyTask[]) ?? [],
    notes:      row.notes ?? undefined,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

async function fetchDailyLogs(): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbRowToLog);
}

export function useDailyLogs() {
  return useQuery({
    queryKey: logKeys.all,
    queryFn: fetchDailyLogs,
  });
}

export function useSaveDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
      tasks,
      notes,
    }: {
      employeeId: string;
      date: string;
      tasks: DailyTask[];
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(
          { employee_id: employeeId, date, tasks: tasks as unknown as Json, notes: notes ?? null },
          { onConflict: 'employee_id,date' },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return dbRowToLog(data);
    },
    onSuccess: (savedLog) => {
      qc.setQueryData<DailyLog[]>(logKeys.all, prev => {
        if (!prev) return [savedLog];
        const exists = prev.some(l => l.id === savedLog.id);
        return exists
          ? prev.map(l => l.id === savedLog.id ? savedLog : l)
          : [savedLog, ...prev];
      });
    },
  });
}
