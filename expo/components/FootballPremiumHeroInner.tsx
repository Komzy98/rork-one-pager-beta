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

const BRIGHT_GREEN = '#34D157';

/** Same min height as `FOOTBALL_HERO_MIN_HEIGHT_PX` in `sports.tsx` — used to nudge the club strip down by 3%. */
const FOOTBALL_HERO_MIN_HEIGHT_PX = 470;
const MY_CLUBS_DROP_PX = Math.round(FOOTBALL_HERO_MIN_HEIGHT_PX * 0.03);

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
  const edgePad = useMemo(() => {
    const base = windowWidth <= 360 ? 12 : windowWidth <= 400 ? 14 : 20;
    return Math.max(base, Math.ceil(insets.left), Math.ceil(insets.right));
  }, [windowWidth, insets.left, insets.right]);
  const compactHero = windowWidth < 390;

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
          <RefreshCw size={21} color={BRIGHT_GREEN} strokeWidth={2.4} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroAction} onPress={onSearch} activeOpacity={0.85}>
          <Search size={22} color="#FFFFFF" strokeWidth={2.3} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        <View style={styles.heroArtSpacer} />

        <View style={styles.clubRow}>
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
                <View style={styles.featuredTeamRow}>
                  {featuredMatch.homeTeamLogo ? (
                    <Image
                      source={{ uri: featuredMatch.homeTeamLogo }}
                      style={styles.featuredCrest}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.featuredCrest, styles.crestPlaceholder]} />
                  )}
                  <Text
                    style={[styles.featuredTeam, compactHero && styles.featuredTeamCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {featuredMatch.homeTeam}
                  </Text>
                </View>
                <View style={[styles.vsBubbleDark, compactHero && styles.vsBubbleCompact]}>
                  <Text style={styles.vsDark}>VS</Text>
                </View>
                <View style={styles.featuredTeamRow}>
                  <Text
                    style={[styles.featuredTeam, { textAlign: 'right' }, compactHero && styles.featuredTeamCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {featuredMatch.awayTeam}
                  </Text>
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
                <CalendarDays size={14} color={BRIGHT_GREEN} />
                <Text style={styles.featuredMetaGreen}>{timeLine}</Text>
                <View style={styles.metaDivider} />
                <MapPin size={14} color="#D0D5DD" />
                <Text style={styles.featuredMeta} numberOfLines={1}>
                  {venueLine}
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
    borderColor: 'rgba(52,209,87,0.45)',
  },
  heroContent: {
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  /** Reserve space for baked-in “FOOTBALL CENTER” artwork. */
  heroArtSpacer: {
    height: 112,
    width: '100%',
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16 + MY_CLUBS_DROP_PX,
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
    color: BRIGHT_GREEN,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  featuredMainRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  featuredCrest: { width: 26, height: 30 },
  crestPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
  },
  featuredTeam: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    flexShrink: 1,
  },
  featuredTeamCompact: {
    fontSize: 15,
    lineHeight: 18,
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
  vsDark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  featuredMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featuredMetaGreen: { color: BRIGHT_GREEN, fontSize: 11, fontWeight: '900' },
  featuredMeta: { color: '#E8EAED', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  metaDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
});
