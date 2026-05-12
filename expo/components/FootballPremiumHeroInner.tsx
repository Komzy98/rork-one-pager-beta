import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Search,
  RefreshCw,
  Plus,
  CalendarDays,
  MapPin,
  Bookmark,
} from 'lucide-react-native';

const BRIGHT_GREEN = '#34D157';

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

type Props = {
  liveCount: number;
  clubLogoUris: (string | undefined)[];
  featuredMatch: FeaturedMatchFields | null;
  onSearch: () => void;
  onRefresh: () => void;
  onMyClubs: () => void;
  onFeaturedPress: () => void;
  onAddClub: () => void;
  onSavedPress?: () => void;
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
 * Premium hero copy: title, live line, “My clubs” row, and “Next featured match” Blur card.
 * Render inside the stadium ImageBackground; parent supplies gradients and image.
 */
export default function FootballPremiumHeroInner({
  liveCount,
  clubLogoUris,
  featuredMatch,
  onSearch,
  onRefresh,
  onMyClubs,
  onFeaturedPress,
  onAddClub,
  onSavedPress,
}: Props) {
  const venueLine =
    [featuredMatch?.venue, featuredMatch?.venueCity].filter(Boolean).join(', ') || 'Venue TBA';
  const timeLine = featuredMatch ? formatFeaturedTimeLine(featuredMatch) : '';

  return (
    <View style={styles.root}>
      <View style={styles.heroTopActions}>
        <TouchableOpacity style={styles.heroAction} onPress={onSearch} activeOpacity={0.85}>
          <Search size={22} color="#FFFFFF" strokeWidth={2.3} />
        </TouchableOpacity>
        {onSavedPress ? (
          <TouchableOpacity style={styles.heroAction} onPress={onSavedPress} activeOpacity={0.85}>
            <Bookmark size={21} color="#FFFFFF" strokeWidth={2.3} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.heroAction, styles.refreshAction]} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={21} color={BRIGHT_GREEN} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>Football</Text>
        <Text style={styles.heroLive}>● {liveCount} matches live</Text>
        <Text style={styles.heroSub}>Stay tuned for upcoming action</Text>

        <View style={styles.clubRow}>
          {clubLogoUris.slice(0, 4).map((uri, i) => (
            <View key={`${uri ?? 't'}-${i}`} style={styles.clubAvatar}>
              {uri ? (
                <Image source={{ uri }} style={styles.clubLogo} resizeMode="contain" />
              ) : (
                <View style={styles.clubLogoPlaceholder} />
              )}
            </View>
          ))}
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
                  <Text style={styles.featuredTeam} numberOfLines={2}>
                    {featuredMatch.homeTeam}
                  </Text>
                </View>
                <View style={styles.vsBubbleDark}>
                  <Text style={styles.vsDark}>VS</Text>
                </View>
                <View style={styles.featuredTeamRow}>
                  <Text style={[styles.featuredTeam, { textAlign: 'right' }]} numberOfLines={2}>
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
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroLive: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: BRIGHT_GREEN,
  },
  heroSub: {
    marginTop: 3,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
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
  },
  featuredTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
