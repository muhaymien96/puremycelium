import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type BusinessSettings = Tables<"business_settings">;

// Get all business profiles
export const useBusinessProfiles = () => {
  return useQuery({
    queryKey: ['business_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data as BusinessSettings[];
    },
  });
};

// Get single business profile
export const useBusinessSettings = (profileId?: string) => {
  return useQuery({
    queryKey: ['business_settings', profileId],
    queryFn: async () => {
      if (profileId) {
        const { data, error } = await supabase
          .from('business_settings')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        return data as BusinessSettings;
      }

      // Get default profile
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) throw error;
      return data as BusinessSettings;
    },
  });
};

export const useUpdateBusinessSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, settings }: { id: string; settings: Partial<BusinessSettings> }) => {
      const { data, error } = await supabase
        .from('business_settings')
        .update(settings)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_settings'] });
      queryClient.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Business settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
};

export const useCreateBusinessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<BusinessSettings>) => {
      const { data, error } = await supabase
        .from('business_settings')
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Business profile created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create profile: ${error.message}`);
    },
  });
};

export const useSetDefaultProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // First, unset all defaults
      await supabase
        .from('business_settings')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Then set the new default
      const { data, error } = await supabase
        .from('business_settings')
        .update({ is_default: true })
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['business_settings'] });
      toast.success('Default profile updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to set default: ${error.message}`);
    },
  });
};

export const useDeleteBusinessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('business_settings')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Profile deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete profile: ${error.message}`);
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, profileId }: { file: File; profileId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${profileId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      return { logoUrl: urlData.publicUrl, profileId };
    },
    onSuccess: async ({ logoUrl, profileId }) => {
      await supabase
        .from('business_settings')
        .update({ logo_url: logoUrl })
        .eq('id', profileId);

      queryClient.invalidateQueries({ queryKey: ['business_settings'] });
      queryClient.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Logo uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload logo: ${error.message}`);
    },
  });
};
