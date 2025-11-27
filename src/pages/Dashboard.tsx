import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, Plus, Package, Users, Receipt, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useOrders } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: recentOrders, isLoading: loadingOrders } = useOrders();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🍯 PureMycelium</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <p className="text-3xl font-bold">R {stats?.totalSales.toFixed(2) || '0.00'}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Orders</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16" />
              ) : (
                <p className="text-3xl font-bold">{stats?.orderCount || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Customers</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16" />
              ) : (
                <p className="text-3xl font-bold">{stats?.customerCount || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Products</p>
              {loadingStats ? (
                <Skeleton className="h-10 w-16" />
              ) : (
                <p className="text-3xl font-bold">{stats?.productCount || 0}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/sale')}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">New Sale</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Package className="h-5 w-5" />
            <span className="font-medium">Inventory</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Customers</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Receipt className="h-5 w-5" />
            <span className="font-medium">Invoices</span>
          </button>
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
      </main>
    </div>
  );
};

export default Dashboard;
