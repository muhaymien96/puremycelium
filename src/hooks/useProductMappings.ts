import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProductMappings = () => {
  return useQuery({
    queryKey: ['product-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_mappings')
        .select(`
          *,
          products (
            id,
            name,
            sku
          )
        `)
        .eq('source', 'yoco_import')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useDeleteProductMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_mappings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-mappings'] });
      toast.success('Product mapping deleted');
    },
    onError: (error: Error) => {
      console.error('Delete mapping error:', error);
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });
};
