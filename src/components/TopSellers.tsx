import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTopSellers, Period } from '@/hooks/useTopSellers';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Package } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrency = (value: number) => `R ${value.toFixed(2)}`;

const periodLabels: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

export function TopSellers() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: topSellers, isLoading } = useTopSellers(5, period);

  const itemAnim = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.2 }
    }),
    exit: { opacity: 0, x: 10, transition: { duration: 0.15 } }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Top Sellers</h3>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : topSellers && topSellers.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div 
              key={period}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {topSellers.map((product, idx) => (
                <motion.div
                  key={product.product_id}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={itemAnim}
                  className="border rounded-lg p-3 bg-background hover:bg-muted/50 transition"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-primary">#{idx + 1}</span>
                        <p className="font-semibold truncate">{product.product_name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground capitalize">
                          {product.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.units_sold} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary">
                        {formatCurrency(product.total_revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <EmptyState
            icon={Package}
            title={`No sales ${periodLabels[period].toLowerCase()}`}
            description="Start selling to see your top products"
          />
        )}
      </CardContent>
    </Card>
  );
}
