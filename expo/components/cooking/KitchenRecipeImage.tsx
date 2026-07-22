import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { UtensilsCrossed } from 'lucide-react-native';

const PLACEHOLDER = require('@/assets/images/icon.png');

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Fill parent (hero cards). */
  fill?: boolean;
};

export function KitchenRecipeImage({ uri, style, borderRadius = 14, fill }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const flat = StyleSheet.flatten(style) ?? {};
  const width = typeof flat.width === 'number' ? flat.width : 80;
  const height = typeof flat.height === 'number' ? flat.height : 80;

  const imageStyle = fill
    ? [StyleSheet.absoluteFillObject, { borderRadius }, style]
    : [{ width, height, borderRadius }, style];

  if (!uri?.trim() || failed) {
    return (
      <View
        style={[
          styles.fallback,
          fill ? StyleSheet.absoluteFillObject : { width, height, borderRadius },
          style,
        ]}
      >
        <UtensilsCrossed size={Math.min(width, height) * 0.35} color="#C4B5AD" />
      </View>
    );
  }

  return (
    <Image
      key={uri.trim()}
      source={{ uri: uri.trim() }}
      style={imageStyle}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      placeholder={PLACEHOLDER}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#F0E8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
