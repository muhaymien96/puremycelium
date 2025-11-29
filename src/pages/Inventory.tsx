import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, Calendar, TrendingDown, Package, Trash2, DollarSign, Pencil } from 'lucide-react';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { AddProductModal } from '@/components/AddProductModal';
import { AddBatchModal } from '@/components/AddBatchModal';
import { BatchHistoryModal } from '@/components/BatchHistoryModal';
import { EditProductModal } from '@/components/EditProductModal';
import { InactiveProductsTab } from '@/components/InactiveProductsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const Inventory = () => {
  const { data: products, isLoading } = useProducts();
  const { data: dashboard, isLoading: loadingDashboard } = useInventoryDashboard();
  const deleteProduct = useDeleteProduct();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  const LOW_STOCK_THRESHOLD = 10;

  const lowStockProducts = products?.filter(p => p.total_stock < LOW_STOCK_THRESHOLD) || [];
  const expiringBatches = dashboard?.expiring_batches || [];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor stock levels and manage products</p>
          </div>
          <Button size="sm" onClick={() => setShowAddProduct(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Products</p>
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{dashboard?.total_products || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-orange-500">{dashboard?.low_stock_count || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-red-500">{dashboard?.expiring_count || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 mb-2 cursor-help">
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Stock Value (Cost)</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Total cost basis of current inventory</p>
                    <p className="text-xs font-semibold mt-1">Potential Revenue: R {(dashboard?.total_retail_value || 0).toFixed(2)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {loadingDashboard ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">R {(dashboard?.total_cost_value || 0).toFixed(2)}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {(lowStockProducts.length > 0 || expiringBatches.length > 0) && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockProducts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Low Stock Items ({lowStockProducts.length})
                  </h4>
                  <div className="space-y-2">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Only {product.total_stock} units left
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowAddBatch(true);
                          }}
                        >
                          Reorder
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expiringBatches.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expiring Soon ({expiringBatches.length})
                  </h4>
                  <div className="space-y-2">
                    {expiringBatches.map((batch: any) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                        <div>
                          <p className="font-medium">{batch.products?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Batch {batch.batch_number} expires {new Date(batch.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {batch.quantity} units
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="reorder">Reorder Suggestions</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Products</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
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
                              <p className="text-lg font-bold">{product.total_stock} {product.unit_of_measure || 'units'}</p>
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
                              setShowEditProduct(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowBatchHistory(true);
                            }}
                          >
                            History
                          </Button>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setProductToDelete(product)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Start by adding your first product to track inventory"
                actionLabel="Add Product"
                onAction={() => setShowAddProduct(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="reorder" className="space-y-4 mt-4">
            {dashboard?.reorder_suggestions && dashboard.reorder_suggestions.length > 0 ? (
              dashboard.reorder_suggestions.map((suggestion: any) => {
                const borderColor = suggestion.priority === 'critical' ? 'border-red-500' : 
                                   suggestion.priority === 'high' ? 'border-orange-500' : 
                                   'border-yellow-500';
                const badgeVariant = suggestion.priority === 'critical' ? 'destructive' : 'secondary';
                
                return (
                  <Card key={suggestion.product_id} className={borderColor}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{suggestion.product_name}</h3>
                            <Badge variant={badgeVariant} className="uppercase text-xs">
                              {suggestion.priority}
                            </Badge>
                            {suggestion.expiring_stock > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {suggestion.expiring_stock} expiring
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{suggestion.reason}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <p className="text-xs text-muted-foreground">Current Stock</p>
                              <p className="text-lg font-bold">{suggestion.current_stock}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Suggested Order</p>
                              <p className="text-lg font-bold text-green-600">{suggestion.suggested_quantity} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Estimated Cost</p>
                              <p className="text-lg font-bold">R {suggestion.estimated_cost.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={suggestion.priority === 'critical' ? 'default' : 'outline'}
                          onClick={() => {
                            const product = products?.find(p => p.id === suggestion.product_id);
                            if (product) {
                              setSelectedProduct(product);
                              setShowAddBatch(true);
                            }
                          }}
                        >
                          Order
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                icon={TrendingDown}
                title="No reorder suggestions"
                description="Stock levels are currently adequate for all products"
              />
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4 mt-4">
            <InactiveProductsTab />
          </TabsContent>
        </Tabs>

        <AddProductModal open={showAddProduct} onOpenChange={setShowAddProduct} />
          <EditProductModal
            open={showEditProduct}
            onOpenChange={setShowEditProduct}
            product={showEditProduct ? selectedProduct : null}
          />
          {selectedProduct && (
            <>
              <AddBatchModal
                open={showAddBatch}
                onOpenChange={setShowAddBatch}
                productId={selectedProduct.id}
                productName={selectedProduct.name}
              />
              <BatchHistoryModal
                open={showBatchHistory}
                onOpenChange={setShowBatchHistory}
                productId={selectedProduct.id}
                productName={selectedProduct.name}
              />
            </>
          )}

        {/* Delete Confirmation Dialog with Reason */}
        <AlertDialog open={!!productToDelete} onOpenChange={() => {
          setProductToDelete(null);
          setDeactivationReason('');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate "{productToDelete?.name}"? This will hide it from active inventory but preserve historical data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <label htmlFor="reason" className="text-sm font-medium mb-2 block">
                Reason for deactivation (required) *
              </label>
              <Textarea
                id="reason"
                placeholder="e.g., Product discontinued, Seasonal item, Replaced by new product..."
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                className="min-h-[80px]"
              />
              {deactivationReason.trim().length > 0 && deactivationReason.trim().length < 3 && (
                <p className="text-sm text-destructive mt-1">Reason must be at least 3 characters</p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deactivationReason.trim().length < 3}
                onClick={() => {
                  if (productToDelete && deactivationReason.trim().length >= 3) {
                    deleteProduct.mutate({ 
                      productId: productToDelete.id,
                      reason: deactivationReason.trim()
                    });
                    setProductToDelete(null);
                    setDeactivationReason('');
                  }
                }}
              >
                Deactivate Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Inventory;
