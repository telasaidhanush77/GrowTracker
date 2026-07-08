import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type AIReportType = 'goal' | 'quarterly' | 'fiscal_year';

export interface AIReport {
  id: string;
  employee_id: string;
  report_type: AIReportType;
  goal_id: string | null;
  quarter: string | null;
  content: string;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  overall_score: number | null;
  model_used: string;
  generated_at: string;
  created_at: string;
}

export interface GenerateReportParams {
  employeeId: string;
  reportType: AIReportType;
  goalId?: string;
  quarter?: string;
}

export interface TriggerCoachingParams {
  employeeId?: string;
}

export function useAIReports(employeeId: string | null) {
  return useQuery({
    queryKey: ['ai-reports', employeeId],
    queryFn: async (): Promise<AIReport[]> => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('employee_id', employeeId)
        .order('generated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AIReport[];
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: GenerateReportParams): Promise<AIReport> => {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: params,
      });
      if (error) {
        // Extract the real error body from non-2xx responses
        let msg = error.message;
        try {
          const body = await (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
          if (body?.error) msg = body.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!data?.ok) throw new Error(data?.error ?? 'Report generation failed');
      return data.report as AIReport;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports', report.employee_id] });
    },
  });
}

export function useTriggerCoaching() {
  return useMutation({
    mutationFn: async (params: TriggerCoachingParams = {}) => {
      const { data, error } = await supabase.functions.invoke('smart-coaching', {
        body: params,
      });
      if (error) throw new Error(error.message);
      return data as { ok: boolean; sent: number; employees_processed: number };
    },
  });
}
