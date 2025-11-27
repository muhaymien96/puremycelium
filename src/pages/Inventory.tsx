import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { AddProductModal } from '@/components/AddProductModal';
import { AddBatchModal } from '@/components/AddBatchModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const Inventory = () => {
  const { data: products, isLoading } = useProducts();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const LOW_STOCK_THRESHOLD = 5;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-muted-foreground">Manage your products and stock levels</p>
          </div>
          <Button size="sm" onClick={() => setShowAddProduct(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : products && products.length > 0 ? (
          products.map((product) => {
            const lowStock = product.total_stock < LOW_STOCK_THRESHOLD;
            return (
              <Card key={product.id} className={lowStock ? 'border-orange-500' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        {lowStock && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 capitalize">{product.category}</p>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Stock on Hand</p>
                          <p className="text-lg font-bold">{product.total_stock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="text-lg font-bold">R {Number(product.unit_price).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowAddBatch(true);
                        }}
                      >
                        Add Batch
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No products yet</p>
              <Button onClick={() => setShowAddProduct(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            </CardContent>
          </Card>
        )}

        <AddProductModal open={showAddProduct} onOpenChange={setShowAddProduct} />
        {selectedProduct && (
          <AddBatchModal
            open={showAddBatch}
            onOpenChange={setShowAddBatch}
            productId={selectedProduct.id}
            productName={selectedProduct.name}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Inventory;