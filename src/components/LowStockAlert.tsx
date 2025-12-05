import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';

export function LowStockAlert() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const lowStockCount = stats?.lowStockCount || 0;
  const expiringCount = stats?.expiringBatchesCount || 0;
  const hasAlerts = lowStockCount > 0 || expiringCount > 0;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`cursor-pointer transition-all ${
          hasAlerts 
            ? 'border-yellow-300 bg-yellow-50/50 hover:bg-yellow-50 hover:shadow-md' 
            : 'border-green-200 bg-green-50/30 hover:bg-green-50 hover:shadow-md'
        }`}
        onClick={() => navigate('/inventory')}
      >
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-3">
            {hasAlerts ? (
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Package className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {hasAlerts ? 'Stock Alerts' : 'Stock Healthy'}
              </h3>
              
              {hasAlerts ? (
                <div className="space-y-1">
                  {lowStockCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-yellow-700">{lowStockCount}</span> product{lowStockCount !== 1 ? 's' : ''} running low
                    </p>
                  )}
                  {expiringCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-yellow-700">{expiringCount}</span> batch{expiringCount !== 1 ? 'es' : ''} expiring soon
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to review inventory
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    All products are well stocked
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No expiring batches detected
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
