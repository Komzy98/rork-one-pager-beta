import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Check, Sun, Moon, Smartphone, Lock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  ALL_PRESET_THEMES,
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  getThemeById,
} from '@/constants/themes';
import { Theme, ThemeMode, ThemeColors } from '@/types/theme';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/constants/design';

export function ThemeSettings() {
  const {
    colors,
    themeMode,
    lightThemeId,
    darkThemeId,
    isPro,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
  } = useTheme();

  const [showLightThemes, setShowLightThemes] = useState(false);
  const [showDarkThemes, setShowDarkThemes] = useState(false);

  const lightThemesAll = ALL_PRESET_THEMES.filter(t => !t.isDark);
  const darkThemesAll = ALL_PRESET_THEMES.filter(t => t.isDark);

  const lightStandard = useMemo(
    () => lightThemesAll.filter(t => t.tier !== 'pro'),
    [lightThemesAll]
  );
  const lightPro = useMemo(
    () => lightThemesAll.filter(t => t.tier === 'pro'),
    [lightThemesAll]
  );
  const darkStandard = useMemo(
    () => darkThemesAll.filter(t => t.tier !== 'pro'),
    [darkThemesAll]
  );
  const darkPro = useMemo(
    () => darkThemesAll.filter(t => t.tier === 'pro'),
    [darkThemesAll]
  );

  const currentLightTheme = useMemo((): Theme => {
    const t = getThemeById(lightThemeId);
    if (t?.tier === 'pro' && !isPro) return DEFAULT_LIGHT_THEME;
    return t || DEFAULT_LIGHT_THEME;
  }, [lightThemeId, isPro]);

  const currentDarkTheme = useMemo((): Theme => {
    const t = getThemeById(darkThemeId);
    if (t?.tier === 'pro' && !isPro) return DEFAULT_DARK_THEME;
    return t || DEFAULT_DARK_THEME;
  }, [darkThemeId, isPro]);

  const effectiveLightId = useMemo(() => {
    const t = getThemeById(lightThemeId);
    if (t?.tier === 'pro' && !isPro) return DEFAULT_LIGHT_THEME.id;
    return lightThemeId;
  }, [lightThemeId, isPro]);

  const effectiveDarkId = useMemo(() => {
    const t = getThemeById(darkThemeId);
    if (t?.tier === 'pro' && !isPro) return DEFAULT_DARK_THEME.id;
    return darkThemeId;
  }, [darkThemeId, isPro]);

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'Auto', icon: Smartphone },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme Mode</Text>
      <View style={[styles.modeContainer, { backgroundColor: colors.surface }]}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = themeMode === mode.value;
          return (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.modeButton,
                isSelected && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setThemeMode(mode.value)}
              activeOpacity={0.7}
            >
              <Icon
                size={20}
                color={isSelected ? colors.textInverse : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: isSelected ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.xl }]}>
        Light Theme
      </Text>
      <TouchableOpacity
        style={[styles.themeSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLightThemes(true)}
        activeOpacity={0.7}
      >
        <View style={styles.themeSelectorContent}>
          <View style={[styles.colorPreview, { backgroundColor: currentLightTheme?.colors.primary }]} />
          <Text style={[styles.themeName, { color: colors.text }]}>
            {currentLightTheme?.name}
          </Text>
        </View>
        <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
        Dark Theme
      </Text>
      <TouchableOpacity
        style={[styles.themeSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDarkThemes(true)}
        activeOpacity={0.7}
      >
        <View style={styles.themeSelectorContent}>
          <View style={[styles.colorPreview, { backgroundColor: currentDarkTheme?.colors.primary }]} />
          <Text style={[styles.themeName, { color: colors.text }]}>
            {currentDarkTheme?.name}
          </Text>
        </View>
        <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
      </TouchableOpacity>

      <Modal
        visible={showLightThemes}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLightThemes(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Light Theme</Text>
            <TouchableOpacity onPress={() => setShowLightThemes(false)}>
              <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.themeGrid}>
            <Text style={[styles.themeGroupLabel, { color: colors.textMuted }]}>Standard</Text>
            {lightStandard.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isSelected={effectiveLightId === theme.id}
                locked={false}
                onSelect={() => {
                  setLightTheme(theme.id);
                  setShowLightThemes(false);
                }}
                colors={colors}
              />
            ))}
            <Text style={[styles.themeGroupLabel, { color: colors.textMuted, marginTop: 16 }]}>Pro</Text>
            {lightPro.map((theme) => {
              const locked = theme.tier === 'pro' && !isPro;
              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={lightThemeId === theme.id && !locked}
                  locked={locked}
                  onSelect={() => {
                    if (locked) {
                      Alert.alert(
                        'Pro theme',
                        'This theme is included with Pro. Upgrade to unlock Aurora, Sandstone, Glacier, and other premium palettes.'
                      );
                      return;
                    }
                    setLightTheme(theme.id);
                    setShowLightThemes(false);
                  }}
                  colors={colors}
                />
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDarkThemes}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDarkThemes(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Dark Theme</Text>
            <TouchableOpacity onPress={() => setShowDarkThemes(false)}>
              <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.themeGrid}>
            <Text style={[styles.themeGroupLabel, { color: colors.textMuted }]}>Standard</Text>
            {darkStandard.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isSelected={effectiveDarkId === theme.id}
                locked={false}
                onSelect={() => {
                  setDarkTheme(theme.id);
                  setShowDarkThemes(false);
                }}
                colors={colors}
              />
            ))}
            <Text style={[styles.themeGroupLabel, { color: colors.textMuted, marginTop: 16 }]}>Pro</Text>
            {darkPro.map((theme) => {
              const locked = theme.tier === 'pro' && !isPro;
              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={darkThemeId === theme.id && !locked}
                  locked={locked}
                  onSelect={() => {
                    if (locked) {
                      Alert.alert(
                        'Pro theme',
                        'This theme is included with Pro. Upgrade to unlock Nebula, Ember, Abyss, and other premium palettes.'
                      );
                      return;
                    }
                    setDarkTheme(theme.id);
                    setShowDarkThemes(false);
                  }}
                  colors={colors}
                />
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  locked: boolean;
  onSelect: () => void;
  colors: ThemeColors;
}

function ThemeCard({ theme, isSelected, locked, onSelect, colors }: ThemeCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { 
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: locked ? 0.72 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {locked && (
        <View style={[styles.lockBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Lock size={14} color={colors.textSecondary} />
        </View>
      )}
      {isSelected && !locked && (
        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
          <Check size={16} color={colors.textInverse} />
        </View>
      )}
      <View style={styles.colorPalette}>
        <View style={[styles.colorBlock, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.colorBlock, { backgroundColor: theme.colors.background }]} />
        <View style={[styles.colorBlock, { backgroundColor: theme.colors.success }]} />
        <View style={[styles.colorBlock, { backgroundColor: theme.colors.warning }]} />
      </View>
      <Text style={[styles.themeCardName, { color: colors.text }]}>
        {theme.name}
        {locked ? ' · Pro' : ''}
      </Text>
      <View style={[styles.previewCard, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.previewHeader, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.previewDot, { backgroundColor: theme.colors.primary }]} />
        </View>
        <View style={[styles.previewContent, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.previewLine, { backgroundColor: theme.colors.text }]} />
          <View style={[styles.previewLine, { backgroundColor: theme.colors.textSecondary, width: '70%' }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    marginBottom: SPACING.sm,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.s,
  },
  modeText: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600' as const,
  },
  themeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  themeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
  },
  themeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '500' as const,
  },
  changeText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    ...TYPOGRAPHY.title3,
  },
  doneButton: {
    ...TYPOGRAPHY.body,
    fontWeight: '600' as const,
  },
  modalScroll: {
    flex: 1,
  },
  themeGrid: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  themeGroupLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    marginBottom: SPACING.xs,
  },
  themeCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectedBadge: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockBadge: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  colorBlock: {
    flex: 1,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
  },
  themeCardName: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.sm,
  },
  previewCard: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  previewHeader: {
    height: 24,
    borderRadius: BORDER_RADIUS.xs,
    paddingHorizontal: SPACING.s,
    justifyContent: 'center',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewContent: {
    padding: SPACING.s,
    borderRadius: BORDER_RADIUS.xs,
    gap: SPACING.xs,
  },
  previewLine: {
    height: 8,
    borderRadius: BORDER_RADIUS.xs,
    width: '100%',
  },
});
