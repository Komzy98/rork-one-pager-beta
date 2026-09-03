import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActivitiesScreen from './activities';
import TodayModeSwitcher from '@/components/activities/TodayModeSwitcher';

export default function TodayOverviewRoute() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ActivitiesScreen />
      <View style={[styles.switcher, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TodayModeSwitcher active="overview" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switcher: {
    position: 'absolute',
    right: 24,
    zIndex: 50,
  },
});
