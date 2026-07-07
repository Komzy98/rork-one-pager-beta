import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, ChevronUp, Heart, MapPin, Sparkles, Ticket, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { formatDistanceKm } from '@/utils/eventDiscovery';
import type { EventsPalette } from '@/utils/eventsPalette';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PEEK_HEIGHT = 210;
const EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 440);

interface EventsMapBottomSheetProps {
  event: LocalEvent | null;
  palette: EventsPalette;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onClose: () => void;
  onOpenDetail: (eventId: string) => void;
  onAddToOnePager: (event: LocalEvent) => void;
  onToggleSaved: (event: LocalEvent) => void;
  onOpenTickets: (event: LocalEvent) => void;
  bottomInset?: number;
}

export const EventsMapBottomSheet = React.memo(function EventsMapBottomSheet({
  event,
  palette,
  expanded,
  onExpandChange,
  onClose,
  onOpenDetail,
  onAddToOnePager,
  onToggleSaved,
  onOpenTickets,
  bottomInset = 0,
}: EventsMapBottomSheetProps) {
  const sheetHeight = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const targetHeight = event ? (expanded ? EXPANDED_HEIGHT : PEEK_HEIGHT) : 0;

  useEffect(() => {
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      tension: 180,
      friction: 22,
    }).start();
    dragY.setValue(0);
  }, [targetHeight, dragY, sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0 && expanded) {
          dragY.setValue(g.dy);
        } else if (g.dy < 0 && !expanded && event) {
          dragY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40 && !expanded) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onExpandChange(true);
        } else if (g.dy > 50 && expanded) {
          onExpandChange(false);
        } else if (g.dy > 80 && !expanded) {
          onClose();
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const animatedHeight = Animated.add(sheetHeight, dragY);

  const handleToggleExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onExpandChange(!expanded);
  }, [expanded, onExpandChange]);

  if (!event) {
    return (
      <Animated.View
        style={[
          styles.hintSheet,
          {
            height: 56,
            backgroundColor: palette.card,
            borderColor: palette.border,
            marginBottom: bottomInset + 8,
          },
        ]}
      >
        <MapPin size={16} color={palette.primary} />
        <Text style={[styles.hintText, { color: palette.text }]}>Tap a pin to explore events</Text>
      </Animated.View>
    );
  }

  const distanceText = formatDistanceKm(event.distanceKm ?? 0);

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: animatedHeight,
          backgroundColor: palette.card,
          borderColor: palette.border,
          marginBottom: bottomInset + 8,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: palette.textMuted }]} />
        <TouchableOpacity style={styles.handleTap} onPress={handleToggleExpand} activeOpacity={0.8}>
          <ChevronUp
            size={16}
            color={palette.textSecondary}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.previewRow}
        activeOpacity={0.9}
        onPress={() => onOpenDetail(event.id)}
      >
        <Image source={{ uri: event.image }} style={styles.poster} />
        <View style={styles.previewInfo}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={expanded ? 3 : 2}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={palette.textMuted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.venue}{distanceText ? ` · ${distanceText}` : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Calendar size={12} color={palette.textMuted} />
            <Text style={[styles.meta, { color: palette.textSecondary }]}>
              {event.date} · {event.time}
            </Text>
          </View>
          {!expanded ? (
            <Text style={[styles.swipeHint, { color: palette.primary }]}>Swipe up for details</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.expandedBody}>
          <LinearGradient
            colors={['transparent', palette.surfaceLight]}
            style={styles.expandedFade}
          />
          {event.description ? (
            <Text style={[styles.description, { color: palette.textSecondary }]} numberOfLines={4}>
              {event.description}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
              onPress={() => void onAddToOnePager(event)}
            >
              <Sparkles size={15} color="#FFF" />
              <Text style={styles.primaryBtnText}>
                {event.isSaved ? 'In One Pager' : 'Add to One Pager'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: palette.border }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void onToggleSaved(event);
              }}
              accessibilityRole="button"
              accessibilityLabel={event.isSaved ? 'Remove from One Pager' : 'Save to One Pager'}
            >
              <Heart size={16} color={event.isSaved ? palette.primary : palette.textSecondary} fill={event.isSaved ? palette.primary : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: palette.border }]}
              onPress={() => onOpenTickets(event)}
            >
              <Ticket size={15} color={palette.text} />
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                {event.price === 'Free' ? 'Register' : 'Tickets'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hintSheet: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '600',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  handleTap: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    padding: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 8,
  },
  previewRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  poster: {
    width: 88,
    height: 110,
    borderRadius: 14,
  },
  previewInfo: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  swipeHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  expandedFade: {
    height: 1,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
