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
  Users,
  Zap,
  Award,
  Gauge,
  CircleDot,
  Timer,
  TrendingUp,
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

const CARBON = '#08080F';
const CARBON_SURFACE = '#0E0E1A';
const CARBON_CARD = '#111120';
const CARBON_ELEVATED = '#16162A';
const CARBON_BORDER = 'rgba(255,255,255,0.06)';
const F1_RED = '#E10600';
const F1_RED_GLOW = 'rgba(225,6,0,0.15)';
const GOLD = '#D4AF37';
const SILVER = '#A8A8B8';
const BRONZE = '#CD7F32';
const TEXT_PRIMARY = '#F2F2FA';
const TEXT_SECONDARY = '#7B7B95';
const TEXT_MUTED = '#4A4A68';

const DriverHeadshot = React.memo(({
  photo,
  teamColor,
  size,
  number,
  showRing = false,
}: {
  photo?: string;
  teamColor: string;
  size: number;
  number: number;
  showRing?: boolean;
}) => {
  const [imgError, setImgError] = useState(false);

  if (photo && !imgError) {
    return (
      <View style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden' as const,
          backgroundColor: teamColor + '10',
          borderWidth: showRing ? 2.5 : 1.5,
          borderColor: showRing ? teamColor : teamColor + '40',
        },
      ]}>
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: teamColor + '15',
        borderWidth: showRing ? 2.5 : 1.5,
        borderColor: showRing ? teamColor : teamColor + '30',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
    ]}>
      <Text style={{ color: teamColor, fontWeight: '900' as const, fontSize: size * 0.35 }}>
        {number}
      </Text>
    </View>
  );
});

