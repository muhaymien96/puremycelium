import { Card, CardContent } from '@/components/ui/card';
import { useTodaysSales } from '@/hooks/useTodaysSales';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => `R ${value.toFixed(2)}`;

export function TodaysSalesSummary() {
  const { data: todaysSales, isLoading } = useTodaysSales();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-3">Today's Sales</h3>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(todaysSales?.totalSales || 0)}
                    </p>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">
                        {todaysSales?.orderCount || 0}
                      </span> order{todaysSales?.orderCount !== 1 ? 's' : ''}
                    </div>
                    <div className="border-l pl-4">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(todaysSales?.avgOrderValue || 0)}
                      </span> avg
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
