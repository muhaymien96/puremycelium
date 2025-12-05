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
        .select(`
          *,
          product_batches(quantity, expiry_date),
          profiles(full_name)
        `)
        .eq('is_active', false)
        .order('deactivated_at', { ascending: false });

      if (error) throw error;

      return data.map((p: any) => ({
        ...p,
        total_stock:
          p.product_batches?.reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0,
        unexpired_stock:
          p.product_batches
            ?.filter((b: any) => !b.expiry_date || new Date(b.expiry_date) > new Date())
            .reduce((sum: number, b: any) => sum + Number(b.quantity), 0) || 0
      }));
    },
    enabled: isAdminUser
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
      toast.success('Product reactivated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reactivate product');
    }
  });

  const handleReactivate = (product: any) => {
    if (product.unexpired_stock === 0) {
      toast.error('⚠️ Add new stock before reactivating');
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
        title="Restricted Access"
        description="Only administrators may manage inactive products"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!inactiveProducts || inactiveProducts.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="All Active 🎉"
        description="No inactive products at the moment"
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Showing {inactiveProducts.length} inactive product(s)
        </p>

        {inactiveProducts.map((product: any) => (
          <Card key={product.id} className="border-muted shadow-sm">
            <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{product.name}</h3>
                  <Badge variant="secondary">Inactive</Badge>
                  {product.unexpired_stock > 0 && (
                    <Badge variant="default" className="bg-amber-500/20 text-amber-700">
                      Has Stock
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground capitalize">
                  {product.category} • R {Number(product.unit_price).toFixed(2)}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <Detail label="Remaining" value={`${product.total_stock} ${product.unit_of_measure || 'units'}`} />
                  {product.deactivated_at && (
                    <Detail label="Deactivated" value={new Date(product.deactivated_at).toLocaleDateString()} />
                  )}
                  {product.deactivated_reason && (
                    <Detail label="Reason" value={product.deactivated_reason} />
                  )}
                  {product.profiles && (
                    <Detail label="By" value={product.profiles.full_name} />
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
                  disabled={reactivate.isPending}
                  onClick={() => handleReactivate(product)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProduct && (
        <>
          <AddBatchModal
            open={showAddBatch}
            onOpenChange={(o) => {
              setShowAddBatch(o);
              if (!o) setTimeout(() => reactivate.mutate(selectedProduct.id), 500);
            }}
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            productSku={selectedProduct.sku}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
