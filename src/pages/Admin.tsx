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
} from "lucide-react";
import {
  useUsers,
  useAssignRole,
  useRemoveRole,
  useActivityLog,
  useSystemStats,
} from "@/hooks/useUserManagement";
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
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleAction, setRoleAction] = useState<"add" | "remove" | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "user">("user");

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
            <TabsList className="w-full justify-start md:justify-center overflow-x-auto rounded-full bg-muted/60 px-1 py-1">
              <TabsTrigger
                value="users"
                className="flex items-center gap-1 text-xs md:text-sm px-3 md:px-4"
              >
                <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                User Management
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center gap-1 text-xs md:text-sm px-3 md:px-4"
              >
                <Activity className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Activity Log
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-1 text-xs md:text-sm px-3 md:px-4"
              >
                <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Settings
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
                  <CardTitle className="text-base md:text-lg">
                    System Settings
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Configure global system preferences.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Setting row component style */}
                    {[
                      {
                        title: "Stock Low Threshold",
                        desc: "Alert when product stock falls below this level.",
                        value: "10 units",
                      },
                      {
                        title: "Expiry Warning Days",
                        desc: "Show warning for products expiring within this period.",
                        value: "30 days",
                      },
                      {
                        title: "Critical Expiry Days",
                        desc: "Prioritize reorder for products expiring within this period.",
                        value: "60 days",
                      },
                      {
                        title: "Default Cost Margin",
                        desc: "Fallback cost calculation when batch cost is missing.",
                        value: "60% of retail",
                      },
                    ].map((setting, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center gap-4 p-4 bg-card/60 rounded-xl border hover:shadow transition-shadow"
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm md:text-base">
                            {setting.title}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground leading-tight">
                            {setting.desc}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1 text-[11px] md:text-xs whitespace-nowrap bg-white shadow-sm"
                        >
                          {setting.value}
                        </Badge>
                      </div>
                    ))}
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
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
