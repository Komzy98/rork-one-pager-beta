import React from 'react';
import { Image, StyleProp, ImageStyle, StyleSheet } from 'react-native';
import { getNationFlagUrl } from '@/constants/nations';

type Props = {
  code: string;
  width: number;
  borderRadius?: number;
  /** @default 3 / 4 */
  aspectRatio?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Renders a country/region flag from flagcdn (PNG). Use `Nation.code` (ISO-style, e.g. gb-eng, fr).
 */
export function NationFlag({ code, width, borderRadius = 6, aspectRatio = 3 / 4, style }: Props) {
  const height = Math.round(width / aspectRatio);
  return (
    <Image
      source={{ uri: getNationFlagUrl(code, 'w80') }}
      accessibilityIgnoresInvertColors
      style={[
        {
          width,
          height,
          borderRadius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(15, 23, 42, 0.12)',
        },
        style,
      ]}
      resizeMode="cover"
    />
  );
}
