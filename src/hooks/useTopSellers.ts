import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';

interface TopSeller {
  product_id: string;
  product_name: string;
  total_revenue: number;
  units_sold: number;
  category: string;
}

export type Period = 'week' | 'month' | 'quarter' | 'year';

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function useTopSellers(limit = 5, period: Period = 'month') {
  return useQuery({
    queryKey: ['top-sellers', limit, period],
    queryFn: async () => {
      const { start, end } = getDateRange(period);

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          subtotal,
          quantity,
          products:product_id (
            name,
            category
          ),
          orders:order_id (
            created_at,
            status
          )
        `)
        .gte('orders.created_at', start.toISOString())
        .lte('orders.created_at', end.toISOString())
        .neq('orders.status', 'cancelled')
        .neq('orders.status', 'refunded');

      if (error) throw error;

      // Group by product and calculate totals
      const productMap = new Map<string, TopSeller>();

      orderItems?.forEach((item: any) => {
        if (!item.products || !item.orders) return;

        const productId = item.product_id;
        const existing = productMap.get(productId);

        if (existing) {
          existing.total_revenue += Number(item.subtotal);
          existing.units_sold += Number(item.quantity);
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: item.products.name,
            total_revenue: Number(item.subtotal),
            units_sold: Number(item.quantity),
            category: item.products.category,
          });
        }
      });

      // Convert to array and sort by revenue
      const topSellers = Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      return topSellers;
    },
  });
}
