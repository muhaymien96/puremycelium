import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <XCircle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was cancelled. You can try again or return to the home page.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="default">
            Go to Home
          </Button>
          <Button onClick={() => window.history.back()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;