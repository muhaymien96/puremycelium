import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats, useOrders } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: recentOrders, isLoading: loadingOrders } = useOrders();

  const formatCurrency = (value: number | undefined | null) =>
    `R ${(Number(value || 0)).toFixed(2)}`;

  const formatPercent = (value: number | undefined | null) =>
    `${(Number(value || 0)).toFixed(1)}%`;

  const cardAnim = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.05, duration: 0.25 }
    }),
    tap: { scale: 0.98 }
  };

  // Each KPI card
  const KPI_Card = ({
    label,
    value,
    sub,
    index,
    color,
  }: any) => (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      whileTap="tap"
      variants={cardAnim}
    >
      <Card
        className={`rounded-xl border shadow-sm hover:shadow-md transition-all ${color}`}
      >
        <CardContent className="pt-5 pb-4">
          <p className="text-[11px] text-muted-foreground">{label}</p>

          {loadingStats ? (
            <Skeleton className="h-7 w-24 mt-2" />
          ) : (
            <p className="text-2xl md:text-3xl font-bold mt-1 leading-tight">
              {value}
            </p>
          )}

          {sub && !loadingStats && (
            <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // Status Color Logic
  const stockWarning =
    stats?.lowStockCount > 0 || (stats?.expiringBatchesCount || 0) > 0;

  const stockColor = stockWarning
    ? "border-yellow-300 bg-yellow-50"
    : "border-slate-200 bg-white";

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-24">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your business at a glance
          </p>
        </motion.div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPI_Card
            label="Net Revenue"
            value={formatCurrency(stats?.netRevenue)}
            sub="After completed refunds"
            index={0}
          />
          <KPI_Card
            label="Gross Sales"
            value={formatCurrency(stats?.totalSales)}
            sub="Before refunds"
            index={1}
          />
          <KPI_Card
            label="Refunds"
            value={formatCurrency(stats?.totalRefunds)}
            sub="Completed only"
            index={2}
          />
          <KPI_Card
            label="Profit Margin"
            value={formatPercent(stats?.profitMargin)}
            sub="Based on financials"
            index={3}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KPI_Card
            label="Orders"
            value={stats?.orderCount || 0}
            index={4}
          />
          <KPI_Card
            label="Customers"
            value={stats?.customerCount || 0}
            index={5}
          />
          <KPI_Card
            label="Active Products"
            value={stats?.productCount || 0}
            index={6}
          />
          <KPI_Card
            label="Stock Cost Value"
            value={formatCurrency(stats?.stockCostValue)}
            sub={`Low: ${stats?.lowStockCount || 0} • Exp: ${
              stats?.expiringBatchesCount || 0
            }`}
            index={7}
            color={stockColor}
          />
        </div>

        {/* Recent Orders */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Recent Orders</h3>

            {loadingOrders ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: any, idx: number) => (
                  <motion.div
                    key={order.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    whileTap="tap"
                    variants={cardAnim}
                    className="border rounded-lg p-3 bg-white hover:bg-muted/50 transition cursor-pointer"
                    onClick={() => navigate('/orders')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customers
                            ? `${order.customers.first_name} ${order.customers.last_name}`
                            : 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.status}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Start making sales to see activity"
                actionLabel="New Sale"
                onAction={() => navigate('/sale')}
              />
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default Dashboard;
