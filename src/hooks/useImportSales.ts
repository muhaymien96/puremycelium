import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TransactionGroup } from "@/lib/csv-parser";

interface ImportPayload {
  groups: TransactionGroup[];
  startDate: string;
  endDate: string;
  fileName?: string;
  productMappings?: Record<string, string>;
  saveProductMappings?: boolean;
}

interface ImportResult {
  newOrders: number;
  skippedDuplicates: number;
  totalItems: number;
  unmatchedProducts: number;
  importBatchId: string;
  errors: string[];
}

export const useImportSales = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportPayload): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('import-sales', {
        body: payload,
      });

      if (error) throw error;
      return data as ImportResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      
      const message = data.unmatchedProducts > 0
        ? `Import complete: ${data.newOrders} new orders, ${data.skippedDuplicates} duplicates skipped, ${data.totalItems} items imported, ${data.unmatchedProducts} products unmatched`
        : `Import complete: ${data.newOrders} new orders, ${data.skippedDuplicates} duplicates skipped, ${data.totalItems} items imported`;
      
      toast.success(message);
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      
      // Check if it's a 403 (Forbidden) error
      if (error.context?.status === 403 || error.message?.includes('Admin access required')) {
        toast.warning('Admin access required', {
          description: 'You need administrator privileges to import sales data.'
        });
      } else {
        toast.error(`Import failed: ${error.message || 'Unknown error'}`);
      }
    },
  });
};
