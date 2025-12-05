import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useReportsData = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['reports-data', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      // Fetch orders with items and product costs - use transaction_datetime for accurate date filtering
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(name, category, cost_price, unit_price))
        `)
        .gte('transaction_datetime', startDate.toISOString())
        .lte('transaction_datetime', endDate.toISOString())
        .order('transaction_datetime', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch financial transactions - use transaction_at for accurate date filtering
      const { data: financialTx, error: finError } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('transaction_at', startDate.toISOString())
        .lte('transaction_at', endDate.toISOString());

      if (finError) throw finError;

      // Fetch expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      if (expError) throw expError;

      // Fetch market events with their orders for profitability
      const { data: marketEvents, error: eventsError } = await supabase
        .from('market_events')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0]);

      if (eventsError) throw eventsError;

      // Calculate daily sales with profit data
      const salesByDate: Record<string, any> = {};

      (financialTx || []).forEach((tx: any) => {
        const txDate = new Date(tx.transaction_at || tx.created_at);
        const dateKey = format(txDate, 'MMM dd');
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = { revenue: 0, refunds: 0, netRevenue: 0, cost: 0, profit: 0 };
        }

        if (tx.transaction_type === 'sale') {
          salesByDate[dateKey].revenue += Number(tx.amount || 0);
          salesByDate[dateKey].cost += Number(tx.cost || 0);
          salesByDate[dateKey].profit += Number(tx.profit || 0);
        }
        if (tx.transaction_type === 'refund') {
          const abs = Math.abs(Number(tx.amount || 0));
          salesByDate[dateKey].refunds += abs;
          salesByDate[dateKey].profit += Number(tx.profit || 0);
        }
      });

      Object.values(salesByDate).forEach((d: any) => {
        d.netRevenue = d.revenue - d.refunds;
      });

      // Get expenses by date for combined chart
      const expensesByDate: Record<string, number> = {};
      (expenses || []).forEach((e: any) => {
        const dateKey = format(new Date(e.expense_date), 'MMM dd');
        expensesByDate[dateKey] = (expensesByDate[dateKey] || 0) + Number(e.amount);
      });

      const dailySales = Object.entries(salesByDate).map(([date, d]: any) => ({
        date,
        amount: d.netRevenue,
        cost: d.cost,
        profit: d.profit,
        revenue: d.revenue,
        expenses: expensesByDate[date] || 0,
      }));

      // Revenue by category
      const revenueByCategory: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        o.order_items?.forEach((i: any) => {
          const cat = i.products?.category || 'other';
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(i.subtotal || 0);
        });
      });
      const categoryData = Object.entries(revenueByCategory).map(([name, value]: any) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Top products with units sold and cost data
      const productSales: Record<string, { quantity: number; revenue: number; cost: number }> = {};
      (orders || []).forEach((o: any) => {
        o.order_items?.forEach((i: any) => {
          const name = i.products?.name || 'Unknown';
          if (!productSales[name]) productSales[name] = { quantity: 0, revenue: 0, cost: 0 };
          productSales[name].quantity += Number(i.quantity);
          productSales[name].revenue += Number(i.subtotal);
          // Estimate cost from product cost_price or 60% of unit_price
          const unitCost = i.products?.cost_price || (Number(i.unit_price) * 0.6);
          productSales[name].cost += Number(i.quantity) * unitCost;
        });
      });

      const topProducts = Object.entries(productSales)
        .map(([name, d]: any) => ({ name, unitsSold: d.quantity, revenue: d.revenue, cost: d.cost }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Get top 10 for margin analysis

      // Calculate total units sold
      const totalUnitsSold = Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0);

      // Order status breakdown
      const statusData: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        statusData[o.status] = (statusData[o.status] || 0) + 1;
      });
      const status = Object.entries(statusData).map(([name, value]: any) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Calculate KPIs from financial transactions
      const revenue = (financialTx || [])
        .filter((t: any) => t.transaction_type === 'sale')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const refunds = (financialTx || [])
        .filter((t: any) => t.transaction_type === 'refund')
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0);

      const totalCost = (financialTx || [])
        .filter((t: any) => t.transaction_type === 'sale')
        .reduce((sum: number, t: any) => sum + Number(t.cost || 0), 0);

      const grossProfit = revenue - totalCost;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      const netRevenue = revenue - refunds;
      const totalOrders = orders?.length ?? 0;
      const avgOrderValue = totalOrders > 0 ? netRevenue / totalOrders : 0;

      // Total expenses
      const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      // Net profit (after expenses)
      const netProfit = grossProfit - totalExpenses;

      // Expense breakdown by type
      const expenseByType: Record<string, number> = {};
      (expenses || []).forEach((e: any) => {
        const type = e.expense_type || 'other';
        expenseByType[type] = (expenseByType[type] || 0) + Number(e.amount);
      });
      const expenseBreakdown = Object.entries(expenseByType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Event profitability - use linked expenses (auto-created from event costs)
      const eventProfitability = await Promise.all(
        (marketEvents || []).map(async (event: any) => {
          // Get orders for this event
          const { data: eventOrders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('market_event_id', event.id)
            .neq('status', 'cancelled')
            .neq('status', 'refunded');

          const eventRevenue = (eventOrders || []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
          
          // Get expenses linked to this event (includes auto-created stall_fee, travel, other)
          const { data: eventExpenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('market_event_id', event.id);

          const totalEventCosts = (eventExpenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

          return {
            id: event.id,
            name: event.name,
            date: event.event_date,
            location: event.location,
            revenue: eventRevenue,
            costs: totalEventCosts,
            profit: eventRevenue - totalEventCosts,
          };
        })
      );

      // Raw data for CSV export (enhanced with units sold)
      const rawOrdersData = (orders || []).map((o: any) => {
        const unitsSold = o.order_items?.reduce((sum: number, i: any) => sum + Number(i.quantity), 0) || 0;
        return {
          order_number: o.order_number,
          date: format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
          status: o.status,
          total: Number(o.total_amount),
          delivery_fee: Number(o.delivery_fee || 0),
          items: o.order_items?.length || 0,
          units_sold: unitsSold,
        };
      });

      const rawExpensesData = (expenses || []).map((e: any) => ({
        date: e.expense_date,
        type: e.expense_type,
        description: e.description,
        amount: Number(e.amount),
      }));

      // Product sales for export
      const rawProductSalesData = Object.entries(productSales)
        .map(([name, d]: any) => ({ product: name, units_sold: d.quantity, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        dailySales,
        categoryData,
        topProducts,
        statusData: status,
        expenseBreakdown,
        eventProfitability,
        kpis: {
          totalRevenue: revenue,
          netRevenue,
          totalOrders,
          avgOrderValue,
          grossProfit,
          grossMargin,
          totalExpenses,
          totalCost,
          netProfit,
          totalUnitsSold,
        },
        rawData: {
          orders: rawOrdersData,
          expenses: rawExpensesData,
          productSales: rawProductSalesData,
        },
      };
    },
  });
};
