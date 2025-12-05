import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  roles: Array<{ role: Enums<"app_role"> }>;
  last_sign_in_at: string | null;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      const typedProfiles: Array<{ id: string; email: string; full_name: string; phone: string | null; created_at: string }> = Array.isArray(profiles) ? profiles : [];

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;
      const typedRoles: Array<{ user_id: string; role: 'admin' | 'user' }> = Array.isArray(roles) ? roles : [];

      // Fetch last sign in times from auth.users (admin only)
      let typedAuthUsers: Array<{ id: string; last_sign_in_at: string | null }> = [];
      try {
        const { data, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;
        typedAuthUsers = Array.isArray(data?.users) ? data.users.map((u: any) => ({ id: u.id, last_sign_in_at: u.last_sign_in_at || null })) : [];
      } catch (e) {
        // If not admin or error, fallback to nulls
        typedAuthUsers = [];
      }

      // Combine the data
      const usersWithRoles: UserWithRole[] = typedProfiles.map((profile) => ({
        ...profile,
        roles: typedRoles.filter((r) => r.user_id === profile.id).map((r) => ({ role: r.role })),
        last_sign_in_at: typedAuthUsers.find((u) => u.id === profile.id)?.last_sign_in_at || null,
      }));

      return usersWithRoles;
    },
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      // Prevent duplicate role assignment
      const { data: existing, error: checkError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('user_id', userId)
        .eq('role', role);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return;
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });
};

export const useRemoveRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      // Only remove if exists
      const { data: existing, error: checkError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('user_id', userId)
        .eq('role', role);
      if (checkError) throw checkError;
      if (!existing || existing.length === 0) return;
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });
};

export const useActivityLog = () => {
  return useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      // Fetch recent product deactivations
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('name, deactivated_at, deactivated_reason, profiles(full_name)')
        .not('deactivated_at', 'is', null)
        .order('deactivated_at', { ascending: false })
        .limit(50);

      if (productsError) throw productsError;
      const safeProducts = Array.isArray(products) ? products : [];

      // Fetch recent orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, status, total_amount, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      const safeOrders = Array.isArray(orders) ? orders : [];

      // Combine and sort by timestamp
      const activities = [
        ...safeProducts.map((p: any) => ({
          type: 'product_deactivation' as const,
          timestamp: p.deactivated_at,
          user: p.profiles?.full_name || 'Unknown',
          details: `Deactivated "${p.name}" - ${p.deactivated_reason}`,
        })),
        ...safeOrders.map((o: any) => ({
          type: 'order_created' as const,
          timestamp: o.created_at,
          user: o.profiles?.full_name || 'Unknown',
          details: `Created order #${o.id?.slice(0, 8)} - R${Number(o.total_amount).toFixed(2)} (${o.status})`,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities;
    },
  });
};

export const useSystemStats = () => {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const [usersRes, ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, created_at'),
        supabase.from('products').select('id, is_active', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate orders this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const ordersArr = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      const ordersThisMonth = ordersArr.filter(
        (o) => o.created_at && new Date(o.created_at) >= startOfMonth
      ).length || 0;

      return {
        total_users: usersRes.count || 0,
        total_products: productsRes.count || 0,
        total_customers: customersRes.count || 0,
        orders_this_month: ordersThisMonth,
      };
    },
  });
};
