import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Package, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportStockChangesProps {
  importBatchId: string;
}

interface StockMovement {
  id: string;
  quantity: number;
  movement_type: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    sku: string;
    total_stock: number;
  } | null;
}

export function ImportStockChanges({ importBatchId }: ImportStockChangesProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', importBatchId],
    queryFn: async () => {
      // Get all orders from this import batch
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('import_batch_id', importBatchId);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map(o => o.id);

      // Get stock movements for these orders
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          quantity,
          movement_type,
          created_at,
          products (
            id,
            name,
            sku,
            total_stock
          )
        `)
        .eq('movement_type', 'sale')
        .in('reference_id', orderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StockMovement[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No stock movements recorded for this import. This may occur if products were not mapped during import.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Aggregate movements by product
  const aggregated = movements.reduce((acc, movement) => {
    if (!movement.products) return acc;
    
    const productId = movement.products.id;
    if (!acc[productId]) {
      acc[productId] = {
        product: movement.products,
        totalReduction: 0,
        count: 0,
      };
    }
    
    acc[productId].totalReduction += Math.abs(movement.quantity);
    acc[productId].count += 1;
    
    return acc;
  }, {} as Record<string, { product: StockMovement['products'], totalReduction: number, count: number }>);

  const aggregatedArray = Object.values(aggregated)
    .sort((a, b) => b.totalReduction - a.totalReduction);

  const totalReduction = aggregatedArray.reduce((sum, item) => sum + item.totalReduction, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Changes
        </CardTitle>
        <CardDescription>
          Stock movements from this import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{aggregatedArray.length}</div>
            <div className="text-xs text-muted-foreground">Products Affected</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-red-600">{totalReduction}</div>
            <div className="text-xs text-muted-foreground">Total Units Reduced</div>
          </div>
        </div>

        {/* Stock Changes Table */}
        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-right p-2 font-medium">Stock Reduced</th>
                  <th className="text-right p-2 font-medium">Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedArray.map((item) => (
                  <tr key={item.product?.id} className="border-b">
                    <td className="p-2">
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.product?.sku} • {item.count} transaction(s)
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1 text-red-600 font-medium">
                        <TrendingDown className="h-3 w-3" />
                        {item.totalReduction}
                      </div>
                    </td>
                    <td className="p-2 text-right font-bold">
                      <span className={
                        (item.product?.total_stock || 0) < 10 
                          ? 'text-yellow-600' 
                          : 'text-foreground'
                      }>
                        {item.product?.total_stock || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
