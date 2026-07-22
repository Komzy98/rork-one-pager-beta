import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  useWindowDimensions,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronRight,
  Gem,
  Map as MapIcon,
  MapPin,
  Sparkles,
  TrendingUp,
  Navigation,
} from 'lucide-react-native';
import WatchingMapScreen from '@/app/(root)/watching-map';
import { tmdbApi, type TMDBMovie, type TMDBTVShow } from '@/utils/tmdbApi';
import { type YounifyBrowseSection } from '@/services/younify';
import {
  tmdbPosterSizeForContainerWidth,
} from '@/utils/aroundYouImages';
import {
  AROUND_YOU_REGIONS,
  type AroundYouRegion,
  getAroundYouBundle,
  type AroundYouRailItem,
} from '@/mocks/aroundYouTab';

const BG = '#08080C';
const SURFACE = '#121218';
const ACCENT = '#E50914';
const ACCENT_SOFT = 'rgba(229, 9, 20, 0.35)';
const TEXT = '#F5F5F7';
const TEXT_MUTED = '#71717A';
const TEXT_SOFT = '#A1A1AA';

type Props = {
  onMediaPress: (item: TMDBMovie | TMDBTVShow, mediaType: 'movie' | 'tv') => void;
  onOpenFullMap?: () => void;
  /** When linked, small tiles can use provider artwork; rows keyed by TMDB id from browse + rail. */
  hasLinkedServices?: boolean;
  streamingSections?: YounifyBrowseSection[];
  /** Flat rows from `fetchYounifyContentForConnectedServices` (Connected services rail). */
  younifyContent?: unknown[];
};

const H_PAD = 20;
const CARD_RADIUS = 18;

export type AroundYouSubMode = 'trending' | 'map' | 'mood';

const SUB_MODES: { key: AroundYouSubMode; label: string; icon: typeof TrendingUp }[] = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'map', label: 'Map View', icon: MapIcon },
  { key: 'mood', label: 'Watch Mood', icon: Sparkles },
];

function LiveDot() {
  const pulse = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });

  return (
    <View style={styles.liveDotWrap}>
      <RNAnimated.View style={[styles.liveDotHalo, { opacity, transform: [{ scale }] }]} />
      <View style={styles.liveDotCore} />
    </View>
  );
}

function GenreMixBar({ segments }: { segments: { pct: number; color: string }[] }) {
  return (
    <View style={styles.mixBar}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={[styles.mixSeg, { flex: s.pct, backgroundColor: s.color }]}
        />
      ))}
    </View>
  );
}

