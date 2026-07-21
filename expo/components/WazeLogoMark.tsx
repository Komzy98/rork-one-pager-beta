import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

const WAZE_LOGO = require('@/assets/images/waze-logo.png');

/** Background on the official Waze app icon / logo tile. */
export const WAZE_BRAND_CYAN = '#33CCFF';

type Props = {
  /** Layout footprint (matches Maps nav icon row height). */
  layoutSize?: number;
  /** Visual scale inside the footprint — bigger logo without taller buttons. */
  visualScale?: number;
};

export function WazeLogoMark({ layoutSize = 14, visualScale = 1.65 }: Props) {
  return (
    <View
      style={{
        width: layoutSize,
        height: layoutSize,
        borderRadius: Math.round(layoutSize * 0.22),
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={WAZE_LOGO}
        style={{
          width: layoutSize,
          height: layoutSize,
          transform: [{ scale: visualScale }],
        }}
        contentFit="cover"
        accessibilityLabel="Waze"
      />
    </View>
  );
}
