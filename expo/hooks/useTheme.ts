import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { Theme, ThemeMode } from '@/types/theme';
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, getThemeById } from '@/constants/themes';
import { useProAccess } from '@/hooks/useProAccess';
import { useAuth } from './useAuth';

const THEME_STORAGE_KEY = '@app_theme_settings';

interface ThemeSettings {
  mode: ThemeMode;
  lightThemeId: string;
  darkThemeId: string;
}

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const isPro = useProAccess();
  const { user } = useAuth();
  const scopedThemeStorageKey = `${THEME_STORAGE_KEY}_${user?.id || 'guest'}`;
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    mode: 'light',
    lightThemeId: DEFAULT_LIGHT_THEME.id,
    darkThemeId: DEFAULT_DARK_THEME.id,
  });
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadThemeSettings();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, [scopedThemeStorageKey]);

  const loadThemeSettings = async () => {
    try {
      let stored = await AsyncStorage.getItem(scopedThemeStorageKey);
      if (!stored) {
        const legacy = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (legacy) {
          stored = legacy;
          await AsyncStorage.setItem(scopedThemeStorageKey, legacy);
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeSettings;
        setThemeSettings(parsed);
      } else {
        setThemeSettings({
          mode: 'light',
          lightThemeId: DEFAULT_LIGHT_THEME.id,
          darkThemeId: DEFAULT_DARK_THEME.id,
        });
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemeSettings = async (settings: ThemeSettings) => {
    try {
      await AsyncStorage.setItem(scopedThemeStorageKey, JSON.stringify(settings));
      setThemeSettings(settings);
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  };

  const resolveThemeId = useCallback(
    (themeId: string, slot: 'light' | 'dark'): string => {
      const candidate = getThemeById(themeId);
      if (candidate?.tier === 'pro' && !isPro) {
        return slot === 'dark' ? DEFAULT_DARK_THEME.id : DEFAULT_LIGHT_THEME.id;
      }
      return themeId;
    },
    [isPro]
  );

  const getCurrentTheme = useCallback((): Theme => {
    const effectiveMode = themeSettings.mode === 'auto'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeSettings.mode;

    const slot: 'light' | 'dark' = effectiveMode === 'dark' ? 'dark' : 'light';
    const rawId = effectiveMode === 'dark'
      ? themeSettings.darkThemeId
      : themeSettings.lightThemeId;
    const resolvedId = resolveThemeId(rawId, slot);
    const found = getThemeById(resolvedId);
    if (found) return found;
    return effectiveMode === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  }, [themeSettings, systemColorScheme, resolveThemeId]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    const newSettings = { ...themeSettings, mode };
    saveThemeSettings(newSettings);
  }, [themeSettings]);

  const setLightTheme = useCallback((themeId: string) => {
    const newSettings = { ...themeSettings, lightThemeId: themeId };
    saveThemeSettings(newSettings);
  }, [themeSettings]);

  const setDarkTheme = useCallback((themeId: string) => {
    const newSettings = { ...themeSettings, darkThemeId: themeId };
    saveThemeSettings(newSettings);
  }, [themeSettings]);

  const currentTheme = getCurrentTheme();

  return {
    theme: currentTheme,
    colors: currentTheme.colors,
    isDark: currentTheme.isDark,
    isPro,
    themeMode: themeSettings.mode,
    lightThemeId: themeSettings.lightThemeId,
    darkThemeId: themeSettings.darkThemeId,
    systemColorScheme,
    isLoading,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
  };
});
