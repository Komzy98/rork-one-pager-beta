import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Calendar, Heart, MapPin, Sparkles, TrendingUp, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LocalEvent } from '@/types/events';
import { formatDistanceKm } from '@/utils/eventDiscovery';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import type { EventsPalette } from '@/utils/eventsPalette';
import { EventRecommendationBadge } from '@/components/events/EventRecommendationBadge';
import EventListingBadges from '@/components/events/EventListingBadges';
import { EventSocialProofRow } from '@/components/events/EventSocialProofRow';
import type { EventFriendProfile } from '@/utils/eventSocialProof';
import { resolveEventPosterUrl } from '@/utils/eventPosterImage';

type PosterVariant = 'vertical' | 'horizontal' | 'feed';

interface PremiumEventPosterCardProps {
  event: LocalEvent;
  palette: EventsPalette;
  variant?: PosterVariant;
  onPress: (eventId: string) => void;
  onToggleSaved: (event: LocalEvent) => void | Promise<void>;
  onSaved?: () => void;
  onAddToOnePager?: (event: LocalEvent) => void;
  /** Small chip above card — featured uses compact reason, feed uses category label */
  recommendationChipLabel?: string;
  recommendationChipVariant?: 'featured-chip' | 'feed-chip';
  onWhyThis?: (event: LocalEvent) => void;
  socialProofLabel?: string | null;
  socialProofFriends?: EventFriendProfile[];
  onInviteFriends?: (event: LocalEvent) => void;
  /** Worldwide search — show Ticketmaster/Skiddle + UK/US market chips. */
  showListingBadges?: boolean;
}

