import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const dashboardScreenshot = "../assets/dashboard.png";

const features = [
  { icon: "🛒", label: "Sales & POS" },
  { icon: "📦", label: "Inventory Management" },
  { icon: "💳", label: "Payment Processing (Yoco)" },
  { icon: "📊", label: "Dashboard & Profit Analytics" },
  { icon: "🔔", label: "Stock Tracking & Alerts" },
  { icon: "👥", label: "Customer & Order Management" },
];

const useCases = [
  {
    icon: "🐝",
    title: "Honey Vendors",
    img: "https://cdn.pixabay.com/photo/2016/10/27/27/31/honey-1777988_960_720.jpg",
  },
  {
    icon: "🍄",
    title: "Mushroom Sellers",
    img: "https://cdn.pixabay.com/photo/2017/08/06/12/17/mushrooms-2596958_960_720.jpg",
  },
  {
    icon: "🌱",
    title: "Farmers Markets",
    img: "https://cdn.pixabay.com/photo/2017/07/31/11/21/market-2558270_960_720.jpg",
  },
];


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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b bg-white/80 backdrop-blur z-10 sticky top-0">
        <div className="flex items-center gap-2 text-2xl font-bold cursor-pointer" onClick={() => navigate('/')}>🍯🍄 Mycelia</div>
        <div className="flex gap-6 items-center text-base font-medium">
          <Button variant="ghost" onClick={() => navigate('/auth')}>Login</Button>
          <Button onClick={() => navigate('/auth')} className="ml-2">Sign up</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto w-full gap-12">
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Smart CRM for SMEs
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Sales, inventory, payments, and business growth in one platform.
          </p>
          <div className="flex gap-4 mb-8">
            <Button size="lg" onClick={() => navigate('/auth')}>Start Free →</Button>
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <img src={dashboardScreenshot} alt="Dashboard Screenshot" className="rounded-xl shadow-lg w-full max-w-md border" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {features.map(f => (
            <div key={f.label} className="flex flex-col items-center bg-white rounded-lg shadow p-6 border h-full">
              <div className="text-4xl mb-4">{f.icon}</div>
              <div className="text-lg font-semibold text-center">{f.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="py-8 px-8 bg-white border-t text-center text-muted-foreground">
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-2">
          <a href="/privacy" className="hover:text-primary transition">Privacy</a>
          <a href="/terms" className="hover:text-primary transition">Terms</a>
          <a href="/support" className="hover:text-primary transition">Support</a>
          <a href="/about" className="hover:text-primary transition">About</a>
        </div>
        <div className="text-xsA\Z">&copy; {new Date().getFullYear()} Mycelia. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Index;
