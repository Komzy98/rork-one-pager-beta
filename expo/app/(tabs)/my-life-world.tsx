import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExperienceCheckInCard } from '@/components/experience/ExperienceCheckInCard';
import MyLifeWorldV2 from '@/components/my-life/MyLifeWorldV2';

export default function MyLifeWorldRoute() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <MyLifeWorldV2 />
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
  checkInWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 20,
  },
});
