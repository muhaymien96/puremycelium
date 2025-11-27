import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, Calendar, TrendingDown, Package } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { AddProductModal } from '@/components/AddProductModal';
import { AddBatchModal } from '@/components/AddBatchModal';
import { BatchHistoryModal } from '@/components/BatchHistoryModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';

const Inventory = () => {
  const { data: products, isLoading } = useProducts();
  const { data: dashboard, isLoading: loadingDashboard } = useInventoryDashboard();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Total Stock Value</p>
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">R {(dashboard?.total_value || 0).toFixed(2)}</p>
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
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="reorder">Reorder Suggestions</TabsTrigger>
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

          <TabsContent value="low-stock" className="space-y-4 mt-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <Card key={product.id} className="border-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 capitalize">{product.category}</p>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Stock on Hand</p>
                            <p className="text-lg font-bold text-orange-500">{product.total_stock}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Suggested Reorder</p>
                            <p className="text-lg font-bold">{Math.max(20, LOW_STOCK_THRESHOLD * 2)} units</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowAddBatch(true);
                        }}
                      >
                        Reorder Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="All stock levels healthy"
                description="No products are currently below the low stock threshold"
              />
            )}
          </TabsContent>

          <TabsContent value="reorder" className="space-y-4 mt-4">
            {dashboard?.reorder_suggestions && dashboard.reorder_suggestions.length > 0 ? (
              dashboard.reorder_suggestions.map((suggestion: any) => (
                <Card key={suggestion.product_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{suggestion.product_name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.reason}</p>
                        <div className="flex items-center gap-4">
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
              ))
            ) : (
              <EmptyState
                icon={TrendingDown}
                title="No reorder suggestions"
                description="Stock levels are currently adequate for all products"
              />
            )}
          </TabsContent>
        </Tabs>

        <AddProductModal open={showAddProduct} onOpenChange={setShowAddProduct} />
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
      </div>
    </AppLayout>
  );
};

export default Inventory;