export default function AroundYouTab({
  onMediaPress,
  onOpenFullMap,
  hasLinkedServices = false,
  streamingSections,
  younifyContent,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const [region, setRegion] = useState<AroundYouRegion>('Salford');
  const [locOpen, setLocOpen] = useState(false);
  const [subMode, setSubMode] = useState<AroundYouSubMode>('trending');
  const [freshSec, setFreshSec] = useState(12);

  const bundle = useMemo(() => getAroundYouBundle(region), [region]);
  const railPosterW = Math.round((winW - H_PAD * 2 - 48) / 3.2);
  const climbingPosterW = Math.round(railPosterW * 0.92);
  const hiddenPosterLogicalW = 108;

  useEffect(() => {
    const id = setInterval(() => {
      setFreshSec((s) => (s >= 55 ? 8 : s + 7));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const pickRegion = useCallback((r: AroundYouRegion) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setRegion(r);
    setLocOpen(false);
  }, []);

  const onPressMedia = useCallback(
    (item: TMDBMovie | TMDBTVShow, mediaType: 'movie' | 'tv') => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onMediaPress(item, mediaType);
    },
    [onMediaPress],
  );

  const donutSegments = useMemo(
    () => bundle.genreBreakdown.map((g) => ({ pct: g.pct, color: g.color })),
    [bundle.genreBreakdown],
  );

  const setMode = useCallback((m: AroundYouSubMode) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSubMode(m);
  }, []);

  const tickerRight = `Updated ${freshSec} sec ago`;

  return (
    <View style={styles.root}>
      <View style={styles.chrome}>
        <View style={styles.locRow}>
          <Pressable
            style={({ pressed }) => [styles.locChip, pressed && { opacity: 0.85 }]}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLocOpen(true);
            }}
          >
            <MapPin size={14} color={ACCENT} />
            <Text style={styles.locChipText}>{region}</Text>
            <ChevronDown size={16} color={TEXT_SOFT} />
          </Pressable>
        </View>

        <View style={styles.modeSegmentTrack}>
          {SUB_MODES.map(({ key, label, icon: Icon }) => {
            const active = subMode === key;
            return (
              <Pressable
                key={key}
                style={[styles.modeSegment, active && styles.modeSegmentActive]}
                onPress={() => setMode(key)}
              >
                <Icon size={15} color={active ? '#FFF' : TEXT_MUTED} />
                <Text style={[styles.modeSegmentLabel, active && styles.modeSegmentLabelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tickerBar}>
          <LiveDot />
          <Text style={styles.tickerMain}>
            <Text style={styles.tickerCount}>{bundle.activeViewers.toLocaleString()} </Text>
            viewers active nearby
          </Text>
          <Text style={styles.tickerMeta}>{tickerRight}</Text>
        </View>
      </View>

      {subMode === 'trending' ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader
            title="Hot right now nearby"
            subtitle="Ranked by One Pager activity near you · tonight"
          />
          <Rail
            data={bundle.hotRail}
            posterW={railPosterW}
            onPressItem={onPressMedia}
            badgeStyle="watching"
            showRank
            showProvider
          />

          <SectionHeader
            title="Climbing fast in your area"
            subtitle="Titles surging locally this evening"
          />
          <Rail
            data={bundle.climbingRail}
            posterW={climbingPosterW}
            onPressItem={onPressMedia}
            badgeStyle="percent"
          />

          <View style={styles.sectionHeadRow}>
            <Gem size={18} color="#C084FC" />
            <Text style={styles.sectionHeadTitle}>Unexpected local favourite</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.hiddenCard, pressed && { opacity: 0.92 }]}
            onPress={() => onPressMedia(bundle.hiddenGem.tmdb, 'movie')}
          >
            <HiddenGemPoster
              posterPath={bundle.hiddenGem.posterPath}
              tmdb={bundle.hiddenGem.tmdb}
              logicalWidth={hiddenPosterLogicalW}
            />
            <View style={styles.hiddenBody}>
              <Text style={styles.hiddenTitle}>{bundle.hiddenGem.title}</Text>
              <Text style={styles.hiddenText}>{bundle.hiddenGem.body}</Text>
              <Text style={styles.hiddenMetric}>{bundle.hiddenGem.watching}</Text>
            </View>
          </Pressable>

          <SectionHeader title={bundle.tasteSectionTitle} subtitle={bundle.tasteSectionSubtitle} />
          <Rail
            data={bundle.tasteRail}
            posterW={railPosterW}
            onPressItem={onPressMedia}
            badgeStyle="watching"
          />

          <View style={styles.localInsightsFooter}>
            <Text style={styles.localInsightsTitle}>Around {region}</Text>
            <Text style={styles.localInsightsLine}>
              Peak watch: <Text style={styles.localInsightsEm}>9PM – 11PM</Text>
            </Text>
            <Text style={styles.localInsightsLine}>
              Most active genre: <Text style={styles.localInsightsEm}>Crime / Thriller</Text>
            </Text>
            <Text style={styles.localInsightsLine}>
              Top age band: <Text style={styles.localInsightsEm}>25 – 34</Text> (simulated)
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : subMode === 'map' ? (
        <View style={styles.mapBody}>
          <WatchingMapScreen embedded />
          {onOpenFullMap ? (
            <Pressable
              style={({ pressed }) => [styles.mapFloatingLink, pressed && { opacity: 0.9 }]}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenFullMap();
              }}
            >
              <Navigation size={16} color="#FFF" />
              <Text style={styles.mapFloatingLinkText}>Fullscreen map</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.moodHeroKicker}>Watch Mood</Text>
          <Text style={styles.moodHeroTitle}>Tonight in {region === 'UK Wide' ? 'the UK' : region}</Text>
          <Text style={styles.moodHeroLead}>{bundle.heroMoodLine}</Text>

          <View style={styles.insightCard}>
            <Text style={styles.insightBody}>{bundle.watchMoodBody}</Text>
            <View style={styles.insightVisualRow}>
              <View style={styles.donutCol}>
                <GenreMixBar segments={donutSegments} />
                <Text style={styles.donutCaption}>Tonight mix</Text>
              </View>
              <View style={styles.genreList}>
                {bundle.genreBreakdown.slice(0, 5).map((g) => (
                  <View key={g.label} style={styles.genreRow}>
                    <View style={[styles.genreSwatch, { backgroundColor: g.color }]} />
                    <Text style={styles.genreLabel}>{g.label}</Text>
                    <Text style={styles.genrePct}>{g.pct}%</Text>
                  </View>
                ))}
              </View>
              <View style={styles.peakCol}>
                <Text style={styles.peakGraphLabel}>{bundle.peakTimeLabel}</Text>
                <View style={styles.fakeSpark}>
                  {[0.35, 0.55, 0.42, 0.7, 0.95, 0.88, 0.62].map((h, i) => (
                    <View
                      key={i}
                      style={[styles.sparkBar, { height: 36 * h, backgroundColor: i === 4 ? ACCENT : '#2A2A32' }]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.moodSectionTitle}>Genre pulse vs last night</Text>
          {bundle.moodGenrePulse.map((row) => (
            <View key={row.label} style={styles.pulseRow}>
              <Text style={styles.pulseLabel}>{row.label}</Text>
              <Text style={[styles.pulseChange, row.up ? styles.pulseUp : styles.pulseDown]}>{row.change}</Text>
            </View>
          ))}

          <SectionHeader
            title="Tonight’s local picks for you"
            subtitle="Based on watch mood + what’s surging nearby"
          />
          <Rail
            data={bundle.moodSuggestionRail}
            posterW={railPosterW}
            onPressItem={onPressMedia}
            badgeStyle="watching"
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={locOpen} transparent animationType="fade" onRequestClose={() => setLocOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLocOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Viewing pulse for</Text>
            {AROUND_YOU_REGIONS.map((r) => (
              <Pressable
                key={r}
                style={[styles.modalRow, r === region && styles.modalRowOn]}
                onPress={() => pickRegion(r)}
              >
                <Text style={[styles.modalRowText, r === region && styles.modalRowTextOn]}>{r}</Text>
                {r === region ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
      <Pressable style={styles.seeAll} onPress={() => {}}>
        <Text style={styles.seeAllText}>See all</Text>
        <ChevronRight size={16} color={ACCENT} />
      </Pressable>
    </View>
  );
}

function Rail({
  data,
  posterW,
  onPressItem,
  badgeStyle,
  showRank = false,
  showProvider = false,
}: {
  data: AroundYouRailItem[];
  onPressItem: (item: TMDBMovie | TMDBTVShow, mediaType: 'movie' | 'tv') => void;
  posterW: number;
  badgeStyle: 'watching' | 'percent';
  showRank?: boolean;
  showProvider?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
    >
      {data.map((item, index) => {
        const tmdbSize = tmdbPosterSizeForContainerWidth(posterW);
        const tmdbUri =
          tmdbApi.getImageUrl(item.tmdb.poster_path, tmdbSize) ??
          tmdbApi.getImageUrl(item.posterPath, tmdbSize);
        const rank = showRank ? index + 1 : null;
        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [{ width: posterW }, pressed && { opacity: 0.9 }]}
            onPress={() => onPressItem(item.tmdb, item.mediaType)}
          >
            <View style={[styles.railPosterWrap, { width: posterW }]}>
              {rank != null && rank <= 5 ? (
                <View style={styles.railRankBadge}>
                  <Text style={styles.railRankText}>{rank}</Text>
                </View>
              ) : null}
              {item.surgeLabel ? (
                <View style={styles.railSurgeBadge}>
                  <Text style={styles.railSurgeText}>{item.surgeLabel}</Text>
                </View>
              ) : null}
              {tmdbUri ? (
                <Image source={{ uri: tmdbUri }} style={styles.railPoster} />
              ) : (
                <View style={[styles.railPoster, styles.railPosterFallback]}>
                  <Text style={styles.railPosterFallbackText}>No poster</Text>
                </View>
              )}
              <View
                style={[
                  styles.railBadge,
                  badgeStyle === 'percent' ? styles.railBadgePct : null,
                ]}
              >
                <Text style={styles.railBadgeText}>{item.badge}</Text>
              </View>
            </View>
            <Text style={styles.railTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {showProvider && item.provider ? (
              <Text style={styles.railProvider} numberOfLines={1}>
                {item.provider}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function HiddenGemPoster({
  posterPath,
  tmdb,
  logicalWidth,
}: {
  posterPath: string;
  tmdb: TMDBMovie | TMDBTVShow;
  logicalWidth: number;
}) {
  const tmdbSize = tmdbPosterSizeForContainerWidth(logicalWidth);
  const tmdbUri =
    tmdbApi.getImageUrl(tmdb.poster_path, tmdbSize) ??
    tmdbApi.getImageUrl(posterPath, tmdbSize);
  if (tmdbUri) return <Image source={{ uri: tmdbUri }} style={styles.hiddenPoster} />;
  return (
    <View style={[styles.hiddenPoster, styles.hiddenPosterFallback]}>
      <Text style={styles.hiddenPosterFallbackText}>No poster</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    minHeight: 0,
  },
  bodyScroll: { flex: 1 },
  scrollContent: {
    paddingTop: 4,
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
  },
  chrome: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0A0A0F',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#14141A',
    borderRadius: 12,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  modeSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 9,
    minHeight: 34,
  },
  modeSegmentActive: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  modeSegmentLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  modeSegmentLabelActive: {
    color: '#FFF',
  },
  tickerBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(229,9,20,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  tickerMain: {
    flex: 1,
    color: TEXT_SOFT,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 120,
  },
  tickerCount: {
    color: TEXT,
    fontWeight: '800',
  },
  tickerMeta: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  mapBody: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  mapFloatingLink: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    left: H_PAD,
    right: H_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,20,28,0.92)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapFloatingLinkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  moodHeroKicker: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  moodHeroTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  moodHeroLead: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 18,
  },
  moodSectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 12,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pulseLabel: {
    color: TEXT_SOFT,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  pulseChange: {
    fontSize: 14,
    fontWeight: '800',
  },
  pulseUp: { color: '#4ADE80' },
  pulseDown: { color: '#FB7185' },
  localInsightsFooter: {
    marginTop: 20,
    padding: 16,
    borderRadius: CARD_RADIUS,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  localInsightsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  localInsightsLine: {
    color: TEXT_SOFT,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  localInsightsEm: {
    color: TEXT,
    fontWeight: '800',
  },
  locChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.22)',
    marginBottom: 14,
  },
  locChipText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    alignSelf: 'center',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ACCENT_SOFT,
  },
  heroGradient: {
    padding: 14,
    borderRadius: CARD_RADIUS,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  updatedTiny: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  pulseRadar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.35)',
  },
  heroEyebrow: {
    color: TEXT_SOFT,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroEyebrowFire: { color: '#FF9F0A' },
  heroBig: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  heroMood: {
    marginTop: 8,
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  carouselFrame: {
    height: 132,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  carouselBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  carouselImg: { borderRadius: 14 },
  carouselBottom: {
    padding: 10,
    paddingTop: 28,
  },
  carouselTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  carouselMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  carouselMeta: { color: TEXT_SOFT, fontSize: 12, fontWeight: '600' },
  carouselSurge: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3F3F46',
  },
  heroDotOn: {
    width: 18,
    backgroundColor: ACCENT,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statCell: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  statNum: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
  block: { marginBottom: 20 },
  blockTitle: {
    color: TEXT_SOFT,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  topRank: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '900',
    width: 22,
  },
  topTitle: { color: TEXT, fontSize: 16, fontWeight: '700' },
  topMeta: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600', marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: '88%',
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 2 },
  seeAllText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
  railContent: {
    gap: 12,
    paddingBottom: 22,
    paddingRight: 8,
  },
  railPosterWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    marginBottom: 8,
  },
  railPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  railPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A22',
  },
  railPosterFallbackText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  railPosterSlot: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  railRankBadge: {
    position: 'absolute',
    zIndex: 3,
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  railRankText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  railSurgeBadge: {
    position: 'absolute',
    zIndex: 3,
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  railSurgeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '800',
  },
  railBadge: {
    position: 'absolute',
    zIndex: 2,
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(229,9,20,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  railBadgePct: {
    backgroundColor: 'rgba(229,9,20,0.88)',
  },
  railBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  railTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  railProvider: {
    marginTop: 2,
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: SURFACE,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  insightTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  insightTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  insightBody: {
    color: TEXT_SOFT,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 14,
  },
  insightVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mixBar: {
    width: 88,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  mixSeg: {
    height: '100%',
  },
  donutCol: { alignItems: 'center', width: 88 },
  donutCaption: {
    marginTop: 6,
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600',
  },
  genreList: { flex: 1, gap: 6 },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  genreSwatch: { width: 8, height: 8, borderRadius: 4 },
  genreLabel: { flex: 1, color: TEXT_SOFT, fontSize: 12, fontWeight: '600' },
  genrePct: { color: TEXT, fontSize: 12, fontWeight: '800' },
  peakCol: { width: 72, alignItems: 'center' },
  peakGraphLabel: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  fakeSpark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 40,
  },
  sparkBar: {
    width: 7,
    borderRadius: 3,
  },
  insightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  insightCtaText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeadTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  hiddenCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hiddenPoster: {
    width: 108,
    aspectRatio: 2 / 3,
  },
  hiddenPosterFallback: {
    backgroundColor: '#1A1A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenPosterFallbackText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  hiddenPosterSlot: {
    overflow: 'hidden',
  },
  hiddenBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  hiddenTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  hiddenText: {
    color: TEXT_SOFT,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  hiddenMetric: {
    marginTop: 10,
    color: ACCENT,
    fontSize: 13,
    fontWeight: '800',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  mapLinkText: {
    flex: 1,
    color: TEXT_SOFT,
    fontSize: 14,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    zIndex: 2,
    backgroundColor: '#14141C',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalRowOn: {
    backgroundColor: 'rgba(229,9,20,0.12)',
  },
  modalRowText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  modalRowTextOn: { color: ACCENT },
  modalCheck: { color: ACCENT, fontWeight: '900' },
  liveDotWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotHalo: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ACCENT,
  },
  liveDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
});
