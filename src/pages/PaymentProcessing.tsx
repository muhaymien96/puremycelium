import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentProcessing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentMethod = searchParams.get('method');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard');
      return;
    }

    const fetchOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name)), customers(first_name, last_name)')
        .eq('id', orderId)
        .single();
      
      setOrder(data);
    };

    fetchOrder();

    // Poll for payment completion every 2 seconds
    const interval = setInterval(async () => {
      const { data: payment } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (payment?.payment_status === 'completed') {
        navigate(`/payment/success?orderId=${orderId}`);
      } else if (payment?.payment_status === 'failed') {
        navigate(`/payment/failure?orderId=${orderId}`);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          
          <div>
            <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
            <p className="text-muted-foreground">
              {paymentMethod === 'YOKO_WEBPOS' && 'Waiting for terminal confirmation...'}
              {paymentMethod === 'PAYMENT_LINK' && 'Payment link sent! Waiting for completion...'}
              {paymentMethod === 'CASH' && 'Processing cash payment...'}
            </p>
          </div>

          {order && (
            <div className="border rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-2">Order Summary</h3>
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
                    {item.quantity}x {item.products?.name}
                  </p>
                ))}
              </div>
              <p className="font-bold">Total: R {Number(order.total_amount).toFixed(2)}</p>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Cancel & Return
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProcessing;
