import React from 'react';
import { View, StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Trophy } from 'lucide-react-native';
import { resolveLeagueLogoSource } from '@/utils/footballLeagueLabel';

type FootballLeagueLogoProps = {
  leagueId?: number | null;
  leagueName?: string | null;
  leagueLogo?: string | null;
  size?: number;
  style?: ImageStyle;
  fallbackStyle?: ViewStyle;
  fallbackIconSize?: number;
  fallbackColor?: string;
};

export default function FootballLeagueLogo({
  leagueId,
  leagueName,
  leagueLogo,
  size = 36,
  style,
  fallbackStyle,
  fallbackIconSize = 16,
  fallbackColor = '#8E8E93',
}: FootballLeagueLogoProps) {
  const source = resolveLeagueLogoSource({ leagueId, league: leagueName, leagueLogo });

  if (source) {
    return (
      <Image
        source={source}
        style={[{ width: size, height: size }, style]}
        contentFit="contain"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size }, fallbackStyle]}>
      <Trophy size={fallbackIconSize} color={fallbackColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
