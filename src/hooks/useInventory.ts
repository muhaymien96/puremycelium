import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInventoryDashboard = () => {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      // Get ACTIVE products with stock and product cost_price
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit_price, cost_price, is_active, product_batches(quantity, expiry_date)')
        .eq('is_active', true);

      if (productsError) throw productsError;

      const LOW_STOCK_THRESHOLD = 10;
      const CRITICAL_THRESHOLD = 5;
      const DAYS_TO_EXPIRY_WARNING = 30;
      const DAYS_TO_EXPIRY_CRITICAL = 60;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + DAYS_TO_EXPIRY_WARNING);

      // Calculate dashboard metrics
      const totalProducts = products?.length || 0;
      
      const lowStockCount = products?.filter((p: any) => {
        const totalStock = p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;
        return totalStock < LOW_STOCK_THRESHOLD;
      }).length || 0;

      // Get expiring batches from ACTIVE products only
      const { data: expiringBatches } = await supabase
        .from('product_batches')
        .select('*, products!inner(name, is_active)')
        .lt('expiry_date', expiryDate.toISOString())
        .gt('quantity', 0)
        .eq('products.is_active', true)
        .order('expiry_date', { ascending: true })
        .limit(10);

      const expiringCount = expiringBatches?.length || 0;

      // Helper to get cost per unit with fallback chain:
      // 1. product.cost_price (product default)
      // 2. 60% of unit_price (last resort estimate)
      const getCostPerUnit = (product: any): number => {
        if (product.cost_price != null && !isNaN(Number(product.cost_price)) && Number(product.cost_price) > 0) {
          return Number(product.cost_price);
        }
        return Number(product.unit_price) * 0.6;
      };

      // Calculate total stock value (COST BASIS with improved fallback)
      const totalCostValue = products?.reduce((sum: number, p: any) => {
        const costPerUnit = getCostPerUnit(p);
        const batchValue = p.product_batches?.reduce((s: number, b: any) => {
          const quantity = Number(b.quantity);
          return s + (quantity * costPerUnit);
        }, 0) || 0;
        return sum + batchValue;
      }, 0) || 0;

      // Calculate total retail value (POTENTIAL REVENUE)
      const totalRetailValue = products?.reduce((sum: number, p: any) => {
        const stock = p.product_batches?.reduce((s: number, b: any) => s + Number(b.quantity), 0) || 0;
        return sum + (stock * Number(p.unit_price));
      }, 0) || 0;

      // Generate enhanced reorder suggestions with expiry analysis and priority
      const reorderSuggestions = products?.map((p: any) => {
        const currentStock = p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;
        
        // Use product cost_price with fallback to 60% of unit_price
        const avgCostPerUnit = getCostPerUnit(p);

        // Check for expiring stock
        const expiringStockDate = new Date();
        expiringStockDate.setDate(expiringStockDate.getDate() + DAYS_TO_EXPIRY_CRITICAL);
        const expiringStock = p.product_batches?.filter((b: any) => 
          b.expiry_date && new Date(b.expiry_date) < expiringStockDate
        ).reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0;

        // Determine priority level
        let priority: 'critical' | 'high' | 'medium' | null = null;
        let reason = '';

        if (currentStock === 0) {
          priority = 'critical';
          reason = 'Out of stock - restock immediately';
        } else if (currentStock < CRITICAL_THRESHOLD) {
          priority = 'high';
          reason = `Critical low stock (${currentStock} units remaining)`;
        } else if (currentStock < LOW_STOCK_THRESHOLD && expiringStock > 0) {
          priority = 'high';
          reason = `Low stock (${currentStock} units) with ${expiringStock} units expiring soon`;
        } else if (currentStock < LOW_STOCK_THRESHOLD) {
          priority = 'medium';
          reason = `Low stock (${currentStock} units remaining)`;
        }

        if (priority) {
          const suggestedQuantity = Math.max(20, LOW_STOCK_THRESHOLD * 2);
          return {
            product_id: p.id,
            product_name: p.name,
            current_stock: currentStock,
            suggested_quantity: suggestedQuantity,
            estimated_cost: suggestedQuantity * avgCostPerUnit,
            priority,
            reason,
            expiring_stock: expiringStock,
          };
        }
        return null;
      }).filter(Boolean) || [];

      // Sort by priority (critical > high > medium) and then by stock level
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      reorderSuggestions.sort((a: any, b: any) => {
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.current_stock - b.current_stock;
      });

      return {
        total_products: totalProducts,
        low_stock_count: lowStockCount,
        expiring_count: expiringCount,
        total_cost_value: totalCostValue,
        total_retail_value: totalRetailValue,
        expiring_batches: expiringBatches || [],
        reorder_suggestions: reorderSuggestions,
      };
    },
  });
};
