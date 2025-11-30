import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export const useReportsData = () => {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      // Orders for category / product / status analytics (30 days)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(name, category))
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Financial transactions (for revenue / cost / profit / refunds)
      const { data: financialTx, error: finError } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (finError) throw finError;

      // Refunds table as backup
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (refundsError) throw refundsError;

      // ===== Daily Sales (30 days) - NET of refunds when possible =====
      const salesByDate: Record<
        string,
        {
          revenue: number;
          refunds: number;
          netRevenue: number;
          cost: number;
          profit: number;
        }
      > = {};

      if (financialTx && financialTx.length > 0) {
        (financialTx as any[]).forEach((tx) => {
          const txDate = new Date(tx.created_at);
          const dateKey = format(txDate, 'MMM dd');

          if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = {
              revenue: 0,
              refunds: 0,
              netRevenue: 0,
              cost: 0,
              profit: 0,
            };
          }

          if (tx.transaction_type === 'sale') {
            salesByDate[dateKey].revenue += Number(tx.amount || 0);
            salesByDate[dateKey].cost += Number(tx.cost || 0);
            salesByDate[dateKey].profit += Number(tx.profit || 0);
          } else if (tx.transaction_type === 'refund') {
            const absAmt = Math.abs(Number(tx.amount || 0));
            salesByDate[dateKey].refunds += absAmt;
            salesByDate[dateKey].profit += Number(tx.profit || 0); // usually negative
          }
        });

        // Compute netRevenue per day
        Object.values(salesByDate).forEach((d) => {
          d.netRevenue = d.revenue - d.refunds;
        });
      } else {
        // Fallback if no financial_transactions yet: use order totals only (gross)
        (orders || []).forEach((order: any) => {
          const dateKey = format(new Date(order.created_at), 'MMM dd');
          if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = {
              revenue: 0,
              refunds: 0,
              netRevenue: 0,
              cost: 0,
              profit: 0,
            };
          }
          salesByDate[dateKey].revenue += Number(order.total_amount);
          salesByDate[dateKey].netRevenue = salesByDate[dateKey].revenue;
        });
      }

      const dailySales = Object.entries(salesByDate).map(
        ([date, data]: [string, any]) => ({
          date,
          amount: data.netRevenue ?? data.revenue,
          cost: data.cost || 0,
          profit: data.profit || 0,
        })
      );

      // ===== Revenue by category =====
      const revenueByCategory = (orders || []).reduce((acc: any, order: any) => {
        order.order_items?.forEach((item: any) => {
          const category = item.products?.category || 'other';
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += Number(item.subtotal);
        });
        return acc;
      }, {});

      const categoryData = Object.entries(revenueByCategory || {}).map(
        ([name, value]: [string, any]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: Number(value),
        })
      );

      // ===== Top products by revenue =====
      const productSales = (orders || []).reduce((acc: any, order: any) => {
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

      // ===== Order status distribution =====
      const statusDistribution = (orders || []).reduce((acc: any, order: any) => {
        const status = order.status || 'pending';
        if (!acc[status]) {
          acc[status] = 0;
        }
        acc[status]++;
        return acc;
      }, {});

      const statusData = Object.entries(statusDistribution || {}).map(
        ([name, value]: [string, any]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: Number(value),
        })
      );

      // ===== KPIs: This month =====
      const now = new Date();

      const thisMonthTx = (financialTx || []).filter((tx: any) => {
        const txDate = new Date(tx.created_at);
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      });

      const saleTx = thisMonthTx.filter(
        (tx: any) => tx.transaction_type === 'sale'
      );
      const refundTx = thisMonthTx.filter(
        (tx: any) => tx.transaction_type === 'refund'
      );

      const totalRevenue =
        saleTx.reduce(
          (sum: number, tx: any) => sum + Number(tx.amount || 0),
          0
        ) || 0;

      const totalCost =
        saleTx.reduce(
          (sum: number, tx: any) => sum + Number(tx.cost || 0),
          0
        ) || 0;

      // Net profit from all tx in the month (sales + refunds)
      const netProfitThisMonth =
        thisMonthTx.reduce(
          (sum: number, tx: any) => sum + Number(tx.profit || 0),
          0
        ) || 0;

      // Refunds from financial_transactions (preferred)
      const totalRefundsFromFin =
        refundTx.reduce(
          (sum: number, tx: any) =>
            sum + Math.abs(Number(tx.amount || 0)),
          0
        ) || 0;

      // Fallback: refunds table (this month only) if no financial refund tx exist
      const refundsThisMonthFromTable =
        (refunds || [])
          .filter((r: any) => {
            const rDate = new Date(r.created_at);
            return (
              rDate.getMonth() === now.getMonth() &&
              rDate.getFullYear() === now.getFullYear()
            );
          })
          .reduce(
            (sum: number, r: any) => sum + Number(r.amount || 0),
            0
          ) || 0;

      const finalRefunds = totalRefundsFromFin || refundsThisMonthFromTable;

      // Fallback to orders if no financial transactions yet
      const thisMonthOrders =
        (orders || []).filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return (
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        }) || [];

      const orderBasedRevenue =
        thisMonthOrders.reduce(
          (sum: number, order: any) => sum + Number(order.total_amount),
          0
        ) || 0;

      const totalOrders = thisMonthOrders.length || 0;
      const baseRevenue = totalRevenue || orderBasedRevenue;
      const netRevenue = baseRevenue - finalRefunds;
      const avgOrderValue = totalOrders > 0 ? baseRevenue / totalOrders : 0;

      const profitMargin =
        netRevenue > 0 ? (netProfitThisMonth / netRevenue) * 100 : 0;

      return {
        dailySales,
        categoryData,
        topProducts,
        statusData,
        kpis: {
          totalRevenue: baseRevenue,
          totalOrders,
          avgOrderValue,
          totalRefunds: finalRefunds,
          netRevenue,
          totalCost,
          totalProfit: netProfitThisMonth,
          profitMargin,
        },
      };
    },
  });
};
