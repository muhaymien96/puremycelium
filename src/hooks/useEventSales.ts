import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface TopSeller {
  product_name: string;
  quantity: number;
  revenue: number;
}

interface EventSalesOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface EventSales {
  orders: EventSalesOrder[];
  topSellers: TopSeller[];
  totalRevenue: number;
  orderCount: number;
}

export function useEventSales(eventId: string | undefined) {
  const queryClient = useQueryClient();

  // Set up real-time subscription for orders
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-sales-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `market_event_id=eq.${eventId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['event-sales', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return useQuery({
    queryKey: ['event-sales', eventId],
    queryFn: async (): Promise<EventSales> => {
      if (!eventId) {
        return {
          orders: [],
          topSellers: [],
          totalRevenue: 0,
          orderCount: 0
        };
      }

      // Fetch orders with items and product details
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          order_items (
            quantity,
            unit_price,
            products (
              name
            )
          )
        `)
        .eq('market_event_id', eventId)
        .in('status', ['confirmed', 'delivered'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const orderCount = orders?.length || 0;

      // Calculate top sellers
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
      
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const productName = item.products?.name || 'Unknown';
          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += Number(item.quantity);
          productSales[productName].revenue += Number(item.quantity) * Number(item.unit_price);
        });
      });

      const topSellers: TopSeller[] = Object.entries(productSales)
        .map(([product_name, data]) => ({
          product_name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      return {
        orders: orders?.map(o => ({
          id: o.id,
          order_number: o.order_number,
          total_amount: Number(o.total_amount),
          status: o.status,
          created_at: o.created_at
        })) || [],
        topSellers,
        totalRevenue,
        orderCount
      };
    },
    enabled: !!eventId
  });
}
