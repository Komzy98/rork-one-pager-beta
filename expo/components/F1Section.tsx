import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  Modal,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import {
  Flag,
  Trophy,
  ChevronRight,
  MapPin,
  Calendar,
  CalendarDays,
  X,
  CheckCircle2,
  Gauge,
  CircleDot,
  Clock3,
  TrendingUp,
  BarChart3,
  Users,
  Radio,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  F1Race,
  F1Driver,
  F1_CALENDAR_2026,
  getNextRace,
  getDriverStandings,
  getConstructorStandings,
} from '@/constants/f1Data';
import {
  getHeroSecondaryRowStyle,
  getSportsHeroBottomCropPx,
  getSportsHeroImageStyle,
  getSportsTallHeroMinHeight,
  getHeroSportStripSlotStyle,
} from '@/constants/sportsHeroLayout';
import F1PremiumHeroInner from '@/components/F1PremiumHeroInner';
import F1LivePanel from '@/components/F1LivePanel';
import {
  F1DriverProfileModal,
  F1RaceDetailExtras,
  F1TeamProfileModal,
} from '@/components/F1EnrichmentPanels';
import { useF1Bundle } from '@/contexts/F1BundleContext';
import {
  mapApiRaceToF1Race,
  mapApiDriverStanding,
  mapApiConstructorStanding,
  formatSessionDay,
  formatSessionTime,
} from '@/utils/f1Enrichment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface F1SectionProps {
  isDark: boolean;
  insets: { top: number; bottom: number };
  edgePad: number;
  /** Sport-mode strip rendered over the hero (from Sports tab). */
  sportToggleSlot?: React.ReactNode;
}

const F1_HERO_IMAGE = require('../assets/images/f1-race-center-hero.png');

/** Race Center redesign (`F1TabRedesign.tsx`) — dark shell + brand red. */
const BG = '#050506';
const CARD = '#101113';
const CARD_2 = '#17181B';
const CARD_BORDER = 'rgba(255,255,255,0.10)';
const DIVIDER = 'rgba(255,255,255,0.10)';
const F1_RED = '#F20D18';
const F1_RED_BG = 'rgba(242,13,24,0.10)';
const F1_RED_BORDER = 'rgba(242,13,24,0.45)';
const GOLD = '#D4A017';
const GOLD_BG = 'rgba(212,160,23,0.12)';
const SILVER = '#9EA3AD';
const SILVER_BG = 'rgba(158,163,173,0.12)';
const BRONZE = '#B45309';
const BRONZE_BG = 'rgba(180,83,9,0.12)';
const GREEN = '#22C55E';
const GREEN_BG = 'rgba(34,197,94,0.12)';
const TXT = '#F6F7F9';
const TXT_2 = '#9EA3AD';
const TXT_3 = '#9EA3AD';
const TXT_4 = 'rgba(255,255,255,0.35)';
const SHADOW_COLOR = '#000';

type F1Tab = 'live' | 'schedule' | 'championship' | 'constructors';

const CountdownUnit = React.memo(({ value, label }: { value: number; label: string }) => (
  <View style={s.timeBox}>
    <Text style={s.timeValue}>{String(value).padStart(2, '0')}</Text>
    <Text style={s.timeLabel}>{label}</Text>
  </View>
));

