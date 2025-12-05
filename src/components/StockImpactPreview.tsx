import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package, TrendingDown, CheckCircle2 } from "lucide-react";
import type { TransactionGroup } from "@/lib/csv-parser";

interface StockImpactPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: TransactionGroup[];
  productMappings: Record<string, string>;
  products: any[];
  onConfirm: () => void;
  isImporting: boolean;
}

interface StockImpact {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reduction: number;
  newStock: number;
  hasLowStock: boolean;
  hasNegativeStock: boolean;
}

export function StockImpactPreview({
  open,
  onOpenChange,
  groups,
  productMappings,
  products,
  onConfirm,
  isImporting,
}: StockImpactPreviewProps) {
  const calculateStockImpact = (): StockImpact[] => {
    const stockChanges = new Map<string, number>();

    groups.forEach((group) => {
      group.items.forEach((item) => {
        let productId = productMappings[item.productSku];
        let product = products.find((p) => p.id === productId);

        if (!product) {
          product = products.find((p) => p.sku === item.productSku);
        }

        if (product) {
          const currentReduction = stockChanges.get(product.id) || 0;
          stockChanges.set(product.id, currentReduction + item.quantity);
        }
      });
    });

    const impacts: StockImpact[] = [];
    stockChanges.forEach((reduction, productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        const currentStock = product.total_stock || 0;
        const newStock = currentStock - reduction;

        impacts.push({
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock,
          reduction,
          newStock,
          hasLowStock: newStock > 0 && newStock < 10,
          hasNegativeStock: newStock < 0,
        });
      }
    });

    return impacts.sort((a, b) => {
      if (a.hasNegativeStock !== b.hasNegativeStock) return a.hasNegativeStock ? -1 : 1;
      if (a.hasLowStock !== b.hasLowStock) return a.hasLowStock ? -1 : 1;
      return b.reduction - a.reduction;
    });
  };

  const impacts = calculateStockImpact();
  const hasNegativeStock = impacts.some((i) => i.hasNegativeStock);
  const hasLowStock = impacts.some((i) => i.hasLowStock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex + max height so we can lock footer to bottom */}
      <DialogContent className="w-full max-w-lg sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estimated Stock Impact
          </DialogTitle>
          <DialogDescription>
            Review how this import will affect your inventory levels
          </DialogDescription>
        </DialogHeader>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Summary Alerts */}
          {hasNegativeStock && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {impacts.filter((i) => i.hasNegativeStock).length} product(s) will have
                negative stock after import. This may indicate missing batches or
                incorrect quantities.
              </AlertDescription>
            </Alert>
          )}

          {hasLowStock && !hasNegativeStock && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {impacts.filter((i) => i.hasLowStock).length} product(s) will have low
                stock (below 10 units) after import.
              </AlertDescription>
            </Alert>
          )}

          {!hasNegativeStock && !hasLowStock && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                All products will have sufficient stock after import.
              </AlertDescription>
            </Alert>
          )}

          {/* Stock Impact Table */}
          <div className="border rounded-lg">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">Product</th>
                    <th className="text-right p-2 font-medium">Current Stock</th>
                    <th className="text-right p-2 font-medium">Will Reduce</th>
                    <th className="text-right p-2 font-medium">New Stock</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {impacts.map((impact) => (
                    <tr
                      key={impact.productId}
                      className={`border-b ${
                        impact.hasNegativeStock
                          ? "bg-destructive/10"
                          : impact.hasLowStock
                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                          : ""
                      }`}
                    >
                      <td className="p-2">
                        <div className="font-medium">{impact.productName}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {impact.sku}
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {impact.currentStock}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1 text-red-600">
                          <TrendingDown className="h-3 w-3" />
                          {impact.reduction}
                        </div>
                      </td>
                      <td className="p-2 text-right font-bold">
                        <span
                          className={
                            impact.hasNegativeStock
                              ? "text-destructive"
                              : impact.hasLowStock
                              ? "text-yellow-600"
                              : "text-green-600"
                          }
                        >
                          {impact.newStock}
                        </span>
                      </td>
                      <td className="p-2">
                        {impact.hasNegativeStock ? (
                          <span className="text-[11px] text-destructive font-medium">
                            Negative Stock!
                          </span>
                        ) : impact.hasLowStock ? (
                          <span className="text-[11px] text-yellow-600 font-medium">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[11px] text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-2xl font-bold">{impacts.length}</div>
              <div className="text-xs text-muted-foreground">Products Affected</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{groups.length}</div>
              <div className="text-xs text-muted-foreground">Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {impacts.reduce((sum, i) => sum + i.reduction, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Units</div>
            </div>
          </div>
        </div>

        {/* FIXED FOOTER (always visible) */}
        <DialogFooter className="pt-4 border-t mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isImporting}>
            {isImporting ? "Importing..." : "Confirm Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
