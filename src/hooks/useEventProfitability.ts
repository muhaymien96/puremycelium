import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EventProfitability {
  eventId: string;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  orderCount: number;
}

export const useEventProfitability = (eventId: string) => {
  return useQuery({
    queryKey: ['event_profitability', eventId],
    queryFn: async () => {
      // Get event costs from expenses table (linked via market_event_id)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('market_event_id', eventId);

      if (expensesError) throw expensesError;

      const totalCosts = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Get revenue from orders linked to this event
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('market_event_id', eventId)
        .in('status', ['confirmed', 'delivered']);

      if (ordersError) throw ordersError;

      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      return {
        eventId,
        totalRevenue,
        totalCosts,
        profit: totalRevenue - totalCosts,
        orderCount: orders?.length || 0,
      } as EventProfitability;
    },
    enabled: !!eventId,
  });
};

export const useMonthlyEventProfitability = (year: number, month: number) => {
  return useQuery({
    queryKey: ['monthly_event_profitability', year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Get all events in the month
      const { data: events, error: eventsError } = await supabase
        .from('market_events')
        .select('id')
        .gte('event_date', startDate)
        .lte('event_date', endDate);

      if (eventsError) throw eventsError;

      const eventIds = events?.map(e => e.id) || [];

      // Get total costs from expenses linked to these events ONLY
      let totalCosts = 0;
      if (eventIds.length > 0) {
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount')
          .in('market_event_id', eventIds);

        if (expensesError) throw expensesError;

        totalCosts = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      }

      // Get revenue from all orders linked to these events
      let totalRevenue = 0;
      let orderCount = 0;

      if (eventIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount')
          .in('market_event_id', eventIds)
          .in('status', ['confirmed', 'delivered']);

        if (ordersError) throw ordersError;

        totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
        orderCount = orders?.length || 0;
      }

      return {
        totalRevenue,
        totalCosts,
        profit: totalRevenue - totalCosts,
        orderCount,
        eventCount: events?.length || 0,
      };
    },
  });
};
