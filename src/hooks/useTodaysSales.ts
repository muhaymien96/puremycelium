import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TodaysSalesData {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
}

export function useTodaysSales() {
  return useQuery({
    queryKey: ['todays-sales'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .neq('status', 'cancelled')
        .neq('status', 'refunded');

      if (error) throw error;

      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const orderCount = orders?.length || 0;
      const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

      return {
        totalSales,
        orderCount,
        avgOrderValue,
      } as TodaysSalesData;
    },
  });
}
