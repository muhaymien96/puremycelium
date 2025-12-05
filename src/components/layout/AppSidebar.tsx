import {
  Home,
  Plus,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  Calendar,
  Upload,
  History,
  Shield,
  LogOut,
  UserCircle,
  Settings,
  Wallet,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "New Sale", url: "/sale", icon: Plus },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Expenses", url: "/expenses", icon: Wallet },
  { title: "Events", url: "/events", icon: Calendar },
  { title: "Import Sales", url: "/import", icon: Upload },
  { title: "Import History", url: "/import-history", icon: History },
];
export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      {/* Header Branding */}
      <SidebarHeader className="border-b p-4">
        <motion.div
          className="flex items-center gap-2"
          layout
          transition={{ duration: 0.25 }}
        >
          {open && (
            <span className="font-bold text-lg tracking-tight">Revono</span>
          )}
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`transition-colors duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "hover:bg-accent"
                      }`}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Admin Row */}
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/reports"}
                      className="transition-colors duration-200 hover:bg-accent"
                    >
                      <NavLink to="/reports" className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4" />
                        {open && <span>Reports</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/admin"}
                      className="transition-colors duration-200 hover:bg-accent"
                    >
                      <NavLink to="/admin" className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-red-500" />
                        {open && <span className="text-red-600 font-medium">Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/settings"}
                      className="transition-colors duration-200 hover:bg-accent"
                    >
                      <NavLink to="/settings" className="flex items-center gap-3">
                        <Settings className="h-4 w-4" />
                        {open && <span>Settings</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer User Section */}
      <SidebarFooter className="border-t p-4">
        <motion.div className="flex items-center gap-3 mb-3" layout>
          <UserCircle className="h-6 w-6 text-muted-foreground" />
          {open && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium truncate">{user?.email}</span>
              {isAdmin && (
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                  Admin
                </span>
              )}
            </div>
          )}
        </motion.div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start transition"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {open && <span>Logout</span>}
        </Button>
      </SidebarFooter>

      {/* Floating Expand/Collapse Button */}
      <motion.div
        layout
        className="absolute top-4 -right-4"
        transition={{ duration: 0.2 }}
      >
        <SidebarTrigger />
      </motion.div>
    </Sidebar>
  );
}
