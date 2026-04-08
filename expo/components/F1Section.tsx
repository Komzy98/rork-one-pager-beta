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
} from 'lucide-react-native';
import { Image } from 'expo-image';

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

const CARBON_DARK = '#0B0B14';
const CARBON_CARD = '#101020';
const CARBON_CARD_LIGHT = '#FFFFFF';
const F1_RED = '#E10600';
const GOLD = '#D4AF37';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';

const DriverHeadshot = React.memo(({
  photo,
  teamColor,
  size,
  number,
}: {
  photo?: string;
  teamColor: string;
  size: number;
  number: number;
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
          backgroundColor: teamColor + '15',
          borderWidth: 2,
          borderColor: teamColor + '60',
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
        backgroundColor: teamColor + '20',
        borderWidth: 2,
        borderColor: teamColor + '40',
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
      backgroundColor: teamColor + '20',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }}>
      <Text style={{ color: teamColor, fontWeight: '800' as const, fontSize: size * 0.3 }}>
        {name.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
});



const F1Countdown = React.memo(({ race, isDark }: { race: F1Race; isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

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
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2500, useNativeDriver: true }),
      ])
    );
    pulse.start();

    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    return () => pulse.stop();
  }, [glowAnim, barAnim]);

  const seasonProgress = useMemo(() => {
    const completed = getCompletedRaces().length;
    const total = F1_CALENDAR_2026.length;
    return completed / total;
  }, []);

  return (
    <View style={s.countdownOuter}>
      {race.circuitImage && (
        <View style={s.countdownImageWrap}>
          <Image
            source={{ uri: race.circuitImage }}
            style={s.countdownImage}
            contentFit="cover"
            transition={400}
            cachePolicy="memory-disk"
          />
        </View>
      )}
      <View
        style={[s.countdownGradient, { backgroundColor: isDark ? CARBON_DARK : '#0C0416' }]}
      >
        <Animated.View style={[s.countdownTopGlow, { opacity: glowAnim }]} />
        <View style={s.countdownRedStripe} />

        <View style={s.countdownHeader}>
          <View style={s.nextRaceBadge}>
            <Zap size={10} color={F1_RED} fill={F1_RED} />
            <Text style={s.nextRaceLabel}>NEXT RACE</Text>
          </View>
          <View style={s.roundPill}>
            <Text style={s.roundPillText}>ROUND {race.round}</Text>
          </View>
        </View>

        <Text style={s.countdownRaceName}>{race.name}</Text>

        <View style={s.countdownMeta}>
          <View style={s.metaChip}>
            <Text style={s.metaFlag}>{race.flag}</Text>
            <Text style={s.metaText}>{race.city}, {race.country}</Text>
          </View>
        </View>
        <View style={s.countdownMeta}>
          <View style={s.metaChip}>
            <MapPin size={10} color="#6B6B90" />
            <Text style={s.metaText}>{race.circuit}</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaChip}>
            <CircleDot size={10} color="#6B6B90" />
            <Text style={s.metaText}>{race.laps} laps</Text>
          </View>
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
                <View
                  style={[s.timerBoxGradient, { backgroundColor: 'rgba(225,6,0,0.08)' }]}
                >
                  <Text style={s.timerValue}>
                    {String(item.value).padStart(2, '0')}
                  </Text>
                  <Text style={s.timerUnit}>{item.label}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={s.seasonProgressWrap}>
          <View style={s.seasonProgressRow}>
            <Text style={s.seasonProgressLabel}>Season Progress</Text>
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
          </View>
        </View>

        <View style={s.countdownDateRow}>
          <Calendar size={12} color={F1_RED} />
          <Text style={s.countdownDate}>
            {new Date(race.date).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </View>
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
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isCompleted) {
      Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
      ).start();
    }
  }, [isCompleted, shimmerAnim]);

  const getDaysUntil = () => {
    const now = new Date();
    const d = new Date(race.date);
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'TODAY';
    if (diff === 1) return 'TOMORROW';
    if (diff > 0) return `${diff}D`;
    return `${Math.abs(diff)}D AGO`;
  };

  const getFormattedDate = () => {
    const d = new Date(race.date);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    };
  };

  const dateInfo = getFormattedDate();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, tension: 300, friction: 20, useNativeDriver: true }).start();
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
        <View style={[
          s.raceCard,
          { backgroundColor: isDark ? CARBON_CARD : CARBON_CARD_LIGHT },
          isDark && s.raceCardDark,
        ]}>
          {race.circuitImage && (
            <View style={s.raceCardImageSection}>
              <Image
                source={{ uri: race.circuitImage }}
                style={s.raceCardImage}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
              />
            </View>
          )}

          <View style={s.raceCardInner}>
            <View style={s.raceCardDateBlock}>
              <View style={[
                s.raceCardDateBox,
                { backgroundColor: isCompleted
                  ? (isDark ? '#0A1F14' : '#ECFDF5')
                  : (isDark ? F1_RED + '14' : F1_RED + '0A')
                },
              ]}>
                <Text style={[
                  s.raceCardDateDay,
                  { color: isCompleted ? '#10B981' : F1_RED },
                ]}>{dateInfo.day}</Text>
                <Text style={[
                  s.raceCardDateMonth,
                  { color: isCompleted ? '#10B98199' : F1_RED + '99' },
                ]}>{dateInfo.month}</Text>
              </View>
            </View>

            <View style={s.raceCardBody}>
              <View style={s.raceCardTopRow}>
                <View style={s.raceCardTopLeft}>
                  <View style={[
                    s.raceRoundBadge,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                  ]}>
                    <Text style={[s.raceRoundText, { color: isDark ? '#7B7B95' : '#8E8E93' }]}>R{race.round}</Text>
                  </View>
                  <Text style={s.raceCardFlag}>{race.flag}</Text>
                </View>
                {isCompleted ? (
                  <View style={[s.raceStatusPill, { backgroundColor: isDark ? '#0A1F14' : '#ECFDF5' }]}>
                    <CheckCircle2 size={9} color="#10B981" />
                    <Text style={[s.raceStatusText, { color: '#10B981' }]}>Done</Text>
                  </View>
                ) : (
                  <View style={[s.raceStatusPill, { backgroundColor: isDark ? F1_RED + '12' : F1_RED + '08' }]}>
                    <Zap size={9} color={F1_RED} fill={F1_RED} />
                    <Text style={[s.raceStatusText, { color: F1_RED }]}>{getDaysUntil()}</Text>
                  </View>
                )}
              </View>

              <Text style={[s.raceCardTitle, { color: isDark ? '#F0F0FA' : '#1A1A24' }]} numberOfLines={1}>
                {race.name}
              </Text>

              <View style={s.raceCardMetaRow}>
                <View style={s.raceCardMetaItem}>
                  <MapPin size={9} color={isDark ? '#4A4A68' : '#B0B0BA'} />
                  <Text style={[s.raceCardMetaText, { color: isDark ? '#5A5A78' : '#999' }]} numberOfLines={1}>
                    {race.circuit}
                  </Text>
                </View>
              </View>

              {isCompleted && race.podium ? (
                <View style={[s.raceCardPodium, { borderTopColor: isDark ? '#1A1A30' : '#F0F0F5' }]}>
                  {race.podium.map((driver, idx) => {
                    const driverData = getDriverStandings().find(d => d.name === driver);
                    const medals = [GOLD, SILVER, BRONZE];
                    return (
                      <View key={driver} style={s.podiumSlot}>
                        <DriverHeadshot
                          photo={driverData?.photo}
                          teamColor={driverData?.teamColor || '#888'}
                          size={20}
                          number={driverData?.number || 0}
                        />
                        <View style={[s.podiumPos, { backgroundColor: medals[idx] + '18' }]}>
                          <Text style={[s.podiumPosText, { color: medals[idx] }]}>{idx + 1}</Text>
                        </View>
                        <Text style={[s.podiumName, { color: isDark ? '#C0C0D0' : '#4A4A5A' }]} numberOfLines={1}>
                          {driver.split(' ').pop()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={s.raceCardFooter}>
                  <View style={s.raceCardInfoChips}>
                    <View style={[s.raceInfoChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                      <Flag size={8} color={isDark ? '#5A5A78' : '#B0B0BA'} />
                      <Text style={[s.raceInfoChipText, { color: isDark ? '#5A5A78' : '#B0B0BA' }]}>
                        {race.laps} laps
                      </Text>
                    </View>
                    <View style={[s.raceInfoChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                      <Gauge size={8} color={isDark ? '#5A5A78' : '#B0B0BA'} />
                      <Text style={[s.raceInfoChipText, { color: isDark ? '#5A5A78' : '#B0B0BA' }]}>
                        {race.circuitLength}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color={isDark ? '#2A2A44' : '#D0D0DA'} />
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
      { backgroundColor: isDark ? CARBON_CARD : CARBON_CARD_LIGHT },
      isDark && s.driverRowDark,
      isTop3 && { borderLeftWidth: 3, borderLeftColor: tierColor },
    ]}>
      <View style={s.driverPos}>
        {isTop3 ? (
          <View style={[s.posMedalBg, { backgroundColor: (tierColor || '#888') + '20' }]}>
            <Text style={[s.posMedalText, { color: tierColor }]}>{position}</Text>
          </View>
        ) : (
          <Text style={[s.posText, { color: isDark ? '#4A4A68' : '#B0B0BA' }]}>{position}</Text>
        )}
      </View>

      <DriverHeadshot
        photo={driver.photo}
        teamColor={driver.teamColor}
        size={38}
        number={driver.number}
      />

      <View style={s.driverInfo}>
        <View style={s.driverNameRow}>
          <Text style={[s.driverName, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
            {driver.name}
          </Text>
          <Text style={s.driverFlag}>{driver.nationalityFlag}</Text>
        </View>
        <View style={s.driverTeamRow}>
          <View style={[s.teamColorBar, { backgroundColor: driver.teamColor }]} />
          <Text style={[s.driverTeam, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
            {driver.team}
          </Text>
        </View>
        {driver.points > 0 && (
          <View style={s.pointsBarWrap}>
            <View style={[s.pointsBarTrack, { backgroundColor: isDark ? '#1A1A30' : '#F0F0F5' }]}>
              <View style={[s.pointsBarFill, { width: `${barWidth}%`, backgroundColor: driver.teamColor }]} />
            </View>
          </View>
        )}
      </View>

      <View style={s.driverStats}>
        <Text style={[s.driverPoints, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
          {driver.points}
        </Text>
        <Text style={[s.driverPtsLabel, { color: isDark ? '#4A4A68' : '#B0B0BA' }]}>PTS</Text>
        {driver.wins > 0 && (
          <View style={s.winsRow}>
            <Trophy size={9} color={GOLD} />
            <Text style={[s.winsText, { color: GOLD }]}>{driver.wins}</Text>
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
  const teamData = F1_TEAMS_2026.find(t => t.name === team.name);
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
          { backgroundColor: isDark ? CARBON_CARD : CARBON_CARD_LIGHT },
          isDark && s.ctorCardDark,
          isTop3 && { borderColor: (tierColor || '#888') + '30' },
        ]}>
          <View
            style={[s.ctorGradientBg, { backgroundColor: team.color + (isDark ? '08' : '05') }]}
          />

          <View style={s.ctorTopRow}>
            <View style={s.ctorRankSection}>
              {isTop3 ? (
                <View style={[s.ctorRankBadge, { backgroundColor: (tierColor || '#888') + '20' }]}>
                  <Text style={[s.ctorRankText, { color: tierColor }]}>{position}</Text>
                </View>
              ) : (
                <View style={[s.ctorRankBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                  <Text style={[s.ctorRankText, { color: isDark ? '#5A5A78' : '#B0B0BA' }]}>{position}</Text>
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
              <Text style={[s.ctorName, { color: isDark ? '#F0F0FA' : '#1A1A24' }]} numberOfLines={1}>
                {team.name}
              </Text>
              <View style={s.ctorColorLine}>
                <View style={[s.ctorColorStripe, { backgroundColor: team.color }]} />
                <View style={[s.ctorColorStripeFade, { backgroundColor: team.color + '30' }]} />
              </View>
            </View>

            <View style={s.ctorPointsBlock}>
              <Text style={[s.ctorPointsValue, { color: team.color }]}>
                {team.points}
              </Text>
              <Text style={[s.ctorPointsUnit, { color: isDark ? '#4A4A68' : '#B0B0BA' }]}>PTS</Text>
            </View>
          </View>

          <View style={[s.ctorDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />

          <View style={s.ctorBottomRow}>
            <View style={s.ctorDriversSection}>
              {team.drivers.map((driver, idx) => {
                const driverData = getDriverStandings().find(d => d.name === driver);
                const driverPts = driverData?.points ?? 0;
                return (
                  <View key={driver} style={[
                    s.ctorDriverCard,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)' },
                  ]}>
                    <DriverHeadshot
                      photo={driverData?.photo}
                      teamColor={team.color}
                      size={28}
                      number={driverData?.number || 0}
                    />
                    <View style={s.ctorDriverInfo}>
                      <Text style={[s.ctorDriverName, { color: isDark ? '#C0C0D8' : '#3A3A4A' }]} numberOfLines={1}>
                        {driver.split(' ').pop()}
                      </Text>
                      <Text style={[s.ctorDriverPts, { color: isDark ? '#5A5A78' : '#9999A8' }]}>
                        {driverPts} pts
                      </Text>
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
                <View style={[s.ctorBarTrack, { backgroundColor: isDark ? '#1A1A30' : '#ECECF2' }]}>
                  <View
                    style={[s.ctorBarFill, { width: `${barWidth}%`, backgroundColor: team.color }]}
                  />
                </View>
                <Text style={[s.ctorBarPct, { color: isDark ? '#4A4A68' : '#B0B0BA' }]}>
                  {Math.round(barWidth)}%
                </Text>
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
      <View style={s.tabBar}>
        <View style={[
          s.tabTrack,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }
        ]}>
          <Animated.View style={[
            s.tabIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: Animated.multiply(indicatorAnim, tabWidth) }],
            }
          ]}>
            <View
              style={[s.tabIndicatorInner, { backgroundColor: F1_RED + '14' }]}
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
                  color={isActive ? F1_RED : (isDark ? '#444460' : '#9999A8')}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <Text style={[
                  s.tabLabel,
                  { color: isActive ? (isDark ? '#F0F0FA' : '#1A1A24') : (isDark ? '#444460' : '#9999A8') },
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
                  isActive && {
                    backgroundColor: isDark ? 'rgba(225,6,0,0.1)' : 'rgba(225,6,0,0.06)',
                    borderColor: F1_RED + '30',
                  },
                  !isActive && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    borderColor: 'transparent',
                  },
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
                  <Calendar size={11} color={isActive ? F1_RED : (isDark ? '#5A5A78' : '#B0B0BA')} />
                ) : (
                  <Trophy size={11} color={isActive ? F1_RED : (isDark ? '#5A5A78' : '#B0B0BA')} />
                )}
                <Text style={[
                  s.filterChipText,
                  { color: isActive ? F1_RED : (isDark ? '#5A5A78' : '#B0B0BA') },
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
                <Text style={[s.emptyTitle, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]}>
                  No {calendarFilter === 'upcoming' ? 'Upcoming' : 'Completed'} Races
                </Text>
                <Text style={[s.emptySub, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
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
                <Text style={[s.standingsTitle, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                  Driver Championship
                </Text>
                <Text style={[s.standingsSub, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
                  {completedRaces.length} of {F1_CALENDAR_2026.length} races completed
                </Text>
              </View>
              <View style={[s.standingsSeasonBadge, { backgroundColor: isDark ? F1_RED + '12' : F1_RED + '08' }]}>
                <Text style={s.standingsSeasonText}>2026</Text>
              </View>
            </View>

            {driverStandings.length > 0 && (
              <View style={s.topThreeSection}>
                {driverStandings.slice(0, 3).map((driver, idx) => {
                  const colors = [GOLD, SILVER, BRONZE];
                  const sizes = [60, 50, 50];
                  return (
                    <View key={driver.id} style={[s.topDriverCard, idx === 0 && s.topDriverCardFirst]}>
                      <View
                        style={[
                          s.topDriverGradient,
                          { backgroundColor: isDark ? CARBON_CARD : CARBON_CARD_LIGHT },
                          isDark && { borderColor: colors[idx] + '20', borderWidth: 1 },
                          !isDark && { borderColor: colors[idx] + '30', borderWidth: 1 },
                        ]}
                      >
                        <View style={[s.topDriverPosBadge, { backgroundColor: colors[idx] + '25' }]}>
                          <Text style={[s.topDriverPosText, { color: colors[idx] }]}>
                            {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                          </Text>
                        </View>
                        <DriverHeadshot
                          photo={driver.photo}
                          teamColor={driver.teamColor}
                          size={sizes[idx]}
                          number={driver.number}
                        />
                        <Text style={[s.topDriverName, { color: isDark ? '#F0F0FA' : '#1A1A24', marginTop: 8 }]} numberOfLines={1}>
                          {driver.name.split(' ').pop()}
                        </Text>
                        <View style={[s.topDriverTeamPill, { backgroundColor: driver.teamColor + '15' }]}>
                          <View style={[s.topDriverTeamDot, { backgroundColor: driver.teamColor }]} />
                          <Text style={[s.topDriverTeamText, { color: driver.teamColor }]} numberOfLines={1}>
                            {driver.team.length > 12 ? driver.team.substring(0, 12) + '..' : driver.team}
                          </Text>
                        </View>
                        <Text style={[s.topDriverPts, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                          {driver.points}
                          <Text style={[s.topDriverPtsUnit, { color: isDark ? '#5A5A78' : '#B0B0BA' }]}> PTS</Text>
                        </Text>
                      </View>
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
                <Text style={[s.standingsTitle, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                  Constructor Championship
                </Text>
                <Text style={[s.standingsSub, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
                  {completedRaces.length} of {F1_CALENDAR_2026.length} races completed
                </Text>
              </View>
              <View style={[s.standingsSeasonBadge, { backgroundColor: isDark ? F1_RED + '12' : F1_RED + '08' }]}>
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
          <View style={[s.modalContainer, { backgroundColor: isDark ? '#14142A' : '#FFFFFF' }]}>
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
                  </View>
                )}

                <View style={[s.modalHeader, { borderBottomColor: isDark ? '#1E1E38' : '#F0F0F5' }]}>
                  <Text style={[s.modalTitle, { color: isDark ? '#F0F0FA' : '#1A1A24' }]} numberOfLines={1}>
                    {selectedRace.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRaceModal(false)}
                    style={[s.modalCloseBtn, { backgroundColor: isDark ? '#1E1E38' : '#F0F0F5' }]}
                  >
                    <X size={16} color={isDark ? '#7B7B95' : '#8E8E93'} />
                  </TouchableOpacity>
                </View>

                <View style={{ padding: 20 }}>
                  <View style={s.modalFlagSection}>
                    <Text style={s.modalBigFlag}>{selectedRace.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modalCountry, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                        {selectedRace.name}
                      </Text>
                      <Text style={[s.modalCity, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
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
                      <View key={item.label} style={[s.modalInfoCard, { backgroundColor: isDark ? '#0E0E1E' : '#F8F8FC' }]}>
                        <View style={[s.modalInfoIconWrap, { backgroundColor: F1_RED + '12' }]}>
                          <item.icon size={14} color={F1_RED} />
                        </View>
                        <Text style={[s.modalInfoLabel, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>{item.label}</Text>
                        <Text style={[s.modalInfoValue, { color: isDark ? '#F0F0FA' : '#1A1A24' }]} numberOfLines={2}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedRace.status === 'completed' && selectedRace.podium && (
                    <View style={s.modalPodiumSection}>
                      <Text style={[s.modalSectionTitle, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                        Podium Finishers
                      </Text>
                      {selectedRace.podium.map((driver, idx) => {
                        const driverData = driverStandings.find(d => d.name === driver);
                        const positions = ['1st Place', '2nd Place', '3rd Place'];
                        const tierColors = [GOLD, SILVER, BRONZE];
                        return (
                          <View key={driver} style={[
                            s.modalPodiumCard,
                            { backgroundColor: isDark ? '#0E0E1E' : '#F8F8FC' },
                            { borderLeftWidth: 3, borderLeftColor: tierColors[idx] },
                          ]}>
                            <DriverHeadshot
                              photo={driverData?.photo}
                              teamColor={driverData?.teamColor || '#888'}
                              size={42}
                              number={driverData?.number || 0}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[s.modalPodiumDriverName, { color: isDark ? '#F0F0FA' : '#1A1A24' }]}>
                                {driver}
                              </Text>
                              <View style={s.modalPodiumTeamRow}>
                                <View style={[s.modalPodiumTeamDot, { backgroundColor: driverData?.teamColor || '#888' }]} />
                                <Text style={[s.modalPodiumTeamName, { color: isDark ? '#5A5A78' : '#8E8E93' }]}>
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
  tabBar: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    position: 'relative' as const,
  },
  tabIndicator: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  tabIndicatorInner: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: F1_RED + '25',
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
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  countdownOuter: {
    marginBottom: 18,
    borderRadius: 22,
    overflow: 'hidden' as const,
    shadowColor: F1_RED,
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  countdownImageWrap: {
    height: 140,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
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
  countdownTopGlow: {
    position: 'absolute' as const,
    top: -60,
    left: '20%' as any,
    right: '20%' as any,
    height: 120,
    backgroundColor: F1_RED,
    borderRadius: 60,
    opacity: 0.06,
  },
  countdownRedStripe: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: F1_RED,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nextRaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: F1_RED + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  nextRaceLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: F1_RED,
    letterSpacing: 1.5,
  },
  roundPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roundPillText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#6B6B90',
    letterSpacing: 1,
  },
  countdownRaceName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  countdownMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaFlag: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 12,
    color: '#6B6B90',
    fontWeight: '500' as const,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3A3A5A',
  },
  countdownTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
    marginBottom: 18,
  },
  timerBox: {
    borderRadius: 14,
    overflow: 'hidden' as const,
    minWidth: 60,
    borderWidth: 1,
    borderColor: F1_RED + '15',
  },
  timerBoxGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: F1_RED,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as any,
  },
  timerUnit: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#5A5A78',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  timerSep: {
    fontSize: 22,
    fontWeight: '300' as const,
    color: '#3A3A5A',
  },
  seasonProgressWrap: {
    marginBottom: 16,
  },
  seasonProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  seasonProgressLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#5A5A78',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  seasonProgressPct: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: F1_RED,
  },
  seasonProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  seasonProgressFill: {
    height: '100%' as any,
    backgroundColor: F1_RED,
    borderRadius: 2,
  },
  countdownDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
  },
  countdownDate: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7B7B95',
  },

  raceCardOuter: {
    marginBottom: 12,
  },
  raceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  raceCardDark: {
    borderColor: 'rgba(255,255,255,0.05)',
  },
  raceCardImageSection: {
    height: 120,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    overflow: 'hidden' as const,
  },
  raceCardImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  raceCardInner: {
    flexDirection: 'row',
    padding: 14,
    zIndex: 1,
  },
  raceCardDateBlock: {
    marginRight: 12,
  },
  raceCardDateBox: {
    width: 48,
    height: 56,
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
    marginTop: 1,
  },
  raceCardBody: {
    flex: 1,
  },
  raceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  raceCardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  raceRoundBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  raceRoundText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  raceCardFlag: {
    fontSize: 16,
  },
  raceStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  raceStatusText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  raceCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  raceCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  raceCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  raceCardMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    flex: 1,
  },
  raceCardPodium: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  },
  raceInfoChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },

  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  standingsTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  standingsSub: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 3,
  },
  standingsSeasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    marginBottom: 14,
  },
  topDriverCard: {
    flex: 1,
  },
  topDriverCardFirst: {
    flex: 1,
  },
  topDriverGradient: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center' as const,
    minHeight: 180,
    justifyContent: 'center' as const,
  },
  topDriverPosBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    textAlign: 'center' as const,
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
  },
  topDriverPtsUnit: {
    fontSize: 10,
    fontWeight: '600' as const,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 10,
  },
  driverRowDark: {
    borderColor: 'rgba(255,255,255,0.04)',
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
    width: 10,
    height: 3,
    borderRadius: 1.5,
  },
  driverTeam: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  pointsBarWrap: {
    marginTop: 6,
  },
  pointsBarTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden' as const,
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
    letterSpacing: -0.5,
  },
  driverPtsLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
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
  },

  ctorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden' as const,
    position: 'relative' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  ctorCardDark: {
    borderColor: 'rgba(255,255,255,0.06)',
  },
  ctorGradientBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
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
  },
  ctorRankText: {
    fontSize: 14,
    fontWeight: '900' as const,
  },
  ctorLogoWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  ctorMainInfo: {
    flex: 1,
    gap: 4,
  },
  ctorName: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  ctorColorLine: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden' as const,
    maxWidth: 80,
  },
  ctorColorStripe: {
    width: '60%' as any,
    height: '100%' as any,
    borderRadius: 1.5,
  },
  ctorColorStripeFade: {
    width: '40%' as any,
    height: '100%' as any,
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
    letterSpacing: 1,
    marginTop: -1,
  },
  ctorDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
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
  },
  ctorDriverInfo: {
    flex: 1,
  },
  ctorDriverName: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  ctorDriverPts: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  ctorDriverWins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: GOLD + '15',
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
  },
  ctorBarFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  ctorBarPct: {
    fontSize: 10,
    fontWeight: '700' as const,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: F1_RED + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    flex: 1,
    marginRight: 12,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
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
    letterSpacing: -0.5,
  },
  modalCity: {
    fontSize: 13,
    fontWeight: '500' as const,
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
    gap: 8,
  },
  modalInfoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  modalPodiumSection: {
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  modalPodiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  modalPodiumDriverName: {
    fontSize: 15,
    fontWeight: '700' as const,
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
  },
  modalPodiumDriverFlag: {
    fontSize: 22,
  },
});
