import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-3xl px-8 text-center">
        <h1 className="mb-6 text-5xl font-bold">🍯🍄 PureMycelium</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Honey & Mushroom CRM - Complete business management system with sales, inventory, payments, and customer management.
        </p>
        <div className="mt-8 rounded-lg border bg-card p-6 text-left">
          <h2 className="mb-3 text-2xl font-semibold">Features:</h2>
          <ul className="grid grid-cols-2 gap-3 text-muted-foreground">
            <li>✓ Sales & POS System</li>
            <li>✓ Inventory Management</li>
            <li>✓ Customer Database</li>
            <li>✓ Payment Processing (Yoco)</li>
            <li>✓ Invoice Generation</li>
            <li>✓ Stock Tracking</li>
            <li>✓ Order Management</li>
            <li>✓ Dashboard & Reports</li>
          </ul>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <Button onClick={() => navigate('/auth')} size="lg">
            Sign In
          </Button>
          <Button onClick={() => navigate('/auth')} variant="outline" size="lg">
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
