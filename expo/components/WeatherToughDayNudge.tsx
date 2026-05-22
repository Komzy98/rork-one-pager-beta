import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CloudRain, CloudLightning, Snowflake, Wind, Thermometer, CloudFog } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { ProcessedWeatherData } from '@/utils/weatherApi';
import {
  getWeatherNudge,
  type WeatherNudgeStats,
  type ToughWeatherKind,
} from '@/utils/weatherNudges';

interface WeatherToughDayNudgeProps {
  weather: ProcessedWeatherData | null | undefined;
  stats?: WeatherNudgeStats;
  userName?: string;
}

function NudgeIcon({ kinds, color }: { kinds: ToughWeatherKind[]; color: string }) {
  const size = 16;
  if (kinds.includes('storm')) return <CloudLightning size={size} color={color} strokeWidth={2.5} />;
  if (kinds.includes('snow')) return <Snowflake size={size} color={color} strokeWidth={2.5} />;
  if (kinds.includes('cold')) return <Thermometer size={size} color={color} strokeWidth={2.5} />;
  if (kinds.includes('wind')) return <Wind size={size} color={color} strokeWidth={2.5} />;
  if (kinds.includes('fog')) return <CloudFog size={size} color={color} strokeWidth={2.5} />;
  return <CloudRain size={size} color={color} strokeWidth={2.5} />;
}

/** Single compact coaching line — shown at most once on Overview when weather is tough. */
export default function WeatherToughDayNudge({
  weather,
  stats,
  userName,
}: WeatherToughDayNudgeProps) {
  const { colors, isDark } = useTheme();
  const nudge = getWeatherNudge(weather, stats, userName);

  if (!nudge) return null;

  const accent =
    nudge.severity === 'high'
      ? isDark
        ? '#F87171'
        : '#DC2626'
      : isDark
        ? '#93C5FD'
        : '#2563EB';

  return (
    <View
      style={[
        styles.compact,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
          borderColor: isDark ? colors.border : 'rgba(15, 23, 42, 0.08)',
        },
      ]}
    >
      <NudgeIcon kinds={nudge.kinds} color={accent} />
      <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={2}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{nudge.headline}</Text>
        {' — '}
        {nudge.tip}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
