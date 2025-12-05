import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, MapPin, TrendingUp, CreditCard, Package, Calendar, ShoppingCart, Star } from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomers';
import { useCustomerAnalytics } from '@/hooks/useCustomerAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: loadingCustomer } = useCustomer(id!);
  const { data: analytics, isLoading: loadingAnalytics } = useCustomerAnalytics(id!);

  if (loadingCustomer) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 pb-20 md:pb-6">
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

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      'CASH': 'Cash',
      'YOKO_WEBPOS': 'Card/Terminal',
      'PAYMENT_LINK': 'Payment Link'
    };
    return methodMap[method] || method;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{customer.first_name} {customer.last_name}</h1>
            <p className="text-sm text-muted-foreground">Complete customer profile and purchase history</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/customers')}>
            Back
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              {loadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{analytics?.totalOrders || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Lifetime Value</p>
              </div>
              {loadingAnalytics ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold">R {(analytics?.totalSpent || 0).toFixed(2)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
              </div>
              {loadingAnalytics ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold">R {(analytics?.avgOrderValue || 0).toFixed(2)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Avg Days Between</p>
              </div>
              {loadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{analytics?.avgDaysBetweenOrders || 0}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
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
                    <Badge variant="outline">{customer.preferred_channel}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Customer Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingAnalytics ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">First Order</span>
                      <span className="text-sm font-medium">
                        {analytics?.firstOrderDate 
                          ? new Date(analytics.firstOrderDate).toLocaleDateString('en-ZA', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'No orders yet'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">Last Order</span>
                      <span className="text-sm font-medium">
                        {analytics?.lastOrderDate 
                          ? new Date(analytics.lastOrderDate).toLocaleDateString('en-ZA', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'No orders yet'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Customer Since</span>
                      <span className="text-sm font-medium">
                        {analytics?.daysSinceFirstOrder 
                          ? `${analytics.daysSinceFirstOrder} days ago`
                          : 'New customer'}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order History</CardTitle>
                <CardDescription>Complete list of all customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : analytics?.orders && analytics.orders.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.orders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">R {Number(order.total_amount).toFixed(2)}</p>
                            <Badge variant="outline" className="capitalize">
                              {order.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="space-y-1 mt-2 pt-2 border-t">
                            {order.order_items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.quantity}x {item.products?.name || 'Unknown Product'}
                                </span>
                                <span className="font-medium">R {Number(item.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Payment Info */}
                        {order.payments && order.payments.length > 0 && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Paid via {formatPaymentMethod(order.payments[0].payment_method)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Favorite Products
                </CardTitle>
                <CardDescription>Most purchased products by this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : analytics?.favoriteProducts && analytics.favoriteProducts.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.favoriteProducts.map((product: any, idx: number) => (
                      <div key={product.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{product.quantity} units</p>
                          <p className="text-xs text-muted-foreground">
                            R {product.totalSpent.toFixed(2)} spent
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No purchase history yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4 mt-4">
            {/* Payment Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Preferences
                </CardTitle>
                <CardDescription>Most used payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <Skeleton className="h-24 w-full" />
                ) : analytics?.paymentPreferences && analytics.paymentPreferences.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.paymentPreferences.map((pref: any) => (
                      <div key={pref.method} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatPaymentMethod(pref.method)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{pref.count} times</span>
                          <Badge variant="secondary">{pref.percentage.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No payment data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <Skeleton className="h-24 w-full" />
                ) : analytics?.orderStatuses && analytics.orderStatuses.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.orderStatuses.map((status: any) => (
                      <div key={status.status} className="flex items-center justify-between p-2 border rounded">
                        <span className="capitalize text-sm">{status.status}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{status.count} orders</span>
                          <Badge variant="outline">{status.percentage.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No order data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CustomerDetail;