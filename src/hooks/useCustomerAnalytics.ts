import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerAnalytics = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-analytics', customerId],
    queryFn: async () => {
      // Fetch orders with full details
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            quantity,
            unit_price,
            subtotal,
            products(id, name, category)
          ),
          payments(payment_method, payment_status, amount)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate analytics
      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Get favorite products (most purchased by quantity)
      const productMap = new Map<string, { id: string; name: string; category: string; quantity: number; totalSpent: number }>();
      
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          if (item.products) {
            const existing = productMap.get(item.products.id);
            if (existing) {
              existing.quantity += Number(item.quantity);
              existing.totalSpent += Number(item.subtotal);
            } else {
              productMap.set(item.products.id, {
                id: item.products.id,
                name: item.products.name,
                category: item.products.category,
                quantity: Number(item.quantity),
                totalSpent: Number(item.subtotal)
              });
            }
          }
        });
      });

      const favoriteProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Get payment preferences (most used payment methods)
      const paymentMethodMap = new Map<string, number>();
      orders?.forEach(order => {
        order.payments?.forEach((payment: any) => {
          if (payment.payment_status === 'completed') {
            const method = payment.payment_method || 'Unknown';
            paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + 1);
          }
        });
      });

      const paymentPreferences = Array.from(paymentMethodMap.entries())
        .map(([method, count]) => ({
          method,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Order status breakdown
      const statusMap = new Map<string, number>();
      orders?.forEach(order => {
        const status = order.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const orderStatuses = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
      }));

      // Purchase frequency
      const firstOrderDate = orders && orders.length > 0 
        ? new Date(orders[orders.length - 1].created_at)
        : null;
      
      const lastOrderDate = orders && orders.length > 0
        ? new Date(orders[0].created_at)
        : null;

      let daysSinceFirstOrder = 0;
      let avgDaysBetweenOrders = 0;
      
      if (firstOrderDate && lastOrderDate && totalOrders > 1) {
        daysSinceFirstOrder = Math.floor((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        avgDaysBetweenOrders = Math.floor(daysSinceFirstOrder / (totalOrders - 1));
      }

      return {
        totalOrders,
        totalSpent,
        avgOrderValue,
        favoriteProducts,
        paymentPreferences,
        orderStatuses,
        firstOrderDate,
        lastOrderDate,
        daysSinceFirstOrder,
        avgDaysBetweenOrders,
        orders: orders || []
      };
    },
    enabled: !!customerId
  });
};