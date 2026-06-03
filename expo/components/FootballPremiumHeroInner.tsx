import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
  Search,
  RefreshCw,
  Plus,
  CalendarDays,
  MapPin,
} from 'lucide-react-native';
import {
  FOOTBALL_HERO_BOTTOM_STACK_LIFT_PX,
  getSportsTallHeroMinHeight,
  HERO_FEATURED_CARD_BOTTOM_INSET_PX,
  SPORTS_TALL_HERO_MIN_HEIGHT_PX,
} from '@/constants/sportsHeroLayout';

/** Reserve space for baked-in “FOOTBALL CENTER” artwork at the tall-hero baseline. */
const HERO_ART_SPACER_BASE_PX = 112;

export type FeaturedMatchFields = {
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  date: string;
  time: string;
  venue?: string;
  venueCity?: string;
};

/** Up to four favourite clubs shown on the hero — tap opens club profile when `onClubAvatarPress` is set. */
export type FootballHeroFavoriteClub = {
  apiId?: number | null;
  name: string;
  logoUri: string;
};

type Props = {
  liveCount: number;
  /** First-row club crests (max 4). Prefer over legacy `clubLogoUris`. */
  clubSlots?: FootballHeroFavoriteClub[];
  /** @deprecated Use `clubSlots` with structured teams. */
  clubLogoUris?: (string | undefined)[];
  featuredMatch: FeaturedMatchFields | null;
  onSearch: () => void;
  onRefresh: () => void;
  onMyClubs: () => void;
  onFeaturedPress: () => void;
  onAddClub: () => void;
  onClubAvatarPress?: (club: FootballHeroFavoriteClub) => void;
};