export const PremiumEventPosterCard = React.memo(function PremiumEventPosterCard({
  event,
  palette,
  variant = 'vertical',
  onPress,
  onToggleSaved,
  onSaved,
  onAddToOnePager,
  recommendationChipLabel,
  recommendationChipVariant = 'feed-chip',
  onWhyThis,
  socialProofLabel,
  socialProofFriends = [],
  onInviteFriends,
  showListingBadges = false,
}: PremiumEventPosterCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const isHorizontal = variant === 'horizontal';
  const isFeed = variant === 'feed';
  const categoryMeta = getEventCategoryMeta(event.category);
  const CategoryIcon = categoryMeta.icon;
  const isFree = event.price === 'Free';
  const priceBg = isFree ? palette.successLight : palette.primaryLight;
  const priceColor = isFree ? palette.success : palette.primary;
  const distanceText = formatDistanceKm(event.distanceKm ?? 0);
  const posterUri = useMemo(() => resolveEventPosterUrl(event.image), [event.image]);
  const [posterFailed, setPosterFailed] = useState(false);
  const displayPosterUri = posterFailed ? resolveEventPosterUrl(null) : posterUri;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 220, friction: 16 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 220, friction: 16 }).start();
  }, [scaleAnim]);

  const handleSavePress = useCallback(async () => {
    const wasSaved = event.isSaved;
    if (!wasSaved) {
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1.45, useNativeDriver: true, tension: 200, friction: 6 }),
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      ]).start();
    }
    await onToggleSaved(event);
    if (!wasSaved) {
      onSaved?.();
    }
  }, [event, heartScale, onSaved, onToggleSaved]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(event.id);
  }, [event.id, onPress]);

  return (
    <Animated.View
      style={[
        isFeed ? styles.feedWrap : isHorizontal ? styles.horizontalWrap : styles.verticalWrap,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={[
          isFeed ? styles.feedCard : isHorizontal ? styles.horizontalCard : styles.verticalCard,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={isFeed ? styles.feedImageWrap : isHorizontal ? styles.horizontalImageWrap : styles.verticalImageWrap}>
          <Image
            source={{ uri: displayPosterUri }}
            style={isFeed ? styles.feedImage : isHorizontal ? styles.horizontalImage : styles.verticalImage}
            contentFit="cover"
            recyclingKey={`${event.id}-${displayPosterUri}`}
            onError={() => setPosterFailed(true)}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.imageGradient}
          />
          {event.isHot ? (
            <View style={styles.hotBadge}>
              <TrendingUp size={10} color="#FFF" />
              <Text style={styles.hotText}>Hot</Text>
            </View>
          ) : null}
          {!isFeed ? (
            <TouchableOpacity
              style={styles.heartBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                void handleSavePress();
              }}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Heart
                  size={16}
                  color={event.isSaved ? palette.primary : '#FFF'}
                  fill={event.isSaved ? palette.primary : 'transparent'}
                />
              </Animated.View>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={isFeed ? styles.feedBody : isHorizontal ? styles.horizontalBody : styles.verticalBody}>
          {recommendationChipLabel ? (
            <View style={styles.chipRow}>
              <EventRecommendationBadge
                label={recommendationChipLabel}
                palette={palette}
                variant={recommendationChipVariant === 'featured-chip' ? 'featured-chip' : 'feed-chip'}
              />
              {onWhyThis ? (
                <TouchableOpacity
                  style={styles.whyThisBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onWhyThis(event);
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={[styles.whyThisText, { color: palette.primary }]}>Why this?</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryChip, { backgroundColor: `${categoryMeta.color}22` }]}>
              <CategoryIcon size={11} color={categoryMeta.color} />
              <Text style={[styles.categoryText, { color: categoryMeta.color }]}>
                {categoryMeta.label}
              </Text>
            </View>
            <View style={[styles.priceBadge, { backgroundColor: priceBg }]}>
              <Text style={[styles.priceText, { color: priceColor }]}>{event.price}</Text>
            </View>
          </View>

          <Text
            style={[styles.title, { color: palette.text }]}
            numberOfLines={isHorizontal ? 1 : 2}
          >
            {event.title}
          </Text>

          {socialProofLabel && socialProofFriends.length > 0 ? (
            <EventSocialProofRow
              label={socialProofLabel}
              friends={socialProofFriends}
              palette={palette}
              compact={isHorizontal}
            />
          ) : null}

          {showListingBadges ? <EventListingBadges event={event} palette={palette} /> : null}

          <View style={styles.metaRow}>
            <MapPin size={11} color={palette.textMuted} />
            <Text style={[styles.metaText, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.metaRow}>
              <Calendar size={11} color={palette.textMuted} />
              <Text style={[styles.metaText, { color: palette.textSecondary }]} numberOfLines={1}>
                {event.date} · {event.time}
              </Text>
            </View>
            {distanceText ? (
              <Text style={[styles.distance, { color: palette.textMuted }]}>{distanceText}</Text>
            ) : null}
          </View>

          {isFeed && onAddToOnePager ? (
            <View style={styles.feedActions}>
              <TouchableOpacity
                style={[styles.feedPrimaryBtn, { backgroundColor: palette.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  void onAddToOnePager(event);
                }}
              >
                <Sparkles size={14} color="#FFF" />
                <Text style={styles.feedPrimaryText}>
                  {event.isSaved ? 'In One Pager' : 'Add to One Pager'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedSecondaryBtn, { borderColor: palette.border }]}
                onPress={(e) => {
                  e.stopPropagation();
                  void handleSavePress();
                }}
              >
                <Heart
                  size={14}
                  color={event.isSaved ? palette.primary : palette.textSecondary}
                  fill={event.isSaved ? palette.primary : 'transparent'}
                />
                <Text style={[styles.feedSecondaryText, { color: palette.textSecondary }]}>
                  {event.isSaved ? 'Saved' : 'Interested'}
                </Text>
              </TouchableOpacity>
              {onInviteFriends ? (
                <TouchableOpacity
                  style={[styles.feedInviteBtn, { borderColor: palette.border }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onInviteFriends(event);
                  }}
                >
                  <UserPlus size={14} color={palette.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {!isFeed && onInviteFriends ? (
            <TouchableOpacity
              style={[styles.inviteLink, { borderColor: palette.border }]}
              onPress={(e) => {
                e.stopPropagation();
                onInviteFriends(event);
              }}
            >
              <UserPlus size={12} color={palette.primary} />
              <Text style={[styles.inviteLinkText, { color: palette.primary }]}>Invite friends</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const CARD_WIDTH = 168;
const HORIZONTAL_WIDTH = 280;
/** Image + body padding for horizontal poster cards (nested carousel height). */
export const POSTER_HORIZONTAL_CARD_MIN_HEIGHT = 252;

const styles = StyleSheet.create({
  feedWrap: {
    width: '100%',
  },
  feedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  feedImageWrap: {
    height: 180,
    position: 'relative',
  },
  feedImage: {
    width: '100%',
    height: '100%',
  },
  feedBody: {
    padding: 14,
    gap: 7,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  whyThisBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  whyThisText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  feedPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  feedPrimaryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  feedSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedInviteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  inviteLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verticalWrap: {
    width: CARD_WIDTH,
  },
  horizontalWrap: {
    width: HORIZONTAL_WIDTH,
  },
  verticalCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  horizontalCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  verticalImageWrap: {
    height: 210,
    position: 'relative',
  },
  horizontalImageWrap: {
    height: 140,
    position: 'relative',
  },
  verticalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  hotBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  hotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalBody: {
    padding: 12,
    gap: 6,
  },
  horizontalBody: {
    padding: 12,
    gap: 5,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.15,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  distance: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export { CARD_WIDTH as POSTER_CARD_WIDTH, HORIZONTAL_WIDTH as POSTER_HORIZONTAL_WIDTH };
