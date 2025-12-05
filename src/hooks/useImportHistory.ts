import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useImportHistory = () => {
  return useQuery({
    queryKey: ['import-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};
