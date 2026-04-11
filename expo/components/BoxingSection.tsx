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
  FlatList,
} from 'react-native';
import {
  Calendar,
  Trophy,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  Award,
  Crown,
  Shield,
  Flame,
  Target,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  BoxingFight,
  getNextFight,
  getUpcomingFights,
  getCompletedFights,
  getMethodColor,
  getMethodShort,
  BOXING_DIVISIONS,
} from '@/constants/boxingData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BoxingSectionProps {
  isDark: boolean;
  insets: { top: number; bottom: number };
}

const BOXING_RED = '#C41E3A';
const BOXING_RED_LIGHT = 'rgba(196, 30, 58, 0.12)';
const BOXING_GOLD = '#C5A028';
const BOXING_GOLD_LIGHT = 'rgba(197, 160, 40, 0.12)';

type BoxingTab = 'upcoming' | 'results' | 'divisions';

const CountdownUnit = React.memo(({ value, label, isDark }: { value: number; label: string; isDark: boolean }) => (
  <View style={[s.cdUnit, { backgroundColor: isDark ? 'rgba(196,30,58,0.1)' : 'rgba(196,30,58,0.06)' }]}>
    <Text style={[s.cdValue, { color: isDark ? BOXING_RED : '#B91C36' }]}>{String(value).padStart(2, '0')}</Text>
    <Text style={[s.cdLabel, { color: isDark ? '#6B6B85' : '#9CA3AF' }]}>{label}</Text>
  </View>
));

