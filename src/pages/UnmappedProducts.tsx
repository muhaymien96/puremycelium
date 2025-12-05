import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Link2,
  Plus,
  Search,
  CheckCircle,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { AddProductModal } from '@/components/AddProductModal';
import { toast } from 'sonner';

interface UnmappedItem {
  product_name: string | null;
  product_sku: string | null;
  count: number;
  total_quantity: number;
  total_revenue: number;
}

export default function UnmappedProducts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const importBatchId = searchParams.get('import_id');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<UnmappedItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [prefilledProductName, setPrefilledProductName] = useState('');

  const { data: products } = useProducts();

  // Fetch unmapped order items
  const { data: unmappedItems, isLoading } = useQuery({
    queryKey: ['unmapped-products', importBatchId],
    queryFn: async () => {
      let query = supabase
        .from('order_items')
        .select('product_name, product_sku, quantity, subtotal')
        .is('product_id', null)
        .not('product_name', 'is', null);

      if (importBatchId) {
        // Get order IDs for this import batch
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('import_batch_id', importBatchId);

        if (orders && orders.length > 0) {
          query = query.in('order_id', orders.map(o => o.id));
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by product_name/sku
      const grouped: Record<string, UnmappedItem> = {};
      data?.forEach(item => {
        const key = item.product_sku || item.product_name || 'unknown';
        if (!grouped[key]) {
          grouped[key] = {
            product_name: item.product_name,
            product_sku: item.product_sku,
            count: 0,
            total_quantity: 0,
            total_revenue: 0,
          };
        }
        grouped[key].count++;
        grouped[key].total_quantity += Number(item.quantity);
        grouped[key].total_revenue += Number(item.subtotal);
      });

      return Object.values(grouped).sort((a, b) => b.count - a.count);
    },
  });

  // Map product mutation
  const mapProduct = useMutation({
    mutationFn: async ({ sku, productId }: { sku: string; productId: string }) => {
      // Update all order_items with this SKU to point to the product
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ product_id: productId })
        .eq('product_sku', sku)
        .is('product_id', null);

      if (updateError) throw updateError;

      // Create a product mapping for future imports
      const { error: mappingError } = await supabase
        .from('product_mappings')
        .upsert({
          external_sku: sku,
          product_id: productId,
          external_name: selectedItem?.product_name,
          source: 'manual_mapping',
        }, {
          onConflict: 'external_sku',
        });

      if (mappingError) throw mappingError;

      return { sku, productId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmapped-products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['product-mappings'] });
      toast.success('Product mapped successfully');
      setSelectedItem(null);
      setSelectedProductId('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to map product: ${error.message}`);
    },
  });

  const filteredItems = useMemo(() => {
    if (!unmappedItems) return [];
    if (!searchQuery) return unmappedItems;

    const q = searchQuery.toLowerCase();
    return unmappedItems.filter(item =>
      item.product_name?.toLowerCase().includes(q) ||
      item.product_sku?.toLowerCase().includes(q)
    );
  }, [unmappedItems, searchQuery]);

  const handleMapProduct = () => {
    if (!selectedItem || !selectedProductId) return;
    const sku = selectedItem.product_sku || selectedItem.product_name || '';
    mapProduct.mutate({ sku, productId: selectedProductId });
  };

  const handleCreateProduct = (item: UnmappedItem) => {
    setPrefilledProductName(item.product_name || '');
    setShowAddProductModal(true);
    setSelectedItem(item);
  };

  const totalUnmapped = unmappedItems?.reduce((sum, item) => sum + item.count, 0) || 0;
  const totalRevenue = unmappedItems?.reduce((sum, item) => sum + item.total_revenue, 0) || 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/import-history')}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Import History
          </Button>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Unmapped Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {importBatchId 
              ? 'Products from this import that need to be mapped to your inventory'
              : 'All unmapped products across all imports'}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{filteredItems.length}</div>
              <p className="text-xs text-muted-foreground">Unique Products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{totalUnmapped}</div>
              <p className="text-xs text-muted-foreground">Order Items</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">R {totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Untracked Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search unmapped products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">All products are mapped!</p>
              <p className="text-muted-foreground text-sm mt-1">
                No unmapped products found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.product_sku || item.product_name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium truncate">
                              {item.product_name || 'Unknown Product'}
                            </p>
                          </div>
                          {item.product_sku && (
                            <p className="text-xs text-muted-foreground mt-1">
                              SKU: {item.product_sku}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">
                              {item.count} order{item.count > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline">
                              {item.total_quantity} units sold
                            </Badge>
                            <Badge variant="outline" className="text-green-600">
                              R {item.total_revenue.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Map
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCreateProduct(item)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Map Product Dialog */}
        <Dialog open={!!selectedItem && !showAddProductModal} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Map Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedItem?.product_name}</p>
                {selectedItem?.product_sku && (
                  <p className="text-xs text-muted-foreground">SKU: {selectedItem.product_sku}</p>
                )}
              </div>

              <div>
                <p className="text-sm mb-2">Select existing product to map:</p>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R{product.unit_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-center text-sm text-muted-foreground">or</div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => selectedItem && handleCreateProduct(selectedItem)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Product
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleMapProduct}
                disabled={!selectedProductId || mapProduct.isPending}
              >
                Map Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Product Modal */}
        <AddProductModal
          open={showAddProductModal}
          onOpenChange={(open) => {
            setShowAddProductModal(open);
            if (!open) {
              setPrefilledProductName('');
            }
          }}
          defaultName={prefilledProductName}
          onProductCreated={(productId) => {
            if (selectedItem) {
              const sku = selectedItem.product_sku || selectedItem.product_name || '';
              mapProduct.mutate({ sku, productId });
            }
            setShowAddProductModal(false);
          }}
        />
      </div>
    </AppLayout>
  );
}