const TeamLogo = React.memo(({
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
  const [imgError, setImgError] = useState(false);

  if (logo && !imgError) {
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
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 3,
      backgroundColor: teamColor + '18',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }}>
      <Text style={{ color: teamColor, fontWeight: '800' as const, fontSize: size * 0.3 }}>
        {name.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
});

const PremiumBadge = React.memo(({ label, color, icon: Icon }: { label: string; color: string; icon?: any }) => (
  <View style={[s.premiumBadge, { backgroundColor: color + '12', borderColor: color + '20' }]}>
    {Icon && <Icon size={9} color={color} strokeWidth={2.5} />}
    <Text style={[s.premiumBadgeText, { color }]}>{label}</Text>
  </View>
));

const F1Countdown = React.memo(({ race, isDark }: { race: F1Race; isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    heartbeat.start();

    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    return () => { pulse.stop(); heartbeat.stop(); };
  }, [glowAnim, barAnim, pulseAnim]);

  const seasonProgress = useMemo(() => {
    const completed = getCompletedRaces().length;
    const total = F1_CALENDAR_2026.length;
    return completed / total;
  }, []);

  return (
    <Animated.View style={[s.countdownOuter, { transform: [{ scale: pulseAnim }] }]}>
      {race.circuitImage && (
        <View style={s.countdownImageWrap}>
          <Image
            source={{ uri: race.circuitImage }}
            style={s.countdownImage}
            contentFit="cover"
            transition={400}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['transparent', 'rgba(8,8,15,0.7)', 'rgba(8,8,15,0.95)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      <LinearGradient
        colors={[CARBON, CARBON_SURFACE, CARBON]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.countdownGradient}
      >
        <Animated.View style={[s.countdownRedAccent, { opacity: glowAnim }]} />

        <View style={s.countdownHeader}>
          <View style={s.nextRaceBadge}>
            <Zap size={10} color={F1_RED} fill={F1_RED} />
            <Text style={s.nextRaceLabel}>LIGHTS OUT</Text>
          </View>
          <View style={s.roundPill}>
            <Text style={s.roundPillText}>R{race.round}/{F1_CALENDAR_2026.length}</Text>
          </View>
        </View>

        <Text style={s.countdownRaceName}>{race.name}</Text>

        <View style={s.countdownMeta}>
          <Text style={s.metaFlag}>{race.flag}</Text>
          <Text style={s.metaText}>{race.city}, {race.country}</Text>
          <View style={s.metaDivider} />
          <MapPin size={10} color={TEXT_MUTED} />
          <Text style={s.metaText}>{race.circuit}</Text>
        </View>

        <View style={s.countdownTimerRow}>
          {[
            { value: timeLeft.days, label: 'DAYS' },
            { value: timeLeft.hours, label: 'HRS' },
            { value: timeLeft.mins, label: 'MIN' },
            { value: timeLeft.secs, label: 'SEC' },
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && <Text style={s.timerSep}>:</Text>}
              <View style={s.timerBox}>
                <LinearGradient
                  colors={[F1_RED + '0C', F1_RED + '04']}
                  style={s.timerBoxGradient}
                >
                  <Text style={s.timerValue}>
                    {String(item.value).padStart(2, '0')}
                  </Text>
                  <Text style={s.timerUnit}>{item.label}</Text>
                </LinearGradient>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={s.countdownInfoRow}>
          <View style={s.countdownInfoChip}>
            <CircleDot size={10} color={TEXT_MUTED} />
            <Text style={s.countdownInfoText}>{race.laps} laps</Text>
          </View>
          <View style={s.countdownInfoDot} />
          <View style={s.countdownInfoChip}>
            <Gauge size={10} color={TEXT_MUTED} />
            <Text style={s.countdownInfoText}>{race.circuitLength}</Text>
          </View>
        </View>

        <View style={s.seasonProgressWrap}>
          <View style={s.seasonProgressRow}>
            <Text style={s.seasonProgressLabel}>SEASON PROGRESS</Text>
            <Text style={s.seasonProgressPct}>{Math.round(seasonProgress * 100)}%</Text>
          </View>
          <View style={s.seasonProgressTrack}>
            <Animated.View
              style={[
                s.seasonProgressFill,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${seasonProgress * 100}%`],
                  }),
                },
              ]}
            />
            <Animated.View style={[
              s.seasonProgressGlow,
              {
                left: barAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${Math.max(0, seasonProgress * 100 - 2)}%`],
                }),
                opacity: glowAnim,
              }
            ]} />
          </View>
        </View>

        <View style={s.countdownDateRow}>
          <Calendar size={11} color={F1_RED} />
          <Text style={s.countdownDate}>
            {new Date(race.date).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const F1RaceCard = React.memo(({
  race,
  isDark,
  onPress,
}: {
  race: F1Race;
  isDark: boolean;
  onPress: () => void;
}) => {
  const isCompleted = race.status === 'completed';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getDaysUntil = () => {
    const now = new Date();
    const d = new Date(race.date);
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'TOMORROW';
    if (diff > 0) return `IN ${diff}D`;
    return `${Math.abs(diff)}D AGO`;
  };

  const getFormattedDate = () => {
    const d = new Date(race.date);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    };
  };

  const dateInfo = getFormattedDate();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[s.raceCardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={s.raceCard}>
          {race.circuitImage && (
            <View style={s.raceCardImageSection}>
              <Image
                source={{ uri: race.circuitImage }}
                style={s.raceCardImage}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
              />
              <LinearGradient
                colors={['transparent', CARBON_CARD + 'CC', CARBON_CARD]}
                locations={[0, 0.6, 1]}
                style={s.raceCardImageFade}
              />
              <View style={s.raceCardImageOverlayBadges}>
                <View style={s.raceCardRoundChip}>
                  <Text style={s.raceCardRoundChipText}>R{race.round}</Text>
                </View>
                {isCompleted ? (
                  <View style={s.raceCardCompletedChip}>
                    <CheckCircle2 size={10} color="#10B981" />
                    <Text style={s.raceCardCompletedText}>COMPLETE</Text>
                  </View>
                ) : (
                  <View style={s.raceCardUpcomingChip}>
                    <Timer size={10} color={F1_RED} />
                    <Text style={s.raceCardUpcomingText}>{getDaysUntil()}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={s.raceCardInner}>
            <View style={s.raceCardDateBlock}>
              <LinearGradient
                colors={isCompleted ? ['#10B98112', '#10B98108'] : [F1_RED + '12', F1_RED + '06']}
                style={s.raceCardDateBox}
              >
                <Text style={[
                  s.raceCardDateDay,
                  { color: isCompleted ? '#10B981' : F1_RED },
                ]}>{dateInfo.day}</Text>
                <Text style={[
                  s.raceCardDateMonth,
                  { color: isCompleted ? '#10B98180' : F1_RED + '80' },
                ]}>{dateInfo.month}</Text>
              </LinearGradient>
            </View>

            <View style={s.raceCardBody}>
              <View style={s.raceCardTopRow}>
                <Text style={s.raceCardFlag}>{race.flag}</Text>
                <Text style={s.raceCardCountryLabel}>{race.country}</Text>
              </View>

              <Text style={s.raceCardTitle} numberOfLines={1}>
                {race.name}
              </Text>

              <View style={s.raceCardMetaRow}>
                <MapPin size={9} color={TEXT_MUTED} />
                <Text style={s.raceCardMetaText} numberOfLines={1}>
                  {race.circuit}
                </Text>
              </View>

              {isCompleted && race.podium ? (
                <View style={s.raceCardPodium}>
                  {race.podium.map((driver, idx) => {
                    const driverData = getDriverStandings().find(d => d.name === driver);
                    const medals = [GOLD, SILVER, BRONZE];
                    return (
                      <View key={driver} style={s.podiumSlot}>
                        <DriverHeadshot
                          photo={driverData?.photo}
                          teamColor={driverData?.teamColor || '#888'}
                          size={18}
                          number={driverData?.number || 0}
                        />
                        <View style={[s.podiumPos, { backgroundColor: medals[idx] + '18' }]}>
                          <Text style={[s.podiumPosText, { color: medals[idx] }]}>P{idx + 1}</Text>
                        </View>
                        <Text style={s.podiumName} numberOfLines={1}>
                          {driver.split(' ').pop()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={s.raceCardFooter}>
                  <View style={s.raceCardInfoChips}>
                    <View style={s.raceInfoChip}>
                      <Flag size={8} color={TEXT_MUTED} />
                      <Text style={s.raceInfoChipText}>{race.laps} laps</Text>
                    </View>
                    <View style={s.raceInfoChip}>
                      <Gauge size={8} color={TEXT_MUTED} />
                      <Text style={s.raceInfoChipText}>{race.circuitLength}</Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color={TEXT_MUTED + '60'} />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const DriverStandingRow = React.memo(({
  driver,
  position,
  isDark,
  maxPoints,
}: {
  driver: F1Driver;
  position: number;
  isDark: boolean;
  maxPoints: number;
}) => {
  const barWidth = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;
  const isTop3 = position <= 3;
  const tierColors = [GOLD, SILVER, BRONZE];
  const tierColor = isTop3 ? tierColors[position - 1] : undefined;

  return (
    <View style={[
      s.driverRow,
      isTop3 && { borderLeftWidth: 3, borderLeftColor: tierColor },
    ]}>
      <View style={s.driverPos}>
        {isTop3 ? (
          <View style={[s.posMedalBg, { backgroundColor: (tierColor || '#888') + '18' }]}>
            <Text style={[s.posMedalText, { color: tierColor }]}>{position}</Text>
          </View>
        ) : (
          <Text style={s.posText}>{position}</Text>
        )}
      </View>

      <DriverHeadshot
        photo={driver.photo}
        teamColor={driver.teamColor}
        size={40}
        number={driver.number}
        showRing={isTop3}
      />

      <View style={s.driverInfo}>
        <View style={s.driverNameRow}>
          <Text style={s.driverName}>{driver.name}</Text>
          <Text style={s.driverFlag}>{driver.nationalityFlag}</Text>
        </View>
        <View style={s.driverTeamRow}>
          <View style={[s.teamColorBar, { backgroundColor: driver.teamColor }]} />
          <Text style={s.driverTeam}>{driver.team}</Text>
        </View>
        {driver.points > 0 && (
          <View style={s.pointsBarWrap}>
            <View style={s.pointsBarTrack}>
              <LinearGradient
                colors={[driver.teamColor, driver.teamColor + '60']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.pointsBarFill, { width: `${barWidth}%` }]}
              />
            </View>
          </View>
        )}
      </View>

      <View style={s.driverStats}>
        <Text style={s.driverPoints}>{driver.points}</Text>
        <Text style={s.driverPtsLabel}>PTS</Text>
        {driver.wins > 0 && (
          <View style={s.winsRow}>
            <Trophy size={9} color={GOLD} />
            <Text style={s.winsText}>{driver.wins}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const ConstructorRow = React.memo(({
  team,
  position,
  isDark,
  maxPoints,
}: {
  team: { name: string; color: string; points: number; drivers: string[]; logo?: string };
  position: number;
  isDark: boolean;
  maxPoints: number;
}) => {
  const barWidth = maxPoints > 0 ? (team.points / maxPoints) * 100 : 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isTop3 = position <= 3;
  const tierColors = [GOLD, SILVER, BRONZE];
  const tierColor = isTop3 ? tierColors[position - 1] : undefined;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], marginBottom: 10 }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[
          s.ctorCard,
          isTop3 && { borderColor: (tierColor || '#888') + '25' },
        ]}>
          <LinearGradient
            colors={[team.color + '06', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={s.ctorTopRow}>
            <View style={s.ctorRankSection}>
              {isTop3 ? (
                <LinearGradient
                  colors={[(tierColor || '#888') + '25', (tierColor || '#888') + '10']}
                  style={s.ctorRankBadge}
                >
                  <Text style={[s.ctorRankText, { color: tierColor }]}>{position}</Text>
                </LinearGradient>
              ) : (
                <View style={s.ctorRankBadge}>
                  <Text style={[s.ctorRankText, { color: TEXT_MUTED }]}>{position}</Text>
                </View>
              )}
            </View>

            <View style={s.ctorLogoWrap}>
              <TeamLogo
                logo={team.logo}
                teamColor={team.color}
                size={44}
                name={team.name}
              />
            </View>

            <View style={s.ctorMainInfo}>
              <Text style={s.ctorName} numberOfLines={1}>{team.name}</Text>
              <View style={s.ctorColorLine}>
                <LinearGradient
                  colors={[team.color, team.color + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.ctorColorStripe}
                />
              </View>
            </View>

            <View style={s.ctorPointsBlock}>
              <Text style={[s.ctorPointsValue, { color: team.color }]}>{team.points}</Text>
              <Text style={s.ctorPointsUnit}>PTS</Text>
            </View>
          </View>

          <View style={s.ctorDivider} />

          <View style={s.ctorBottomRow}>
            <View style={s.ctorDriversSection}>
              {team.drivers.map((driver) => {
                const driverData = getDriverStandings().find(d => d.name === driver);
                const driverPts = driverData?.points ?? 0;
                return (
                  <View key={driver} style={s.ctorDriverCard}>
                    <DriverHeadshot
                      photo={driverData?.photo}
                      teamColor={team.color}
                      size={28}
                      number={driverData?.number || 0}
                    />
                    <View style={s.ctorDriverInfo}>
                      <Text style={s.ctorDriverName} numberOfLines={1}>
                        {driver.split(' ').pop()}
                      </Text>
                      <Text style={s.ctorDriverPts}>{driverPts} pts</Text>
                    </View>
                    {(driverData?.wins ?? 0) > 0 && (
                      <View style={s.ctorDriverWins}>
                        <Trophy size={8} color={GOLD} />
                        <Text style={s.ctorDriverWinsText}>{driverData?.wins}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {team.points > 0 && (
              <View style={s.ctorBarSection}>
                <View style={s.ctorBarTrack}>
                  <LinearGradient
                    colors={[team.color, team.color + '40']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[s.ctorBarFill, { width: `${barWidth}%` }]}
                  />
                </View>
                <Text style={s.ctorBarPct}>{Math.round(barWidth)}%</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

type F1Tab = 'calendar' | 'drivers' | 'constructors';

export default function F1Section({ isDark, insets }: F1SectionProps) {
  const [f1Tab, setF1Tab] = useState<F1Tab>('calendar');
  const [calendarFilter, setCalendarFilter] = useState<'upcoming' | 'results'>('upcoming');
  const [selectedRace, setSelectedRace] = useState<F1Race | null>(null);
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  const tabs: { key: F1Tab; label: string; icon: any }[] = [
    { key: 'calendar', label: 'Races', icon: Flag },
    { key: 'drivers', label: 'Drivers', icon: Users },
    { key: 'constructors', label: 'Teams', icon: Award },
  ];

  const tabIndex = tabs.findIndex(t => t.key === f1Tab);

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: tabIndex,
      tension: 90,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [tabIndex, indicatorAnim]);

  const nextRace = useMemo(() => getNextRace(), []);
  const upcomingRaces = useMemo(() => getUpcomingRaces(), []);
  const completedRaces = useMemo(() => getCompletedRaces(), []);
  const driverStandings = useMemo(() => getDriverStandings(), []);
  const constructorStandings = useMemo(() => getConstructorStandings(), []);

  const maxDriverPts = useMemo(() => Math.max(...driverStandings.map(d => d.points), 1), [driverStandings]);
  const maxConstructorPts = useMemo(() => Math.max(...constructorStandings.map(t => t.points), 1), [constructorStandings]);

  const calendarRaces = calendarFilter === 'upcoming' ? upcomingRaces : completedRaces;

  const handleTabPress = useCallback(async (tab: F1Tab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setF1Tab(tab);
  }, []);

  const handleRacePress = useCallback((race: F1Race) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedRace(race);
    setShowRaceModal(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const tabWidth = (SCREEN_WIDTH - 40 - 8) / tabs.length;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.f1Header}>
        <View style={s.f1BrandRow}>
          <View style={s.f1LogoWrap}>
            <LinearGradient
              colors={[F1_RED, '#CC0500']}
              style={s.f1LogoBg}
            >
              <Text style={s.f1LogoText}>F1</Text>
            </LinearGradient>
          </View>
          <View>
            <Text style={s.f1BrandTitle}>Formula 1</Text>
            <Text style={s.f1BrandSeason}>2026 Season</Text>
          </View>
        </View>
      </View>

      <View style={s.tabBar}>
        <View style={s.tabTrack}>
          <Animated.View style={[
            s.tabIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: Animated.multiply(indicatorAnim, tabWidth) }],
            }
          ]}>
            <LinearGradient
              colors={[F1_RED + '18', F1_RED + '08']}
              style={s.tabIndicatorInner}
            />
          </Animated.View>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = f1Tab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={s.tabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.6}
              >
                <Icon
                  size={14}
                  color={isActive ? F1_RED : TEXT_MUTED}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <Text style={[
                  s.tabLabel,
                  { color: isActive ? TEXT_PRIMARY : TEXT_MUTED },
                  isActive && { fontWeight: '700' as const },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {f1Tab === 'calendar' && (
        <View style={s.filterRow}>
          {(['upcoming', 'results'] as const).map(filter => {
            const isActive = calendarFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  s.filterChip,
                  isActive && s.filterChipActive,
                  !isActive && s.filterChipInactive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setCalendarFilter(filter);
                }}
                activeOpacity={0.7}
              >
                {filter === 'upcoming' ? (
                  <Calendar size={11} color={isActive ? F1_RED : TEXT_MUTED} />
                ) : (
                  <Trophy size={11} color={isActive ? F1_RED : TEXT_MUTED} />
                )}
                <Text style={[
                  s.filterChipText,
                  { color: isActive ? F1_RED : TEXT_MUTED },
                ]}>
                  {filter === 'upcoming' ? `Upcoming (${upcomingRaces.length})` : `Results (${completedRaces.length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={F1_RED} colors={[F1_RED]} />
        }
      >
        {f1Tab === 'calendar' && (
          <>
            {calendarFilter === 'upcoming' && nextRace && (
              <F1Countdown race={nextRace} isDark={isDark} />
            )}
            {calendarRaces.map(race => (
              <F1RaceCard
                key={race.id}
                race={race}
                isDark={isDark}
                onPress={() => handleRacePress(race)}
              />
            ))}
            {calendarRaces.length === 0 && (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Flag size={28} color={F1_RED} />
                </View>
                <Text style={s.emptyTitle}>
                  No {calendarFilter === 'upcoming' ? 'Upcoming' : 'Completed'} Races
                </Text>
                <Text style={s.emptySub}>
                  {calendarFilter === 'upcoming' ? 'The season calendar will be updated soon' : 'No race results yet'}
                </Text>
              </View>
            )}
          </>
        )}

        {f1Tab === 'drivers' && (
          <>
            <View style={s.standingsHeader}>
              <View>
                <Text style={s.standingsTitle}>Driver Championship</Text>
                <Text style={s.standingsSub}>
                  {completedRaces.length} of {F1_CALENDAR_2026.length} races completed
                </Text>
              </View>
              <View style={s.standingsSeasonBadge}>
                <Text style={s.standingsSeasonText}>2026</Text>
              </View>
            </View>

            {driverStandings.length > 0 && (
              <View style={s.topThreeSection}>
                {driverStandings.slice(0, 3).map((driver, idx) => {
                  const colors = [GOLD, SILVER, BRONZE];
                  const sizes = [64, 52, 52];
                  const posLabels = ['1st', '2nd', '3rd'];
                  return (
                    <View key={driver.id} style={[s.topDriverCard, idx === 0 && s.topDriverCardFirst]}>
                      <LinearGradient
                        colors={[colors[idx] + '12', 'transparent']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={[
                          s.topDriverGradient,
                          { borderColor: colors[idx] + '20', borderWidth: 1 },
                        ]}
                      >
                        <View style={[s.topDriverPosBadge, { backgroundColor: colors[idx] + '20' }]}>
                          <Text style={[s.topDriverPosText, { color: colors[idx] }]}>{posLabels[idx]}</Text>
                        </View>
                        <DriverHeadshot
                          photo={driver.photo}
                          teamColor={driver.teamColor}
                          size={sizes[idx]}
                          number={driver.number}
                          showRing
                        />
                        <Text style={s.topDriverName} numberOfLines={1}>
                          {driver.name.split(' ').pop()}
                        </Text>
                        <View style={[s.topDriverTeamPill, { backgroundColor: driver.teamColor + '12' }]}>
                          <View style={[s.topDriverTeamDot, { backgroundColor: driver.teamColor }]} />
                          <Text style={[s.topDriverTeamText, { color: driver.teamColor }]} numberOfLines={1}>
                            {driver.team.length > 12 ? driver.team.substring(0, 12) + '..' : driver.team}
                          </Text>
                        </View>
                        <Text style={s.topDriverPts}>
                          {driver.points}
                          <Text style={s.topDriverPtsUnit}> PTS</Text>
                        </Text>
                        {driver.wins > 0 && (
                          <View style={s.topDriverWinsRow}>
                            <Trophy size={10} color={GOLD} />
                            <Text style={s.topDriverWinsText}>{driver.wins} wins</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>
            )}

            {driverStandings.slice(3).map((driver, idx) => (
              <DriverStandingRow
                key={driver.id}
                driver={driver}
                position={idx + 4}
                isDark={isDark}
                maxPoints={maxDriverPts}
              />
            ))}
          </>
        )}

        {f1Tab === 'constructors' && (
          <>
            <View style={s.standingsHeader}>
              <View>
                <Text style={s.standingsTitle}>Constructor Championship</Text>
                <Text style={s.standingsSub}>
                  {completedRaces.length} of {F1_CALENDAR_2026.length} races completed
                </Text>
              </View>
              <View style={s.standingsSeasonBadge}>
                <Text style={s.standingsSeasonText}>2026</Text>
              </View>
            </View>
            {constructorStandings.map((team, idx) => (
              <ConstructorRow
                key={team.name}
                team={team}
                position={idx + 1}
                isDark={isDark}
                maxPoints={maxConstructorPts}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showRaceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRaceModal(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowRaceModal(false)} />
          <View style={s.modalContainer}>
            <View style={s.modalHandle} />

            {selectedRace && (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {selectedRace.circuitImage && (
                  <View style={s.modalHeroWrap}>
                    <Image
                      source={{ uri: selectedRace.circuitImage }}
                      style={s.modalHeroImage}
                      contentFit="cover"
                      transition={400}
                      cachePolicy="memory-disk"
                    />
                    <LinearGradient
                      colors={['transparent', CARBON_ELEVATED]}
                      style={s.modalHeroFade}
                    />
                  </View>
                )}

                <View style={s.modalHeader}>
                  <Text style={s.modalTitle} numberOfLines={1}>
                    {selectedRace.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRaceModal(false)}
                    style={s.modalCloseBtn}
                  >
                    <X size={16} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={{ padding: 20 }}>
                  <View style={s.modalFlagSection}>
                    <Text style={s.modalBigFlag}>{selectedRace.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalCountry}>{selectedRace.name}</Text>
                      <Text style={s.modalCity}>
                        {selectedRace.city}, {selectedRace.country} · Round {selectedRace.round}
                      </Text>
                    </View>
                  </View>

                  <View style={s.modalInfoGrid}>
                    {[
                      { label: 'Circuit', value: selectedRace.circuit, icon: MapPin },
                      { label: 'Race Date', value: new Date(selectedRace.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), icon: Calendar },
                      { label: 'Race Laps', value: String(selectedRace.laps), icon: Flag },
                      { label: 'Track Length', value: selectedRace.circuitLength, icon: Gauge },
                    ].map(item => (
                      <View key={item.label} style={s.modalInfoCard}>
                        <LinearGradient
                          colors={[F1_RED + '15', F1_RED + '05']}
                          style={s.modalInfoIconWrap}
                        >
                          <item.icon size={14} color={F1_RED} />
                        </LinearGradient>
                        <Text style={s.modalInfoLabel}>{item.label}</Text>
                        <Text style={s.modalInfoValue} numberOfLines={2}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedRace.status === 'completed' && selectedRace.podium && (
                    <View style={s.modalPodiumSection}>
                      <Text style={s.modalSectionTitle}>Podium Finishers</Text>
                      {selectedRace.podium.map((driver, idx) => {
                        const driverData = driverStandings.find(d => d.name === driver);
                        const positions = ['1st Place', '2nd Place', '3rd Place'];
                        const tierColorsArr = [GOLD, SILVER, BRONZE];
                        return (
                          <View key={driver} style={[
                            s.modalPodiumCard,
                            { borderLeftWidth: 3, borderLeftColor: tierColorsArr[idx] },
                          ]}>
                            <DriverHeadshot
                              photo={driverData?.photo}
                              teamColor={driverData?.teamColor || '#888'}
                              size={44}
                              number={driverData?.number || 0}
                              showRing
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={s.modalPodiumDriverName}>{driver}</Text>
                              <View style={s.modalPodiumTeamRow}>
                                <View style={[s.modalPodiumTeamDot, { backgroundColor: driverData?.teamColor || '#888' }]} />
                                <Text style={s.modalPodiumTeamName}>
                                  {driverData?.team || 'Unknown'} · {positions[idx]}
                                </Text>
                              </View>
                            </View>
                            <Text style={s.modalPodiumDriverFlag}>{driverData?.nationalityFlag}</Text>
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
  f1Header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  f1BrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  f1LogoWrap: {
    shadowColor: F1_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  f1LogoBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  f1LogoText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  f1BrandTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  f1BrandSeason: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginTop: 1,
  },

  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },

  tabBar: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    position: 'relative' as const,
    backgroundColor: CARBON_SURFACE,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
  },
  tabIndicator: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  tabIndicatorInner: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: F1_RED + '20',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: F1_RED + '0C',
    borderColor: F1_RED + '25',
  },
  filterChipInactive: {
    backgroundColor: CARBON_SURFACE,
    borderColor: CARBON_BORDER,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  countdownOuter: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: F1_RED + '15',
    shadowColor: F1_RED,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  countdownImageWrap: {
    height: 160,
    overflow: 'hidden' as const,
  },
  countdownImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  countdownGradient: {
    paddingVertical: 24,
    paddingHorizontal: 22,
    position: 'relative' as const,
  },
  countdownRedAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: F1_RED,
    shadowColor: F1_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nextRaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: F1_RED + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: F1_RED + '20',
  },
  nextRaceLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 1.8,
  },
  roundPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  roundPillText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: TEXT_MUTED,
    letterSpacing: 1,
  },
  countdownRaceName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  countdownMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  metaFlag: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500' as const,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_MUTED + '60',
  },
  countdownTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 20,
  },
  timerBox: {
    borderRadius: 14,
    overflow: 'hidden' as const,
    minWidth: 62,
    borderWidth: 1,
    borderColor: F1_RED + '12',
  },
  timerBoxGradient: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
  },
  timerValue: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: F1_RED,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  timerUnit: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  timerSep: {
    fontSize: 22,
    fontWeight: '300' as const,
    color: TEXT_MUTED + '60',
    marginTop: -8,
  },
  countdownInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  countdownInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownInfoText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600' as const,
  },
  countdownInfoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_MUTED + '50',
  },
  seasonProgressWrap: {
    marginBottom: 18,
  },
  seasonProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  seasonProgressLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    letterSpacing: 1.5,
  },
  seasonProgressPct: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
  },
  seasonProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  seasonProgressFill: {
    height: '100%' as any,
    backgroundColor: F1_RED,
    borderRadius: 2,
  },
  seasonProgressGlow: {
    position: 'absolute' as const,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: F1_RED,
    shadowColor: F1_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  countdownDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  countdownDate: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },

  raceCardOuter: {
    marginBottom: 12,
  },
  raceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
    backgroundColor: CARBON_CARD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden' as const,
  },
  raceCardImageSection: {
    height: 110,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  raceCardImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  raceCardImageFade: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  raceCardImageOverlayBadges: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  raceCardRoundChip: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  raceCardRoundChipText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  raceCardCompletedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  raceCardCompletedText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#10B981',
    letterSpacing: 0.8,
  },
  raceCardUpcomingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(225, 6, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: F1_RED + '30',
  },
  raceCardUpcomingText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.8,
  },
  raceCardInner: {
    flexDirection: 'row',
    padding: 14,
  },
  raceCardDateBlock: {
    marginRight: 12,
  },
  raceCardDateBox: {
    width: 50,
    height: 58,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  raceCardDateDay: {
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  raceCardDateMonth: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  raceCardBody: {
    flex: 1,
  },
  raceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  raceCardFlag: {
    fontSize: 16,
  },
  raceCardCountryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  raceCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  raceCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  raceCardMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
    flex: 1,
  },
  raceCardPodium: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARBON_BORDER,
    gap: 4,
  },
  podiumSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  podiumPos: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  podiumPosText: {
    fontSize: 8,
    fontWeight: '900' as const,
  },
  podiumName: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  raceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raceCardInfoChips: {
    flexDirection: 'row',
    gap: 6,
  },
  raceInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  raceInfoChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },

  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 4,
  },
  standingsTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  standingsSub: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  standingsSeasonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: F1_RED + '10',
    borderWidth: 1,
    borderColor: F1_RED + '18',
  },
  standingsSeasonText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 0.5,
  },

  topThreeSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  topDriverCard: {
    flex: 1,
  },
  topDriverCardFirst: {
    flex: 1,
  },
  topDriverGradient: {
    borderRadius: 18,
    padding: 12,
    alignItems: 'center' as const,
    minHeight: 185,
    justifyContent: 'center' as const,
    backgroundColor: CARBON_CARD,
  },
  topDriverPosBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  topDriverPosText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  topDriverName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    textAlign: 'center' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  topDriverTeamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  topDriverTeamDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  topDriverTeamText: {
    fontSize: 8,
    fontWeight: '600' as const,
  },
  topDriverPts: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
  },
  topDriverPtsUnit: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },
  topDriverWinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  topDriverWinsText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: GOLD,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
    backgroundColor: CARBON_CARD,
    gap: 10,
  },
  driverPos: {
    width: 28,
    alignItems: 'center' as const,
  },
  posMedalBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posMedalText: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  posText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
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
    marginTop: 3,
  },
  teamColorBar: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
  },
  driverTeam: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
  },
  pointsBarWrap: {
    marginTop: 6,
  },
  pointsBarTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pointsBarFill: {
    height: '100%' as any,
    borderRadius: 1.5,
  },
  driverStats: {
    alignItems: 'center' as const,
    minWidth: 44,
  },
  driverPoints: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  driverPtsLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  winsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  winsText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: GOLD,
  },

  ctorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
    backgroundColor: CARBON_CARD,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  ctorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  ctorRankSection: {
    alignItems: 'center' as const,
  },
  ctorRankBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ctorRankText: {
    fontSize: 14,
    fontWeight: '900' as const,
  },
  ctorLogoWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctorMainInfo: {
    flex: 1,
    gap: 5,
  },
  ctorName: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  ctorColorLine: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden' as const,
    maxWidth: 80,
  },
  ctorColorStripe: {
    width: '100%' as any,
    height: '100%' as any,
    borderRadius: 1.5,
  },
  ctorPointsBlock: {
    alignItems: 'flex-end' as const,
  },
  ctorPointsValue: {
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as any,
  },
  ctorPointsUnit: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    letterSpacing: 1,
    marginTop: -1,
  },
  ctorDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: CARBON_BORDER,
  },
  ctorBottomRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  ctorDriversSection: {
    flexDirection: 'row',
    gap: 8,
  },
  ctorDriverCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  ctorDriverInfo: {
    flex: 1,
  },
  ctorDriverName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
    letterSpacing: -0.1,
  },
  ctorDriverPts: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  ctorDriverWins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: GOLD + '12',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ctorDriverWinsText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: GOLD,
  },
  ctorBarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctorBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ctorBarFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  ctorBarPct: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    minWidth: 28,
    textAlign: 'right' as const,
    fontVariant: ['tabular-nums'] as any,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: F1_RED + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: F1_RED + '15',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    color: TEXT_MUTED,
    paddingHorizontal: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    backgroundColor: CARBON_ELEVATED,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: TEXT_MUTED + '40',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    zIndex: 10,
  },
  modalHeroWrap: {
    height: 180,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  modalHeroImage: {
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: CARBON_BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CARBON_SURFACE,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
  },
  modalFlagSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },
  modalBigFlag: {
    fontSize: 48,
  },
  modalCountry: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  modalCity: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  modalInfoCard: {
    width: (SCREEN_WIDTH - 40 - 30) / 2,
    padding: 14,
    borderRadius: 16,
    backgroundColor: CARBON_SURFACE,
    gap: 8,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
  },
  modalInfoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  modalPodiumSection: {
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  modalPodiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARBON_SURFACE,
    gap: 12,
    borderWidth: 1,
    borderColor: CARBON_BORDER,
  },
  modalPodiumDriverName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  modalPodiumTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  modalPodiumTeamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalPodiumTeamName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_MUTED,
  },
  modalPodiumDriverFlag: {
    fontSize: 22,
  },
});
