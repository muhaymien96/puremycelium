import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface BatchHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export function BatchHistoryModal({ open, onOpenChange, productId, productName }: BatchHistoryModalProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, product_batches(batch_number)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: open && !!productId,
  });

  const { data: batches } = useQuery({
    queryKey: ['product-batches', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_batches')
        .select('*')
        .eq('product_id', productId)
        .order('production_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!productId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch History - {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Batches */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Batches
            </h3>
            {batches && batches.length > 0 ? (
              <div className="space-y-2">
                {batches.map((batch: any) => (
                  <div key={batch.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Batch {batch.batch_number}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Qty: {Number(batch.quantity)}</span>
                        <span>Produced: {new Date(batch.production_date).toLocaleDateString()}</span>
                        {batch.expiry_date && (
                          <span className={
                            new Date(batch.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'text-red-600'
                              : ''
                          }>
                            Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {Number(batch.quantity) === 0 && (
                      <Badge variant="secondary">Depleted</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No batches found</p>
            )}
          </div>

          {/* Movement History */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Stock Movement History
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : movements && movements.length > 0 ? (
              <div className="space-y-2">
                {movements.map((movement: any) => {
                  const isIncoming = movement.movement_type === 'IN';
                  return (
                    <div key={movement.id} className="p-3 rounded-lg bg-muted/50 flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`mt-1 ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncoming ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">
                              {movement.movement_type} - {movement.reference_type || 'Manual'}
                            </p>
                            <Badge variant={isIncoming ? 'default' : 'secondary'} className="text-xs">
                              {isIncoming ? '+' : ''}{Number(movement.quantity)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(movement.created_at).toLocaleString()}
                          </p>
                          {movement.product_batches && (
                            <p className="text-xs text-muted-foreground">
                              Batch: {movement.product_batches.batch_number}
                            </p>
                          )}
                          {movement.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No movement history</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
