import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        {/* Mobile Header */}
        <MobileHeader />

        {/* Animated Page Content */}
        <div className="flex-1 relative overflow-hidden pb-20 md:pb-0 pt-14 md:pt-0">
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full w-full"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </SidebarProvider>
  );
};