const NextRaceHero = React.memo(({ race, totalRaces, completedCount }: { race: F1Race; totalRaces: number; completedCount: number }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const target = new Date(race.date + 'T' + race.time + ':00Z').getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [race.date, race.time]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const seasonProg = useMemo(
    () => (totalRaces > 0 ? completedCount / totalRaces : 0),
    [totalRaces, completedCount],
  );
  const dateLabel = useMemo(
    () =>
      new Date(race.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }).toUpperCase(),
    [race.date]
  );

  return (
    <Animated.View
      style={[s.featuredCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <View style={s.featuredTopRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.roundLabel}>ROUND {race.round}</Text>
          <Text style={s.raceTitleFeatured} numberOfLines={2}>
            {race.name}
          </Text>
          <Text style={s.circuitFeatured} numberOfLines={2}>
            {race.flag} {race.circuit}
          </Text>
        </View>
        <View style={s.trackBadge}>
          <Flag size={22} color={F1_RED} strokeWidth={2.2} />
        </View>
      </View>

      <View style={s.countdownRow}>
        <CountdownUnit value={timeLeft.d} label="DAYS" />
        <CountdownUnit value={timeLeft.h} label="HRS" />
        <CountdownUnit value={timeLeft.m} label="MIN" />
        <CountdownUnit value={timeLeft.s} label="SEC" />
      </View>

      <View style={s.statRowFeatured}>
        <View style={s.statBox}>
          <CircleDot size={17} color={F1_RED} />
          <Text style={s.statValueBox}>{race.laps} laps</Text>
          <Text style={s.statLabelBox}>LAPS</Text>
        </View>
        <View style={s.statBox}>
          <Gauge size={17} color={F1_RED} />
          <Text style={s.statValueBox} numberOfLines={1}>
            {race.circuitLength}
          </Text>
          <Text style={s.statLabelBox}>LENGTH</Text>
        </View>
        <View style={s.statBox}>
          <CalendarDays size={17} color={F1_RED} />
          <Text style={s.statValueBox} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text style={s.statLabelBox}>DATE</Text>
        </View>
      </View>

      <View style={s.progressRow}>
        <Text style={s.progressLabel}>SEASON PROGRESS</Text>
        <Text style={s.progressPercent}>{Math.round(seasonProg * 100)}%</Text>
      </View>
      <View style={s.progressTrack}>
        <LinearGradient
          colors={[F1_RED, '#FF4040']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.progressFill, { width: `${seasonProg * 100}%` as any }]}
        />
      </View>
    </Animated.View>
  );
});

