import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Heart, MapPin, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import type { EventsPalette } from '@/utils/eventsPalette';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_GAP = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface EventsFeaturedCarouselProps {
  events: LocalEvent[];
  palette: EventsPalette;
  onPressEvent: (eventId: string) => void;
  onToggleSaved: (event: LocalEvent) => void;
}

export const EventsFeaturedCarousel = React.memo(function EventsFeaturedCarousel({
  events,
  palette,
  onPressEvent,
  onToggleSaved,
}: EventsFeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    setActiveIndex(Math.max(0, Math.min(index, events.length - 1)));
  }, [events.length]);

  const handlePress = useCallback(
    (event: LocalEvent) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPressEvent(event.id);
    },
    [onPressEvent]
  );

  const dots = useMemo(
    () =>
      events.map((item, index) => (
        <View
          key={item.id}
          style={[styles.dot, index === activeIndex && [styles.dotActive, { backgroundColor: palette.primary }]]}
        />
      )),
    [activeIndex, events, palette.primary]
  );

  if (events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[styles.card, { width: CARD_WIDTH }]}
            activeOpacity={0.92}
            onPress={() => handlePress(event)}
          >
            <Image source={{ uri: event.image }} style={styles.image} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.gradient} />

            <View style={styles.badgeRow}>
              {event.isHot ? (
                <View style={styles.hotBadge}>
                  <TrendingUp size={10} color="#FFF" />
                  <Text style={styles.hotText}>Hot</Text>
                </View>
              ) : (
                <View style={[styles.featuredBadge, { backgroundColor: palette.primary }]}>
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.heartBtn}
              onPress={(e) => {
                e.stopPropagation();
                void onToggleSaved(event);
              }}
            >
              <Heart
                size={18}
                color={event.isSaved ? palette.primary : '#FFF'}
                fill={event.isSaved ? palette.primary : 'transparent'}
              />
            </TouchableOpacity>

            <View style={styles.overlay}>
              <Text style={styles.title} numberOfLines={2}>
                {event.title}
              </Text>
              <View style={styles.metaRow}>
                <MapPin size={12} color="rgba(255,255,255,0.78)" />
                <Text style={styles.venue} numberOfLines={1}>
                  {event.venue}
                </Text>
              </View>
              <View style={styles.footer}>
                <View style={styles.metaRow}>
                  <Calendar size={12} color="rgba(255,255,255,0.78)" />
                  <Text style={styles.date}>{event.date}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.price}>{event.price}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {events.length > 1 ? <View style={styles.dots}>{dots}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  card: {
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  badgeRow: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  hotText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  venue: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.15,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  date: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  price: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 18,
  },
});
