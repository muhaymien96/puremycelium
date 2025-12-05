import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type ProductBatch = Tables<"product_batches">;
export type Product = Tables<"products"> & { batches: ProductBatch[] };


export const useProducts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to real-time changes for products
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    // Subscribe to real-time changes for product_batches
    const batchesChannel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_batches'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(batchesChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('products', {
        method: 'GET',
      });
      
      if (error) throw error;
      // Filter out inactive products
      const products = (data.products as Product[]);
      return products.filter(p => p.is_active !== false);
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
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Batch added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add batch');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, reason }: { productId: string; reason: string }) => {
      // Validate reason
      if (!reason || reason.trim().length < 3) {
        throw new Error('Deactivation reason must be at least 3 characters');
      }

      // Check if user is admin
      const { isAdmin } = await import('@/lib/permissions');
      const adminCheck = await isAdmin();
      if (!adminCheck) {
        throw new Error('Only administrators can deactivate products');
      }

      // Check for unexpired batches
      const { data: batches, error: batchError } = await supabase
        .from('product_batches')
        .select('quantity, expiry_date')
        .eq('product_id', productId)
        .gt('quantity', 0);

      if (batchError) throw batchError;

      const unexpiredStock = batches?.filter(b => 
        !b.expiry_date || new Date(b.expiry_date) > new Date()
      ).reduce((sum, b) => sum + Number(b.quantity), 0) || 0;

      if (unexpiredStock > 0) {
        throw new Error(
          `Cannot deactivate product with ${unexpiredStock} units of unexpired stock. ` +
          'Please sell or remove existing inventory first.'
        );
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate product with audit trail
      const { error } = await supabase
        .from('products')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_reason: reason.trim(),
          deactivated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-products'] });
      toast.success('Product deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate product');
    },
  });
};

export const useReactivateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: string) => {
      // Check if user is admin
      const { isAdmin } = await import('@/lib/permissions');
      const adminCheck = await isAdmin();
      if (!adminCheck) {
        throw new Error('Only administrators can reactivate products');
      }

      // Reactivate product
      const { error } = await supabase
        .from('products')
        .update({ 
          is_active: true,
          deactivated_at: null,
          deactivated_reason: null,
          deactivated_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-products'] });
      toast.success('Product reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reactivate product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase.functions.invoke('products', {
        method: 'PUT',
        body: {
          productId,
          ...updates,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
};
