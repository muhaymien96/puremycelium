import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportHistory } from "@/hooks/useImportHistory";
import { useRollbackImport } from "@/hooks/useRollbackImport";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { History, FileText, CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSwipeable } from "react-swipeable";
import { Button } from "@/components/ui/button";
import { ImportStockChanges } from "@/components/ImportStockChanges";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ImportHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: imports, isLoading, refetch } = useImportHistory();
  const { data: isAdmin } = useIsAdmin();
  const { mutate: rollbackImport, isPending: isRollingBack } = useRollbackImport();
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch total unmapped products count
  const { data: unmappedCount } = useQuery({
    queryKey: ['unmapped-products-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .is('product_id', null)
        .not('product_name', 'is', null);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const handlers = useSwipeable({
    onSwipedLeft: () => navigate('/reports'),
    onSwipedRight: () => navigate('/import'),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const handleRollbackClick = (batchId: string) => {
    setSelectedBatchId(batchId);
    setRollbackDialogOpen(true);
  };

  const handleConfirmRollback = () => {
    if (selectedBatchId) {
      rollbackImport(selectedBatchId);
      setRollbackDialogOpen(false);
      setSelectedBatchId(null);
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-all-data');

      if (error) throw error;

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reports-data'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped-products-count'] });

      const deleted = data?.deleted;
      toast.success(
        `Cleared: ${deleted?.orders || 0} orders, ${deleted?.importBatches || 0} imports`
      );
      refetch();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      if (error.message?.includes('Admin access required')) {
        toast.error('Admin access required to clear data');
      } else {
        toast.error(`Failed to clear data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsClearing(false);
      setClearDataDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'completed_with_errors':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> With Errors</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="gap-1">Processing...</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'rolled_back':
        return <Badge variant="outline" className="gap-1"><RotateCcw className="h-3 w-3" /> Rolled Back</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div {...handlers} className="max-w-6xl mx-auto space-y-6 p-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Import History</h1>
            <p className="text-muted-foreground">
              Review past Yoco sales imports and their results
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearDataDialogOpen(true)}
                disabled={isClearing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            )}
            {unmappedCount !== undefined && unmappedCount > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate('/unmapped-products')}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="hidden sm:inline">{unmappedCount} Unmapped Products</span>
                <Badge variant="secondary" className="sm:hidden">{unmappedCount}</Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Swipe Indicator for Mobile */}
        <div className="md:hidden flex justify-center gap-2 py-2">
          <div className="h-1 w-12 rounded-full bg-muted" />
          <div className="h-1 w-12 rounded-full bg-muted" />
          <div className="h-1 w-12 rounded-full bg-primary" />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !imports || imports.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No imports yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {imports.map((batch) => (
              <Card key={batch.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">
                          {batch.file_name || 'Unnamed Import'}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(batch.created_at!), 'MMM d, yyyy HH:mm:ss')}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(batch.status || 'unknown')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-5 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {batch.orders_created || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Orders Created</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {batch.items_imported || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Items Imported</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {batch.orders_skipped || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Duplicates Skipped</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {batch.unmatched_products || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Unmatched Products</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium">Period</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(batch.start_date), 'MMM d')} - {format(new Date(batch.end_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  {batch.errors && batch.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <div className="text-sm font-medium text-destructive mb-2">
                        Errors ({batch.errors.length}):
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                        {batch.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {batch.errors.length > 5 && (
                          <li>... and {batch.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  {(batch.status === 'completed' || batch.status === 'completed_with_errors') && (
                    <div className="mt-4 flex gap-2">
                      <Collapsible
                        open={expandedBatch === batch.id}
                        onOpenChange={(open) => setExpandedBatch(open ? batch.id : null)}
                        className="flex-1"
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            {expandedBatch === batch.id ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Hide Stock Changes
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                View Stock Changes
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <ImportStockChanges importBatchId={batch.id} />
                        </CollapsibleContent>
                      </Collapsible>
                      
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRollbackClick(batch.id)}
                          disabled={isRollingBack}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  )}

                  {batch.status === 'rolled_back' && (
                    <div className="mt-4">
                      <Alert>
                        <RotateCcw className="h-4 w-4" />
                        <AlertDescription>
                          This import has been rolled back. All orders and stock changes have been reversed.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Rollback Confirmation Dialog */}
        <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rollback Import?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all orders, payments, and financial records from this import. 
                Stock levels will be restored to their previous state. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRollback}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Rollback Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear All Data Confirmation Dialog */}
        <AlertDialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Transaction Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete ALL orders, payments, invoices, refunds, stock movements, 
                financial transactions, and import batches. Product and customer data will be preserved.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllData}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AppLayout>
  );
}
