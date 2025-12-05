import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [businessName, setBusinessName] = useState<string>('');

  useEffect(() => {
    checkAuth();
    fetchBusinessName();
  }, []);

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

  // Still checking auth
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

  // Customer view (not authenticated)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-yellow-200 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 bg-yellow-100 rounded-full" />
              </div>
              <XCircle className="h-20 w-20 text-yellow-500 mx-auto relative z-10" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-yellow-700">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                Your payment was cancelled. No charges were made.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <p className="text-sm text-yellow-800">
                <strong>Changed your mind?</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                No problem! You can use the payment link in your email whenever you're ready to complete your purchase.
              </p>
            </div>

            {businessName && (
              <p className="text-xs text-muted-foreground pt-2">
                Thank you for considering <strong>{businessName}</strong>
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

  // Staff view (authenticated)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <XCircle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          The customer cancelled the payment. You can resend the payment link if needed.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/orders')} variant="default">
            View Orders
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;