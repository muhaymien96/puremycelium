import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Payment Failed</h1>
        <p className="text-muted-foreground mb-8">
          Unfortunately, your payment could not be processed. Your cart has been preserved - please check your payment details and try again.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="default">
            Go to Home
          </Button>
          {orderId && (
            <Button onClick={() => navigate(`/sale?retry=${orderId}`)} variant="outline">
              Retry Payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;