const HeroCountdown = React.memo(({ fight, isDark }: { fight: BoxingFight; isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(fight.date).getTime();
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
  }, [fight.date]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const fightDate = new Date(fight.date);
  const dateStr = fightDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Animated.View style={[s.heroCard, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={isDark ? ['#1A0508', '#140A12', '#0D0D1A'] : ['#2A0A10', '#1E0810', '#120A18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroGradient}
      >
        <View style={s.heroAccent} />

        <View style={s.heroTopRow}>
          <View style={s.heroLabelWrap}>
            <Flame size={10} color={BOXING_RED} />
            <Text style={s.heroLabel}>NEXT FIGHT</Text>
          </View>
          {fight.titleFight && fight.belts && (
            <View style={s.heroBeltsWrap}>
              {fight.belts.map((belt, idx) => (
                <View key={idx} style={s.heroBeltChip}>
                  <Text style={s.heroBeltText}>{belt}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={s.heroEvent} numberOfLines={1}>{fight.event}</Text>

        <View style={s.heroFighters}>
          <View style={s.heroFighterSide}>
            <View style={s.heroAvatarWrap}>
              <LinearGradient
                colors={[BOXING_RED, '#8B0000']}
                style={s.heroAvatar}
              >
                <Text style={s.heroAvatarInitial}>{fight.fighter1.name.split(' ').pop()?.charAt(0) || '?'}</Text>
              </LinearGradient>
            </View>
            <Text style={s.heroFighterFlag}>{fight.fighter1.countryFlag}</Text>
            <Text style={s.heroFighterName} numberOfLines={2}>{fight.fighter1.name}</Text>
            {fight.fighter1.nickname && (
              <Text style={s.heroFighterNick} numberOfLines={1}>"{fight.fighter1.nickname}"</Text>
            )}
            <Text style={s.heroFighterRecord}>{fight.fighter1.record}</Text>
          </View>

          <View style={s.heroVsWrap}>
            <LinearGradient
              colors={[BOXING_RED, '#8B0000']}
              style={s.heroVsBadge}
            >
              <Text style={s.heroVsText}>VS</Text>
            </LinearGradient>
          </View>

          <View style={s.heroFighterSide}>
            <View style={s.heroAvatarWrap}>
              <LinearGradient
                colors={['#1E3A5F', '#0D2240']}
                style={s.heroAvatar}
              >
                <Text style={s.heroAvatarInitial}>{fight.fighter2.name.split(' ').pop()?.charAt(0) || '?'}</Text>
              </LinearGradient>
            </View>
            <Text style={s.heroFighterFlag}>{fight.fighter2.countryFlag}</Text>
            <Text style={s.heroFighterName} numberOfLines={2}>{fight.fighter2.name}</Text>
            {fight.fighter2.nickname && (
              <Text style={s.heroFighterNick} numberOfLines={1}>"{fight.fighter2.nickname}"</Text>
            )}
            <Text style={s.heroFighterRecord}>{fight.fighter2.record}</Text>
          </View>
        </View>

        <View style={s.heroCountdownRow}>
          <CountdownUnit value={timeLeft.days} label="DAYS" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.hours} label="HRS" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.mins} label="MIN" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.secs} label="SEC" isDark={isDark} />
        </View>

        <View style={s.heroInfoRow}>
          <View style={s.heroInfoItem}>
            <MapPin size={11} color="#6B6B85" />
            <Text style={s.heroInfoText}>{fight.venue}, {fight.city}</Text>
          </View>
          <View style={s.heroInfoItem}>
            <Calendar size={11} color="#6B6B85" />
            <Text style={s.heroInfoText}>{dateStr}</Text>
          </View>
        </View>

        <View style={s.heroDivisionRow}>
          <View style={[s.heroDivisionBadge, { backgroundColor: 'rgba(196,30,58,0.12)' }]}>
            <Text style={[s.heroDivisionText, { color: BOXING_RED }]}>{fight.division}</Text>
          </View>
          <Text style={s.heroRoundsText}>{fight.rounds} Rounds</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const FightCard = React.memo(({ fight, isDark, onPress }: { fight: BoxingFight; isDark: boolean; onPress?: () => void }) => {
  const isCompleted = fight.status === 'completed';
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress]);

  const getFightTime = () => {
    const d = new Date(fight.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fightDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (fightDay.getTime() === today.getTime()) return 'Today';
    if (fightDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getFighterInitial = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    return name.charAt(0);
  };

  return (
    <Animated.View style={[s.fightCardWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92}>
        <View style={[
          s.fightCard,
          { backgroundColor: isDark ? '#111125' : '#FFFFFF' },
          isDark && { borderColor: 'rgba(196,30,58,0.08)' },
        ]}>
          <View style={s.fightHeader}>
            <View style={s.fightHeaderLeft}>
              {fight.titleFight && (
                <View style={[s.titleBadge, { backgroundColor: isDark ? 'rgba(197,160,40,0.12)' : 'rgba(197,160,40,0.08)' }]}>
                  <Crown size={10} color={BOXING_GOLD} />
                  <Text style={[s.titleBadgeText, { color: BOXING_GOLD }]}>TITLE</Text>
                </View>
              )}
              <View style={[s.divisionBadge, { backgroundColor: isDark ? BOXING_RED_LIGHT : 'rgba(196,30,58,0.06)' }]}>
                <Text style={[s.divisionBadgeText, { color: isDark ? BOXING_RED : '#B91C36' }]}>{fight.division}</Text>
              </View>
            </View>
            {isCompleted ? (
              <View style={[s.statusBadge, { backgroundColor: isDark ? '#0D2818' : '#ECFDF5' }]}>
                <CheckCircle2 size={11} color="#10B981" />
                <Text style={[s.statusText, { color: '#10B981' }]}>Final</Text>
              </View>
            ) : (
              <View style={[s.statusBadge, { backgroundColor: isDark ? 'rgba(196,30,58,0.08)' : 'rgba(196,30,58,0.05)' }]}>
                <Clock size={11} color={BOXING_RED} />
                <Text style={[s.statusText, { color: BOXING_RED }]}>{getFightTime()}</Text>
              </View>
            )}
          </View>

          {fight.belts && fight.belts.length > 0 && (
            <View style={s.beltsRow}>
              {fight.belts.map((belt, idx) => (
                <View key={idx} style={[s.beltChip, { backgroundColor: isDark ? 'rgba(197,160,40,0.08)' : 'rgba(197,160,40,0.06)' }]}>
                  <Text style={[s.beltChipText, { color: BOXING_GOLD }]}>{belt}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.fightersRow}>
            <View style={s.fighterSide}>
              <View style={[
                s.fighterAvatarOuter,
                isCompleted && fight.fighter1.winner && { borderColor: '#10B981', borderWidth: 2 },
                isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.5 },
              ]}>
                <LinearGradient
                  colors={isDark ? [BOXING_RED + '30', BOXING_RED + '10'] : [BOXING_RED + '15', BOXING_RED + '05']}
                  style={s.fighterAvatar}
                >
                  <Text style={[s.fighterInitials, { color: isDark ? BOXING_RED : '#B91C36' }]}>
                    {getFighterInitial(fight.fighter1.name)}
                  </Text>
                </LinearGradient>
              </View>
              <Text style={s.fighterFlag}>{fight.fighter1.countryFlag}</Text>
              <Text style={[
                s.fighterName,
                { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                isCompleted && fight.fighter1.winner && { color: '#10B981' },
              ]} numberOfLines={2}>{fight.fighter1.name}</Text>
              <Text style={[s.fighterRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{fight.fighter1.record}</Text>
              {isCompleted && fight.fighter1.winner && (
                <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                  <Text style={s.winBadgeText}>WIN</Text>
                </LinearGradient>
              )}
            </View>

            <View style={s.vsCenter}>
              <View style={[s.vsLine, { backgroundColor: isDark ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.1)' }]} />
              <LinearGradient
                colors={isDark ? [BOXING_RED + '25', BOXING_RED + '12'] : [BOXING_RED + '15', BOXING_RED + '08']}
                style={s.vsCircle}
              >
                <Text style={[s.vsText, { color: isDark ? BOXING_RED : '#B91C36' }]}>VS</Text>
              </LinearGradient>
              <View style={[s.vsLine, { backgroundColor: isDark ? 'rgba(196,30,58,0.15)' : 'rgba(196,30,58,0.1)' }]} />
            </View>

            <View style={s.fighterSide}>
              <View style={[
                s.fighterAvatarOuter,
                isCompleted && fight.fighter2.winner && { borderColor: '#10B981', borderWidth: 2 },
                isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.5 },
              ]}>
                <LinearGradient
                  colors={isDark ? ['#1E3A5F30', '#1E3A5F10'] : ['#1E3A5F15', '#1E3A5F05']}
                  style={s.fighterAvatar}
                >
                  <Text style={[s.fighterInitials, { color: isDark ? '#3B82F6' : '#1E3A5F' }]}>
                    {getFighterInitial(fight.fighter2.name)}
                  </Text>
                </LinearGradient>
              </View>
              <Text style={s.fighterFlag}>{fight.fighter2.countryFlag}</Text>
              <Text style={[
                s.fighterName,
                { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                isCompleted && fight.fighter2.winner && { color: '#10B981' },
              ]} numberOfLines={2}>{fight.fighter2.name}</Text>
              <Text style={[s.fighterRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{fight.fighter2.record}</Text>
              {isCompleted && fight.fighter2.winner && (
                <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                  <Text style={s.winBadgeText}>WIN</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {isCompleted && fight.result && (
            <View style={[s.resultRow, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
              <View style={[s.resultMethodWrap, { backgroundColor: getMethodColor(fight.result.method) + '15' }]}>
                <Text style={[s.resultMethodShort, { color: getMethodColor(fight.result.method) }]}>
                  {getMethodShort(fight.result.method)}
                </Text>
                <Text style={[s.resultMethodFull, { color: getMethodColor(fight.result.method) }]}>
                  {fight.result.method}
                </Text>
                {fight.result.round && (
                  <View style={[s.resultChip, { backgroundColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
                    <Text style={[s.resultChipText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>R{fight.result.round}</Text>
                  </View>
                )}
                {fight.result.time && (
                  <View style={[s.resultChip, { backgroundColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
                    <Clock size={9} color={isDark ? '#6B6B85' : '#8E8E93'} />
                    <Text style={[s.resultChipText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>{fight.result.time}</Text>
                  </View>
                )}
              </View>
              {fight.result.scores && fight.result.scores.length > 0 && (
                <View style={s.scoresRow}>
                  {fight.result.scores.map((score, idx) => (
                    <View key={idx} style={[s.scoreChip, { backgroundColor: isDark ? '#1A1A32' : '#F5F5FA' }]}>
                      <Text style={[s.scoreText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>{score}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={[s.fightFooter, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
            <View style={s.fightFooterLeft}>
              <MapPin size={10} color={isDark ? '#52526E' : '#AEAEB2'} />
              <Text style={[s.fightFooterText, { color: isDark ? '#52526E' : '#AEAEB2' }]} numberOfLines={1}>
                {fight.venue}, {fight.city}
              </Text>
            </View>
            <Text style={[s.fightFooterEvent, { color: isDark ? '#3A3A5A' : '#C0C0CC' }]} numberOfLines={1}>
              {fight.event}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const DivisionCard = React.memo(({ division, index, isDark }: { division: typeof BOXING_DIVISIONS[0]; index: number; isDark: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={[s.divCard, { opacity: fadeAnim, backgroundColor: isDark ? '#111125' : '#FFFFFF' }]}>
      <View style={s.divCardLeft}>
        <View style={[s.divRankBadge, { backgroundColor: isDark ? BOXING_RED_LIGHT : 'rgba(196,30,58,0.06)' }]}>
          <Target size={14} color={BOXING_RED} />
        </View>
        <View style={s.divCardInfo}>
          <Text style={[s.divName, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]}>{division.name}</Text>
          <Text style={[s.divWeight, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{division.weightLimit}</Text>
        </View>
      </View>
      {division.champion && (
        <View style={s.divChampWrap}>
          <Crown size={12} color={BOXING_GOLD} />
          <Text style={[s.divChampName, { color: isDark ? BOXING_GOLD : '#96780A' }]} numberOfLines={1}>{division.champion}</Text>
        </View>
      )}
    </Animated.View>
  );
});

const TabPill = React.memo(({ activeTab, onTabChange, isDark, counts }: {
  activeTab: BoxingTab;
  onTabChange: (tab: BoxingTab) => void;
  isDark: boolean;
  counts: Record<string, number>;
}) => {
  const tabs: { key: BoxingTab; label: string; icon: any; color: string }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: BOXING_RED },
    { key: 'results', label: 'Results', icon: Trophy, color: '#10B981' },
    { key: 'divisions', label: 'Divisions', icon: Award, color: BOXING_GOLD },
  ];

  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState<number>(SCREEN_WIDTH - 40);
  const activeIndex = tabs.findIndex(t => t.key === activeTab);
  const tabWidth = (containerWidth - 8) / tabs.length;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex * tabWidth + 4,
      tension: 90,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorAnim, tabWidth]);

  const handlePress = useCallback(async (tab: BoxingTab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTabChange(tab);
  }, [onTabChange]);

  const activeColor = tabs[activeIndex]?.color || BOXING_RED;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[s.pillContainer, {
        backgroundColor: isDark ? '#111122' : '#EAEAF0',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      }]}
    >
      <Animated.View style={[s.pillIndicator, { width: tabWidth - 8, transform: [{ translateX: indicatorAnim }] }]}>
        <LinearGradient
          colors={isDark ? [activeColor + '25', activeColor + '12'] : [activeColor + '18', activeColor + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.pillIndicatorInner, {
            borderColor: activeColor + (isDark ? '30' : '25'),
            shadowColor: activeColor,
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }]}
        />
      </Animated.View>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.6}
            style={s.pillTab}
          >
            <View style={[s.pillTabIconWrap, isActive && { backgroundColor: tab.color + '20' }]}>
              <Icon size={14} color={isActive ? tab.color : (isDark ? '#555570' : '#9999A8')} strokeWidth={isActive ? 2.8 : 2} />
            </View>
            <Text style={[
              s.pillLabel,
              { color: isActive ? (isDark ? '#F0F0FA' : '#1A1A24') : (isDark ? '#555570' : '#9999A8') },
              isActive && { fontWeight: '700' as const, letterSpacing: -0.2 },
            ]}>
              {tab.label}
            </Text>
            {count > 0 && (
              <View style={[s.pillBadge, isActive ? { backgroundColor: tab.color } : { backgroundColor: isDark ? '#252540' : '#D8D8E0' }]}>
                <Text style={[s.pillBadgeText, { color: isActive ? '#FFFFFF' : (isDark ? '#6B6B85' : '#8E8E93') }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

export default function BoxingSection({ isDark, insets }: BoxingSectionProps) {
  const [activeTab, setActiveTab] = useState<BoxingTab>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const nextFight = useMemo(() => getNextFight(), []);
  const upcomingFights = useMemo(() => getUpcomingFights(), []);
  const completedFights = useMemo(() => getCompletedFights(), []);

  const counts: Record<string, number> = useMemo(() => ({
    upcoming: upcomingFights.length,
    results: completedFights.length,
    divisions: BOXING_DIVISIONS.length,
  }), [upcomingFights.length, completedFights.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const statsBar = useMemo(() => {
    const koCount = completedFights.filter(f => {
      const m = f.result?.method?.toLowerCase() || '';
      return m.includes('ko') || m.includes('tko');
    }).length;
    const titleFights = [...upcomingFights, ...completedFights].filter(f => f.titleFight).length;
    return { total: upcomingFights.length + completedFights.length, ko: koCount, titleFights };
  }, [upcomingFights, completedFights]);

  type ListItem =
    | { type: 'hero'; fight: BoxingFight; key: string }
    | { type: 'stats'; key: string }
    | { type: 'fight'; fight: BoxingFight; key: string }
    | { type: 'division'; division: typeof BOXING_DIVISIONS[0]; index: number; key: string }
    | { type: 'empty'; key: string };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (activeTab === 'upcoming') {
      if (nextFight) {
        items.push({ type: 'hero', fight: nextFight, key: 'hero-countdown' });
      }
      items.push({ type: 'stats', key: 'stats-bar' });
      if (upcomingFights.length === 0) {
        items.push({ type: 'empty', key: 'empty' });
      } else {
        upcomingFights.forEach((fight, idx) => {
          items.push({ type: 'fight', fight, key: `upcoming-${fight.id}-${idx}` });
        });
      }
    } else if (activeTab === 'results') {
      items.push({ type: 'stats', key: 'stats-bar' });
      if (completedFights.length === 0) {
        items.push({ type: 'empty', key: 'empty' });
      } else {
        completedFights.forEach((fight, idx) => {
          items.push({ type: 'fight', fight, key: `result-${fight.id}-${idx}` });
        });
      }
    } else {
      BOXING_DIVISIONS.forEach((div, idx) => {
        items.push({ type: 'division', division: div, index: idx, key: `div-${div.id}` });
      });
    }

    return items;
  }, [activeTab, nextFight, upcomingFights, completedFights]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'hero':
        return <HeroCountdown fight={item.fight} isDark={isDark} />;
      case 'stats':
        return (
          <View style={s.statsBar}>
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? BOXING_RED : '#B91C36' }]}>{statsBar.total}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>FIGHTS</Text>
            </View>
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? '#EF4444' : '#DC2626' }]}>{statsBar.ko}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>KO/TKO</Text>
            </View>
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? BOXING_GOLD : '#96780A' }]}>{statsBar.titleFights}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>TITLE</Text>
            </View>
          </View>
        );
      case 'fight':
        return <FightCard fight={item.fight} isDark={isDark} />;
      case 'division':
        return <DivisionCard division={item.division} index={item.index} isDark={isDark} />;
      case 'empty':
        return (
          <View style={s.emptyState}>
            <LinearGradient colors={[BOXING_RED, '#8B0000']} style={s.emptyIcon}>
              <Shield size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>
              {activeTab === 'upcoming' ? 'No Upcoming Fights' : 'No Recent Results'}
            </Text>
            <Text style={[s.emptySub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
              {activeTab === 'upcoming' ? 'Check back soon for new fight announcements' : 'Completed fights will appear here'}
            </Text>
          </View>
        );
      default:
        return null;
    }
  }, [isDark, activeTab, statsBar]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabWrapper}>
        <TabPill activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} counts={counts} />
      </View>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BOXING_RED} colors={[BOXING_RED]} />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  tabWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    position: 'relative' as const,
  },
  pillIndicator: {
    position: 'absolute' as const,
    top: 3,
    bottom: 3,
    borderRadius: 11,
    overflow: 'hidden' as const,
  },
  pillIndicatorInner: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    zIndex: 1,
  },
  pillTabIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexShrink: 0,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  pillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 7,
    minWidth: 20,
    alignItems: 'center' as const,
    flexShrink: 0,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroCard: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden' as const,
    shadowColor: BOXING_RED,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  heroAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BOXING_RED,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  heroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: BOXING_RED,
    letterSpacing: 2,
  },
  heroBeltsWrap: {
    flexDirection: 'row',
    gap: 4,
  },
  heroBeltChip: {
    backgroundColor: 'rgba(197,160,40,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197,160,40,0.2)',
  },
  heroBeltText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: BOXING_GOLD,
    letterSpacing: 0.5,
  },
  heroEvent: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.3,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  heroFighters: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  heroFighterSide: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
  },
  heroAvatarWrap: {
    marginBottom: 4,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroAvatarInitial: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  heroFighterFlag: {
    fontSize: 18,
  },
  heroFighterName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#F0F0FA',
    textAlign: 'center' as const,
    lineHeight: 17,
  },
  heroFighterNick: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6B6B85',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  heroFighterRecord: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#5A5A7A',
    letterSpacing: 0.5,
  },
  heroVsWrap: {
    paddingHorizontal: 10,
    paddingTop: 18,
  },
  heroVsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroVsText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  heroCountdownSep: {
    fontSize: 18,
    fontWeight: '300' as const,
    color: '#4A4A6A',
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroInfoText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B6B85',
  },
  heroDivisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroDivisionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.15)',
  },
  heroDivisionText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  heroRoundsText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#5A5A7A',
  },
  cdUnit: {
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.12)',
    minWidth: 52,
  },
  cdValue: {
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  cdLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.08)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  fightCardWrap: {
    width: '100%',
    marginBottom: 8,
  },
  fightCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  fightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  titleBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  divisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  divisionBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  beltsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  beltChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  beltChipText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fighterSide: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
  },
  fighterAvatarOuter: {
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  fighterAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fighterInitials: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  fighterFlag: {
    fontSize: 16,
  },
  fighterName: {
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  fighterRecord: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  winBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  winBadgeText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  vsCenter: {
    paddingHorizontal: 6,
    alignItems: 'center' as const,
    gap: 4,
  },
  vsLine: {
    width: 1,
    height: 10,
  },
  vsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  resultRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center' as const,
    gap: 8,
  },
  resultMethodWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resultMethodShort: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  resultMethodFull: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  resultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultChipText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  fightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fightFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  fightFooterText: {
    fontSize: 11,
    fontWeight: '500' as const,
    flex: 1,
  },
  fightFooterEvent: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  divCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(196,30,58,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  divCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  divRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divCardInfo: {
    flex: 1,
  },
  divName: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  divWeight: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  divChampWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '45%',
  },
  divChampName: {
    fontSize: 11,
    fontWeight: '700' as const,
    flexShrink: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
