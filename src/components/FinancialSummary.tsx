import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/lib/financial-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Banknote, Package, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialSummaryProps {
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

export function FinancialSummary({ 
  startDate, 
  endDate, 
  className 
}: FinancialSummaryProps) {
  const start = startDate || (() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const end = endDate || (() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  })();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['financial-summary', start.toISOString(), end.toISOString()],
    queryFn: () => financialService.getFinancialSummary(start, end),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className || ''}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load financial summary
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className || ''}`}>
      {/* Net Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Revenue
          </CardTitle>
<Banknote className="h-4 w-4 text-muted-foreground" />        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R {summary.netRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.salesCount} sales
          </p>
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cost of Goods
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R {summary.totalCost.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total COGS
          </p>
        </CardContent>
      </Card>

      {/* Net Profit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Profit
          </CardTitle>
          <TrendingUp className={`h-4 w-4 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R {summary.netProfit.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.profitMargin.toFixed(1)}% margin
          </p>
        </CardContent>
      </Card>

      {/* Refunds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Refunds
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            R {summary.refundedAmount.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.refundsCount} refund{summary.refundsCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Activity
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.salesCount + summary.refundsCount}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
