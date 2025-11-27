import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndInvoice();
    }
  }, [orderId]);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your payment has been processed successfully.
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
              <Button variant="outline" onClick={handleResendInvoice}>
                Resend Invoice
              </Button>
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
