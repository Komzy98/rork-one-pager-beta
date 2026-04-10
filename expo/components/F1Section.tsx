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
  FlatList,
} from 'react-native';
import {
  Flag,
  Clock,
  Trophy,
  ChevronRight,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  Users,
  Zap,
  Award,
  Gauge,
  CircleDot,
  Timer,
  ChevronDown,
  Target,
  Flame,
  ArrowRight,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  F1Race,
  F1Driver,
  F1_CALENDAR_2026,
  F1_TEAMS_2026,
  getNextRace,
  getCompletedRaces,
  getUpcomingRaces,
  getDriverStandings,
  getConstructorStandings,
  getDriverPhoto,
} from '@/constants/f1Data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface F1SectionProps {
  isDark: boolean;
  insets: { top: number; bottom: number };
}

const NOIR = '#050508';
const SURFACE = '#0C0C14';
const CARD = '#101018';
const CARD_ELEVATED = '#141420';
const BORDER = 'rgba(255,255,255,0.05)';
const BORDER_SUBTLE = 'rgba(255,255,255,0.03)';
const F1_RED = '#E10600';
const F1_RED_DARK = '#B80500';
const F1_RED_GLOW = 'rgba(225,6,0,0.12)';
const ACCENT_WARM = '#FF6B35';
const GOLD = '#FFD700';
const SILVER = '#C0C0D0';
const BRONZE = '#CD7F32';
const TEXT_PRIMARY = '#F0F0F8';
const TEXT_SECONDARY = '#8888A0';
const TEXT_DIM = '#505068';
const TEXT_GHOST = '#35354A';

const DriverAvatar = React.memo(({
  photo,
  teamColor,
  size,
  number,
  bordered = false,
}: {
  photo?: string;
  teamColor: string;
  size: number;
  number: number;
  bordered?: boolean;
}) => {
  const [err, setErr] = useState(false);

  if (photo && !err) {
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden' as const,
        backgroundColor: teamColor + '10',
        borderWidth: bordered ? 2.5 : 0,
        borderColor: bordered ? teamColor : 'transparent',
      }}>
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setErr(true)}
        />
      </View>
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: teamColor + '14',
      borderWidth: bordered ? 2.5 : 1,
      borderColor: bordered ? teamColor : teamColor + '25',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }}>
      <Text style={{ color: teamColor, fontWeight: '900' as const, fontSize: size * 0.35 }}>
        {number}
      </Text>
    </View>
  );
});

const TeamBadge = React.memo(({
  logo,
  teamColor,
  size,
  name,
}: {
  logo?: string;
  teamColor: string;
  size: number;
  name: string;
}) => {
  const [err, setErr] = useState(false);

  if (logo && !err) {
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        overflow: 'hidden' as const,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: 3,
      }}>
        <Image
          source={{ uri: logo }}
          style={{ width: size - 6, height: size - 6 }}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setErr(true)}
        />
      </View>
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 3,
      backgroundColor: teamColor + '15',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }}>
      <Text style={{ color: teamColor, fontWeight: '800' as const, fontSize: size * 0.3 }}>
        {name.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
});

