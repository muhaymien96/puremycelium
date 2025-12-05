import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type Customer = Tables<"customers">;


export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
};

export const useCustomerOrders = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customerData: Partial<Customer>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          first_name: customerData.first_name || '',
          last_name: customerData.last_name || '',
          email: customerData.email,
          phone: customerData.phone,
          preferred_channel: customerData.preferred_channel,
          address: customerData.address,
          city: customerData.city,
          country: customerData.country,
          postal_code: customerData.postal_code,
          notes: customerData.notes,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add customer');
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete customer');
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customerId, updates }: { customerId: string; updates: Partial<Customer> }) => {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      toast.success('Customer updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update customer');
    },
  });
};
