import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Notification, NotificationType } from '../types';

export const notifKeys = {
  all: ['notifications'] as const,
  forUser: (id: string) => ['notifications', 'user', id] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToNotif(row: any): Notification {
  return {
    id:                 row.id,
    recipientId:        row.recipient_id,
    type:               row.type as NotificationType,
    title:              row.title,
    message:            row.message,
    read:               row.is_read,
    createdAt:          row.created_at,
    relatedGoalId:      row.related_goal_id ?? undefined,
    relatedEmployeeId:  row.related_employee_id ?? undefined,
  };
}

async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbRowToNotif);
}

export function useNotifications() {
  return useQuery({
    queryKey: notifKeys.all,
    queryFn: fetchNotifications,
  });
}

export function useAddNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notif: Omit<Notification, 'id'>) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id:        notif.recipientId,
          type:                notif.type,
          title:               notif.title,
          message:             notif.message,
          is_read:             notif.read,
          related_goal_id:     notif.relatedGoalId ?? null,
          related_employee_id: notif.relatedEmployeeId ?? null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return dbRowToNotif(data);
    },
    onSuccess: (newNotif) => {
      qc.setQueryData<Notification[]>(notifKeys.all, prev =>
        prev ? [newNotif, ...prev] : [newNotif],
      );
    },
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);
      if (error) throw new Error(error.message);
      return notifId;
    },
    onMutate: async (notifId) => {
      await qc.cancelQueries({ queryKey: notifKeys.all });
      const previous = qc.getQueryData<Notification[]>(notifKeys.all);
      qc.setQueryData<Notification[]>(notifKeys.all, prev =>
        prev?.map(n => n.id === notifId ? { ...n, read: true } : n),
      );
      return previous;
    },
    onError: (_err, _notifId, previous) => {
      if (previous) qc.setQueryData(notifKeys.all, previous);
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', recipientId)
        .eq('is_read', false);
      if (error) throw new Error(error.message);
      return recipientId;
    },
    onMutate: async (recipientId) => {
      await qc.cancelQueries({ queryKey: notifKeys.all });
      const previous = qc.getQueryData<Notification[]>(notifKeys.all);
      qc.setQueryData<Notification[]>(notifKeys.all, prev =>
        prev?.map(n => n.recipientId === recipientId ? { ...n, read: true } : n),
      );
      return previous;
    },
    onError: (_err, _recipientId, previous) => {
      if (previous) qc.setQueryData(notifKeys.all, previous);
    },
  });
}
