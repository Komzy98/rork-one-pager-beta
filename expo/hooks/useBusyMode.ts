import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { useAuth } from '@/hooks/useAuth';
import * as Haptics from 'expo-haptics';

const BUSY_MODE_STORAGE_KEY = 'busy_mode_settings';

export interface BusyModeSettings {
  isEnabled: boolean;
  autoDisableTime?: string;
  reason?: 'busy_day' | 'low_energy' | 'time_crunch' | 'custom';
  enabledAt?: string;
  streakProtectionEnabled: boolean;
}

const defaultSettings: BusyModeSettings = {
  isEnabled: false,
  streakProtectionEnabled: true,
};

export const [BusyModeProvider, useBusyMode] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<BusyModeSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = useMemo(() => {
    return userId ? `${BUSY_MODE_STORAGE_KEY}_${userId}` : BUSY_MODE_STORAGE_KEY;
  }, [userId]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await unifiedStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as BusyModeSettings;
          
          if (parsed.autoDisableTime) {
            const disableTime = new Date(parsed.autoDisableTime);
            if (new Date() > disableTime) {
              const updatedSettings = { ...parsed, isEnabled: false, autoDisableTime: undefined };
              await unifiedStorage.setItem(storageKey, JSON.stringify(updatedSettings));
              setSettings(updatedSettings);
              console.log('🔄 [BusyMode] Auto-disabled due to scheduled time');
            } else {
              setSettings(parsed);
            }
          } else {
            setSettings(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading busy mode settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [storageKey]);

  const saveSettings = useCallback(async (newSettings: BusyModeSettings) => {
    try {
      await unifiedStorage.setItem(storageKey, JSON.stringify(newSettings));
      setSettings(newSettings);
      console.log('💾 [BusyMode] Settings saved:', newSettings);
    } catch (error) {
      console.error('Error saving busy mode settings:', error);
    }
  }, [storageKey]);

  const enableBusyMode = useCallback(async (
    reason?: BusyModeSettings['reason'],
    durationHours?: number
  ) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const now = new Date();
    let autoDisableTime: string | undefined;
    
    if (durationHours) {
      const disableDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      autoDisableTime = disableDate.toISOString();
    }

    const newSettings: BusyModeSettings = {
      ...settings,
      isEnabled: true,
      reason: reason || 'busy_day',
      enabledAt: now.toISOString(),
      autoDisableTime,
    };

    await saveSettings(newSettings);
    console.log('⚡ [BusyMode] Enabled with reason:', reason, 'Duration:', durationHours, 'hours');
  }, [settings, saveSettings]);

  const disableBusyMode = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newSettings: BusyModeSettings = {
      ...settings,
      isEnabled: false,
      reason: undefined,
      enabledAt: undefined,
      autoDisableTime: undefined,
    };

    await saveSettings(newSettings);
    console.log('✅ [BusyMode] Disabled');
  }, [settings, saveSettings]);

  const toggleBusyMode = useCallback(async () => {
    if (settings.isEnabled) {
      await disableBusyMode();
    } else {
      await enableBusyMode();
    }
  }, [settings.isEnabled, enableBusyMode, disableBusyMode]);

  const setStreakProtection = useCallback(async (enabled: boolean) => {
    const newSettings: BusyModeSettings = {
      ...settings,
      streakProtectionEnabled: enabled,
    };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const getTimeRemaining = useCallback((): string | null => {
    if (!settings.autoDisableTime) return null;
    
    const now = new Date();
    const disableTime = new Date(settings.autoDisableTime);
    const diff = disableTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [settings.autoDisableTime]);

  const getBusyModeMessage = useCallback((): string => {
    switch (settings.reason) {
      case 'busy_day':
        return 'Busy day mode: 2-minute versions active';
      case 'low_energy':
        return 'Low energy mode: Minimal habits active';
      case 'time_crunch':
        return 'Time crunch: Quick completions enabled';
      default:
        return 'Quick mode: 2-minute habits active';
    }
  }, [settings.reason]);

  return {
    isEnabled: settings.isEnabled,
    reason: settings.reason,
    enabledAt: settings.enabledAt,
    autoDisableTime: settings.autoDisableTime,
    streakProtectionEnabled: settings.streakProtectionEnabled,
    isLoading,
    
    enableBusyMode,
    disableBusyMode,
    toggleBusyMode,
    setStreakProtection,
    getTimeRemaining,
    getBusyModeMessage,
  };
});

export const useBusyModeSafe = () => {
  try {
    const context = useBusyMode();
    if (!context) {
      return {
        isEnabled: false,
        reason: undefined,
        enabledAt: undefined,
        autoDisableTime: undefined,
        streakProtectionEnabled: true,
        isLoading: false,
        enableBusyMode: async () => {},
        disableBusyMode: async () => {},
        toggleBusyMode: async () => {},
        setStreakProtection: async () => {},
        getTimeRemaining: () => null,
        getBusyModeMessage: () => '',
      };
    }
    return context;
  } catch {
    return {
      isEnabled: false,
      reason: undefined,
      enabledAt: undefined,
      autoDisableTime: undefined,
      streakProtectionEnabled: true,
      isLoading: false,
      enableBusyMode: async () => {},
      disableBusyMode: async () => {},
      toggleBusyMode: async () => {},
      setStreakProtection: async () => {},
      getTimeRemaining: () => null,
      getBusyModeMessage: () => '',
    };
  }
};
