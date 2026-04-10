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
  Award,
  Gauge,
  CircleDot,
  Timer,
  TrendingUp,
  BarChart3,
  Crown,
  Zap,
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

const BG = '#F4F5F7';
const CARD = '#FFFFFF';
const CARD_BORDER = '#E8EAF0';
const DIVIDER = '#ECEDF2';
const F1_RED = '#E10600';
const F1_RED_BG = '#FEF2F2';
const F1_RED_LIGHT = 'rgba(225,6,0,0.08)';
const GOLD = '#D4A017';
const GOLD_BG = '#FFFBEB';
const SILVER = '#6B7280';
const SILVER_BG = '#F3F4F6';
const BRONZE = '#B45309';
const BRONZE_BG = '#FFF7ED';
const GREEN = '#16A34A';
const GREEN_BG = '#F0FDF4';
const TXT = '#111827';
const TXT_2 = '#4B5563';
const TXT_3 = '#9CA3AF';
const TXT_4 = '#D1D5DB';
const SHADOW_COLOR = '#000';

type F1Tab = 'schedule' | 'championship' | 'constructors';

const CountdownUnit = React.memo(({ value, label }: { value: number; label: string }) => (
  <View style={s.cdUnit}>
    <Text style={s.cdValue}>{String(value).padStart(2, '0')}</Text>
    <Text style={s.cdLabel}>{label}</Text>
  </View>
));

