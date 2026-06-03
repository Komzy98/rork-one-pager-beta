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
import { Image } from 'expo-image';
import { CalendarDays, RefreshCw, Swords } from 'lucide-react-native';
import { UFC_BRAND } from '@/utils/sportsPalette';
const UFC_RED = UFC_BRAND.red;

/** Pins featured card above hero clip edge (ImageBackground uses overflow:hidden). */
const UFC_FEATURED_CARD_BOTTOM_PX = 0;

export type UfcHeroFeaturedFight = {
  id: number;
  date: string;
  time: string;
  event: string;
  category: string;
  fighter1: { name: string; photo?: string };
  fighter2: { name: string; photo?: string };
};

type Props = {
  featuredFight: UfcHeroFeaturedFight | null;
  onRefresh: () => void;
  onFeaturedPress: () => void;
};

function formatFeaturedTimeLine(fight: UfcHeroFeaturedFight): string {
  const d = new Date(fight.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dn = new Date(d);
  dn.setHours(0, 0, 0, 0);
  const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timePart = fight.time?.trim() ?? '';
  if (dn.getTime() === tomorrow.getTime()) {
    return timePart ? `Tomorrow · ${timePart}` : 'Tomorrow';
  }
  if (dn.getTime() === today.getTime()) {
    return timePart ? `Today · ${timePart}` : 'Today';
  }
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

function FighterAvatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={styles.fighterAvatarImg}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }
  return <Text style={styles.fighterAvatarInitial}>{name.charAt(0) || '?'}</Text>;
}

export default function UFCPremiumHeroInner({ featuredFight, onRefresh, onFeaturedPress }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const edgePad = useMemo(() => {
    const base = windowWidth <= 360 ? 12 : windowWidth <= 400 ? 14 : 20;
    return Math.max(base, Math.ceil(insets.left), Math.ceil(insets.right));
  }, [windowWidth, insets.left, insets.right]);
  const compactHero = windowWidth < 390;
  const featuredCardBottom = useMemo(
    () => (windowWidth >= 428 ? 2 : UFC_FEATURED_CARD_BOTTOM_PX),
    [windowWidth],
  );

  const timeLine = featuredFight ? formatFeaturedTimeLine(featuredFight) : '';
  const weightLine = featuredFight?.category?.trim() || 'Main card';

  return (
    <View style={styles.root}>
      <View style={[styles.heroTopActions, { right: edgePad }]}>
        <TouchableOpacity style={[styles.heroAction, styles.refreshAction]} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={21} color={UFC_RED} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        {featuredFight ? (
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
              <Text style={styles.featuredLabel}>NEXT FEATURED FIGHT</Text>
              <Text style={styles.featuredEvent} numberOfLines={1}>
                {featuredFight.event}
              </Text>
              <View style={styles.featuredMainRow}>
                <View style={styles.fighterCol}>
                  <View style={styles.fighterAvatar}>
                    <FighterAvatar name={featuredFight.fighter1.name} photo={featuredFight.fighter1.photo} />
                  </View>
                  <Text
                    style={[styles.fighterName, compactHero && styles.fighterNameCompact]}
                    numberOfLines={1}
                  >
                    {featuredFight.fighter1.name}
                  </Text>
                </View>
                <View style={[styles.vsBubble, compactHero && styles.vsBubbleCompact]}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={[styles.fighterCol, styles.fighterColAway]}>
                  <View style={styles.fighterAvatar}>
                    <FighterAvatar name={featuredFight.fighter2.name} photo={featuredFight.fighter2.photo} />
                  </View>
                  <Text
                    style={[
                      styles.fighterName,
                      styles.fighterNameAway,
                      compactHero && styles.fighterNameCompact,
                    ]}
                    numberOfLines={1}
                  >
                    {featuredFight.fighter2.name}
                  </Text>
                </View>
              </View>
              <View style={styles.featuredMetaRow}>
                <CalendarDays size={11} color={UFC_RED} />
                <Text style={styles.featuredMetaAccent}>{timeLine}</Text>
                <View style={styles.metaDivider} />
                <Swords size={11} color="#D0D5DD" />
                <Text style={styles.featuredMeta} numberOfLines={1}>
                  {weightLine}
                </Text>
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
    backgroundColor: 'rgba(28,8,10,0.48)',
    borderColor: 'rgba(229,9,20,0.5)',
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
    backgroundColor: 'rgba(10,8,10,0.36)',
  },
  featuredMatchCompact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  featuredLabel: {
    color: UFC_RED,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '900',
  },
  featuredEvent: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  featuredMainRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
  },
  fighterCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 4,
  },
  fighterColAway: {
    alignItems: 'center',
  },
  fighterAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fighterAvatarImg: {
    width: '100%',
    height: '100%',
  },
  fighterAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  fighterName: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  fighterNameCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  fighterNameAway: {
    textAlign: 'center',
  },
  vsBubble: {
    width: 28,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(229,9,20,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexShrink: 0,
  },
  vsBubbleCompact: {
    width: 26,
    height: 20,
    marginHorizontal: 3,
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  featuredMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featuredMetaAccent: {
    color: UFC_RED,
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
