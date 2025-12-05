import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface COGSHealthData {
  totalProducts: number;
  withBatchCost: number;
  withProductCost: number;
  estimatedCost: number;
  healthScore: number;
}

export const COGSHealthIndicator = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['cogs-health'],
    queryFn: async (): Promise<COGSHealthData> => {
      // Get all active products with batches
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, cost_price, unit_price, product_batches(cost_per_unit, quantity)')
        .eq('is_active', true);

      if (error) throw error;

      let withBatchCost = 0;
      let withProductCost = 0;
      let estimatedCost = 0;

      products?.forEach((p: any) => {
        const hasBatchWithCost = p.product_batches?.some(
          (b: any) => b.cost_per_unit != null && Number(b.cost_per_unit) > 0 && Number(b.quantity) > 0
        );
        const hasProductCost = p.cost_price != null && Number(p.cost_price) > 0;

        if (hasBatchWithCost) {
          withBatchCost++;
        } else if (hasProductCost) {
          withProductCost++;
        } else {
          estimatedCost++;
        }
      });

      const total = products?.length || 0;
      const healthScore = total > 0 
        ? Math.round(((withBatchCost + withProductCost) / total) * 100)
        : 100;

      return {
        totalProducts: total,
        withBatchCost,
        withProductCost,
        estimatedCost,
        healthScore,
      };
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-destructive';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>COGS Data Quality</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Products without cost data use estimated COGS (60% of retail), 
                    which may affect profit accuracy. Add cost prices to products 
                    or batches for accurate reporting.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {getHealthIcon(data?.healthScore || 0)}
            <span className={`text-xl font-bold ${getHealthColor(data?.healthScore || 0)}`}>
              {data?.healthScore}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
            <div className="font-semibold text-green-700 dark:text-green-400">{data?.withBatchCost}</div>
            <div className="text-muted-foreground">Batch Cost</div>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
            <div className="font-semibold text-blue-700 dark:text-blue-400">{data?.withProductCost}</div>
            <div className="text-muted-foreground">Product Cost</div>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
            <div className="font-semibold text-amber-700 dark:text-amber-400">{data?.estimatedCost}</div>
            <div className="text-muted-foreground">Estimated</div>
          </div>
        </div>
        {data && data.estimatedCost > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {data.estimatedCost} product(s) use estimated costs. Update cost prices for accurate profits.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
