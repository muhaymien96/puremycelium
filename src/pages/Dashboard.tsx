import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Users, FileText, TrendingUp, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const stats = [
    { title: 'Total Sales', value: 'R 12,450', icon: TrendingUp, color: 'text-green-600' },
    { title: 'Orders', value: '45', icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Customers', value: '23', icon: Users, color: 'text-purple-600' },
    { title: 'Products', value: '12', icon: Package, color: 'text-orange-600' },
  ];

  const quickActions = [
    { title: 'New Sale', path: '/sale', icon: ShoppingCart, color: 'bg-green-500' },
    { title: 'Inventory', path: '/inventory', icon: Package, color: 'bg-blue-500' },
    { title: 'Customers', path: '/customers', icon: Users, color: 'bg-purple-500' },
    { title: 'Invoices', path: '/invoices', icon: FileText, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🍯 PureMycelium</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className={`${action.color} p-3 rounded-full mb-3`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">{action.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No recent orders to display</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;