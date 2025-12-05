import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Shield,
  Activity,
  Settings,
  UserPlus,
  UserMinus,
  Clock,
  TrendingUp,
  Package,
  ShoppingCart,
  AlertCircle,
  MoreVertical,
  Database,
  Trash2,
  Calculator,
  Save,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useUsers,
  useAssignRole,
  useRemoveRole,
  useActivityLog,
  useSystemStats,
} from "@/hooks/useUserManagement";
import { useSystemSettings, useUpdateSystemSettings } from "@/hooks/useSystemSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Admin = () => {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: activityLog, isLoading: loadingActivity } = useActivityLog();
  const { data: stats, isLoading: loadingStats } = useSystemStats();
  const { data: systemSettings, isLoading: loadingSettings } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleAction, setRoleAction] = useState<"add" | "remove" | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "user">("user");
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [isCleaningDatabase, setIsCleaningDatabase] = useState(false);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState({
    stockLowThreshold: 10,
    expiryWarningDays: 30,
    criticalExpiryDays: 60,
    defaultCostMarginPercent: 60,
  });

  const handleAssignRole = () => {
    if (selectedUser) {
      assignRole.mutate({ userId: selectedUser.id, role: selectedRole });
      setSelectedUser(null);
      setRoleAction(null);
    }
  };

  const handleRemoveRole = () => {
    if (selectedUser) {
      const adminUsers =
        users?.filter((u) => u.roles.some((r) => r.role === "admin")) || [];
      if (
        selectedRole === "admin" &&
        adminUsers.length === 1 &&
        selectedUser.roles.some((r: any) => r.role === "admin")
      ) {
        toast.error("Cannot remove the last admin user");
        setSelectedUser(null);
        setRoleAction(null);
        return;
      }

      removeRole.mutate({ userId: selectedUser.id, role: selectedRole });
      setSelectedUser(null);
      setRoleAction(null);
    }
  };

  const handleCleanDatabase = async () => {
    setIsCleaningDatabase(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to perform this action");
        return;
      }

      const response = await fetch(
        "https://acxhhfwvxtkvxkvmfiep.supabase.co/functions/v1/clean-database",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to clean database");
      }

      toast.success("Database cleaned successfully");
      setShowCleanupDialog(false);
      window.location.reload();
    } catch (error: any) {
      console.error("Error cleaning database:", error);
      toast.error(error.message || "Failed to clean database");
    } finally {
      setIsCleaningDatabase(false);
    }
  };

  const handleBackfillCogs = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to perform this action");
        return;
      }

      const response = await fetch(
        "https://acxhhfwvxtkvxkvmfiep.supabase.co/functions/v1/backfill-cogs",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to backfill COGS");
      }

      setBackfillResult(result);
      toast.success(`Backfill complete: ${result.updated} transactions updated`);
    } catch (error: any) {
      console.error("Error backfilling COGS:", error);
      toast.error(error.message || "Failed to backfill COGS");
    } finally {
      setIsBackfilling(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "admin" ? "default" : "secondary";
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold md:font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Admin Panel
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage users, roles, and system settings.
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden xs:inline-flex items-center gap-1 text-[11px] md:text-xs"
            >
              <Shield className="h-3 w-3" />
              Admin Access
            </Badge>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-gradient-to-b from-white to-muted/40 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    Total Users
                  </p>
                </div>
                {loadingStats ? (
                  <Skeleton className="h-7 md:h-8 w-12" />
                ) : (
                  <p className="text-xl md:text-2xl font-semibold">
                    {stats?.total_users || 0}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-white to-muted/40 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    Orders This Month
                  </p>
                </div>
                {loadingStats ? (
                  <Skeleton className="h-7 md:h-8 w-16" />
                ) : (
                  <p className="text-xl md:text-2xl font-semibold">
                    {stats?.orders_this_month || 0}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-white to-muted/40 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    Total Products
                  </p>
                </div>
                {loadingStats ? (
                  <Skeleton className="h-7 md:h-8 w-16" />
                ) : (
                  <p className="text-xl md:text-2xl font-semibold">
                    {stats?.total_products || 0}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-white to-muted/40 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    Total Customers
                  </p>
                </div>
                {loadingStats ? (
                  <Skeleton className="h-7 md:h-8 w-16" />
                ) : (
                  <p className="text-xl md:text-2xl font-semibold">
                    {stats?.total_customers || 0}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/60 rounded-lg">
              <TabsTrigger
                value="users"
                className="flex items-center justify-center gap-1 text-[11px] md:text-sm py-2 px-1 md:px-4"
              >
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">User Management</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center justify-center gap-1 text-[11px] md:text-sm py-2 px-1 md:px-4"
              >
                <Activity className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Activity Log</span>
                <span className="sm:hidden">Activity</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center justify-center gap-1 text-[11px] md:text-sm py-2 px-1 md:px-4"
              >
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4 mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg">
                    User Roles & Permissions
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Manage user access levels. Admins have full control, staff
                    can perform market operations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !users || users.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No users found"
                      description="No users have been registered yet"
                    />
                  ) : (
                    <div className="divide-y rounded-xl border bg-card/60">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 px-3 py-3 md:px-4 md:py-3.5"
                        >
                          {/* Avatar + admin pill */}
                          <div className="relative shrink-0">
                            <Avatar className="h-8 w-8 md:h-9 md:w-9 bg-primary/10">
                              <AvatarFallback className="text-xs md:text-sm font-medium">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-medium text-sm md:text-base truncate">
                                  {user.full_name}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {user.roles.map((r: any) => (
                                    <Badge
                                      key={r.role}
                                      variant={getRoleBadgeVariant(r.role)}
                                      className="text-[10px] md:text-[11px] px-2 py-0.5 rounded-full"
                                    >
                                      {r.role}
                                    </Badge>
                                  ))}
                                  {user.roles.length === 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] md:text-[11px] px-2 py-0.5 rounded-full text-muted-foreground"
                                    >
                                      No roles
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span>
                                Joined:{" "}
                                {user.created_at
                                  ? new Date(
                                      user.created_at
                                    ).toLocaleDateString()
                                  : "-"}
                              </span>
                              {user.last_sign_in_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last login:{" "}
                                  {new Date(
                                    user.last_sign_in_at
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 md:h-9 md:w-9 shrink-0 hover:bg-muted active:scale-95 transition"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open user menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 text-xs md:text-sm"
                            >
                              <DropdownMenuLabel className="text-xs">
                                Role actions
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setRoleAction("add");
                                  setSelectedRole("user");
                                }}
                              >
                                <UserPlus className="mr-2 h-3.5 w-3.5" />
                                Add / Change Role
                              </DropdownMenuItem>
                              {user.roles.length > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setRoleAction("remove");
                                    // default to 'user' but dialog will show actual roles list
                                    setSelectedRole("user");
                                  }}
                                >
                                  <UserMinus className="mr-2 h-3.5 w-3.5" />
                                  Remove Role
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Role Permissions Reference */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">
                    Role Permissions Reference
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Admin</Badge>
                      <span className="text-sm font-medium">
                        Full System Access
                      </span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                      <li>Manage user roles and permissions</li>
                      <li>Deactivate/reactivate products</li>
                      <li>View inactive products and audit trails</li>
                      <li>Access admin panel and activity logs</li>
                      <li>
                        Manage all products, orders, customers, and reports
                      </li>
                      <li>Configure system settings</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">User (Staff)</Badge>
                      <span className="text-sm font-medium">
                        Market Operations
                      </span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                      <li>Create and manage sales/orders</li>
                      <li>Process payments</li>
                      <li>View active products and inventory</li>
                      <li>Manage customers</li>
                      <li>Add product batches (restock)</li>
                      <li>Generate invoices and reports</li>
                      <li>
                        <strong>Cannot:</strong> Deactivate products, manage
                        users, access admin panel
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="space-y-4 mt-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">
                    System Activity Log
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Recent actions and changes across the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingActivity ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !activityLog || activityLog.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="No activity yet"
                      description="System activity will appear here"
                    />
                  ) : (
                    <div className="space-y-2">
                      {activityLog.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
                        >
                          <div className="mt-0.5">
                            {activity.type === "product_deactivation" ? (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            ) : (
                              <ShoppingCart className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.details}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{activity.user}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(activity.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">
                        System Settings
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Configure global system preferences.
                      </CardDescription>
                    </div>
                    {!isEditingSettings ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditedSettings({
                            stockLowThreshold: systemSettings?.stockLowThreshold || 10,
                            expiryWarningDays: systemSettings?.expiryWarningDays || 30,
                            criticalExpiryDays: systemSettings?.criticalExpiryDays || 60,
                            defaultCostMarginPercent: systemSettings?.defaultCostMarginPercent || 60,
                          });
                          setIsEditingSettings(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingSettings(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            updateSettings.mutate(editedSettings, {
                              onSuccess: () => {
                                toast.success('Settings saved');
                                setIsEditingSettings(false);
                              },
                            });
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {loadingSettings ? (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stock Low Threshold */}
                      <div className="flex justify-between items-center gap-4 p-4 bg-card/60 rounded-xl border hover:shadow transition-shadow">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm md:text-base">Stock Low Threshold</h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Alert when product stock falls below this level.
                          </p>
                        </div>
                        {isEditingSettings ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedSettings.stockLowThreshold}
                              onChange={(e) => setEditedSettings(s => ({ ...s, stockLowThreshold: parseInt(e.target.value) || 0 }))}
                              className="w-20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">units</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] md:text-xs whitespace-nowrap bg-white shadow-sm">
                            {systemSettings?.stockLowThreshold || 10} units
                          </Badge>
                        )}
                      </div>

                      {/* Expiry Warning Days */}
                      <div className="flex justify-between items-center gap-4 p-4 bg-card/60 rounded-xl border hover:shadow transition-shadow">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm md:text-base">Expiry Warning Days</h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Show warning for products expiring within this period.
                          </p>
                        </div>
                        {isEditingSettings ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedSettings.expiryWarningDays}
                              onChange={(e) => setEditedSettings(s => ({ ...s, expiryWarningDays: parseInt(e.target.value) || 0 }))}
                              className="w-20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] md:text-xs whitespace-nowrap bg-white shadow-sm">
                            {systemSettings?.expiryWarningDays || 30} days
                          </Badge>
                        )}
                      </div>

                      {/* Critical Expiry Days */}
                      <div className="flex justify-between items-center gap-4 p-4 bg-card/60 rounded-xl border hover:shadow transition-shadow">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm md:text-base">Critical Expiry Days</h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Prioritize reorder for products expiring within this period.
                          </p>
                        </div>
                        {isEditingSettings ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedSettings.criticalExpiryDays}
                              onChange={(e) => setEditedSettings(s => ({ ...s, criticalExpiryDays: parseInt(e.target.value) || 0 }))}
                              className="w-20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] md:text-xs whitespace-nowrap bg-white shadow-sm">
                            {systemSettings?.criticalExpiryDays || 60} days
                          </Badge>
                        )}
                      </div>

                      {/* Default Cost Margin */}
                      <div className="flex justify-between items-center gap-4 p-4 bg-card/60 rounded-xl border hover:shadow transition-shadow">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm md:text-base">Default Cost Margin</h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Fallback cost calculation when batch cost is missing.
                          </p>
                        </div>
                        {isEditingSettings ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editedSettings.defaultCostMarginPercent}
                              onChange={(e) => setEditedSettings(s => ({ ...s, defaultCostMarginPercent: parseInt(e.target.value) || 0 }))}
                              className="w-20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">% of retail</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] md:text-xs whitespace-nowrap bg-white shadow-sm">
                            {systemSettings?.defaultCostMarginPercent || 60}% of retail
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data Maintenance Section */}
                  <div className="mt-8 pt-8 border-t">
                    <div className="flex items-start gap-3 mb-4">
                      <Calculator className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-base md:text-lg">
                          Data Maintenance
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          Tools to fix and update historical data.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm md:text-base">
                              Backfill Historical COGS
                            </h4>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Update financial transactions with estimated cost of goods sold using current product costs.
                            This fixes profit calculations for historical orders.
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowBackfillDialog(true)}
                          className="shrink-0 gap-2"
                        >
                          <Calculator className="h-4 w-4" />
                          Backfill COGS
                        </Button>
                      </div>
                      {backfillResult && (
                        <div className="mt-3 p-3 bg-background rounded-lg text-xs">
                          <p className="font-medium">Last backfill result:</p>
                          <p className="text-muted-foreground">
                            Updated: {backfillResult.updated} | Skipped: {backfillResult.skipped} | Total: {backfillResult.total}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dangerous Actions Section */}
                  <div className="mt-8 pt-8 border-t">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-base md:text-lg text-destructive">
                          Dangerous Actions
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          These actions are irreversible. Use with extreme caution.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-destructive" />
                            <h4 className="font-medium text-sm md:text-base">
                              Clean Database
                            </h4>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            Permanently delete all products, orders, invoices, customers, and market events.
                            User accounts and roles will be preserved.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowCleanupDialog(true)}
                          className="shrink-0 gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clean Database
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Role Assignment Dialog */}
          <AlertDialog
            open={roleAction === "add"}
            onOpenChange={() => {
              setRoleAction(null);
              setSelectedUser(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Assign Role</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a role to assign to {selectedUser?.full_name}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4">
                <Select
                  value={selectedRole}
                  onValueChange={(v: "admin" | "user") => setSelectedRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Staff)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleAssignRole}>
                  Assign Role
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Role Removal Dialog */}
          <AlertDialog
            open={roleAction === "remove"}
            onOpenChange={() => {
              setRoleAction(null);
              setSelectedUser(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Role</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a role to remove from {selectedUser?.full_name}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4">
                <Select
                  value={selectedRole}
                  onValueChange={(v: "admin" | "user") => setSelectedRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedUser?.roles.map((r: any) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.role === "admin" ? "Admin" : "User (Staff)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleRemoveRole}
                >
                  Remove Role
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Database Cleanup Confirmation Dialog */}
          <AlertDialog
            open={showCleanupDialog}
            onOpenChange={setShowCleanupDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Clean Database - Confirm Action
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-medium text-foreground">
                    This action will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All products and inventory batches</li>
                    <li>All orders and order items</li>
                    <li>All invoices and payments</li>
                    <li>All customers and contact information</li>
                    <li>All market events</li>
                    <li>All financial transactions and refunds</li>
                    <li>All stock movement history</li>
                  </ul>
                  <p className="font-medium text-destructive pt-2">
                    This action cannot be undone. User accounts and roles will be preserved.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isCleaningDatabase}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleCleanDatabase}
                  disabled={isCleaningDatabase}
                >
                  {isCleaningDatabase ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Yes, Clean Database
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* COGS Backfill Confirmation Dialog */}
          <AlertDialog
            open={showBackfillDialog}
            onOpenChange={setShowBackfillDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Backfill Historical COGS
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-medium text-foreground">
                    This will update all financial transactions where cost = 0 with estimated COGS:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Uses batch cost if available</li>
                    <li>Falls back to product cost price</li>
                    <li>Estimates at 60% of sale price if no cost data</li>
                  </ul>
                  <p className="text-muted-foreground pt-2">
                    This is safe to run multiple times - it only updates transactions with zero cost.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isBackfilling}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBackfillCogs}
                  disabled={isBackfilling}
                >
                  {isBackfilling ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Start Backfill
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
