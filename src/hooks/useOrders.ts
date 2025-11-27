import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const useOrders = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          
          if (payload.eventType === 'UPDATE') {
            toast.success('Order updated', { duration: 2000 });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          console.log('Payment change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('Invoice change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(first_name, last_name), order_items(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.functions.invoke('orders', {
        method: 'POST',
        body: orderData,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
};

export const useProcessPayment = () => {
  return useMutation({
    mutationFn: async (paymentData: any) => {
      const { data, error } = await supabase.functions.invoke('order-pay', {
        method: 'POST',
        body: paymentData,
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process payment');
    },
  });
};

export const useSendPaymentLink = () => {
  return useMutation({
    mutationFn: async (linkData: { order_id: string; customer_email: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('send-payment-link', {
        method: 'POST',
        body: linkData,
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send payment link');
    },
  });
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      order_id: string;
      payment_id?: string;
      amount: number;
      reason: string;
      notes?: string;
      items: Array<{
        order_item_id: string;
        product_id: string;
        batch_id?: string;
        quantity: number;
      }>;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('order-refund', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      order_id: string;
      new_status: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: data.new_status as any })
        .eq('id', data.order_id);

      if (error) throw error;

      // Add manual note if provided
      if (data.notes) {
        await supabase
          .from('order_status_history')
          .update({ notes: data.notes })
          .eq('order_id', data.order_id)
          .eq('new_status', data.new_status as any)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast.success('Order status updated');
    },
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [ordersRes, customersRes, productsRes, refundsRes] = await Promise.all([
        supabase.from('orders').select('total_amount, status'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('refunds').select('amount').eq('status', 'completed'),
      ]);

      const totalSales = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const orderCount = ordersRes.data?.length || 0;
      const customerCount = customersRes.count || 0;
      const productCount = productsRes.count || 0;
      const totalRefunds = refundsRes.data?.reduce((sum, refund) => sum + Number(refund.amount), 0) || 0;

      return {
        totalSales,
        orderCount,
        customerCount,
        productCount,
        totalRefunds,
      };
    },
  });
};
