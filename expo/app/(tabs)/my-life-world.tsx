import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, LayoutDashboard } from 'lucide-react-native';

import { ExperienceCheckInCard } from '@/components/experience/ExperienceCheckInCard';
import MyLifeWorldV3 from '@/components/my-life/MyLifeWorldV3';
import { useTheme } from '@/hooks/useTheme';
import { interFont } from '@/constants/fonts';

export default function MyLifeWorldRoute() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <MyLifeWorldV3 />

      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Overview"
        onPress={() => router.push('/(tabs)/activities' as never)}
        style={[
          styles.overviewButton,
          {
            top: insets.top + 14,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <LayoutDashboard size={16} color={colors.primary} />
        <Text style={[styles.overviewLabel, { color: colors.text }]}>Overview</Text>
        <ChevronRight size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <View
        pointerEvents="box-none"
        style={[styles.checkInWrap, { bottom: Math.max(insets.bottom, 18) + 82 }]}
      >
        <ExperienceCheckInCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overviewButton: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewLabel: {
    fontFamily: interFont('600'),
    fontSize: 13,
    fontWeight: '600',
  },
  checkInWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 20,
  },
});
