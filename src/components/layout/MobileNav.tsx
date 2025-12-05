import { Home, Plus, ShoppingCart, Package, LayoutGrid } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar, Wallet, BarChart3 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

// Core navigation items (always visible)
const coreNavItems = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Sale", path: "/sale", icon: Plus },
  { label: "Orders", path: "/orders", icon: ShoppingCart },
  { label: "Stock", path: "/inventory", icon: Package },
];

// More menu items
const moreItems = [
  { label: "Expenses", path: "/expenses", icon: Wallet },
  { label: "Events", path: "/events", icon: Calendar },
];

const adminMoreItems = [
  { label: "Reports", path: "/reports", icon: BarChart3 },
];

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isAdmin } = useIsAdmin();
  const [moreOpen, setMoreOpen] = useState(false);

  // Combined more items including admin-only
  const allMoreItems = isAdmin 
    ? [...moreItems, ...adminMoreItems]
    : moreItems;

  const handleNavigation = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {coreNavItems.map((item) => {
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

        {/* More button with sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
                moreOpen || allMoreItems.some(item => location.pathname === item.path)
                  ? "text-primary scale-105 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
              <span className="text-[10px] tracking-wide">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 pb-6">
              {allMoreItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
