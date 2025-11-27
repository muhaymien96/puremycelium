import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInventoryDashboard = () => {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      // Get products with stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*, product_batches(quantity, expiry_date)');

      if (productsError) throw productsError;

      const LOW_STOCK_THRESHOLD = 10;
      const DAYS_TO_EXPIRY_WARNING = 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + DAYS_TO_EXPIRY_WARNING);

      // Calculate dashboard metrics
      const totalProducts = products?.length || 0;
      
      const lowStockCount = products?.filter((p: any) => {
        const totalStock = p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;
        return totalStock < LOW_STOCK_THRESHOLD;
      }).length || 0;

      // Get expiring batches
      const { data: expiringBatches } = await supabase
        .from('product_batches')
        .select('*, products(name)')
        .lt('expiry_date', expiryDate.toISOString())
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true })
        .limit(10);

      const expiringCount = expiringBatches?.length || 0;

      // Calculate total stock value
      const totalValue = products?.reduce((sum: number, p: any) => {
        const stock = p.product_batches?.reduce((s: number, b: any) => s + Number(b.quantity), 0) || 0;
        return sum + (stock * Number(p.unit_price));
      }, 0) || 0;

      // Generate reorder suggestions
      const reorderSuggestions = products?.filter((p: any) => {
        const totalStock = p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;
        return totalStock < LOW_STOCK_THRESHOLD;
      }).map((p: any) => {
        const currentStock = p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;
        const suggestedQuantity = Math.max(20, LOW_STOCK_THRESHOLD * 2);
        
        return {
          product_id: p.id,
          product_name: p.name,
          current_stock: currentStock,
          suggested_quantity: suggestedQuantity,
          estimated_cost: suggestedQuantity * Number(p.unit_price),
          reason: currentStock === 0 
            ? 'Out of stock - restock immediately' 
            : `Low stock (${currentStock} units remaining)`
        };
      }) || [];

      return {
        total_products: totalProducts,
        low_stock_count: lowStockCount,
        expiring_count: expiringCount,
        total_value: totalValue,
        expiring_batches: expiringBatches || [],
        reorder_suggestions: reorderSuggestions,
      };
    },
  });
};
