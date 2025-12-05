import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, FileText, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const linkSent = searchParams.get('linkSent') === 'true';
  const [order, setOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [businessName, setBusinessName] = useState<string>('');

  useEffect(() => {
    checkAuth();
    fetchBusinessName();
  }, []);

  useEffect(() => {
    // Only fetch order details for authenticated staff
    if (orderId && isAuthenticated) {
      fetchOrderAndInvoice();
    }
  }, [orderId, isAuthenticated]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const fetchBusinessName = async () => {
    const { data } = await supabase
      .from('business_settings')
      .select('business_name')
      .eq('is_default', true)
      .single();
    setBusinessName(data?.business_name || '');
  };

  const fetchOrderAndInvoice = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name)), customers(first_name, last_name)')
      .eq('id', orderId)
      .single();
    
    setOrder(orderData);

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    setInvoice(invoiceData);
  };

  const handleResendInvoice = async () => {
    if (!invoice) return;
    
    try {
      await supabase.functions.invoke('send-invoice', {
        body: { invoice_id: invoice.id }
      });
      toast.success('Invoice resent successfully');
    } catch (error) {
      toast.error('Failed to resend invoice');
    }
  };

  // Still checking auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-pulse">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Customer view (not authenticated) - simple thank you page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 bg-green-100 rounded-full animate-pulse" />
              </div>
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto relative z-10" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-green-700">Thank You!</h1>
              <h2 className="text-xl font-semibold text-gray-800">Payment Successful</h2>
              <p className="text-muted-foreground">
                Your payment has been received and your order is being processed.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <p className="text-sm text-green-800">
                <strong>What happens next?</strong>
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>✓ A receipt has been sent to your email</li>
                <li>✓ Your order is now being prepared</li>
                <li>✓ You'll be notified when it's ready</li>
              </ul>
            </div>

            {businessName && (
              <p className="text-sm text-muted-foreground pt-4">
                Thank you for choosing <strong>{businessName}</strong>
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              You can safely close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Staff view (authenticated) - full details with navigation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          {linkSent ? (
            <Send className="h-16 w-16 text-blue-500 mx-auto" />
          ) : (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          )}
          
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {linkSent ? 'Payment Link Sent!' : 'Payment Successful!'}
            </h2>
            <p className="text-muted-foreground">
              {linkSent 
                ? 'The payment link has been sent to the customer.'
                : 'Your payment has been processed successfully.'
              }
            </p>
          </div>

          {order && (
            <div className="border rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-2">Order Details</h3>
              <p className="text-sm text-muted-foreground mb-1">
                Order #{order.order_number}
              </p>
              {order.customers && (
                <p className="text-sm text-muted-foreground mb-2">
                  {order.customers.first_name} {order.customers.last_name}
                </p>
              )}
              <div className="space-y-1 mb-2">
                {order.order_items?.map((item: any) => (
                  <p key={item.id} className="text-sm">
                    {item.quantity}x {item.products?.name} - R {Number(item.subtotal).toFixed(2)}
                  </p>
                ))}
              </div>
              <p className="font-bold">Total: R {Number(order.total_amount).toFixed(2)}</p>
            </div>
          )}

          {invoice && (
            <div className="flex flex-col gap-2">
              {invoice.pdf_url && (
                <Button variant="outline" asChild>
                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    View Invoice
                  </a>
                </Button>
              )}
              {!linkSent && (
                <Button variant="outline" onClick={handleResendInvoice}>
                  Resend Invoice
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/invoices')}>
              View All Invoices
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/sale')}>
              New Sale
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
