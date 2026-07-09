import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, Moon, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { EventConciergeNarrative } from '@/utils/eventConcierge';
import type { EventsPalette } from '@/utils/eventsPalette';
import { appFont } from '@/constants/fonts';

interface EventConciergeFeedBannerProps {
  narrative: EventConciergeNarrative;
  palette: EventsPalette;
  tonightCount?: number;
  weekendCount?: number;
  onAddTonight?: () => void | Promise<void>;
  onBuildWeekend?: () => void | Promise<void>;
  loading?: 'tonight' | 'weekend' | null;
}

export const EventConciergeFeedBanner = React.memo(function EventConciergeFeedBanner({
  narrative,
  palette,
  tonightCount = 0,
  weekendCount = 0,
  onAddTonight,
  onBuildWeekend,
  loading = null,
}: EventConciergeFeedBannerProps) {
  const showTonight = tonightCount > 0 && onAddTonight;
  const showWeekend = weekendCount > 0 && onBuildWeekend;
  const showActions = showTonight || showWeekend;

  const handleTonight = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void onAddTonight?.();
  }, [onAddTonight]);

  const handleWeekend = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void onBuildWeekend?.();
  }, [onBuildWeekend]);

  return (
    <View style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: palette.primaryLight }]}>
          <Sparkles size={14} color={palette.primary} />
        </View>
        <Text style={[styles.summary, { color: palette.textSecondary }]} numberOfLines={2}>
          <Text style={[styles.greeting, { color: palette.text }]}>{narrative.greeting} </Text>
          {narrative.summarySentence}
        </Text>
      </View>

      {showActions ? (
        <View style={styles.actions}>
          {showTonight ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: palette.primaryLight, borderColor: palette.border }]}
              onPress={handleTonight}
              disabled={loading === 'tonight'}
              activeOpacity={0.85}
            >
              {loading === 'tonight' ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <Moon size={13} color={palette.primary} />
              )}
              <Text style={[styles.actionText, { color: palette.text }]}>
                Tonight · {tonightCount}
              </Text>
            </TouchableOpacity>
          ) : null}
          {showWeekend ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}
              onPress={handleWeekend}
              disabled={loading === 'weekend'}
              activeOpacity={0.85}
            >
              {loading === 'weekend' ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <CalendarDays size={13} color={palette.primary} />
              )}
              <Text style={[styles.actionText, { color: palette.text }]}>
                Weekend · {weekendCount}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...appFont('700'),
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    ...appFont('400'),
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionText: {
    ...appFont('600'),
    fontSize: 12,
    fontWeight: '600',
  },
});
