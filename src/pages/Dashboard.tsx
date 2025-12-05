import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { TopSellers } from '@/components/TopSellers';
import { LowStockAlert } from '@/components/LowStockAlert';
import { TodaysSalesSummary } from '@/components/TodaysSalesSummary';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { QuickExpenseForm } from '@/components/QuickExpenseForm';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();

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
      variants={cardAnim}
    >
      <Card
        className={`rounded-xl border shadow-sm hover:shadow-md transition-all min-h-[80px] md:min-h-[100px] ${color}`}
      >
        <CardContent className="pt-3 pb-2 px-3 md:pt-5 md:pb-4 md:px-4">
          <p className="text-[9px] md:text-[11px] text-muted-foreground truncate">{label}</p>

          {loadingStats ? (
            <Skeleton className="h-5 md:h-7 w-16 md:w-24 mt-1 md:mt-2" />
          ) : (
            <p className="text-base md:text-2xl lg:text-3xl font-bold mt-0.5 md:mt-1 leading-tight truncate">
              {value}
            </p>
          )}

          {sub && !loadingStats && (
            <p className="text-[8px] md:text-[10px] text-muted-foreground mt-0.5 md:mt-1 truncate">{sub}</p>
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
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
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
            label="Revenue"
            value={formatCurrency(stats?.netRevenue)}
            sub="After refunds"
            index={0}
          />
          <KPI_Card
            label="Gross Profit"
            value={formatCurrency(stats?.totalProfit)}
            sub="Revenue minus COGS"
            index={1}
            color={(stats?.totalProfit || 0) >= 0 ? "" : "border-red-300 bg-red-50"}
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
            color={(stats?.profitMargin || 0) >= 20 ? "border-green-300 bg-green-50" : (stats?.profitMargin || 0) >= 0 ? "" : "border-red-300 bg-red-50"}
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
            index={7}
            color={stockColor}
          />
        </div>

        {/* Analytics Widgets Grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TopSellers />
          </div>
          <div className="space-y-4">
            <TodaysSalesSummary />
            <QuickExpenseForm />
            <UpcomingEvents />
            <LowStockAlert />
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default Dashboard;
