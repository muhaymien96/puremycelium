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

      // Fetch financial transactions for accurate profit/cost data
      const { data: financialTx } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Process sales by date
      const salesByDate = orders?.reduce((acc: any, order) => {
        const date = format(new Date(order.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { revenue: 0, cost: 0, profit: 0 };
        }
        acc[date].revenue += Number(order.total_amount);
        return acc;
      }, {});

      // Add profit data from financial transactions
      financialTx?.forEach((tx: any) => {
        if (tx.transaction_type === 'sale') {
          const date = format(new Date(tx.created_at), 'MMM dd');
          if (salesByDate[date]) {
            salesByDate[date].cost += Number(tx.cost || 0);
            salesByDate[date].profit += Number(tx.profit || 0);
          }
        }
      });

      const dailySales = Object.entries(salesByDate || {}).map(([date, data]: [string, any]) => ({
        date,
        amount: data.revenue,
        cost: data.cost,
        profit: data.profit,
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

      // Calculate KPIs from financial transactions
      const thisMonthTx = financialTx?.filter((tx: any) => {
        const txDate = new Date(tx.created_at);
        const now = new Date();
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      });

      const saleTx = thisMonthTx?.filter((tx: any) => tx.transaction_type === 'sale') || [];
      const refundTx = thisMonthTx?.filter((tx: any) => tx.transaction_type === 'refund') || [];

      const totalRevenue = saleTx.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
      const totalCost = saleTx.reduce((sum: number, tx: any) => sum + Number(tx.cost || 0), 0);
      const totalProfit = saleTx.reduce((sum: number, tx: any) => sum + Number(tx.profit || 0), 0);
      const totalRefunds = Math.abs(refundTx.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0));

      // Fallback to orders if no financial transactions
      const thisMonthOrders = orders?.filter((order) => {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      });

      const orderBasedRevenue = thisMonthOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = thisMonthOrders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? (totalRevenue || orderBasedRevenue) / totalOrders : 0;

      // Get refunds from refunds table as backup
      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const refundsFromTable = refunds?.reduce((sum, refund) => sum + Number(refund.amount), 0) || 0;
      const finalRefunds = totalRefunds || refundsFromTable;

      return {
        dailySales,
        categoryData,
        topProducts,
        statusData,
        kpis: {
          totalRevenue: totalRevenue || orderBasedRevenue,
          totalOrders,
          avgOrderValue,
          totalRefunds: finalRefunds,
          netRevenue: (totalRevenue || orderBasedRevenue) - finalRefunds,
          totalCost,
          totalProfit: totalProfit || ((totalRevenue || orderBasedRevenue) - finalRefunds - totalCost),
          profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0',
        },
      };
    },
  });
};
