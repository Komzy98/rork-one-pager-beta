import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TodayPrimaryV2 from '@/components/activities/TodayPrimaryV2';
import TodayModeSwitcher from '@/components/activities/TodayModeSwitcher';

export default function TodayCoherentRoute() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <TodayPrimaryV2 />
      <View style={[styles.switcher, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TodayModeSwitcher active="now" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switcher: {
    position: 'absolute',
    right: 84,
    zIndex: 20,
  },
});
