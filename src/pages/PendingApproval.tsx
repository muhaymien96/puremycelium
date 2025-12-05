import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function PendingApproval() {
  const { user, hasAnyRole, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (hasAnyRole) {
        navigate("/dashboard");
      }
    }
  }, [user, hasAnyRole, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-2">
          <CardHeader className="text-center space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
            >
              <Clock className="h-8 w-8 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">Pending Approval</CardTitle>
              <CardDescription className="text-base mt-2">
                Your account is waiting for admin approval
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Access Restricted</p>
                  <p className="text-sm text-muted-foreground">
                    An administrator needs to assign you a role before you can access the application.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Signed in as</p>
                  <p className="text-sm text-muted-foreground break-all">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Please contact your system administrator to request access.
              </p>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
