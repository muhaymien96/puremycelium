import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RollbackResult {
  message: string;
  ordersDeleted: number;
  stockRestored: number;
  stockMovementsReversed: number;
}

export const useRollbackImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importBatchId: string): Promise<RollbackResult> => {
      const { data, error } = await supabase.functions.invoke('rollback-import', {
        body: { import_batch_id: importBatchId },
      });

      if (error) throw error;
      return data as RollbackResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      
      toast.success(
        `Rollback complete: ${data.ordersDeleted} orders deleted, ${data.stockRestored} units restored`
      );
    },
    onError: async (error: any) => {
      console.error('Rollback error:', error);
      
      // Check if it's a 403 (Forbidden) error
      if (error.context?.status === 403 || error.message?.includes('Admin access required')) {
        toast.warning('Admin access required', {
          description: 'You need administrator privileges to rollback imports.'
        });
      } else {
        toast.error(`Rollback failed: ${error.message || 'Unknown error'}`);
      }
    },
  });
};
