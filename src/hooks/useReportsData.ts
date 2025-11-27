import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export const useReportsData = () => {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      // Fetch orders with items for the last 30 days
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(name, category))
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Process sales by date
      const salesByDate = orders?.reduce((acc: any, order) => {
        const date = format(new Date(order.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += Number(order.total_amount);
        return acc;
      }, {});

      const dailySales = Object.entries(salesByDate || {}).map(([date, amount]) => ({
        date,
        amount: Number(amount),
      }));

      // Process revenue by category
      const revenueByCategory = orders?.reduce((acc: any, order) => {
        order.order_items?.forEach((item: any) => {
          const category = item.products?.category || 'other';
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += Number(item.subtotal);
        });
        return acc;
      }, {});

      const categoryData = Object.entries(revenueByCategory || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Number(value),
      }));

      // Process top products
      const productSales = orders?.reduce((acc: any, order) => {
        order.order_items?.forEach((item: any) => {
          const productName = item.products?.name || 'Unknown';
          if (!acc[productName]) {
            acc[productName] = { quantity: 0, revenue: 0 };
          }
          acc[productName].quantity += Number(item.quantity);
          acc[productName].revenue += Number(item.subtotal);
        });
        return acc;
      }, {});

      const topProducts = Object.entries(productSales || {})
        .map(([name, data]: [string, any]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Process order status distribution
      const statusDistribution = orders?.reduce((acc: any, order) => {
        const status = order.status || 'pending';
        if (!acc[status]) {
          acc[status] = 0;
        }
        acc[status]++;
        return acc;
      }, {});

      const statusData = Object.entries(statusDistribution || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Number(value),
      }));

      // Calculate KPIs
      const thisMonth = orders?.filter((order) => {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      });

      const totalRevenue = thisMonth?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = thisMonth?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get refunds
      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalRefunds = refunds?.reduce((sum, refund) => sum + Number(refund.amount), 0) || 0;

      return {
        dailySales,
        categoryData,
        topProducts,
        statusData,
        kpis: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalRefunds,
          netRevenue: totalRevenue - totalRefunds,
        },
      };
    },
  });
};
