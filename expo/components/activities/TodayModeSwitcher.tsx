import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';

type TodayMode = 'now' | 'overview';

type Props = {
  active: TodayMode;
};

export default function TodayModeSwitcher({ active }: Props) {
  const { colors, isDark } = useTheme();

  const goTo = (mode: TodayMode) => {
    if (mode === active) return;
    router.replace(mode === 'now' ? '/(tabs)/today-coherent' : '/(tabs)/today-overview');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : '#F1F4F8',
          borderColor: colors.border,
        },
      ]}
      accessibilityRole="tablist"
    >
      {(['now', 'overview'] as const).map((mode) => {
        const selected = active === mode;
        return (
          <TouchableOpacity
            key={mode}
            onPress={() => goTo(mode)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.tab,
              selected && {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                OP_TYPE.meta,
                styles.label,
                { color: selected ? colors.text : colors.textSecondary },
              ]}
            >
              {mode === 'now' ? 'Now' : 'Overview'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: OP_RADIUS.medium,
  },
  tab: {
    minHeight: 32,
    paddingHorizontal: OP_SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: OP_RADIUS.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontWeight: '700',
  },
});
