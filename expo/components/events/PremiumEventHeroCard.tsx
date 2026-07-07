import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Heart, MapPin, Sparkles, Ticket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { formatDistanceKm, getEventCountdownLabel, shortenEventTitleForHero } from '@/utils/eventDiscovery';
import type { EventConciergeNarrative as ConciergeCopy } from '@/utils/eventConcierge';
import type { EventsPalette } from '@/utils/eventsPalette';
import { EventRecommendationBadge } from '@/components/events/EventRecommendationBadge';
import { EventConciergeNarrative } from '@/components/events/EventConciergeNarrative';

const HERO_HEIGHT = 400;

interface PremiumEventHeroCardProps {
  events: LocalEvent[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  scrollY: Animated.Value;
  palette: EventsPalette;
  areaLabel?: string;
  safeAreaTop?: number;
  onePagerThisWeekLabel?: string;
  concierge?: ConciergeCopy | null;
  recommendationChipLabel?: string;
  onPressEvent: (eventId: string) => void;
  onAddToOnePager: (event: LocalEvent) => void;
  onInterested: (event: LocalEvent) => void;
  onOpenTickets: (event: LocalEvent) => void;
}

export const PremiumEventHeroCard = React.memo(function PremiumEventHeroCard({
  events,
  activeIndex,
  onIndexChange,
  scrollY,
  palette,
  areaLabel,
  safeAreaTop = 0,
  onePagerThisWeekLabel,
  concierge,
  recommendationChipLabel,
  onPressEvent,
  onAddToOnePager,
  onInterested,
  onOpenTickets,
}: PremiumEventHeroCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasConcierge = !!concierge;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true, tension: 200, friction: 14 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 14 }).start();
  }, [scaleAnim]);

  const handleOpen = useCallback(() => {
    const current = events[activeIndex] ?? events[0];
    if (!current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressEvent(current.id);
  }, [events, activeIndex, onPressEvent]);

  const event = events[activeIndex] ?? events[0];
  if (!event) {
    return (
      <View style={[styles.placeholder, { backgroundColor: palette.surface }]}>
        <Text style={[styles.placeholderText, { color: palette.textSecondary }]}>
          Finding events near you…
        </Text>
      </View>
    );
  }

  const countdown = getEventCountdownLabel(event);
  const distanceText = formatDistanceKm(event.distanceKm ?? 0);
  const metaLine = [countdown, event.venue, distanceText].filter(Boolean).join(' · ');
  const heroTitle = shortenEventTitleForHero(event.title);
  const imageUri = event.image?.trim() ?? '';

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -HERO_HEIGHT * 0.35],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [1, 1.08],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.7, HERO_HEIGHT],
    outputRange: [1, 0.85, 0.55],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: heroOpacity,
          transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchTarget}
        onPress={handleOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.media, { transform: [{ scale: scaleAnim }] }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[...palette.heroGradient]} style={styles.image} />
          )}
          <LinearGradient colors={[...palette.heroScrim]} style={styles.scrim} />
          <LinearGradient
            colors={['rgba(232,67,147,0.35)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.colorWash}
          />

          <View style={[styles.topRow, { paddingTop: safeAreaTop + 8 }]}>
            {hasConcierge ? (
              <View style={styles.conciergeEyebrow}>
                <Sparkles size={10} color="rgba(255,255,255,0.85)" />
                <Text style={styles.conciergeEyebrowText}>Event concierge</Text>
              </View>
            ) : (
              <View style={styles.brandRow}>
                <Text style={styles.brandLabel}>Events</Text>
                {onePagerThisWeekLabel ? (
                  <Text style={styles.onePagerSub} numberOfLines={1}>
                    {onePagerThisWeekLabel}
                  </Text>
                ) : areaLabel ? (
                  <Text style={styles.brandSub} numberOfLines={1}>
                    {areaLabel}
                  </Text>
                ) : null}
              </View>
            )}
            {events.length > 1 ? (
              <View style={styles.dots}>
                {events.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      onIndexChange(index);
                    }}
                    style={[
                      styles.dot,
                      index === activeIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.content}>
            {hasConcierge ? <EventConciergeNarrative narrative={concierge} /> : null}
            {recommendationChipLabel ? (
              <EventRecommendationBadge
                label={recommendationChipLabel}
                palette={palette}
                variant="hero-chip"
              />
            ) : null}
            <Text style={styles.title} numberOfLines={2}>
              {heroTitle}
            </Text>
            {metaLine ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                {metaLine}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  void onAddToOnePager(event);
                }}
                activeOpacity={0.85}
              >
                <Sparkles size={15} color="#FFF" />
                <Text style={styles.primaryBtnText}>
                  {event.isSaved ? 'In One Pager' : 'Add to One Pager'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  event.isSaved && { borderColor: palette.primary, backgroundColor: palette.primaryLight },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void onInterested(event);
                }}
                activeOpacity={0.85}
              >
                <Heart
                  size={15}
                  color={event.isSaved ? palette.primary : '#FFF'}
                  fill={event.isSaved ? palette.primary : 'transparent'}
                />
                <Text style={styles.secondaryBtnText}>
                  {event.isSaved ? 'Saved' : 'Interested'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenTickets(event);
                }}
                activeOpacity={0.85}
              >
                <Ticket size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const EVENT_HERO_HEIGHT = HERO_HEIGHT;

const styles = StyleSheet.create({
  wrap: {
    height: HERO_HEIGHT,
    marginBottom: 4,
    overflow: 'hidden',
  },
  touchTarget: {
    height: HERO_HEIGHT,
    width: '100%',
  },
  media: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  conciergeEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    paddingRight: 12,
  },
  conciergeEyebrowText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  brandRow: {
    gap: 2,
    flex: 1,
    paddingRight: 12,
  },
  brandLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500',
  },
  onePagerSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFF',
  },
  content: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  metaLine: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