const RaceCard = React.memo(({ race, onPress }: { race: F1Race; onPress: () => void }) => {
  const done = race.status === 'completed';
  const isLive = race.status === 'live';
  const pressAnim = useRef(new Animated.Value(1)).current;

  const dateObj = new Date(race.date);
  const dayStr = dateObj.getDate().toString();
  const monthStr = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();

  const daysAway = useMemo(() => {
    const now = new Date();
    const diff = Math.ceil((dateObj.getTime() - now.getTime()) / 86400000);
    if (diff <= 0) return '';
    if (diff === 1) return 'TOMORROW';
    if (diff <= 7) return `${diff} DAYS`;
    return '';
  }, [dateObj]);

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => Animated.spring(pressAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start()}
        activeOpacity={1}
        style={s.raceListCard}
      >
        <View style={[s.dateBlock, done && s.dateBlockDone, isLive && s.dateBlockLive]}>
          <Text style={[s.dateText, done && s.dateTextDone, isLive && s.dateTextLive]}>{dayStr}</Text>
          <Text style={s.monthText}>{monthStr}</Text>
        </View>

        <View style={s.raceListInfo}>
          <View style={s.countryMetaRow}>
            <Text style={s.countryRow} numberOfLines={1}>
              {race.flag} ROUND {race.round}
            </Text>
            {done ? <CheckCircle2 size={16} color={GREEN} strokeWidth={2.2} /> : null}
            {isLive ? (
              <View style={s.livePillSmall}>
                <Text style={s.livePillSmallText}>LIVE</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.raceListTitle} numberOfLines={1}>
            {race.name}
          </Text>
          <Text style={s.raceListCircuit} numberOfLines={1}>
            {race.circuit}
          </Text>
          {done && race.podium && (
            <View style={s.racePodiumStrip}>
              {race.podium.map((name, idx) => {
                const medalColors = [GOLD, SILVER, BRONZE];
                return (
                  <View key={name} style={s.racePodiumItem}>
                    <View style={[s.racePodiumDot, { backgroundColor: medalColors[idx] }]} />
                    <Text style={s.racePodiumName} numberOfLines={1}>
                      {name.split(' ').pop()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {!done && daysAway !== '' && (
            <View style={s.raceUrgencyPill}>
              <Text style={s.raceUrgencyText}>{daysAway}</Text>
            </View>
          )}
        </View>

        <ChevronRight size={22} color={TXT_3} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const DriverStandingRow = React.memo(({ driver, pos, maxPts, onPress }: {
  driver: F1Driver;
  pos: number;
  maxPts: number;
  onPress?: () => void;
}) => {
  const barPct = maxPts > 0 ? (driver.points / maxPts) * 100 : 0;
  const pressAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={!onPress}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressAnim, { toValue: 0.98, tension: 300, friction: 20, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start()}
      >
    <View style={s.standingCard}>
      <View style={[s.teamStripe, { backgroundColor: driver.teamColor }]} />
      <Text style={s.positionCol}>{pos}</Text>
      <View style={[s.dAvatarWrap, { borderColor: driver.teamColor }]}>
        {driver.photo ? (
          <Image
            source={{ uri: driver.photo }}
            style={{ width: 42, height: 42, borderRadius: 21 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: driver.teamColor + '18', justifyContent: 'center' as const, alignItems: 'center' as const }}>
            <Text style={{ color: driver.teamColor, fontWeight: '800' as const, fontSize: 15 }}>{driver.number}</Text>
          </View>
        )}
      </View>
      <View style={s.dInfo}>
        <View style={s.dNameRow}>
          <Text style={s.dName}>{driver.name}</Text>
          <Text style={s.dFlag}>{driver.nationalityFlag}</Text>
        </View>
        <View style={s.dTeamRow}>
          <View style={[s.dTeamDot, { backgroundColor: driver.teamColor }]} />
          <Text style={s.dTeam}>{driver.team}</Text>
        </View>
        {driver.points > 0 && (
          <View style={s.dBarTrack}>
            <View style={[s.dBarFill, { width: `${barPct}%` as any, backgroundColor: driver.teamColor }]} />
          </View>
        )}
      </View>
      <View style={s.dPtsCol}>
        <Text style={s.dPts}>{driver.points}</Text>
        <Text style={s.dPtsLabel}>PTS</Text>
      </View>
    </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const ConstructorRow = React.memo(({ team, pos, maxPts, onPress }: {
  team: { name: string; color: string; points: number; drivers: string[]; logo?: string; apiTeamId?: number };
  pos: number;
  maxPts: number;
  onPress?: () => void;
}) => {
  const barPct = maxPts > 0 ? (team.points / maxPts) * 100 : 0;
  const isTop3 = pos <= 3;
  const medal = isTop3 ? [GOLD, SILVER, BRONZE][pos - 1] : undefined;
  const driverStandings = useMemo(() => getDriverStandings(), []);
  const pressAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={!onPress}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressAnim, { toValue: 0.98, tension: 300, friction: 20, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start()}
      >
        <View style={s.ctorCard}>
          <View style={[s.ctorStripe, { backgroundColor: team.color }]} />

          <View style={s.ctorHeader}>
            {isTop3 ? (
              <View style={[s.ctorPosBadge, { backgroundColor: (medal || '') + '18' }]}>
                <Text style={[s.ctorPosNum, { color: medal }]}>{pos}</Text>
              </View>
            ) : (
              <View style={s.ctorPosPlain}>
                <Text style={s.ctorPosPlainNum}>{pos}</Text>
              </View>
            )}

            {team.logo ? (
              <View style={[s.ctorLogoWrap, { borderColor: team.color + '30' }]}>
                <Image
                  source={{ uri: team.logo }}
                  style={s.ctorLogoImg}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            ) : (
              <View style={[s.ctorLogoFallback, { backgroundColor: team.color + '12' }]}>
                <BarChart3 size={14} color={team.color} />
              </View>
            )}

            <View style={s.ctorNameCol}>
              <Text style={s.ctorName} numberOfLines={1}>{team.name}</Text>
              <View style={[s.ctorColorLine, { backgroundColor: team.color }]} />
            </View>

            <View style={s.ctorPtsBlock}>
              <Text style={[s.ctorPts, { color: team.color }]}>{team.points}</Text>
              <Text style={s.ctorPtsUnit}>PTS</Text>
            </View>
          </View>

          <View style={s.ctorDivider} />

          <View style={s.ctorDrivers}>
            {team.drivers.map((dName) => {
              const dd = driverStandings.find(d => d.name === dName);
              return (
                <View key={dName} style={s.ctorDriverChip}>
                  <View style={[s.ctorDriverDot, { backgroundColor: team.color }]} />
                  <Text style={s.ctorDriverName} numberOfLines={1}>{dName.split(' ').pop()}</Text>
                  <Text style={s.ctorDriverPts}>{dd?.points ?? 0}</Text>
                  {(dd?.wins ?? 0) > 0 && (
                    <View style={s.ctorDriverWin}>
                      <Trophy size={8} color={GOLD} />
                      <Text style={s.ctorDriverWinNum}>{dd?.wins}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {team.points > 0 && (
            <View style={s.ctorBarWrap}>
              <View style={s.ctorBarTrack}>
                <View style={[s.ctorBarFill, { width: `${barPct}%` as any, backgroundColor: team.color }]} />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function F1Section({ insets, edgePad, sportToggleSlot }: F1SectionProps) {
  const { season, live, setPollLive, refetchAll } = useF1Bundle();
  const didAutoLive = useRef(false);
  const [activeTab, setActiveTab] = useState<F1Tab>('schedule');
  const [scheduleFilter, setScheduleFilter] = useState<'upcoming' | 'results'>('upcoming');
  const [selectedRace, setSelectedRace] = useState<F1Race | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [profileDriverId, setProfileDriverId] = useState<number | null>(null);
  const [profileTeamId, setProfileTeamId] = useState<number | null>(null);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [showTeamProfile, setShowTeamProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listScrollRef = useRef<ScrollView>(null);
  const modalOpenedAt = useRef(0);

  useEffect(() => {
    setPollLive(true);
    return () => setPollLive(false);
  }, [setPollLive]);

  useEffect(() => {
    if (!didAutoLive.current && live.data?.isSessionLive) {
      didAutoLive.current = true;
      setActiveTab('live');
    }
  }, [live.data?.isSessionLive]);

  const calendar = useMemo(() => {
    if (season.data?.races?.length) {
      return season.data.races.map(mapApiRaceToF1Race);
    }
    return F1_CALENDAR_2026;
  }, [season.data?.races]);

  const completed = useMemo(
    () => calendar.filter((r) => r.status === 'completed'),
    [calendar],
  );
  const upcoming = useMemo(
    () => calendar.filter((r) => r.status === 'upcoming' || r.status === 'live'),
    [calendar],
  );

  const nextRace = useMemo(() => {
    const liveWeekend = live.data;
    if (liveWeekend?.meetingKey && liveWeekend.countryName) {
      const country = liveWeekend.countryName.toLowerCase();
      const match = calendar.find(
        (r) =>
          r.country.toLowerCase().includes(country) ||
          r.name.toLowerCase().includes(country),
      );
      if (match) return match;
    }
    return calendar.find((r) => r.status === 'upcoming' || r.status === 'live') ?? getNextRace();
  }, [calendar, live.data]);

  const driverStandings = useMemo(() => {
    if (season.data?.driverStandings?.length) {
      return season.data.driverStandings.map(mapApiDriverStanding);
    }
    return getDriverStandings();
  }, [season.data?.driverStandings]);

  const ctorStandings = useMemo(() => {
    if (season.data?.constructorStandings?.length) {
      return season.data.constructorStandings.map(mapApiConstructorStanding);
    }
    return getConstructorStandings();
  }, [season.data?.constructorStandings]);

  const sessionSubtitle = useMemo(() => {
    const liveWeekend = live.data;
    if (liveWeekend?.isSessionLive && liveWeekend.activeSession) {
      const type = liveWeekend.activeSession.sessionName || liveWeekend.activeSession.sessionType;
      const lap = liveWeekend.currentLap;
      return lap ? `${type} · Lap ${lap}` : type;
    }
    const next = liveWeekend?.nextSession ?? liveWeekend?.sessionForTiming;
    if (next && liveWeekend?.meetingKey) {
      return `Next: ${next.sessionName} · ${formatSessionDay(next.dateStart)} ${formatSessionTime(next.dateStart)}`;
    }
    return null;
  }, [live.data]);

  const { width: windowWidth } = useWindowDimensions();
  const heroMinHeight = useMemo(() => getSportsTallHeroMinHeight(windowWidth), [windowWidth]);
  const heroImageStyle = useMemo(
    () =>
      getSportsHeroImageStyle(
        windowWidth,
        getSportsHeroBottomCropPx(heroMinHeight, 0.03),
        heroMinHeight,
      ),
    [windowWidth, heroMinHeight],
  );

  const tabs: { key: F1Tab; label: string; icon: typeof CalendarDays }[] = [
    { key: 'live', label: 'Live', icon: Radio },
    { key: 'schedule', label: 'Schedule', icon: CalendarDays },
    { key: 'championship', label: 'Drivers', icon: TrendingUp },
    { key: 'constructors', label: 'Teams', icon: Users },
  ];

  const maxDPts = useMemo(() => Math.max(...driverStandings.map(d => d.points), 1), [driverStandings]);
  const maxCPts = useMemo(() => Math.max(...ctorStandings.map(t => t.points), 1), [ctorStandings]);
  const shownRaces = scheduleFilter === 'upcoming' ? upcoming : completed;

  const calendarRaces = useMemo(() => {
    if (scheduleFilter === 'upcoming' && nextRace) {
      return shownRaces.filter(r => r.id !== nextRace.id);
    }
    return shownRaces;
  }, [scheduleFilter, nextRace, shownRaces]);

  const handleTabPress = useCallback((tab: F1Tab) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTab(tab);
  }, []);

  const handleDriverProfilePress = useCallback((driverId: number) => {
    setProfileDriverId(driverId);
    setShowDriverProfile(true);
  }, []);

  const handleTeamProfilePress = useCallback((teamId: number) => {
    setProfileTeamId(teamId);
    setShowTeamProfile(true);
  }, []);

  const closeDriverProfile = useCallback(() => {
    setShowDriverProfile(false);
    setProfileDriverId(null);
  }, []);

  const closeTeamProfile = useCallback(() => {
    setShowTeamProfile(false);
    setProfileTeamId(null);
  }, []);

  const handleRacePress = useCallback((race: F1Race) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    modalOpenedAt.current = Date.now();
    setSelectedRace(race);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedRace(null);
  }, []);

  const handleModalBackdropPress = useCallback(() => {
    if (Date.now() - modalOpenedAt.current < 350) return;
    closeModal();
  }, [closeModal]);

  const handleHeroFeaturedPress = useCallback(() => {
    if (nextRace) handleRacePress(nextRace);
  }, [nextRace, handleRacePress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  return (
    <View style={s.root}>
      <ScrollView
        ref={listScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={F1_RED} colors={[F1_RED]} />}
      >
        <ImageBackground
          source={F1_HERO_IMAGE}
          style={[
            s.f1HeroRoot,
            {
              minHeight: heroMinHeight,
              paddingTop: insets.top,
              paddingBottom: 4,
            },
          ]}
          imageStyle={heroImageStyle}
        >
          <View style={[s.f1HeroForeground, s.f1HeroForegroundFill, { paddingHorizontal: edgePad }]}>
            <F1PremiumHeroInner
              featuredRace={nextRace ?? null}
              onRefresh={onRefresh}
              onFeaturedPress={handleHeroFeaturedPress}
              isSessionLive={Boolean(live.data?.isSessionLive)}
              sessionSubtitle={sessionSubtitle}
              meetingTitle={live.data?.meetingLabel ?? undefined}
            />
          </View>
        </ImageBackground>
        {sportToggleSlot ? (
          <View
            style={[s.heroSportStripOverlapSlot, getHeroSportStripSlotStyle('f1'), { paddingHorizontal: edgePad }]}
            pointerEvents="box-none"
          >
            {sportToggleSlot}
          </View>
        ) : null}

        <View style={getHeroSecondaryRowStyle(edgePad, 'f1')}>
          <View style={s.segmented}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.segment, active && s.segmentActive]}
                  onPress={() => handleTabPress(tab.key)}
                  activeOpacity={0.85}
                >
                  <Icon size={14} color={active ? F1_RED : TXT_3} strokeWidth={active ? 2.2 : 2} />
                  <Text style={[s.segmentText, active && s.segmentTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[s.scrollInner, { paddingHorizontal: edgePad }]}>
          {activeTab === 'live' && (
            <F1LivePanel
              live={live.data}
              isLoading={live.isLoading && !live.data}
              onCountdownTarget={nextRace ? `${nextRace.date}T${nextRace.time}:00Z` : null}
            />
          )}

          {activeTab === 'schedule' && (
            <View style={s.filterRow}>
              {(['upcoming', 'results'] as const).map(f => {
                const active = scheduleFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[s.filterChip, active && s.filterChipActive]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setScheduleFilter(f);
                    }}
                    activeOpacity={0.85}
                  >
                    {f === 'upcoming' ? <Clock3 size={13} color={active ? '#FFF' : TXT_3} /> : <Trophy size={13} color={active ? '#FFF' : TXT_3} />}
                    <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                      {f === 'upcoming' ? `Upcoming (${upcoming.length})` : `Results (${completed.length})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'schedule' && (
            <>
              {scheduleFilter === 'upcoming' && nextRace && (
                <NextRaceHero race={nextRace} totalRaces={calendar.length} completedCount={completed.length} />
              )}
              {((scheduleFilter === 'upcoming' && calendarRaces.length > 0) ||
                (scheduleFilter === 'results' && shownRaces.length > 0)) && (
                <View style={s.sectionHeadingRow}>
                  <Text style={s.sectionCalendarTitle}>Race Calendar</Text>
                  <TouchableOpacity
                    onPress={() => listScrollRef.current?.scrollToEnd({ animated: true })}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.75}
                  >
                    <Text style={s.viewAllLink}>View all</Text>
                  </TouchableOpacity>
                </View>
              )}
              {calendarRaces.map(race => (
                <RaceCard key={race.id} race={race} onPress={() => handleRacePress(race)} />
              ))}
              {shownRaces.length === 0 && (
                <View style={s.emptyState}>
                  <View style={s.emptyIconWrap}><Flag size={24} color={F1_RED} /></View>
                  <Text style={s.emptyTitle}>No {scheduleFilter === 'upcoming' ? 'Upcoming' : 'Completed'} Races</Text>
                  <Text style={s.emptySub}>Check back soon</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'championship' && (
            <>
              <View style={s.standingsHeader}>
                <Text style={s.sectionCalendarTitle}>Driver Standings</Text>
                <Text style={s.raceCount}>
                  {completed.length}/{calendar.length} races
                </Text>
              </View>

              {driverStandings.map((d, i) => (
                <DriverStandingRow
                  key={d.id}
                  driver={d}
                  pos={i + 1}
                  maxPts={maxDPts}
                  onPress={d.apiDriverId ? () => handleDriverProfilePress(d.apiDriverId!) : undefined}
                />
              ))}
            </>
          )}

          {activeTab === 'constructors' && (
            <>
              <View style={s.standingsHeader}>
                <Text style={s.sectionCalendarTitle}>Team Standings</Text>
                <Text style={s.raceCount}>
                  {completed.length}/{calendar.length} races
                </Text>
              </View>
              {ctorStandings.map((team, idx) => (
                <ConstructorRow
                  key={team.name}
                  team={team}
                  pos={idx + 1}
                  maxPts={maxCPts}
                  onPress={team.apiTeamId ? () => handleTeamProfilePress(team.apiTeamId!) : undefined}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={s.modalOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={handleModalBackdropPress}
          />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedRace ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={s.modalScrollContent}
              >
                <View style={s.modalTopBanner}>
                  <LinearGradient
                    colors={[F1_RED, '#B80500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={s.modalBannerContent}>
                    <Text style={{ fontSize: 40 }}>{selectedRace.flag}</Text>
                    <View style={s.modalRoundBadge}>
                      <Text style={s.modalRoundBadgeText}>ROUND {selectedRace.round}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.modalTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalRaceName}>{selectedRace.name}</Text>
                    <Text style={s.modalLocation}>{selectedRace.city}, {selectedRace.country}</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={s.modalClose}>
                    <X size={16} color={TXT_2} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalBody}>
                  {selectedRace.status === 'upcoming' || selectedRace.status === 'live' ? (
                    <View style={s.modalUpcomingBanner}>
                      <Clock3 size={14} color={F1_RED} />
                      <Text style={s.modalUpcomingText}>
                        {selectedRace.status === 'live' ? 'Session in progress' : 'Scheduled race'}
                        {' · '}
                        {new Date(selectedRace.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                        {selectedRace.time ? ` · ${selectedRace.time} UTC` : ''}
                      </Text>
                    </View>
                  ) : null}
                  <View style={s.modalGrid}>
                    {[
                      { label: 'Circuit', val: selectedRace.circuit, icon: MapPin },
                      { label: 'Date', val: new Date(selectedRace.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }), icon: Calendar },
                      { label: 'Laps', val: selectedRace.laps > 0 ? String(selectedRace.laps) : 'TBC', icon: Flag },
                      { label: 'Length', val: selectedRace.circuitLength !== '—' ? selectedRace.circuitLength : 'TBC', icon: Gauge },
                    ].map(item => (
                      <View key={item.label} style={s.modalGridItem}>
                        <View style={s.modalGridIcon}><item.icon size={14} color={F1_RED} /></View>
                        <Text style={s.modalGridLabel}>{item.label}</Text>
                        <Text style={s.modalGridVal} numberOfLines={2}>{item.val}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedRace.status === 'completed' && selectedRace.podium && (
                    <View style={s.modalPodiumSection}>
                      <Text style={s.modalPodiumTitle}>RACE PODIUM</Text>
                      {selectedRace.podium.map((name, idx) => {
                        const dd = driverStandings.find(d => d.name === name);
                        const medalColors = [GOLD, SILVER, BRONZE];
                        const positions = ['1st', '2nd', '3rd'];
                        return (
                          <View key={name} style={[s.modalPodiumRow, { borderLeftColor: medalColors[idx], borderLeftWidth: 3 }]}>
                            <View style={[s.modalPodiumAvatarWrap, { borderColor: dd?.teamColor || '#888' }]}>
                              {dd?.photo ? (
                                <Image source={{ uri: dd.photo }} style={{ width: 38, height: 38, borderRadius: 19 }} contentFit="cover" cachePolicy="memory-disk" />
                              ) : (
                                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: (dd?.teamColor || '#888') + '15', justifyContent: 'center' as const, alignItems: 'center' as const }}>
                                  <Text style={{ color: dd?.teamColor || '#888', fontWeight: '800' as const }}>{dd?.number || '?'}</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.modalPodiumName}>{name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <View style={[s.dTeamDot, { backgroundColor: dd?.teamColor || '#888' }]} />
                                <Text style={s.modalPodiumTeam}>{dd?.team || 'Unknown'}</Text>
                              </View>
                            </View>
                            <View style={[s.modalPodiumPosBadge, { backgroundColor: medalColors[idx] + '15' }]}>
                              <Text style={[s.modalPodiumPosText, { color: medalColors[idx] }]}>{positions[idx]}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <F1RaceDetailExtras
                    race={selectedRace}
                    onDriverPress={handleDriverProfilePress}
                  />
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <F1DriverProfileModal
        visible={showDriverProfile}
        driverId={profileDriverId}
        onClose={closeDriverProfile}
      />
      <F1TeamProfileModal
        visible={showTeamProfile}
        teamId={profileTeamId}
        onClose={closeTeamProfile}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  f1HeroRoot: {
    overflow: 'hidden' as const,
    backgroundColor: BG,
    justifyContent: 'flex-start' as const,
  },
  f1HeroForeground: {
    width: '100%',
    position: 'relative' as const,
    zIndex: 1,
  },
  f1HeroForegroundFill: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  heroSportStripOverlapSlot: {},

  scrollInner: {
    paddingHorizontal: 0,
  },

  segmented: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 5,
  },
  segmentActive: {
    backgroundColor: 'rgba(242,13,24,0.10)',
    borderWidth: 1,
    borderColor: F1_RED_BORDER,
  },
  segmentText: {
    color: TXT_3,
    fontWeight: '700' as const,
    fontSize: 12,
  },
  segmentTextActive: {
    color: F1_RED,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  filterChipActive: {
    backgroundColor: F1_RED,
    borderColor: F1_RED,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TXT_3,
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  featuredCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 20,
    shadowColor: F1_RED,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start' as const,
  },
  roundLabel: {
    color: F1_RED,
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
  raceTitleFeatured: {
    color: TXT,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900' as const,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  circuitFeatured: {
    color: TXT_3,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600' as const,
  },
  trackBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: F1_RED_BG,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  countdownRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 22,
  },
  timeBox: {
    flex: 1,
    height: 74,
    borderRadius: 16,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timeValue: {
    color: TXT,
    fontSize: 30,
    fontWeight: '900' as const,
    fontVariant: ['tabular-nums'] as any,
  },
  timeLabel: {
    color: TXT_3,
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 2,
    marginTop: 4,
  },
  statRowFeatured: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    minHeight: 86,
    borderRadius: 16,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  statValueBox: {
    color: TXT,
    fontSize: 14,
    fontWeight: '900' as const,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  statLabelBox: {
    color: TXT_3,
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 1.5,
    marginTop: 5,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  progressLabel: {
    color: TXT_3,
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 3,
  },
  progressPercent: {
    color: F1_RED,
    fontSize: 14,
    fontWeight: '900' as const,
  },
  progressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginTop: 10,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as any,
    borderRadius: 99,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCalendarTitle: {
    color: TXT,
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  viewAllLink: {
    color: F1_RED,
    fontSize: 13,
    fontWeight: '900' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  standingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  raceCount: {
    color: TXT_3,
    fontSize: 15,
    fontWeight: '800' as const,
  },

  raceListCard: {
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  dateBlock: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: F1_RED_BG,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dateBlockDone: {
    backgroundColor: GREEN_BG,
  },
  dateBlockLive: {
    backgroundColor: F1_RED_BG,
  },
  dateText: {
    color: F1_RED,
    fontSize: 26,
    fontWeight: '900' as const,
  },
  dateTextDone: {
    color: GREEN,
  },
  dateTextLive: {
    color: F1_RED,
  },
  livePillSmall: {
    backgroundColor: F1_RED_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  livePillSmallText: {
    color: F1_RED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  monthText: {
    color: TXT_3,
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 2,
  },
  raceListInfo: {
    flex: 1,
    minWidth: 0,
  },
  countryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countryRow: {
    flex: 1,
    color: TXT_3,
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 1.5,
  },
  raceListTitle: {
    color: TXT,
    fontSize: 17,
    fontWeight: '900' as const,
    marginTop: 4,
  },
  raceListCircuit: {
    color: TXT_3,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  raceUrgencyPill: {
    alignSelf: 'flex-start' as const,
    marginTop: 8,
    backgroundColor: F1_RED_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  raceUrgencyText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },
  racePodiumStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
  },
  racePodiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  racePodiumDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  racePodiumName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TXT_2,
  },

  standingCard: {
    minHeight: 78,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 10,
    padding: 12,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  teamStripe: {
    position: 'absolute' as const,
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 99,
  },
  positionCol: {
    color: TXT_3,
    width: 28,
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: '900' as const,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: TXT,
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TXT_3,
    marginTop: 2,
  },
  yearBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: F1_RED_BG,
    borderWidth: 1,
    borderColor: F1_RED + '15',
  },
  yearBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },

  dAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    overflow: 'hidden' as const,
  },
  dInfo: {
    flex: 1,
  },
  dNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dName: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: TXT,
    letterSpacing: -0.2,
  },
  dFlag: {
    fontSize: 13,
  },
  dTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dTeamDot: {
    width: 8,
    height: 3,
    borderRadius: 1.5,
  },
  dTeam: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TXT_3,
  },
  dBarTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden' as const,
    marginTop: 9,
    width: '88%' as any,
  },
  dBarFill: {
    height: '100%' as any,
    borderRadius: 1.5,
  },
  dPtsCol: {
    alignItems: 'center' as const,
    minWidth: 40,
  },
  dPts: {
    fontSize: 25,
    fontWeight: '900' as const,
    color: TXT,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  dPtsLabel: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: TXT_3,
    letterSpacing: 1.5,
  },

  ctorCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD,
    overflow: 'hidden' as const,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  ctorStripe: {
    height: 3,
  },
  ctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  ctorPosBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ctorPosNum: {
    fontSize: 14,
    fontWeight: '900' as const,
  },
  ctorPosPlain: {
    width: 28,
    alignItems: 'center' as const,
  },
  ctorPosPlainNum: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TXT_3,
  },
  ctorLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: CARD_2,
  },
  ctorLogoImg: {
    width: 28,
    height: 28,
  },
  ctorLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ctorNameCol: {
    flex: 1,
    gap: 5,
  },
  ctorName: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: TXT,
    letterSpacing: -0.3,
  },
  ctorColorLine: {
    height: 3,
    borderRadius: 1.5,
    maxWidth: 60,
  },
  ctorPtsBlock: {
    alignItems: 'flex-end' as const,
  },
  ctorPts: {
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as any,
  },
  ctorPtsUnit: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 1,
    marginTop: -1,
  },
  ctorDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    backgroundColor: DIVIDER,
  },
  ctorDrivers: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  ctorDriverChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: BG,
  },
  ctorDriverDot: {
    width: 4,
    height: 12,
    borderRadius: 2,
  },
  ctorDriverName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700' as const,
    color: TXT_2,
    letterSpacing: -0.1,
  },
  ctorDriverPts: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: TXT_3,
  },
  ctorDriverWin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: GOLD_BG,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ctorDriverWinNum: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: GOLD,
  },
  ctorBarWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  ctorBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: DIVIDER,
    overflow: 'hidden' as const,
  },
  ctorBarFill: {
    height: '100%' as any,
    borderRadius: 2,
  },

  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: F1_RED_BG,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TXT,
  },
  emptySub: {
    fontSize: 13,
    color: TXT_3,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    backgroundColor: CARD,
    zIndex: 2,
    elevation: 8,
  },
  modalScrollContent: {
    paddingBottom: 28,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: TXT_4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    zIndex: 10,
  },
  modalTopBanner: {
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden' as const,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  modalBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  modalRoundBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalRoundBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 1,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  modalRaceName: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: TXT,
    letterSpacing: -0.3,
  },
  modalLocation: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TXT_3,
    marginTop: 3,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalUpcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: F1_RED_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: F1_RED_BORDER,
    padding: 12,
    marginBottom: 16,
  },
  modalUpcomingText: {
    flex: 1,
    color: TXT,
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  modalGridItem: {
    width: (SCREEN_WIDTH - 40 - 28) / 2,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_2,
    gap: 7,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalGridIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: F1_RED_BG,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalGridLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TXT_3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalGridVal: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TXT,
    letterSpacing: -0.1,
  },
  modalPodiumSection: {
    gap: 8,
  },
  modalPodiumTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: TXT_3,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalPodiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: BG,
    gap: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalPodiumAvatarWrap: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden' as const,
  },
  modalPodiumName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TXT,
  },
  modalPodiumTeam: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TXT_3,
  },
  modalPodiumPosBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalPodiumPosText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
});
