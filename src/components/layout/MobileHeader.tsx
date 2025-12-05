import { UserCircle, LogOut, Shield, Building2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export function MobileHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="md:hidden fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-b z-40 px-4 h-14 flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg tracking-tight">Revono</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <UserCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">
                {user?.email}
              </p>
              {isAdmin && (
                <Badge variant="default" className="w-fit text-[10px] px-2 py-0">
                  Admin
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate("/import")}>
                <Upload className="h-4 w-4 mr-2" />
                <span>Import Sales</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                <span>Admin</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Building2 className="h-4 w-4 mr-2" />
                <span>Business Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
            <LogOut className="h-4 w-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.header>
  );
}