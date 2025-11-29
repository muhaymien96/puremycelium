import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { AddBatchModal } from './AddBatchModal';
import { BatchHistoryModal } from './BatchHistoryModal';
import { isAdmin } from '@/lib/permissions';

export function InactiveProductsTab() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Check admin status
  useEffect(() => {
    isAdmin().then(setIsAdminUser);
  }, []);
  
  const { data: inactiveProducts, isLoading } = useQuery({
    queryKey: ['inactive-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_batches(quantity, expiry_date), profiles(first_name, last_name)')
        .eq('is_active', false)
        .order('deactivated_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((p: any) => ({
        ...p,
        total_stock: p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0,
        unexpired_stock: p.product_batches?.filter((b: any) => 
          !b.expiry_date || new Date(b.expiry_date) > new Date()
        ).reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0
      }));
    },
    enabled: isAdminUser,
  });
  
  const reactivate = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_active: true, 
          deactivated_at: null,
          deactivated_reason: null,
          deactivated_by: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inactive-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Product reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reactivate product');
    },
  });

  const handleReactivate = (product: any) => {
    if (product.unexpired_stock === 0) {
      toast.error('Cannot reactivate product without adding a batch first');
      setSelectedProduct(product);
      setShowAddBatch(true);
    } else {
      reactivate.mutate(product.id);
    }
  };
  
  if (!isAdminUser) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Admin access required"
        description="Only administrators can view and manage inactive products"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  if (!inactiveProducts || inactiveProducts.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No inactive products"
        description="All products are currently active"
      />
    );
  }
  
  return (
    <>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Showing {inactiveProducts.length} deactivated product(s). Historical order data is preserved.
        </div>
        
        {inactiveProducts.map((product: any) => (
          <Card key={product.id} className="opacity-70 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <Badge variant="secondary">Inactive</Badge>
                    {product.unexpired_stock > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Has Stock
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 capitalize">
                    {product.category} • R {Number(product.unit_price).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining Stock</p>
                      <p className="text-sm font-medium">{product.total_stock} {product.unit_of_measure || 'units'}</p>
                    </div>
                    {product.deactivated_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Deactivated</p>
                        <p className="text-sm font-medium">{new Date(product.deactivated_at).toLocaleDateString()}</p>
                      </div>
                    )}
                    {product.deactivated_reason && (
                      <div>
                        <p className="text-xs text-muted-foreground">Reason</p>
                        <p className="text-sm font-medium">{product.deactivated_reason}</p>
                      </div>
                    )}
                    {product.profiles && (
                      <div>
                        <p className="text-xs text-muted-foreground">By</p>
                        <p className="text-sm font-medium">
                          {product.profiles.first_name} {product.profiles.last_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowHistory(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    History
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReactivate(product)}
                    disabled={reactivate.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reactivate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProduct && (
        <>
          <AddBatchModal
            open={showAddBatch}
            onOpenChange={(open) => {
              setShowAddBatch(open);
              if (!open) {
                // After adding batch, try reactivating
                setTimeout(() => {
                  reactivate.mutate(selectedProduct.id);
                }, 500);
              }
            }}
            productId={selectedProduct.id}
            productName={selectedProduct.name}
          />
          <BatchHistoryModal
            open={showHistory}
            onOpenChange={setShowHistory}
            productId={selectedProduct.id}
            productName={selectedProduct.name}
          />
        </>
      )}
    </>
  );
}
