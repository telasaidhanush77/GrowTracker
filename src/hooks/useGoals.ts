import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Evidence, Goal } from '../types';
import type { TablesUpdate } from '../db/types';

// ── query key factory ─────────────────────────────────────────
export const goalKeys = {
  all: ['goals'] as const,
};

// ── fetch helpers ─────────────────────────────────────────────
async function fetchGoalsWithEvidence(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*, evidence(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => dbRowToGoal(row));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToGoal(row: any): Goal {
  // Supabase returns joined rows as an array even for 1:1 relations — take the first element
  const evArr = Array.isArray(row.evidence) ? row.evidence : (row.evidence ? [row.evidence] : []);
  const ev = evArr[0] ?? null;
  return {
    id:            row.id,
    employeeId:    row.employee_id,
    title:         row.title,
    description:   row.description,
    quarter:       row.quarter,
    priority:      row.priority,
    category:      row.category,
    targetDate:    row.target_date,
    weight:        row.weight,
    status:        row.status,
    managerRating: row.manager_rating ?? undefined,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    evidence: ev
      ? ({
          id:              ev.id,
          description:     ev.description,
          links:           ev.links ?? [],
          selfRating:      ev.self_rating ?? undefined,
          submittedAt:     ev.submitted_at,
          status:          ev.status,
          managerFeedback: ev.manager_feedback ?? undefined,
          reviewedAt:      ev.reviewed_at ?? undefined,
          attachments:     ev.attachments ?? undefined,
        } satisfies Evidence)
      : undefined,
  };
}

// ── useGoals ──────────────────────────────────────────────────
export function useGoals() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: fetchGoalsWithEvidence,
  });
}

// ── useAddGoal ────────────────────────────────────────────────
export function useAddGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          employee_id:    goal.employeeId,
          title:          goal.title,
          description:    goal.description,
          quarter:        goal.quarter,
          priority:       goal.priority,
          category:       goal.category,
          target_date:    goal.targetDate,
          weight:         goal.weight,
          status:         goal.status,
          manager_rating: goal.managerRating ?? null,
        })
        .select('*, evidence(*)')
        .single();

      if (error) throw new Error(error.message);
      return dbRowToGoal(data);
    },
    onSuccess: (newGoal) => {
      qc.setQueryData<Goal[]>(goalKeys.all, prev => {
        const withoutStub = prev?.filter(g => !g.id.startsWith('temp-')) ?? [];
        return [newGoal, ...withoutStub];
      });
    },
  });
}

// ── useUpdateGoal ─────────────────────────────────────────────
export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: Partial<Goal> }) => {
      const dbUpdates: TablesUpdate<'goals'> = {};
      if (updates.title !== undefined)         dbUpdates.title          = updates.title;
      if (updates.description !== undefined)   dbUpdates.description    = updates.description;
      if (updates.quarter !== undefined)       dbUpdates.quarter        = updates.quarter;
      if (updates.priority !== undefined)      dbUpdates.priority       = updates.priority;
      if (updates.category !== undefined)      dbUpdates.category       = updates.category;
      if (updates.targetDate !== undefined)    dbUpdates.target_date    = updates.targetDate;
      if (updates.weight !== undefined)        dbUpdates.weight         = updates.weight;
      if (updates.status !== undefined)        dbUpdates.status         = updates.status;
      if (updates.managerRating !== undefined) dbUpdates.manager_rating = updates.managerRating;

      const { error } = await supabase.from('goals').update(dbUpdates).eq('id', goalId);
      if (error) throw new Error(error.message);
      return { goalId, updates };
    },
    onSuccess: ({ goalId, updates }) => {
      qc.setQueryData<Goal[]>(goalKeys.all, prev =>
        prev?.map(g => g.id === goalId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g),
      );
    },
  });
}

// ── useDeleteGoal ─────────────────────────────────────────────
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', goalId);
      if (error) throw new Error(error.message);
      return goalId;
    },
    onSuccess: (goalId) => {
      qc.setQueryData<Goal[]>(goalKeys.all, prev => prev?.filter(g => g.id !== goalId));
    },
  });
}

