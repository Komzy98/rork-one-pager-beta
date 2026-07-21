import React, { useMemo, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'expo-image';

interface AvatarWithFallbackProps {
  candidates: readonly string[];
  style: StyleProp<ImageStyle>;
  fallback: React.ReactNode;
  contentFit?: 'cover' | 'contain' | 'fill';
  transition?: number;
}

export function AvatarWithFallback({
  candidates,
  style,
  fallback,
  contentFit = 'cover',
  transition = 200,
}: AvatarWithFallbackProps) {
  const uniqueCandidates = useMemo(
    () => candidates.map((url) => url.trim()).filter(Boolean),
    [candidates],
  );
  const [failedIndex, setFailedIndex] = useState(0);
  const uri = uniqueCandidates[failedIndex];

  if (!uri) {
    return <>{fallback}</>;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      onError={() => {
        setFailedIndex((current) => Math.min(current + 1, uniqueCandidates.length));
      }}
    />
  );
}
