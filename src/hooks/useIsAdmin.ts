import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIsAdmin = () => {
  return useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return false;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      return !rolesError && !!roles;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