// ── useSubmitEvidence ─────────────────────────────────────────
export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      data,
    }: {
      goalId: string;
      data: Omit<Evidence, 'id' | 'status'>;
    }) => {
      // Capture existing evidence BEFORE the upsert so we can restore it on rollback
      // (a plain delete would wipe previously-approved evidence on resubmission)
      const { data: existingEv } = await supabase
        .from('evidence')
        .select()
        .eq('goal_id', goalId)
        .maybeSingle();

      // Upsert — one evidence row per goal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upsertPayload: any = {
        goal_id:          goalId,
        description:      data.description,
        links:            data.links,
        self_rating:      data.selfRating ?? null,
        submitted_at:     new Date().toISOString(),
        status:           'pending',
        manager_feedback: null,
        reviewed_at:      null,
        attachments:      data.attachments ?? null,
      };
      const { data: ev, error: evErr } = await supabase
        .from('evidence')
        .upsert(upsertPayload, { onConflict: 'goal_id' })
        .select()
        .single();

      if (evErr) throw new Error(evErr.message);

      const { error: goalErr } = await supabase
        .from('goals')
        .update({ status: 'submitted' })
        .eq('id', goalId);

      if (goalErr) {
        // Roll back the evidence upsert — restore old row if it existed, otherwise delete
        if (existingEv) {
          await supabase.from('evidence').update({
            description:      existingEv.description,
            links:            existingEv.links,
            self_rating:      existingEv.self_rating,
            submitted_at:     existingEv.submitted_at,
            status:           existingEv.status,
            manager_feedback: existingEv.manager_feedback,
            reviewed_at:      existingEv.reviewed_at,
          }).eq('goal_id', goalId);
        } else {
          await supabase.from('evidence').delete().eq('goal_id', goalId);
        }
        throw new Error(goalErr.message);
      }
      return { goalId, evidence: ev };
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
    },
    onSuccess: ({ goalId, evidence: ev }) => {
      qc.setQueryData<Goal[]>(goalKeys.all, prev =>
        prev?.map(g =>
          g.id === goalId
            ? {
                ...g,
                status: 'submitted',
                updatedAt: new Date().toISOString(),
                evidence: {
                  id:          ev.id,
                  description: ev.description,
                  links:       ev.links ?? [],
                  selfRating:  ev.self_rating ?? undefined,
                  submittedAt: ev.submitted_at,
                  status:      ev.status as import('../types').EvidenceStatus,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  attachments: ((ev as any).attachments ?? undefined) as import('../types').Attachment[] | undefined,
                },
              }
            : g,
        ),
      );
    },
  });
}

// ── useReviewEvidence ─────────────────────────────────────────
export function useReviewEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      approved,
      feedback,
      managerRating,
    }: {
      goalId: string;
      approved: boolean;
      feedback: string;
      managerRating?: number;
    }) => {
      const now = new Date().toISOString();
      const newStatus = approved ? 'approved' : 'rejected';

      // Capture current evidence state so we can revert if the goal update fails
      const { data: prevEv } = await supabase
        .from('evidence')
        .select('status, manager_feedback, reviewed_at')
        .eq('goal_id', goalId)
        .maybeSingle();

      const { error: evErr } = await supabase
        .from('evidence')
        .update({
          status:           newStatus,
          manager_feedback: feedback,
          reviewed_at:      now,
        })
        .eq('goal_id', goalId);

      if (evErr) throw new Error(evErr.message);

      const goalUpdate: TablesUpdate<'goals'> = { status: newStatus };
      if (approved && managerRating !== undefined) goalUpdate.manager_rating = managerRating;

      const { error: goalErr } = await supabase
        .from('goals')
        .update(goalUpdate)
        .eq('id', goalId);

      if (goalErr) {
        // Revert evidence to its pre-review state to keep DB consistent
        if (prevEv) {
          await supabase.from('evidence').update({
            status:           prevEv.status,
            manager_feedback: prevEv.manager_feedback,
            reviewed_at:      prevEv.reviewed_at,
          }).eq('goal_id', goalId);
        }
        throw new Error(goalErr.message);
      }

      return { goalId, approved, feedback, managerRating, now };
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
    },
    onSuccess: ({ goalId, approved, feedback, managerRating, now }) => {
      const newStatus = approved ? 'approved' : 'rejected';
      qc.setQueryData<Goal[]>(goalKeys.all, prev =>
        prev?.map(g =>
          g.id === goalId
            ? {
                ...g,
                status: newStatus,
                managerRating: approved ? managerRating : undefined,
                updatedAt: now,
                evidence: g.evidence
                  ? {
                      ...g.evidence,
                      status:          newStatus,
                      managerFeedback: feedback,
                      reviewedAt:      now,
                    }
                  : undefined,
              }
            : g,
        ),
      );
    },
  });
}
