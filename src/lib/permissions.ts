import { supabase } from '@/integrations/supabase/client';

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (rolesError || !roles) {
      return false;
    }

    return roles.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: 'admin' | 'user'): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', role)
      .single();

    return !rolesError && !!roles;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}