const HeroCountdown = React.memo(({ race }: { race: F1Race }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(race.date + 'T' + race.time + ':00Z').getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [race.date, race.time]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
      ])
    );
    glow.start();
    Animated.timing(barAnim, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    return () => glow.stop();
  }, [pulseAnim, barAnim, fadeAnim]);

  const seasonProgress = useMemo(() => {
    const completed = getCompletedRaces().length;
    return completed / F1_CALENDAR_2026.length;
  }, []);

  return (
    <Animated.View style={[s.heroWrap, { opacity: fadeAnim }]}>
      {race.circuitImage && (
        <View style={s.heroImageWrap}>
          <Image
            source={{ uri: race.circuitImage }}
            style={s.heroImage}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['rgba(5,5,8,0.1)', 'rgba(5,5,8,0.6)', 'rgba(5,5,8,0.97)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View style={s.heroContent}>
        <View style={s.heroTopBar}>
          <View style={s.lightsOutChip}>
            <Animated.View style={{ opacity: pulseAnim }}>
              <View style={s.lightsOutDot} />
            </Animated.View>
            <Text style={s.lightsOutText}>NEXT RACE</Text>
          </View>
          <View style={s.roundChip}>
            <Text style={s.roundChipText}>ROUND {race.round}</Text>
          </View>
        </View>

        <Text style={s.heroGrandPrix}>{race.name}</Text>

        <View style={s.heroLocation}>
          <Text style={s.heroFlag}>{race.flag}</Text>
          <Text style={s.heroLocationText}>{race.circuit}</Text>
        </View>

        <View style={s.timerRow}>
          {[
            { val: timeLeft.days, unit: 'D' },
            { val: timeLeft.hours, unit: 'H' },
            { val: timeLeft.mins, unit: 'M' },
            { val: timeLeft.secs, unit: 'S' },
          ].map((t, i) => (
            <React.Fragment key={t.unit}>
              {i > 0 && <Text style={s.timerColon}>:</Text>}
              <View style={s.timerBlock}>
                <Text style={s.timerNum}>{String(t.val).padStart(2, '0')}</Text>
                <Text style={s.timerLabel}>{t.unit}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={s.heroChipsRow}>
          <View style={s.heroChip}>
            <CircleDot size={10} color={TEXT_DIM} />
            <Text style={s.heroChipText}>{race.laps} Laps</Text>
          </View>
          <View style={s.heroChipDot} />
          <View style={s.heroChip}>
            <Gauge size={10} color={TEXT_DIM} />
            <Text style={s.heroChipText}>{race.circuitLength}</Text>
          </View>
          <View style={s.heroChipDot} />
          <View style={s.heroChip}>
            <Calendar size={10} color={TEXT_DIM} />
            <Text style={s.heroChipText}>
              {new Date(race.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={s.progressSection}>
          <View style={s.progressLabelRow}>
            <Text style={s.progressLabel}>SEASON</Text>
            <Text style={s.progressPct}>{Math.round(seasonProgress * 100)}%</Text>
          </View>
          <View style={s.progressTrack}>
            <Animated.View
              style={[s.progressFill, {
                width: barAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${seasonProgress * 100}%`],
                }),
              }]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const RaceListItem = React.memo(({
  race,
  onPress,
}: {
  race: F1Race;
  onPress: () => void;
}) => {
  const isCompleted = race.status === 'completed';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getDaysLabel = () => {
    const now = new Date();
    const d = new Date(race.date);
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'TMR';
    if (diff > 0) return `${diff}D`;
    return '';
  };

  const dateObj = new Date(race.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();

  return (
    <Animated.View style={[s.raceItemOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <View style={s.raceItem}>
          <View style={s.raceItemLeft}>
            <View style={[s.raceItemDateBox, isCompleted && s.raceItemDateBoxDone]}>
              <Text style={[s.raceItemDay, { color: isCompleted ? '#10B981' : F1_RED }]}>{day}</Text>
              <Text style={[s.raceItemMonth, { color: isCompleted ? '#10B98170' : F1_RED + '70' }]}>{month}</Text>
            </View>
          </View>

          <View style={s.raceItemBody}>
            <View style={s.raceItemTopRow}>
              <Text style={s.raceItemFlag}>{race.flag}</Text>
              <Text style={s.raceItemCountry}>{race.country}</Text>
              {!isCompleted && getDaysLabel() && (
                <View style={s.raceItemDaysChip}>
                  <Text style={s.raceItemDaysText}>{getDaysLabel()}</Text>
                </View>
              )}
              {isCompleted && (
                <View style={s.raceItemDoneChip}>
                  <CheckCircle2 size={9} color="#10B981" />
                </View>
              )}
            </View>
            <Text style={s.raceItemName} numberOfLines={1}>{race.name}</Text>
            <Text style={s.raceItemCircuit} numberOfLines={1}>{race.circuit}</Text>

            {isCompleted && race.podium && (
              <View style={s.raceItemPodiumRow}>
                {race.podium.map((driver, idx) => {
                  const dd = getDriverStandings().find(d => d.name === driver);
                  const medals = [GOLD, SILVER, BRONZE];
                  return (
                    <View key={driver} style={s.raceItemPodiumSlot}>
                      <View style={[s.raceItemPodiumMedal, { backgroundColor: medals[idx] + '18' }]}>
                        <Text style={[s.raceItemPodiumPos, { color: medals[idx] }]}>{idx + 1}</Text>
                      </View>
                      <Text style={s.raceItemPodiumName} numberOfLines={1}>{driver.split(' ').pop()}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={s.raceItemRight}>
            <Text style={s.raceItemRound}>R{race.round}</Text>
            <ChevronRight size={14} color={TEXT_GHOST} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const TopDriverPodium = React.memo(({ drivers }: { drivers: F1Driver[] }) => {
  if (drivers.length < 3) return null;
  const [second, first, third] = [drivers[1], drivers[0], drivers[2]];
  const podiumData = [
    { driver: second, pos: 2, color: SILVER, height: 70 },
    { driver: first, pos: 1, color: GOLD, height: 90 },
    { driver: third, pos: 3, color: BRONZE, height: 55 },
  ];

  return (
    <View style={s.podiumWrap}>
      {podiumData.map(({ driver, pos, color, height }) => (
        <View key={driver.id} style={s.podiumColumn}>
          <DriverAvatar
            photo={driver.photo}
            teamColor={driver.teamColor}
            size={pos === 1 ? 56 : 44}
            number={driver.number}
            bordered
          />
          <Text style={s.podiumDriverName} numberOfLines={1}>{driver.name.split(' ').pop()}</Text>
          <View style={[s.podiumTeamDot, { backgroundColor: driver.teamColor }]} />
          <Text style={s.podiumPts}>{driver.points}<Text style={s.podiumPtsUnit}> pts</Text></Text>
          <View style={[s.podiumBar, { height, backgroundColor: color + '20', borderTopColor: color }]}>
            <Text style={[s.podiumPosition, { color }]}>{pos}</Text>
            {driver.wins > 0 && (
              <View style={s.podiumWinsRow}>
                <Trophy size={9} color={GOLD} />
                <Text style={s.podiumWinsNum}>{driver.wins}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
});

const DriverRow = React.memo(({
  driver,
  position,
  maxPoints,
}: {
  driver: F1Driver;
  position: number;
  maxPoints: number;
}) => {
  const barW = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;

  return (
    <View style={s.driverRow}>
      <Text style={s.driverPos}>{position}</Text>
      <DriverAvatar
        photo={driver.photo}
        teamColor={driver.teamColor}
        size={36}
        number={driver.number}
      />
      <View style={s.driverInfo}>
        <View style={s.driverNameRow}>
          <Text style={s.driverName}>{driver.name}</Text>
          <Text style={s.driverFlag}>{driver.nationalityFlag}</Text>
        </View>
        <View style={s.driverTeamRow}>
          <View style={[s.teamDot, { backgroundColor: driver.teamColor }]} />
          <Text style={s.driverTeamLabel}>{driver.team}</Text>
        </View>
        {driver.points > 0 && (
          <View style={s.barTrack}>
            <LinearGradient
              colors={[driver.teamColor, driver.teamColor + '40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.barFill, { width: `${barW}%` }]}
            />
          </View>
        )}
      </View>
      <View style={s.driverPtsCol}>
        <Text style={s.driverPts}>{driver.points}</Text>
        <Text style={s.driverPtsLabel}>PTS</Text>
      </View>
    </View>
  );
});

const ConstructorCard = React.memo(({
  team,
  position,
  maxPoints,
}: {
  team: { name: string; color: string; points: number; drivers: string[]; logo?: string };
  position: number;
  maxPoints: number;
}) => {
  const barW = maxPoints > 0 ? (team.points / maxPoints) * 100 : 0;
  const isTop3 = position <= 3;
  const tierColors = [GOLD, SILVER, BRONZE];
  const tierColor = isTop3 ? tierColors[position - 1] : undefined;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[s.ctorOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start()}
      >
        <View style={[s.ctorCard, isTop3 && { borderColor: (tierColor || '') + '20' }]}>
          <View style={[s.ctorAccentStripe, { backgroundColor: team.color }]} />

          <View style={s.ctorTop}>
            <View style={s.ctorRank}>
              {isTop3 ? (
                <View style={[s.ctorRankBadge, { backgroundColor: (tierColor || '') + '15' }]}>
                  <Text style={[s.ctorRankNum, { color: tierColor }]}>{position}</Text>
                </View>
              ) : (
                <Text style={s.ctorRankPlain}>{position}</Text>
              )}
            </View>

            <TeamBadge logo={team.logo} teamColor={team.color} size={40} name={team.name} />

            <View style={s.ctorMainInfo}>
              <Text style={s.ctorName} numberOfLines={1}>{team.name}</Text>
              <View style={[s.ctorColorBar, { backgroundColor: team.color }]} />
            </View>

            <View style={s.ctorPtsBlock}>
              <Text style={[s.ctorPtsNum, { color: team.color }]}>{team.points}</Text>
              <Text style={s.ctorPtsUnit}>PTS</Text>
            </View>
          </View>

          <View style={s.ctorSeparator} />

          <View style={s.ctorBottom}>
            {team.drivers.map((dName) => {
              const dd = getDriverStandings().find(d => d.name === dName);
              return (
                <View key={dName} style={s.ctorDriverPill}>
                  <DriverAvatar
                    photo={dd?.photo}
                    teamColor={team.color}
                    size={26}
                    number={dd?.number || 0}
                  />
                  <View style={s.ctorDriverTextCol}>
                    <Text style={s.ctorDriverName} numberOfLines={1}>{dName.split(' ').pop()}</Text>
                    <Text style={s.ctorDriverPts}>{dd?.points ?? 0} pts</Text>
                  </View>
                  {(dd?.wins ?? 0) > 0 && (
                    <View style={s.ctorDriverWinBadge}>
                      <Trophy size={8} color={GOLD} />
                      <Text style={s.ctorDriverWinText}>{dd?.wins}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {team.points > 0 && (
            <View style={s.ctorBarWrap}>
              <View style={s.ctorBarTrack}>
                <LinearGradient
                  colors={[team.color, team.color + '30']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.ctorBarFill, { width: `${barW}%` }]}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

type F1Tab = 'races' | 'drivers' | 'teams';

export default function F1Section({ isDark, insets }: F1SectionProps) {
  const [activeTab, setActiveTab] = useState<F1Tab>('races');
  const [calendarFilter, setCalendarFilter] = useState<'upcoming' | 'results'>('upcoming');
  const [selectedRace, setSelectedRace] = useState<F1Race | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const tabs: { key: F1Tab; label: string; icon: any }[] = [
    { key: 'races', label: 'Races', icon: Flag },
    { key: 'drivers', label: 'Drivers', icon: Users },
    { key: 'teams', label: 'Teams', icon: Award },
  ];

  const tabIdx = tabs.findIndex(t => t.key === activeTab);
  const tabWidth = (SCREEN_WIDTH - 40) / tabs.length;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: tabIdx, tension: 100, friction: 14, useNativeDriver: true }).start();
  }, [tabIdx, slideAnim]);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  const nextRace = useMemo(() => getNextRace(), []);
  const upcomingRaces = useMemo(() => getUpcomingRaces(), []);
  const completedRaces = useMemo(() => getCompletedRaces(), []);
  const driverStandings = useMemo(() => getDriverStandings(), []);
  const constructorStandings = useMemo(() => getConstructorStandings(), []);
  const maxDriverPts = useMemo(() => Math.max(...driverStandings.map(d => d.points), 1), [driverStandings]);
  const maxCtorPts = useMemo(() => Math.max(...constructorStandings.map(t => t.points), 1), [constructorStandings]);
  const calendarRaces = calendarFilter === 'upcoming' ? upcomingRaces : completedRaces;

  const handleTabPress = useCallback((tab: F1Tab) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTab(tab);
  }, []);

  const handleRacePress = useCallback((race: F1Race) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRace(race);
    setShowModal(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: NOIR }, { opacity: fadeIn }]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoPill}>
            <LinearGradient colors={[F1_RED, F1_RED_DARK]} style={s.logoBg}>
              <Text style={s.logoText}>F1</Text>
            </LinearGradient>
          </View>
          <View>
            <Text style={s.headerTitle}>Formula 1</Text>
            <Text style={s.headerSub}>2026 World Championship</Text>
          </View>
        </View>
      </View>

      <View style={s.tabContainer}>
        <Animated.View style={[
          s.tabSlider,
          {
            width: tabWidth,
            transform: [{ translateX: Animated.multiply(slideAnim, tabWidth) }],
          },
        ]}>
          <LinearGradient colors={[F1_RED + '20', F1_RED + '08']} style={s.tabSliderInner} />
        </Animated.View>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabBtn}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.6}
            >
              <Icon size={14} color={active ? F1_RED : TEXT_DIM} strokeWidth={active ? 2.5 : 1.8} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'races' && (
        <View style={s.filterRow}>
          {(['upcoming', 'results'] as const).map(f => {
            const active = calendarFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterPill, active && s.filterPillActive]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCalendarFilter(f);
                }}
                activeOpacity={0.7}
              >
                {f === 'upcoming' ? (
                  <Calendar size={11} color={active ? F1_RED : TEXT_DIM} />
                ) : (
                  <Trophy size={11} color={active ? F1_RED : TEXT_DIM} />
                )}
                <Text style={[s.filterText, active && s.filterTextActive]}>
                  {f === 'upcoming' ? `Upcoming (${upcomingRaces.length})` : `Results (${completedRaces.length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={F1_RED} colors={[F1_RED]} />
        }
      >
        {activeTab === 'races' && (
          <>
            {calendarFilter === 'upcoming' && nextRace && (
              <HeroCountdown race={nextRace} />
            )}
            {calendarRaces.map(race => (
              <RaceListItem key={race.id} race={race} onPress={() => handleRacePress(race)} />
            ))}
            {calendarRaces.length === 0 && (
              <View style={s.emptyWrap}>
                <View style={s.emptyIcon}>
                  <Flag size={26} color={F1_RED} />
                </View>
                <Text style={s.emptyTitle}>No {calendarFilter === 'upcoming' ? 'Upcoming' : 'Completed'} Races</Text>
                <Text style={s.emptySub}>Check back soon for updates</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'drivers' && (
          <>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Driver Standings</Text>
                <Text style={s.sectionSub}>{completedRaces.length}/{F1_CALENDAR_2026.length} races completed</Text>
              </View>
              <View style={s.seasonBadge}>
                <Text style={s.seasonBadgeText}>2026</Text>
              </View>
            </View>

            {driverStandings.length >= 3 && (
              <TopDriverPodium drivers={driverStandings} />
            )}

            <View style={s.driverListHeader}>
              <Text style={s.driverListTitle}>Full Standings</Text>
            </View>

            {driverStandings.slice(3).map((driver, idx) => (
              <DriverRow key={driver.id} driver={driver} position={idx + 4} maxPoints={maxDriverPts} />
            ))}
          </>
        )}

        {activeTab === 'teams' && (
          <>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Constructor Standings</Text>
                <Text style={s.sectionSub}>{completedRaces.length}/{F1_CALENDAR_2026.length} races completed</Text>
              </View>
              <View style={s.seasonBadge}>
                <Text style={s.seasonBadgeText}>2026</Text>
              </View>
            </View>

            {constructorStandings.map((team, idx) => (
              <ConstructorCard key={team.name} team={team} position={idx + 1} maxPoints={maxCtorPts} />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            {selectedRace && (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {selectedRace.circuitImage && (
                  <View style={s.modalHero}>
                    <Image
                      source={{ uri: selectedRace.circuitImage }}
                      style={s.modalHeroImg}
                      contentFit="cover"
                      transition={400}
                      cachePolicy="memory-disk"
                    />
                    <LinearGradient
                      colors={['transparent', CARD_ELEVATED]}
                      style={s.modalHeroFade}
                    />
                  </View>
                )}

                <View style={s.modalTop}>
                  <View style={{ flex: 1 }}>
                    <View style={s.modalFlagRow}>
                      <Text style={s.modalBigFlag}>{selectedRace.flag}</Text>
                      <View style={s.modalRoundTag}>
                        <Text style={s.modalRoundTagText}>R{selectedRace.round}</Text>
                      </View>
                    </View>
                    <Text style={s.modalName}>{selectedRace.name}</Text>
                    <Text style={s.modalLocation}>{selectedRace.city}, {selectedRace.country}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalCloseBtn}>
                    <X size={16} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalBody}>
                  <View style={s.modalInfoGrid}>
                    {[
                      { label: 'Circuit', value: selectedRace.circuit, icon: MapPin },
                      { label: 'Race Date', value: new Date(selectedRace.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }), icon: Calendar },
                      { label: 'Laps', value: String(selectedRace.laps), icon: Flag },
                      { label: 'Length', value: selectedRace.circuitLength, icon: Gauge },
                    ].map(item => (
                      <View key={item.label} style={s.modalInfoItem}>
                        <View style={s.modalInfoIconWrap}>
                          <item.icon size={14} color={F1_RED} />
                        </View>
                        <Text style={s.modalInfoLabel}>{item.label}</Text>
                        <Text style={s.modalInfoVal} numberOfLines={2}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedRace.status === 'completed' && selectedRace.podium && (
                    <View style={s.modalPodiumSection}>
                      <Text style={s.modalSectionLabel}>PODIUM</Text>
                      {selectedRace.podium.map((driver, idx) => {
                        const dd = driverStandings.find(d => d.name === driver);
                        const medals = [GOLD, SILVER, BRONZE];
                        const positions = ['1st', '2nd', '3rd'];
                        return (
                          <View key={driver} style={[s.modalPodiumRow, { borderLeftColor: medals[idx], borderLeftWidth: 3 }]}>
                            <DriverAvatar
                              photo={dd?.photo}
                              teamColor={dd?.teamColor || '#888'}
                              size={40}
                              number={dd?.number || 0}
                              bordered
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={s.modalPodiumName}>{driver}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                <View style={[s.teamDot, { backgroundColor: dd?.teamColor || '#888' }]} />
                                <Text style={s.modalPodiumTeam}>{dd?.team || 'Unknown'}</Text>
                              </View>
                            </View>
                            <View style={[s.modalPodiumPosBadge, { backgroundColor: medals[idx] + '15' }]}>
                              <Text style={[s.modalPodiumPosText, { color: medals[idx] }]}>{positions[idx]}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPill: {
    shadowColor: F1_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  logoBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  tabSlider: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  tabSliderInner: {
    flex: 1,
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_DIM,
    letterSpacing: -0.1,
  },
  tabTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '700' as const,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterPillActive: {
    backgroundColor: F1_RED + '0C',
    borderColor: F1_RED + '22',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TEXT_DIM,
  },
  filterTextActive: {
    color: F1_RED,
  },

  heroWrap: {
    borderRadius: 22,
    overflow: 'hidden' as const,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: F1_RED + '12',
    backgroundColor: CARD,
  },
  heroImageWrap: {
    height: 180,
    overflow: 'hidden' as const,
  },
  heroImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  heroContent: {
    padding: 20,
    marginTop: -30,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lightsOutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: F1_RED + '14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lightsOutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: F1_RED,
  },
  lightsOutText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 1.5,
  },
  roundChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roundChipText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: TEXT_DIM,
    letterSpacing: 1,
  },
  heroGrandPrix: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  heroFlag: {
    fontSize: 16,
  },
  heroLocationText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 18,
  },
  timerBlock: {
    minWidth: 58,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: F1_RED + '08',
    borderWidth: 1,
    borderColor: F1_RED + '10',
    alignItems: 'center' as const,
  },
  timerNum: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: F1_RED,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginTop: 3,
  },
  timerColon: {
    fontSize: 20,
    fontWeight: '300' as const,
    color: TEXT_GHOST,
    marginTop: -6,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TEXT_DIM,
  },
  heroChipDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_GHOST,
  },
  progressSection: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TEXT_DIM,
    letterSpacing: 1.5,
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as any,
    borderRadius: 2,
    backgroundColor: F1_RED,
  },

  raceItemOuter: {
    marginBottom: 8,
  },
  raceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  raceItemLeft: {},
  raceItemDateBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: F1_RED + '08',
  },
  raceItemDateBoxDone: {
    backgroundColor: '#10B98108',
  },
  raceItemDay: {
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  raceItemMonth: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1,
    marginTop: 1,
  },
  raceItemBody: {
    flex: 1,
  },
  raceItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  raceItemFlag: {
    fontSize: 13,
  },
  raceItemCountry: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  raceItemDaysChip: {
    marginLeft: 'auto' as any,
    backgroundColor: F1_RED + '12',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  raceItemDaysText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },
  raceItemDoneChip: {
    marginLeft: 'auto' as any,
  },
  raceItemName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  raceItemCircuit: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_DIM,
  },
  raceItemPodiumRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    gap: 6,
  },
  raceItemPodiumSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  raceItemPodiumMedal: {
    width: 16,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  raceItemPodiumPos: {
    fontSize: 8,
    fontWeight: '900' as const,
  },
  raceItemPodiumName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },
  raceItemRight: {
    alignItems: 'center' as const,
    gap: 4,
  },
  raceItemRound: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: TEXT_GHOST,
    letterSpacing: 0.5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_DIM,
    marginTop: 3,
  },
  seasonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: F1_RED + '0C',
    borderWidth: 1,
    borderColor: F1_RED + '15',
  },
  seasonBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },

  podiumWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 10,
    gap: 6,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center' as const,
  },
  podiumDriverName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  podiumTeamDot: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
    marginBottom: 4,
  },
  podiumPts: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  podiumPtsUnit: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_DIM,
  },
  podiumBar: {
    width: '100%' as any,
    borderTopWidth: 3,
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 6,
    gap: 3,
  },
  podiumPosition: {
    fontSize: 22,
    fontWeight: '900' as const,
  },
  podiumWinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  podiumWinsNum: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: GOLD,
  },

  driverListHeader: {
    marginBottom: 10,
  },
  driverListTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  driverPos: {
    width: 22,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: '800' as const,
    color: TEXT_DIM,
    fontVariant: ['tabular-nums'] as any,
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  driverFlag: {
    fontSize: 12,
  },
  driverTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  teamDot: {
    width: 8,
    height: 3,
    borderRadius: 1.5,
  },
  driverTeamLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_DIM,
  },
  barTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden' as const,
    marginTop: 6,
  },
  barFill: {
    height: '100%' as any,
    borderRadius: 1.5,
  },
  driverPtsCol: {
    alignItems: 'center' as const,
    minWidth: 40,
  },
  driverPts: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  driverPtsLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: TEXT_DIM,
    letterSpacing: 0.5,
  },

  ctorOuter: {
    marginBottom: 10,
  },
  ctorCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    overflow: 'hidden' as const,
  },
  ctorAccentStripe: {
    height: 3,
    width: '100%' as any,
  },
  ctorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  ctorRank: {
    width: 28,
    alignItems: 'center' as const,
  },
  ctorRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ctorRankNum: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  ctorRankPlain: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_DIM,
  },
  ctorMainInfo: {
    flex: 1,
    gap: 5,
  },
  ctorName: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  ctorColorBar: {
    height: 3,
    borderRadius: 1.5,
    maxWidth: 70,
  },
  ctorPtsBlock: {
    alignItems: 'flex-end' as const,
  },
  ctorPtsNum: {
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as any,
  },
  ctorPtsUnit: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginTop: -1,
  },
  ctorSeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    backgroundColor: BORDER,
  },
  ctorBottom: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  ctorDriverPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ctorDriverTextCol: {
    flex: 1,
  },
  ctorDriverName: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
    letterSpacing: -0.1,
  },
  ctorDriverPts: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: TEXT_DIM,
    marginTop: 1,
  },
  ctorDriverWinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: GOLD + '10',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ctorDriverWinText: {
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden' as const,
  },
  ctorBarFill: {
    height: '100%' as any,
    borderRadius: 2,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: F1_RED + '0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: F1_RED + '12',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_DIM,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    backgroundColor: CARD_ELEVATED,
  },
  modalHandle: {
    width: 34,
    height: 4,
    backgroundColor: TEXT_GHOST,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    zIndex: 10,
  },
  modalHero: {
    height: 180,
    overflow: 'hidden' as const,
  },
  modalHeroImg: {
    width: '100%' as any,
    height: '100%' as any,
  },
  modalHeroFade: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalBigFlag: {
    fontSize: 36,
  },
  modalRoundTag: {
    backgroundColor: F1_RED + '14',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalRoundTagText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  modalLocation: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_DIM,
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  modalInfoItem: {
    width: (SCREEN_WIDTH - 40 - 28) / 2,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SURFACE,
    gap: 7,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalInfoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: F1_RED + '0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_DIM,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalInfoVal: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  modalPodiumSection: {
    gap: 8,
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalPodiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: SURFACE,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalPodiumName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  modalPodiumTeam: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_DIM,
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
