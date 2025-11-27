import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Payment Failed</h1>
        <p className="text-muted-foreground mb-8">
          Unfortunately, your payment could not be processed. Please check your payment details and try again.
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

export default PaymentFailure;