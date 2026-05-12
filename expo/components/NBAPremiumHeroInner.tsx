import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Search, RefreshCw, Plus, CalendarDays, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import type { NBAGame } from '@/constants/nbaData';
import { getTeamLogo } from '@/constants/nbaData';

const NBA_ORANGE = '#F26522';

function formatFeaturedTipOff(game: NBAGame): string {
  const d = new Date(game.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dn = new Date(d);
  dn.setHours(0, 0, 0, 0);
  const time =
    game.startTime ??
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (dn.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  if (dn.getTime() === today.getTime()) return `Tonight ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
}

type Props = {
  teamAbbreviations: string[];
  featuredGame: NBAGame | null;
  onRefresh: () => void;
  onFeaturedPress: () => void;
};

/**
 * Overlays actions, crest row, and next-game card on the NBA hero image (title/art is in the asset).
 */
export default function NBAPremiumHeroInner({
  teamAbbreviations,
  featuredGame,
  onRefresh,
  onFeaturedPress,
}: Props) {
  const venueLine =
    featuredGame ? [featuredGame.arena, featuredGame.city].filter(Boolean).join(', ') : 'Arena TBA';
  const tipLine = featuredGame ? formatFeaturedTipOff(featuredGame) : '';

  return (
    <View style={styles.root}>
      <View style={styles.heroTopActions}>
        <TouchableOpacity
          style={styles.heroAction}
          onPress={() => router.push('/(tabs)/discover' as any)}
          activeOpacity={0.85}
        >
          <Search size={22} color="#FFFFFF" strokeWidth={2.3} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.heroAction, styles.refreshAction]} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={21} color={NBA_ORANGE} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroContent}>
        <View style={styles.heroArtSpacer} />

        <View style={styles.clubRow}>
          {teamAbbreviations.slice(0, 4).map((abbr, i) => (
            <View key={`${abbr}-${i}`} style={styles.clubAvatar}>
              <Image source={{ uri: getTeamLogo(abbr) }} style={styles.clubLogo} resizeMode="contain" />
            </View>
          ))}
          <TouchableOpacity style={styles.addClub} onPress={() => router.push('/(tabs)/discover' as any)} activeOpacity={0.85}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)} activeOpacity={0.8}>
          <Text style={styles.linkRow}>Browse NBA & more ›</Text>
        </TouchableOpacity>

        {featuredGame ? (
          <TouchableOpacity activeOpacity={0.9} onPress={onFeaturedPress}>
            <BlurView intensity={38} tint="dark" style={styles.featuredMatch}>
              <Text style={styles.featuredLabel}>NEXT ON THE SLATE</Text>
              <View style={styles.featuredMainRow}>
                <View style={styles.featuredTeamRow}>
                  <Image
                    source={{ uri: getTeamLogo(featuredGame.team1.abbreviation) }}
                    style={styles.featuredCrest}
                    resizeMode="contain"
                  />
                  <Text style={styles.featuredTeam} numberOfLines={2}>
                    {featuredGame.team1.name}
                  </Text>
                </View>
                <View style={styles.vsBubbleDark}>
                  <Text style={styles.vsDark}>VS</Text>
                </View>
                <View style={[styles.featuredTeamRow, styles.featuredTeamRowAway]}>
                  <Text style={[styles.featuredTeam, styles.featuredTeamAway]} numberOfLines={2}>
                    {featuredGame.team2.name}
                  </Text>
                  <Image
                    source={{ uri: getTeamLogo(featuredGame.team2.abbreviation) }}
                    style={styles.featuredCrest}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.featuredMetaRow}>
                <CalendarDays size={14} color={NBA_ORANGE} />
                <Text style={styles.featuredMetaAccent}>{tipLine}</Text>
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
    backgroundColor: 'rgba(26,18,10,0.42)',
    borderColor: 'rgba(242,101,34,0.45)',
  },
  heroContent: {
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  /** Clears baked-in “NBA CENTER” / tagline in the hero artwork. */
  heroArtSpacer: {
    height: 108,
    width: '100%',
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
  linkRow: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  featuredMatch: {
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(10,18,22,0.32)',
  },
  featuredLabel: {
    color: NBA_ORANGE,
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
    justifyContent: 'flex-start',
  },
  /** Away name + crest: align multi-line name to the right next to the crest. */
  featuredTeamRowAway: {
    justifyContent: 'flex-end',
  },
  featuredCrest: { width: 26, height: 30, flexShrink: 0 },
  featuredTeam: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    flexShrink: 1,
  },
  featuredTeamAway: {
    textAlign: 'right',
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
  featuredMetaAccent: { color: NBA_ORANGE, fontSize: 11, fontWeight: '900' },
  featuredMeta: { color: '#E8EAED', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  metaDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
});
