import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
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
  AlertCircle
} from 'lucide-react';
import { useUsers, useAssignRole, useRemoveRole, useActivityLog, useSystemStats } from '@/hooks/useUserManagement';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const Admin = () => {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: activityLog, isLoading: loadingActivity } = useActivityLog();
  const { data: stats, isLoading: loadingStats } = useSystemStats();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleAction, setRoleAction] = useState<'add' | 'remove' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');

  const handleAssignRole = () => {
    if (selectedUser) {
      assignRole.mutate({ userId: selectedUser.id, role: selectedRole });
      setSelectedUser(null);
      setRoleAction(null);
    }
  };

  const handleRemoveRole = () => {
    if (selectedUser) {
      // Prevent removing the last admin role
      const adminUsers = users?.filter(u => u.roles.some(r => r.role === 'admin')) || [];
      if (selectedRole === 'admin' && adminUsers.length === 1 && selectedUser.roles.some((r: any) => r.role === 'admin')) {
        toast.error('Cannot remove the last admin user');
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
    return role === 'admin' ? 'default' : 'secondary';
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage users, roles, and system settings
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Orders This Month</p>
              </div>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.orders_this_month || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Total Products</p>
              </div>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.total_customers || 0}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Roles & Permissions</CardTitle>
                <CardDescription>
                  Manage user access levels. Admins have full control, staff can perform market operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : !users || users.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    description="No users have been registered yet"
                  />
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => {
                      const hasAdminRole = user.roles.some((r) => r.role === 'admin');
                      const hasUserRole = user.roles.some((r) => r.role === 'user');
                      
                      return (
                        <Card key={user.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{user.full_name}</h3>
                                  <div className="flex gap-1">
                                    {user.roles.map((r) => (
                                      <Badge key={r.role} variant={getRoleBadgeVariant(r.role)}>
                                        {r.role}
                                      </Badge>
                                    ))}
                                    {user.roles.length === 0 && (
                                      <Badge variant="outline" className="text-muted-foreground">
                                        No roles
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Joined: {new Date(user.created_at).toLocaleDateString()}
                                  </span>
                                  {user.last_sign_in_at && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setRoleAction('add');
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add Role
                                </Button>
                                {user.roles.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setRoleAction('remove');
                                    }}
                                  >
                                    <UserMinus className="h-4 w-4 mr-1" />
                                    Remove Role
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Permissions Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Admin</Badge>
                    <span className="text-sm font-medium">Full System Access</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Manage user roles and permissions</li>
                    <li>Deactivate/reactivate products</li>
                    <li>View inactive products and audit trails</li>
                    <li>Access admin panel and activity logs</li>
                    <li>Manage all products, orders, customers, and reports</li>
                    <li>Configure system settings</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">User (Staff)</Badge>
                    <span className="text-sm font-medium">Market Operations</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Create and manage sales/orders</li>
                    <li>Process payments</li>
                    <li>View active products and inventory</li>
                    <li>Manage customers</li>
                    <li>Add product batches (restock)</li>
                    <li>Generate invoices and reports</li>
                    <li><strong>Cannot:</strong> Deactivate products, manage users, access admin panel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>System Activity Log</CardTitle>
                <CardDescription>
                  Recent actions and changes across the system
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
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="mt-0.5">
                          {activity.type === 'product_deactivation' ? (
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
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure global system preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Stock Low Threshold</h4>
                      <p className="text-sm text-muted-foreground">
                        Alert when product stock falls below this level
                      </p>
                    </div>
                    <Badge variant="outline">10 units</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Expiry Warning Days</h4>
                      <p className="text-sm text-muted-foreground">
                        Show warning for products expiring within this period
                      </p>
                    </div>
                    <Badge variant="outline">30 days</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Critical Expiry Days</h4>
                      <p className="text-sm text-muted-foreground">
                        Prioritize reorder for products expiring within this period
                      </p>
                    </div>
                    <Badge variant="outline">60 days</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Default Cost Margin</h4>
                      <p className="text-sm text-muted-foreground">
                        Fallback cost calculation when batch cost is missing
                      </p>
                    </div>
                    <Badge variant="outline">60% of retail</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Assignment Dialog */}
        <AlertDialog
          open={roleAction === 'add'}
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
              <Select value={selectedRole} onValueChange={(v: 'admin' | 'user') => setSelectedRole(v)}>
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
          open={roleAction === 'remove'}
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
              <Select value={selectedRole} onValueChange={(v: 'admin' | 'user') => setSelectedRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser?.roles.map((r: any) => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.role === 'admin' ? 'Admin' : 'User (Staff)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveRole} className="bg-destructive hover:bg-destructive/90">
                Remove Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Admin;
