import { Home, Plus, ShoppingCart, Package, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Sale", path: "/sale", icon: Plus },
  { label: "Orders", path: "/orders", icon: ShoppingCart },
  { label: "Stock", path: "/inventory", icon: Package },
];

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const items = isAdmin
    ? [...navItems, { label: "Admin", path: "/admin", icon: Shield }]
    : navItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
                isActive
                  ? "text-primary scale-105 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
