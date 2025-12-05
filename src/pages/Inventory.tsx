import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  AlertTriangle,
  Calendar,
  TrendingDown,
  Package,
  Trash2,
  Pencil,
  History,
  PackagePlus,
  BoxesIcon,
  Tag,
} from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOW_STOCK_THRESHOLD = 10;

const DISCONTINUE_REASONS = [
  { value: 'discontinued', label: 'Product discontinued by supplier' },
  { value: 'seasonal', label: 'Seasonal item - out of season' },
  { value: 'replaced', label: 'Replaced by new product' },
  { value: 'low_demand', label: 'Low demand / poor sales' },
  { value: 'quality_issues', label: 'Quality issues' },
  { value: 'expired_stock', label: 'All stock expired' },
  { value: 'temporary', label: 'Temporarily unavailable' },
  { value: 'other', label: 'Other (specify below)' },
];

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
  const [selectedReasonType, setSelectedReasonType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const lowStockProducts =
    products?.filter((p) => (p.total_stock ?? 0) < LOW_STOCK_THRESHOLD) || [];

  const expiringBatches = dashboard?.expiring_batches || [];

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const name = p.name?.toLowerCase() ?? '';
      const category = p.category?.toLowerCase() ?? '';
      return name.includes(term) || category.includes(term);
    });
  }, [products, searchTerm]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Inventory Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor stock levels and manage products.
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              size="sm"
              className="w-full sm:w-auto shadow-sm"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Total Products */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 md:pt-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total Products
                </p>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="text-2xl md:text-3xl font-semibold">
                  {dashboard?.total_products || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 md:pt-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Low Stock Items
                </p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="text-2xl md:text-3xl font-semibold text-amber-600">
                  {dashboard?.low_stock_count || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expiring Soon */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 md:pt-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Expiring Soon
                </p>
                <Calendar className="h-4 w-4 text-red-500" />
              </div>
              {loadingDashboard ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="text-2xl md:text-3xl font-semibold text-red-600">
                  {dashboard?.expiring_count || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stock Value */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 md:pt-5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between mb-1 cursor-help">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Stock Value (Cost)
                      </p>
                      <TrendingDown className="h-4 w-4 text-sky-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Total cost basis of current inventory.
                    </p>
                    <p className="text-xs font-semibold mt-1">
                      Potential Revenue:{' '}
                      R {(dashboard?.total_retail_value || 0).toFixed(2)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {loadingDashboard ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-lg md:text-xl font-semibold">
                  R {(dashboard?.total_cost_value || 0).toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(lowStockProducts.length > 0 || expiringBatches.length > 0) && (
          <Card className="border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockProducts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Low Stock Items ({lowStockProducts.length})
                  </h4>
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/70"
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Only {product.total_stock} remaining
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
                    {lowStockProducts.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        + {lowStockProducts.length - 5} more low stock items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {expiringBatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expiring Soon ({expiringBatches.length})
                  </h4>
                  <div className="space-y-2">
                    {expiringBatches.slice(0, 5).map((batch: any) => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/70"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {batch.products?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Batch {batch.batch_number} expires{' '}
                            {new Date(
                              batch.expiry_date,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {batch.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs & search */}
        <Tabs defaultValue="all" className="w-full space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <TabsList className="w-full md:w-auto grid grid-cols-3 rounded-full bg-muted/60 p-1">
              <TabsTrigger
                value="all"
                className="rounded-full text-xs md:text-sm py-1.5"
              >
                All Products
              </TabsTrigger>
              <TabsTrigger
                value="reorder"
                className="rounded-full text-xs md:text-sm py-1.5"
              >
                Reorder
              </TabsTrigger>
              <TabsTrigger
                value="inactive"
                className="rounded-full text-xs md:text-sm py-1.5"
              >
                Inactive
              </TabsTrigger>
            </TabsList>

            <div className="md:w-72">
              <Input
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* All products */}
          <TabsContent value="all" className="mt-2 md:mt-3">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const stock = product.total_stock ?? 0;
                  const noStock = stock === 0;
                  const lowStock = stock > 0 && stock < LOW_STOCK_THRESHOLD;

                  const cardClasses = `
                    border bg-card/80 backdrop-blur-sm transition-all duration-200
                    hover:-translate-y-[1px] hover:shadow-md
                    ${
                      noStock
                        ? 'border-red-400 shadow-sm ring-1 ring-red-200 bg-red-50/50 dark:bg-red-950/20'
                        : lowStock
                        ? 'border-amber-300/80 shadow-sm ring-1 ring-amber-100/80'
                        : 'shadow-sm hover:border-primary/30'
                    }
                  `;

                  return (
                    <Card key={product.id} className={cardClasses}>
                      <CardContent className="p-4 md:p-5 flex flex-col gap-3 h-full">
                        {/* Top row: title + badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm md:text-base leading-tight">
                                {product.name}
                              </h3>
                              {noStock && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] md:text-[11px] px-2 py-0.5 flex items-center gap-1"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Out of stock
                                </Badge>
                              )}
                              {lowStock && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] md:text-[11px] px-2 py-0.5 flex items-center gap-1 border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Low stock
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                              {product.category && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {product.category}
                                </Badge>
                              )}
                              {product.unit_of_measure && (
                                <span>{product.unit_of_measure}</span>
                              )}
                              {product.sku && (
                                <span className="text-[10px] text-muted-foreground/80">
                                  • SKU {product.sku}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Desktop actions (top-right) */}
                          <div className="hidden md:flex flex-col gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-start h-8 text-xs"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowEditProduct(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-start h-8 text-xs"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowBatchHistory(true);
                              }}
                            >
                              <History className="h-3.5 w-3.5 mr-1.5" />
                              History
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-start h-8 text-xs"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowAddBatch(true);
                              }}
                            >
                              <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
                              Add Batch
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="justify-start h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setProductToDelete(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Deactivate
                            </Button>
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <BoxesIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Stock on Hand
                              </p>
                              <p className="text-lg font-bold">
                                {product.total_stock}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <Tag className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Price
                              </p>
                              <p className="text-lg font-bold">
                                R {Number(product.unit_price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Mobile actions (bottom) */}
                        <div className="flex md:hidden flex-wrap gap-2 pt-3 border-t mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowEditProduct(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowBatchHistory(true);
                            }}
                          >
                            <History className="h-3.5 w-3.5 mr-1.5" />
                            History
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowAddBatch(true);
                            }}
                          >
                            <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
                            Add Batch
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setProductToDelete(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Deactivate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Start by adding your first product to track inventory."
                actionLabel="Add Product"
                onAction={() => setShowAddProduct(true)}
              />
            )}
          </TabsContent>

          {/* Reorder suggestions */}
          <TabsContent value="reorder" className="mt-2 md:mt-3">
            {dashboard?.reorder_suggestions &&
            dashboard.reorder_suggestions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {dashboard.reorder_suggestions.map((suggestion: any) => {
                  const borderColor =
                    suggestion.priority === 'critical'
                      ? 'border-red-500'
                      : suggestion.priority === 'high'
                      ? 'border-amber-500'
                      : 'border-yellow-500';
                  const badgeVariant =
                    suggestion.priority === 'critical'
                      ? 'destructive'
                      : 'secondary';

                  const product = products?.find(
                    (p) => p.id === suggestion.product_id,
                  );

                  return (
                    <Card
                      key={suggestion.product_id}
                      className={`${borderColor} bg-card/80 backdrop-blur-sm shadow-sm`}
                    >
                      <CardContent className="p-4 md:p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm md:text-base">
                                {suggestion.product_name}
                              </h3>
                              <Badge
                                variant={badgeVariant}
                                className="uppercase text-[10px]"
                              >
                                {suggestion.priority}
                              </Badge>
                              {suggestion.expiring_stock > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] flex items-center gap-1"
                                >
                                  <Calendar className="h-3 w-3" />
                                  {suggestion.expiring_stock} expiring
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground mb-2">
                              {suggestion.reason}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={
                              suggestion.priority === 'critical'
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() => {
                              if (product) {
                                setSelectedProduct(product);
                                setShowAddBatch(true);
                              }
                            }}
                          >
                            Order
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Current Stock
                            </p>
                            <p className="font-semibold">
                              {suggestion.current_stock}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Suggested Order
                            </p>
                            <p className="font-semibold text-emerald-600">
                              {suggestion.suggested_quantity} units
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Estimated Cost
                            </p>
                            <p className="font-semibold">
                              R {suggestion.estimated_cost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={TrendingDown}
                title="No reorder suggestions"
                description="Stock levels are currently adequate for all products."
              />
            )}
          </TabsContent>

          {/* Inactive products */}
          <TabsContent value="inactive" className="mt-2 md:mt-3">
            <InactiveProductsTab />
          </TabsContent>
        </Tabs>

        {/* Modals */}
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
              productSku={selectedProduct.sku}
            />
            <BatchHistoryModal
              open={showBatchHistory}
              onOpenChange={setShowBatchHistory}
              productId={selectedProduct.id}
              productName={selectedProduct.name}
            />
          </>
        )}

        {/* Deactivate / delete */}
        <AlertDialog
          open={!!productToDelete}
          onOpenChange={() => {
            setProductToDelete(null);
            setDeactivationReason('');
            setSelectedReasonType('');
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate "
                {productToDelete?.name}"? This will hide it from active
                inventory but preserve historical data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-4">
              <div>
                <label
                  htmlFor="reason-type"
                  className="text-sm font-medium mb-2 block"
                >
                  Reason for deactivation *
                </label>
                <Select
                  value={selectedReasonType}
                  onValueChange={(value) => {
                    setSelectedReasonType(value);
                    if (value !== 'other') {
                      const reason = DISCONTINUE_REASONS.find(r => r.value === value);
                      setDeactivationReason(reason?.label || '');
                    } else {
                      setDeactivationReason('');
                    }
                  }}
                >
                  <SelectTrigger id="reason-type">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCONTINUE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedReasonType === 'other' && (
                <div>
                  <label
                    htmlFor="reason"
                    className="text-sm font-medium mb-2 block"
                  >
                    Please specify *
                  </label>
                  <Textarea
                    id="reason"
                    placeholder="Enter your reason for deactivation..."
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                  {deactivationReason.trim().length > 0 &&
                    deactivationReason.trim().length < 3 && (
                      <p className="text-sm text-destructive mt-1">
                        Reason must be at least 3 characters.
                      </p>
                    )}
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!selectedReasonType || (selectedReasonType === 'other' && deactivationReason.trim().length < 3)}
                onClick={() => {
                  if (
                    productToDelete &&
                    selectedReasonType &&
                    (selectedReasonType !== 'other' || deactivationReason.trim().length >= 3)
                  ) {
                    deleteProduct.mutate({
                      productId: productToDelete.id,
                      reason: deactivationReason.trim(),
                    });
                    setProductToDelete(null);
                    setDeactivationReason('');
                    setSelectedReasonType('');
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
