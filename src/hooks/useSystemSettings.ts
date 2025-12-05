import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SystemSettings {
  stockLowThreshold: number;
  expiryWarningDays: number;
  criticalExpiryDays: number;
  defaultCostMarginPercent: number;
}

const SETTINGS_KEY = 'system_settings';

const defaultSettings: SystemSettings = {
  stockLowThreshold: 10,
  expiryWarningDays: 30,
  criticalExpiryDays: 60,
  defaultCostMarginPercent: 60,
};

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
      return defaultSettings;
    },
    staleTime: Infinity,
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      const current = localStorage.getItem(SETTINGS_KEY);
      const currentSettings = current ? JSON.parse(current) : defaultSettings;
      const updated = { ...currentSettings, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
};
