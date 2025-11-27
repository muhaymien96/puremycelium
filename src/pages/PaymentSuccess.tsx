import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    console.log('Payment success for order:', orderId);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Your payment has been processed successfully. An invoice has been sent to your email.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="default">
            Go to Home
          </Button>
          <Button onClick={() => navigate('/invoices')} variant="outline">
            View Invoices
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;