const NextRaceHero = React.memo(({ race }: { race: F1Race }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  const seasonProg = useMemo(() => getCompletedRaces().length / F1_CALENDAR_2026.length, []);

  return (
    <Animated.View style={[s.heroCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={[F1_RED, '#B80500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroBanner}
      >
        <View style={s.heroBannerContent}>
          <View style={s.heroBadgeRow}>
            <Animated.View style={[s.liveDotOuter, { transform: [{ scale: pulseAnim }] }]}>
              <View style={s.liveDotInner} />
            </Animated.View>
            <Text style={s.heroBadgeText}>NEXT RACE</Text>
            <View style={s.heroRoundPill}>
              <Text style={s.heroRoundText}>R{race.round}/{F1_CALENDAR_2026.length}</Text>
            </View>
          </View>
          <Text style={s.heroFlag}>{race.flag}</Text>
        </View>
      </LinearGradient>

      <View style={s.heroBody}>
        <Text style={s.heroTitle}>{race.name}</Text>
        <View style={s.heroLocRow}>
          <MapPin size={12} color={TXT_3} />
          <Text style={s.heroCircuit}>{race.circuit}</Text>
        </View>

        <View style={s.cdRow}>
          <CountdownUnit value={timeLeft.d} label="DAYS" />
          <Text style={s.cdSep}>:</Text>
          <CountdownUnit value={timeLeft.h} label="HRS" />
          <Text style={s.cdSep}>:</Text>
          <CountdownUnit value={timeLeft.m} label="MIN" />
          <Text style={s.cdSep}>:</Text>
          <CountdownUnit value={timeLeft.s} label="SEC" />
        </View>

        <View style={s.heroStatsRow}>
          {[
            { icon: CircleDot, val: `${race.laps} laps`, label: 'LAPS' },
            { icon: Gauge, val: race.circuitLength, label: 'LENGTH' },
            { icon: Calendar, val: new Date(race.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), label: 'DATE' },
          ].map((st, i) => (
            <View key={i} style={s.heroStatCard}>
              <st.icon size={14} color={F1_RED} />
              <Text style={s.heroStatVal}>{st.val}</Text>
              <Text style={s.heroStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.seasonBar}>
          <View style={s.seasonBarHeader}>
            <Text style={s.seasonBarLabel}>SEASON PROGRESS</Text>
            <Text style={s.seasonBarPct}>{Math.round(seasonProg * 100)}%</Text>
          </View>
          <View style={s.seasonTrack}>
            <LinearGradient
              colors={[F1_RED, '#FF4040']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.seasonFill, { width: `${seasonProg * 100}%` as any }]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const RaceCard = React.memo(({ race, onPress }: { race: F1Race; onPress: () => void }) => {
  const done = race.status === 'completed';
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
        style={s.raceCard}
      >
        <View style={s.raceCardLeft}>
          <View style={[s.raceDateBlock, done ? s.raceDateBlockDone : s.raceDateBlockUpcoming]}>
            <Text style={[s.raceDateDay, { color: done ? GREEN : F1_RED }]}>{dayStr}</Text>
            <Text style={[s.raceDateMonth, { color: done ? GREEN : TXT_3 }]}>{monthStr}</Text>
          </View>
        </View>

        <View style={s.raceCardBody}>
          <View style={s.raceCardTopRow}>
            <Text style={s.raceCardFlag}>{race.flag}</Text>
            <Text style={s.raceCardCountry}>{race.country}</Text>
            {done && <CheckCircle2 size={14} color={GREEN} style={{ marginLeft: 'auto' as any }} />}
            {!done && daysAway !== '' && (
              <View style={s.raceUrgencyPill}>
                <Text style={s.raceUrgencyText}>{daysAway}</Text>
              </View>
            )}
          </View>
          <Text style={s.raceCardName} numberOfLines={1}>{race.name}</Text>
          <Text style={s.raceCardCircuit} numberOfLines={1}>{race.circuit}</Text>

          {done && race.podium && (
            <View style={s.racePodiumStrip}>
              {race.podium.map((name, idx) => {
                const medalColors = [GOLD, SILVER, BRONZE];
                return (
                  <View key={name} style={s.racePodiumItem}>
                    <View style={[s.racePodiumDot, { backgroundColor: medalColors[idx] }]} />
                    <Text style={s.racePodiumName} numberOfLines={1}>{name.split(' ').pop()}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <ChevronRight size={16} color={TXT_4} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const ChampLeaderBanner = React.memo(({ driver }: { driver: F1Driver }) => (
  <View style={s.leaderBanner}>
    <View style={[s.leaderAccent, { backgroundColor: driver.teamColor }]} />
    <View style={s.leaderContent}>
      <View style={s.leaderTopRow}>
        <Crown size={14} color={GOLD} />
        <Text style={s.leaderLabel}>CHAMPIONSHIP LEADER</Text>
      </View>
      <View style={s.leaderMainRow}>
        <View style={[s.leaderAvatarWrap, { borderColor: driver.teamColor }]}>
          {driver.photo ? (
            <Image
              source={{ uri: driver.photo }}
              style={s.leaderAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[s.leaderAvatarFallback, { backgroundColor: driver.teamColor + '15' }]}>
              <Text style={[s.leaderAvatarNum, { color: driver.teamColor }]}>{driver.number}</Text>
            </View>
          )}
        </View>
        <View style={s.leaderInfo}>
          <Text style={s.leaderName}>{driver.name}</Text>
          <View style={s.leaderTeamRow}>
            <View style={[s.leaderTeamDot, { backgroundColor: driver.teamColor }]} />
            <Text style={s.leaderTeamName}>{driver.team}</Text>
          </View>
        </View>
        <View style={s.leaderPtsWrap}>
          <Text style={[s.leaderPtsNum, { color: driver.teamColor }]}>{driver.points}</Text>
          <Text style={s.leaderPtsUnit}>PTS</Text>
        </View>
      </View>
    </View>
  </View>
));

const PodiumVisual = React.memo(({ drivers }: { drivers: F1Driver[] }) => {
  if (drivers.length < 3) return null;
  const podiumOrder = [drivers[1], drivers[0], drivers[2]];
  const heights = [68, 92, 52];
  const medals = [SILVER, GOLD, BRONZE];
  const medalBgs = [SILVER_BG, GOLD_BG, BRONZE_BG];
  const avatarSizes = [40, 52, 36];

  return (
    <View style={s.podiumContainer}>
      {podiumOrder.map((d, i) => (
        <View key={d.id} style={s.podiumCol}>
          <View style={[s.podiumAvatarRing, { borderColor: medals[i] }]}>
            {d.photo ? (
              <Image
                source={{ uri: d.photo }}
                style={{ width: avatarSizes[i], height: avatarSizes[i], borderRadius: avatarSizes[i] / 2 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={{
                width: avatarSizes[i], height: avatarSizes[i], borderRadius: avatarSizes[i] / 2,
                backgroundColor: d.teamColor + '15', justifyContent: 'center' as const, alignItems: 'center' as const,
              }}>
                <Text style={{ color: d.teamColor, fontWeight: '900' as const, fontSize: avatarSizes[i] * 0.35 }}>{d.number}</Text>
              </View>
            )}
          </View>
          <Text style={s.podiumDriverLast} numberOfLines={1}>{d.name.split(' ').pop()}</Text>
          <Text style={s.podiumDriverPts}>{d.points} pts</Text>
          <View style={[s.podiumPillar, { height: heights[i], backgroundColor: medalBgs[i], borderColor: medals[i] + '30' }]}>
            <Text style={[s.podiumPos, { color: medals[i] }]}>{[2, 1, 3][i]}</Text>
            {d.wins > 0 && (
              <View style={s.podiumWinBadge}>
                <Trophy size={9} color={GOLD} />
                <Text style={s.podiumWinNum}>{d.wins}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
});

const DriverStandingRow = React.memo(({ driver, pos, maxPts }: { driver: F1Driver; pos: number; maxPts: number }) => {
  const barPct = maxPts > 0 ? (driver.points / maxPts) * 100 : 0;

  return (
    <View style={s.dRow}>
      <Text style={s.dPos}>{pos}</Text>
      <View style={[s.dAvatarWrap, { borderColor: driver.teamColor }]}>
        {driver.photo ? (
          <Image
            source={{ uri: driver.photo }}
            style={{ width: 34, height: 34, borderRadius: 17 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: driver.teamColor + '12', justifyContent: 'center' as const, alignItems: 'center' as const }}>
            <Text style={{ color: driver.teamColor, fontWeight: '800' as const, fontSize: 13 }}>{driver.number}</Text>
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
  );
});

const ConstructorRow = React.memo(({ team, pos, maxPts }: {
  team: { name: string; color: string; points: number; drivers: string[]; logo?: string };
  pos: number;
  maxPts: number;
}) => {
  const barPct = maxPts > 0 ? (team.points / maxPts) * 100 : 0;
  const isTop3 = pos <= 3;
  const medal = isTop3 ? [GOLD, SILVER, BRONZE][pos - 1] : undefined;
  const driverStandings = useMemo(() => getDriverStandings(), []);
  const pressAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        activeOpacity={1}
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

export default function F1Section({ isDark, insets }: F1SectionProps) {
  const [activeTab, setActiveTab] = useState<F1Tab>('schedule');
  const [scheduleFilter, setScheduleFilter] = useState<'upcoming' | 'results'>('upcoming');
  const [selectedRace, setSelectedRace] = useState<F1Race | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tabUnderlineAnim = useRef(new Animated.Value(0)).current;

  const tabs: { key: F1Tab; label: string; icon: any }[] = [
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'championship', label: 'Drivers', icon: TrendingUp },
    { key: 'constructors', label: 'Teams', icon: BarChart3 },
  ];

  const tabIdx = tabs.findIndex(t => t.key === activeTab);
  const tabW = (SCREEN_WIDTH - 32) / tabs.length;

  useEffect(() => {
    Animated.spring(tabUnderlineAnim, { toValue: tabIdx, tension: 120, friction: 16, useNativeDriver: true }).start();
  }, [tabIdx, tabUnderlineAnim]);

  const nextRace = useMemo(() => getNextRace(), []);
  const upcoming = useMemo(() => getUpcomingRaces(), []);
  const completed = useMemo(() => getCompletedRaces(), []);
  const driverStandings = useMemo(() => getDriverStandings(), []);
  const ctorStandings = useMemo(() => getConstructorStandings(), []);
  const maxDPts = useMemo(() => Math.max(...driverStandings.map(d => d.points), 1), [driverStandings]);
  const maxCPts = useMemo(() => Math.max(...ctorStandings.map(t => t.points), 1), [ctorStandings]);
  const shownRaces = scheduleFilter === 'upcoming' ? upcoming : completed;

  const handleTabPress = useCallback((tab: F1Tab) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTab(tab);
  }, []);

  const handleRacePress = useCallback((race: F1Race) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRace(race);
    setShowModal(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  return (
    <View style={s.root}>

      <View style={s.tabBar}>
        <Animated.View
          style={[
            s.tabIndicator,
            {
              width: tabW - 8,
              transform: [{ translateX: Animated.add(Animated.multiply(tabUnderlineAnim, tabW), 4) }],
            },
          ]}
        />
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.6}
            >
              <Icon size={14} color={active ? F1_RED : TXT_3} strokeWidth={active ? 2.5 : 1.8} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
                activeOpacity={0.7}
              >
                {f === 'upcoming' ? <Timer size={12} color={active ? '#FFF' : TXT_3} /> : <Trophy size={12} color={active ? '#FFF' : TXT_3} />}
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {f === 'upcoming' ? `Upcoming (${upcoming.length})` : `Results (${completed.length})`}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={F1_RED} colors={[F1_RED]} />}
      >
        {activeTab === 'schedule' && (
          <>
            {scheduleFilter === 'upcoming' && nextRace && <NextRaceHero race={nextRace} />}
            {shownRaces.map(race => (
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
            {driverStandings.length > 0 && <ChampLeaderBanner driver={driverStandings[0]} />}
            {driverStandings.length >= 3 && <PodiumVisual drivers={driverStandings} />}

            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitle}>Full Standings</Text>
              <Text style={s.sectionSub}>{completed.length}/{F1_CALENDAR_2026.length} races</Text>
            </View>

            {driverStandings.slice(3).map((d, i) => (
              <DriverStandingRow key={d.id} driver={d} pos={i + 4} maxPts={maxDPts} />
            ))}
          </>
        )}

        {activeTab === 'constructors' && (
          <>
            <View style={s.sectionTitleRow}>
              <View>
                <Text style={s.sectionTitle}>Constructor Championship</Text>
                <Text style={s.sectionSub}>{completed.length}/{F1_CALENDAR_2026.length} races completed</Text>
              </View>
              <View style={s.yearBadge}>
                <Text style={s.yearBadgeText}>2026</Text>
              </View>
            </View>
            {ctorStandings.map((team, idx) => (
              <ConstructorRow key={team.name} team={team} pos={idx + 1} maxPts={maxCPts} />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedRace && (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
                  <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalClose}>
                    <X size={16} color={TXT_2} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalBody}>
                  <View style={s.modalGrid}>
                    {[
                      { label: 'Circuit', val: selectedRace.circuit, icon: MapPin },
                      { label: 'Date', val: new Date(selectedRace.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }), icon: Calendar },
                      { label: 'Laps', val: String(selectedRace.laps), icon: Flag },
                      { label: 'Length', val: selectedRace.circuitLength, icon: Gauge },
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
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabIndicator: {
    position: 'absolute' as const,
    top: 3,
    bottom: 3,
    borderRadius: 11,
    backgroundColor: F1_RED_BG,
    borderWidth: 1,
    borderColor: F1_RED + '15',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TXT_3,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: F1_RED,
    fontWeight: '700' as const,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
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
    fontWeight: '600' as const,
    color: TXT_2,
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  heroCard: {
    borderRadius: 20,
    overflow: 'hidden' as const,
    marginBottom: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: F1_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroBanner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  heroBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  liveDotOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 2,
  },
  heroRoundPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroRoundText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroFlag: {
    fontSize: 30,
  },
  heroBody: {
    padding: 18,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: TXT,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
  },
  heroCircuit: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TXT_2,
  },

  cdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  cdUnit: {
    minWidth: 62,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  cdValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: TXT,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'] as any,
  },
  cdLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cdSep: {
    fontSize: 20,
    fontWeight: '300' as const,
    color: TXT_4,
    marginTop: -8,
  },

  heroStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center' as const,
    gap: 4,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  heroStatVal: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TXT,
  },
  heroStatLabel: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: TXT_3,
    letterSpacing: 0.5,
  },

  seasonBar: {},
  seasonBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  seasonBarLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 1.5,
  },
  seasonBarPct: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
  },
  seasonTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: DIVIDER,
    overflow: 'hidden' as const,
  },
  seasonFill: {
    height: '100%' as any,
    borderRadius: 3,
  },

  raceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 12,
    marginBottom: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  raceCardLeft: {
    alignItems: 'center' as const,
  },
  raceDateBlock: {
    width: 48,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  raceDateBlockUpcoming: {
    backgroundColor: F1_RED_BG,
  },
  raceDateBlockDone: {
    backgroundColor: GREEN_BG,
  },
  raceDateDay: {
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  raceDateMonth: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  raceCardBody: {
    flex: 1,
  },
  raceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  raceCardFlag: {
    fontSize: 14,
  },
  raceCardCountry: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  raceUrgencyPill: {
    marginLeft: 'auto' as any,
    backgroundColor: F1_RED_BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  raceUrgencyText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },
  raceCardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TXT,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  raceCardCircuit: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TXT_3,
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

  leaderBanner: {
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 16,
    overflow: 'hidden' as const,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderAccent: {
    height: 4,
  },
  leaderContent: {
    padding: 16,
  },
  leaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  leaderLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: GOLD,
    letterSpacing: 1.5,
  },
  leaderMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    overflow: 'hidden' as const,
  },
  leaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  leaderAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  leaderAvatarNum: {
    fontWeight: '900' as const,
    fontSize: 18,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: TXT,
    letterSpacing: -0.4,
  },
  leaderTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  leaderTeamDot: {
    width: 10,
    height: 3,
    borderRadius: 1.5,
  },
  leaderTeamName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TXT_3,
  },
  leaderPtsWrap: {
    alignItems: 'center' as const,
  },
  leaderPtsNum: {
    fontSize: 26,
    fontWeight: '900' as const,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'] as any,
  },
  leaderPtsUnit: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 1,
    marginTop: -2,
  },

  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 10,
    gap: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center' as const,
  },
  podiumAvatarRing: {
    borderRadius: 35,
    borderWidth: 2.5,
    overflow: 'hidden' as const,
  },
  podiumDriverLast: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TXT,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  podiumDriverPts: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TXT_3,
    marginTop: 1,
    marginBottom: 6,
  },
  podiumPillar: {
    width: '100%' as any,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 6,
    gap: 3,
    overflow: 'hidden' as const,
  },
  podiumPos: {
    fontSize: 24,
    fontWeight: '900' as const,
  },
  podiumWinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  podiumWinNum: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: GOLD,
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

  dRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 10,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  dPos: {
    width: 22,
    textAlign: 'center' as const,
    fontSize: 14,
    fontWeight: '800' as const,
    color: TXT_3,
    fontVariant: ['tabular-nums'] as any,
  },
  dAvatarWrap: {
    borderRadius: 18,
    borderWidth: 1.5,
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
    fontSize: 14,
    fontWeight: '700' as const,
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
    height: 3,
    borderRadius: 1.5,
    backgroundColor: DIVIDER,
    overflow: 'hidden' as const,
    marginTop: 6,
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
    fontSize: 17,
    fontWeight: '800' as const,
    color: TXT,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  dPtsLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: TXT_3,
    letterSpacing: 0.5,
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
    backgroundColor: '#FFF',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    backgroundColor: CARD,
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
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
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
    backgroundColor: BG,
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
