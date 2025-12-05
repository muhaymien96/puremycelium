import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Call the generate-invoice-pdf edge function
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { order_id: orderId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Invoice generated successfully");
    },
    onError: (error: Error) => {
      console.error('Invoice generation error:', error);
      toast.error(`Failed to generate invoice: ${error.message}`);
    },
  });
};
