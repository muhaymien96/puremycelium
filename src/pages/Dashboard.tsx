import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStats, useOrders } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const Dashboard = () => {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: recentOrders, isLoading: loadingOrders } = useOrders();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here's an overview of your business.
          </p>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-32 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">R {stats?.totalSales.toFixed(2) || '0.00'}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Orders</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats?.orderCount || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Customers</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats?.customerCount || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Products</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats?.productCount || 0}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions removed - now in sidebar */}

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
                {recentOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customers?.first_name} {order.customers?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R {Number(order.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
