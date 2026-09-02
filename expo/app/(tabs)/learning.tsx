import React from 'react';
import { Stack } from 'expo-router';

import LearningPrimaryV2 from '@/components/learning/LearningPrimaryV2';

export default function LearningScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LearningPrimaryV2 />
    </>
  );
}
