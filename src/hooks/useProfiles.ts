import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { profileToStoredUser } from '../lib/profileAdapter';

export const profileKeys = {
  all: ['profiles'] as const,
  one: (id: string) => ['profiles', id] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return (data ?? []).map(profileToStoredUser);
    },
  });
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: profileKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw new Error(error.message);
      return profileToStoredUser(data);
    },
  });
}
