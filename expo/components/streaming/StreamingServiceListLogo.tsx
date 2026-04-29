import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Tv } from 'lucide-react-native';
import { getYounifyStreamingServiceLogoUrl } from '@/services/younify';
import { getStreamingBrandLogoUrl } from '@/utils/streamingServiceLogo';

type Props = {
  /** Raw service row from Younify */
  service: Record<string, unknown>;
  /** Display name fallback */
  label: string;
  size?: number;
  fallbackIconColor: string;
};

/**
 * Brand logo for streaming lists — image only, no grey chip wrapper (use parent layout for spacing).
 */
export default function StreamingServiceListLogo({
  service,
  label,
  size = 40,
  fallbackIconColor,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  const uri = useMemo(() => {
    const fromApi = getYounifyStreamingServiceLogoUrl(service);
    if (fromApi) return fromApi;
    return getStreamingBrandLogoUrl(label);
  }, [service, label]);

  if (!uri || imageFailed) {
    return (
      <View style={[styles.fallbackSlot, { width: size, height: size }]}>
        <Tv size={Math.round(size * 0.45)} color={fallbackIconColor} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
      accessibilityLabel={`${label} logo`}
      accessibilityRole="image"
      accessibilityIgnoresInvertColors
      onError={() => setImageFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
  fallbackSlot: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