function formatFeaturedTimeLine(match: FeaturedMatchFields): string {
  if (match.date.includes('T')) {
    const d = new Date(match.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dn = new Date(d);
    dn.setHours(0, 0, 0, 0);
    if (dn.getTime() === tomorrow.getTime()) {
      return `Tomorrow ${match.time}`;
    }
    if (dn.getTime() === today.getTime()) {
      return `Today ${match.time}`;
    }
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${match.time}`;
  }
  return match.time;
}

function splitTeamNameLines(name: string): { line1: string; line2: string | null } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { line1: '', line2: null };
  if (words.length === 1) return { line1: words[0], line2: null };
  if (words.length === 2) return { line1: words[0], line2: words[1] };
  const mid = Math.ceil(words.length / 2);
  return {
    line1: words.slice(0, mid).join(' '),
    line2: words.slice(mid).join(' '),
  };
}

/** Shrink both lines together — weight 900 runs wider than regular body text. */
function measureTeamNameFontSize(lines: string[], baseSize: number, maxWidth: number): number {
  const minSize = baseSize * 0.5;
  const charFactor = 0.68;
  const usableWidth = maxWidth * 0.9;
  for (let size = baseSize; size >= minSize; size -= 0.5) {
    if (lines.every((line) => line.length * size * charFactor <= usableWidth)) {
      return size;
    }
  }
  return minSize;
}

function FeaturedTeamName({
  name,
  align,
  compact,
  slotWidth,
}: {
  name: string;
  align: 'left' | 'right';
  compact: boolean;
  slotWidth: number;
}) {
  const { line1, line2 } = useMemo(() => splitTeamNameLines(name), [name]);
  const baseSize = line2 ? (compact ? 13.5 : 16) : compact ? 15 : 18;
  const lines = useMemo(
    () => (line2 ? [line1, line2] : [line1]),
    [line1, line2],
  );
  const fontSize = useMemo(
    () => measureTeamNameFontSize(lines, baseSize, slotWidth),
    [lines, baseSize, slotWidth],
  );
  const lineHeight = Math.round(fontSize * 1.15);
  const textAlign = align === 'right' ? ('right' as const) : ('left' as const);
  const lineStyle = { fontSize, lineHeight, textAlign, maxWidth: slotWidth } as const;

  return (
    <View style={styles.featuredTeamNameBlock}>
      <Text
        style={[styles.featuredTeamLine, lineStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {line1}
      </Text>
      {line2 ? (
        <Text
          style={[styles.featuredTeamLine, lineStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {line2}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Overlays actions, club row, and featured match on the Football Center hero (title is in the asset).
 */
export default function FootballPremiumHeroInner({
  liveCount: _liveCount,
  clubSlots,
  clubLogoUris,
  featuredMatch,
  onSearch,
  onRefresh,
  onMyClubs,
  onFeaturedPress,
  onAddClub,
  onClubAvatarPress,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroMinHeight = useMemo(() => getSportsTallHeroMinHeight(windowWidth), [windowWidth]);
  const heroArtSpacerHeight = useMemo(
    () => Math.round((heroMinHeight / SPORTS_TALL_HERO_MIN_HEIGHT_PX) * HERO_ART_SPACER_BASE_PX),
    [heroMinHeight],
  );
  const myClubsDropPx = useMemo(() => Math.round(heroMinHeight * 0.03), [heroMinHeight]);
  const edgePad = useMemo(() => {
    const base = windowWidth <= 360 ? 12 : windowWidth <= 400 ? 14 : 20;
    return Math.max(base, Math.ceil(insets.left), Math.ceil(insets.right));
  }, [windowWidth, insets.left, insets.right]);
  const compactHero = windowWidth < 390;
  const featuredTeamSlotWidth = useMemo(() => {
    const cardPad = 32;
    const vsBlock = (compactHero ? 36 : 44) + (compactHero ? 8 : 16);
    const crestAndGap = 34;
    const available = windowWidth - edgePad * 2 - cardPad - vsBlock;
    return Math.max(68, Math.floor(available / 2 - crestAndGap - 4));
  }, [windowWidth, edgePad, compactHero]);

  const venueLine =
    [featuredMatch?.venue, featuredMatch?.venueCity].filter(Boolean).join(', ') || 'Venue TBA';
  const timeLine = featuredMatch ? formatFeaturedTimeLine(featuredMatch) : '';

  const slots: FootballHeroFavoriteClub[] =
    clubSlots ??
    (clubLogoUris ?? []).map((uri, i) => ({
      apiId: null,
      name: `club-${i}`,
      logoUri: uri ?? '',
    }));

  return (
    <View style={styles.root}>
      <View style={[styles.heroTopActions, { right: edgePad }]}>
        <TouchableOpacity style={[styles.heroAction, styles.refreshAction]} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={21} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroAction} onPress={onSearch} activeOpacity={0.85}>
          <Search size={22} color="#FFFFFF" strokeWidth={2.3} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        <View style={[styles.heroArtSpacer, { minHeight: heroArtSpacerHeight }]} />

        <View style={styles.heroBottomStack}>
        <View style={[styles.clubRow, { marginTop: 12 + myClubsDropPx }]}>
          {slots.slice(0, 4).map((club, i) => {
            const uri = club.logoUri;
            const inner = (
              <>
                {uri ? (
                  <Image source={{ uri }} style={styles.clubLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.clubLogoPlaceholder} />
                )}
              </>
            );
            const key = `${club.name}-${club.apiId ?? i}-${i}`;
            if (onClubAvatarPress && clubSlots != null) {
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.clubAvatar}
                  onPress={() => onClubAvatarPress(club)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${club.name} club profile`}
                >
                  {inner}
                </TouchableOpacity>
              );
            }
            return (
              <View key={key} style={styles.clubAvatar}>
                {inner}
              </View>
            );
          })}
          <TouchableOpacity style={styles.addClub} onPress={onAddClub} activeOpacity={0.85}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onMyClubs} activeOpacity={0.8}>
          <Text style={styles.myClubsText}>My Clubs  ›</Text>
        </TouchableOpacity>

        {featuredMatch ? (
          <TouchableOpacity activeOpacity={0.9} onPress={onFeaturedPress}>
            <BlurView intensity={38} tint="dark" style={styles.featuredMatch}>
              <Text style={styles.featuredLabel}>NEXT FEATURED MATCH</Text>
              <View style={styles.featuredMainRow}>
                <View style={[styles.featuredTeamRow, styles.featuredTeamRowHome]}>
                  {featuredMatch.homeTeamLogo ? (
                    <Image
                      source={{ uri: featuredMatch.homeTeamLogo }}
                      style={styles.featuredCrest}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.featuredCrest, styles.crestPlaceholder]} />
                  )}
                  <FeaturedTeamName
                    name={featuredMatch.homeTeam}
                    align="left"
                    compact={compactHero}
                    slotWidth={featuredTeamSlotWidth}
                  />
                </View>
                <View
                  style={[
                    styles.vsBubbleDark,
                    compactHero && styles.vsBubbleCompact,
                    styles.vsBubbleAlign,
                  ]}
                >
                  <Text style={styles.vsDark}>VS</Text>
                </View>
                <View style={[styles.featuredTeamRow, styles.featuredTeamRowAway]}>
                  <FeaturedTeamName
                    name={featuredMatch.awayTeam}
                    align="right"
                    compact={compactHero}
                    slotWidth={featuredTeamSlotWidth}
                  />
                  {featuredMatch.awayTeamLogo ? (
                    <Image
                      source={{ uri: featuredMatch.awayTeamLogo }}
                      style={styles.featuredCrest}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.featuredCrest, styles.crestPlaceholder]} />
                  )}
                </View>
              </View>
              <View style={styles.featuredMetaRow}>
                <CalendarDays size={14} color="#FFFFFF" />
                <Text style={styles.featuredMeta}>{timeLine}</Text>
                <View style={styles.metaDivider} />
                <MapPin size={14} color="#FFFFFF" />
                <Text style={styles.featuredMeta} numberOfLines={1}>
                  {venueLine}
                </Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  heroTopActions: {
    position: 'absolute',
    right: 20,
    top: 0,
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: 'rgba(8,30,14,0.42)',
    borderColor: 'rgba(21,128,61,0.55)',
  },
  heroContent: {
    flex: 1,
    minHeight: 0,
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: HERO_FEATURED_CARD_BOTTOM_INSET_PX,
  },
  heroArtSpacer: {
    flexGrow: 1,
    width: '100%',
  },
  heroBottomStack: {
    marginBottom: FOOTBALL_HERO_BOTTOM_STACK_LIFT_PX,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  clubAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  clubLogo: { width: 24, height: 24 },
  clubLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  addClub: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(18,24,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  myClubsText: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  featuredMatch: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(10,18,22,0.32)',
  },
  featuredLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  featuredMainRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
  },
  featuredTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  featuredTeamRowHome: {
    justifyContent: 'flex-start',
  },
  featuredTeamRowAway: {
    justifyContent: 'flex-end',
  },
  featuredCrest: { width: 26, height: 30, marginTop: 2 },
  crestPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
  },
  featuredTeamNameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  featuredTeamLine: {
    color: '#FFFFFF',
    fontWeight: '900',
    alignSelf: 'stretch',
  },
  vsBubbleDark: {
    width: 44,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    flexShrink: 0,
  },
  vsBubbleCompact: {
    width: 36,
    height: 30,
    marginHorizontal: 4,
  },
  vsBubbleAlign: {
    alignSelf: 'center',
  },
  vsDark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  featuredMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featuredMeta: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  metaDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
});
