import { Home, Plus, ShoppingCart, Package, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Home', path: '/dashboard', icon: Home },
  { label: 'Sale', path: '/sale', icon: Plus },
  { label: 'Orders', path: '/orders', icon: ShoppingCart },
  { label: 'Stock', path: '/inventory', icon: Package },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
];

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
