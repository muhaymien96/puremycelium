import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  description?: string;
  sku?: string;
  unit_of_measure?: string;
  is_active: boolean;
  total_stock: number;
  batches: any[];
}

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('products', {
        method: 'GET',
      });
      
      if (error) throw error;
      return data.products as Product[];
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productData: any) => {
      const { data, error } = await supabase.functions.invoke('products', {
        method: 'POST',
        body: productData,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (batchData: any) => {
      const { data, error } = await supabase.functions.invoke('product-batches', {
        method: 'POST',
        body: batchData,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Batch added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add batch');
    },
  });
};
