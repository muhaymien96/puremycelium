import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useCustomer, useCustomerOrders } from '@/hooks/useCustomers';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: loadingCustomer } = useCustomer(id!);
  const { data: orders, isLoading: loadingOrders } = useCustomerOrders(id!);

  if (loadingCustomer) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Customer not found</p>
            <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h1>
          <p className="text-sm text-muted-foreground">Customer information and order history</p>
        </div>
        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.postal_code && ` ${customer.postal_code}`}
                </span>
              </div>
            )}
            {customer.preferred_channel && (
              <div className="text-sm">
                <span className="text-muted-foreground">Preferred Contact: </span>
                <span className="font-medium">{customer.preferred_channel}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-bold">{orders?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Lifetime Value</p>
              <p className="text-3xl font-bold">R {totalSpent.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R {Number(order.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items?.length || 0} items
                    </p>
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

export default CustomerDetail;
