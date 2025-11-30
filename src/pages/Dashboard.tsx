import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats, useOrders } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: recentOrders, isLoading: loadingOrders } = useOrders();

  const formatCurrency = (value: number | undefined | null) =>
    `R ${(Number(value || 0)).toFixed(2)}`;

  const formatPercent = (value: number | undefined | null) =>
    `${(Number(value || 0)).toFixed(1)}%`;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            High-level view of sales, refunds, and inventory.
          </p>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Revenue */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-32 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats?.netRevenue)}
                </p>
              )}
              {!loadingStats && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  After completed refunds
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gross Sales */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Gross Sales</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-32 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats?.totalSales)}
                </p>
              )}
              {!loadingStats && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Before refunds
                </p>
              )}
            </CardContent>
          </Card>

          {/* Refunds */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Refunds</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-32 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats?.totalRefunds)}
                </p>
              )}
              {!loadingStats && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Completed refunds only
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Profit Margin</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-24 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {formatPercent(stats?.profitMargin)}
                </p>
              )}
              {!loadingStats && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Based on financial transactions
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orders */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Orders</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {stats?.orderCount || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customers */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Customers</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {stats?.customerCount || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Active Products */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Active Products</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {stats?.productCount || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stock Value (Cost) */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Stock Value (Cost)</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-24 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats?.stockCostValue)}
                </p>
              )}
              {!loadingStats && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Low stock: {stats?.lowStockCount || 0} · Expiring:{" "}
                  {stats?.expiringBatchesCount || 0}
                </p>
              )}
            </CardContent>
          </Card>
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
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
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
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Start making sales to see your recent orders here"
                actionLabel="Create New Sale"
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
