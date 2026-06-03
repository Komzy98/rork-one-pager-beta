import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { CalendarDays, Flag, Gauge, MapPin, RefreshCw } from 'lucide-react-native';
import type { F1Race } from '@/constants/f1Data';

const F1_RED = '#F20D18';

/** Pins featured card above hero clip edge (ImageBackground uses overflow:hidden). */
const F1_FEATURED_CARD_BOTTOM_PX = 0;

type Props = {
  featuredRace: F1Race | null;
  onRefresh: () => void;
  onFeaturedPress: () => void;
};

function formatRaceTimeLine(race: F1Race): string {
  const d = new Date(race.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dn = new Date(d);
  dn.setHours(0, 0, 0, 0);
  const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timePart = race.time?.trim() ?? '';
  if (dn.getTime() === tomorrow.getTime()) {
    return timePart ? `Tomorrow · ${timePart} UTC` : 'Tomorrow';
  }
  if (dn.getTime() === today.getTime()) {
    return timePart ? `Today · ${timePart} UTC` : 'Today';
  }
  return timePart ? `${datePart} · ${timePart} UTC` : datePart;
}

export default function F1PremiumHeroInner({ featuredRace, onRefresh, onFeaturedPress }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const edgePad = useMemo(() => {
    const base = windowWidth <= 360 ? 12 : windowWidth <= 400 ? 14 : 20;
    return Math.max(base, Math.ceil(insets.left), Math.ceil(insets.right));
  }, [windowWidth, insets.left, insets.right]);
  const compactHero = windowWidth < 390;
  const featuredCardBottom = useMemo(
    () => (windowWidth >= 428 ? 2 : F1_FEATURED_CARD_BOTTOM_PX),
    [windowWidth],
  );

  const timeLine = featuredRace ? formatRaceTimeLine(featuredRace) : '';
  const venueLine = featuredRace
    ? [featuredRace.city, featuredRace.country].filter(Boolean).join(', ')
    : '';

  return (
    <View style={styles.root}>
      <View style={[styles.heroTopActions, { right: edgePad }]}>
        <TouchableOpacity style={[styles.heroAction, styles.refreshAction]} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={21} color={F1_RED} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        {featuredRace ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onFeaturedPress}
            style={[styles.featuredWrap, styles.featuredWrapPinned, { bottom: featuredCardBottom }]}
          >
            <BlurView
              intensity={34}
              tint="dark"
              style={[styles.featuredMatch, compactHero && styles.featuredMatchCompact]}
            >
              <Text style={styles.featuredLabel}>NEXT RACE</Text>
              <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.roundLabel}>ROUND {featuredRace.round}</Text>
                  <Text
                    style={[styles.raceName, compactHero && styles.raceNameCompact]}
                    numberOfLines={compactHero ? 1 : 2}
                  >
                    {featuredRace.name}
                  </Text>
                </View>
                <View style={[styles.flagBadge, compactHero && styles.flagBadgeCompact]}>
                  <Text style={[styles.flagEmoji, compactHero && styles.flagEmojiCompact]}>
                    {featuredRace.flag}
                  </Text>
                </View>
              </View>
              <View style={styles.circuitRow}>
                <Flag size={11} color={F1_RED} strokeWidth={2.2} />
                <Text style={styles.circuitText} numberOfLines={1}>
                  {featuredRace.circuit}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Gauge size={11} color={F1_RED} />
                  <Text style={styles.statText}>{featuredRace.laps} laps</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statText}>{featuredRace.circuitLength}</Text>
                </View>
              </View>
              <View style={styles.featuredMetaRow}>
                <CalendarDays size={11} color={F1_RED} />
                <Text style={styles.featuredMetaAccent}>{timeLine}</Text>
                {venueLine ? (
                  <>
                    <View style={styles.metaDivider} />
                    <MapPin size={11} color="#D0D5DD" />
                    <Text style={styles.featuredMeta} numberOfLines={1}>
                      {venueLine}
                    </Text>
                  </>
                ) : null}
              </View>
            </BlurView>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 0,
  },
  heroTopActions: {
    position: 'absolute',
    right: 20,
    top: 0,
    zIndex: 2,
  },
  heroAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,15,22,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  refreshAction: {
    backgroundColor: 'rgba(28,10,10,0.48)',
    borderColor: 'rgba(242,13,24,0.5)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 4,
    paddingHorizontal: 0,
  },
  featuredWrap: {
    width: '100%',
  },
  featuredWrapPinned: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  featuredMatch: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(8,8,10,0.36)',
  },
  featuredMatchCompact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  featuredLabel: {
    color: F1_RED,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '900',
  },
  titleRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  roundLabel: {
    color: F1_RED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  raceName: {
    marginTop: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  raceNameCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  flagBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(242,13,24,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242,13,24,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBadgeCompact: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  flagEmoji: {
    fontSize: 18,
  },
  flagEmojiCompact: {
    fontSize: 16,
  },
  circuitRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  circuitText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    marginTop: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statText: {
    color: '#E8EAED',
    fontSize: 9,
    fontWeight: '700',
  },
  featuredMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featuredMetaAccent: {
    color: F1_RED,
    fontSize: 9,
    fontWeight: '900',
  },
  featuredMeta: {
    color: '#E8EAED',
    fontSize: 9,
    fontWeight: '700',
    flexShrink: 1,
  },
  metaDivider: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
