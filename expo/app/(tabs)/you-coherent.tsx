import React from 'react';
import { Redirect } from 'expo-router';

export default function YouCoherentRoute() {
  return <Redirect href={'/(tabs)/profile' as any} />;
}
