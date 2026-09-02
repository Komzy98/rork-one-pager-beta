import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Clock3,
  CloudRain,
  Compass,
  Dumbbell,
  MapPin,
  MoreHorizontal,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useDiscoverLifeContext } from '@/hooks/useDiscoverLifeContext';
import { useDiscoverSavedLibrary } from '@/hooks/useDiscoverSavedLibrary';
import { useEventKit } from '@/hooks/useEventKit';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { appFont } from '@/constants/fonts';
import { buildPlanForWindow } from '@/utils/discoverPlan';
import { formatDistanceKm, getDaysUntilEvent, getEventCountdownLabel } from '@/utils/eventDiscovery';
import type {
  DiscoverFeedbackReason,
  DiscoverOpenWindow,
  DiscoverOpportunity,
  DiscoverOpportunityKind,
} from '@/utils/discoverLifeEngine';

type DiscoverMode = 'For You' | 'Open Time' | 'Near You' | 'Saved';

const MODES: DiscoverMode[] = ['For You', 'Open Time', 'Near You', 'Saved'];

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function KindIcon({ kind, color = '#FFFFFF', size = 18 }: { kind: DiscoverOpportunityKind; color?: string; size?: number }) {
  switch (kind) {
    case 'event': return <MapPin size={size} color={color} />;
    case 'watch': return <Play size={size} color={color} />;
    case 'sport': return <Trophy size={size} color={color} />;
    case 'habit': return <Dumbbell size={size} color={color} />;
    case 'recipe': return <ChefHat size={size} color={color} />;
    case 'task': return <BriefcaseBusiness size={size} color={color} />;
    case 'media': return <Clapperboard size={size} color={color} />;
    default: return <Sparkles size={size} color={color} />;
  }
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  colors,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  colors: { text: string; textSecondary: string; primary: string };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <ChevronRight size={15} color={colors.primary} strokeWidth={2.4} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ContextPill({
  icon,
  label,
  value,
  accent,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  isDark: boolean;
}) {
  return (
    <View style={[styles.contextPill, { backgroundColor: isDark ? '#171A20' : '#F5F6F8' }]}>
      <View style={[styles.contextPillIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
      <View style={styles.contextPillCopy}>
        <Text style={[styles.contextPillLabel, { color: isDark ? '#8E96A5' : '#737B8C' }]}>{label}</Text>
        <Text style={[styles.contextPillValue, { color: isDark ? '#F5F7FA' : '#111827' }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function ReasonLine({ text }: { text: string }) {
  return (
    <View style={styles.reasonLine}>
      <Sparkles size={12} color="rgba(255,255,255,0.88)" />
      <Text style={styles.reasonText} numberOfLines={2}>{text}</Text>
    </View>
  );
}

function OpportunityCard({
  item,
  isDark,
  colors,
  onOpen,
  onTune,
}: {
  item: DiscoverOpportunity;
  isDark: boolean;
  colors: { text: string; textSecondary: string; primary: string };
  onOpen: () => void;
  onTune: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onOpen}
      style={[styles.opportunityCard, { backgroundColor: isDark ? '#171A20' : '#FFFFFF' }]}
    >
      {item.image ? (
        <ImageBackground source={{ uri: item.image }} style={styles.opportunityImage} imageStyle={styles.opportunityImageRadius}>
          <LinearGradient colors={['rgba(4,7,14,0.02)', 'rgba(4,7,14,0.78)']} style={styles.opportunityImageOverlay}>
            <View style={[styles.kindChip, { backgroundColor: 'rgba(8,12,20,0.66)' }]}>
              <KindIcon kind={item.kind} size={12} />
              <Text style={styles.kindChipText}>{item.eyebrow}</Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onTune(); }} style={styles.cardTuneButton}>
              <MoreHorizontal size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={[`${item.accent}24`, `${item.accent}0D`]} style={styles.opportunityFallback}>
          <View style={[styles.fallbackIcon, { backgroundColor: `${item.accent}22` }]}>
            <KindIcon kind={item.kind} size={23} color={item.accent} />
          </View>
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onTune(); }} style={[styles.cardTuneButton, { backgroundColor: isDark ? '#242832' : '#FFFFFF' }]}>
            <MoreHorizontal size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        </LinearGradient>
      )}
      <View style={styles.opportunityBody}>
        <Text style={[styles.opportunityEyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
        <Text style={[styles.opportunityTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.opportunityMeta, { color: colors.textSecondary }]} numberOfLines={2}>{item.subtitle}</Text>
        {item.reasons[0] ? (
          <Text style={[styles.opportunityReason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reasons[0]}</Text>
        ) : null}
        <View style={styles.opportunityFooter}>
          <Text style={[styles.opportunityAction, { color: colors.primary }]}>{item.actionLabel}</Text>
          <ArrowRight size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NearbyEventRow({
  item,
  isDark,
  colors,
  onOpen,
  onTune,
}: {
  item: DiscoverOpportunity;
  isDark: boolean;
  colors: { text: string; textSecondary: string; primary: string };
  onOpen: () => void;
  onTune: () => void;
}) {
  const event = item.event;
  if (!event) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onOpen}
      style={[styles.nearbyRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.nearbyThumb} />
      ) : (
        <View style={[styles.nearbyThumbFallback, { backgroundColor: isDark ? '#1D263A' : '#EDF3FF' }]}>
          <MapPin size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.nearbyCopy}>
        <View style={styles.nearbyTopLine}>
          <Text style={[styles.nearbyKicker, { color: colors.primary }]}>{getEventCountdownLabel(event).toUpperCase()}</Text>
          {item.reasons.some((reason) => reason.includes('friend')) ? <Users size={12} color={colors.primary} /> : null}
        </View>
        <Text style={[styles.nearbyTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.nearbyMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.time, event.venue, typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : null].filter(Boolean).join(' · ')}
        </Text>
        {item.reasons[0] ? <Text style={[styles.nearbyReason, { color: colors.textSecondary }]} numberOfLines={1}>{item.reasons[0]}</Text> : null}
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onTune(); }} style={styles.inlineTuneButton}>
        <MoreHorizontal size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SavedSectionTitle({ title, count, colors }: { title: string; count: number; colors: { text: string; textSecondary: string } }) {
  if (count <= 0) return null;
  return (
    <View style={styles.savedSectionTitleRow}>
      <Text style={[styles.savedSectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.savedCount, { color: colors.textSecondary }]}>{count}</Text>
    </View>
  );
}

export default function DiscoverConciergeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const data = useDiscoverLifeContext();
  const savedLibrary = useDiscoverSavedLibrary();
  const eventKit = useEventKit();
  const [mode, setMode] = useState<DiscoverMode>('For You');
  const [refreshing, setRefreshing] = useState(false);
  const [planWindow, setPlanWindow] = useState<DiscoverOpenWindow | null>(null);

  const { lifeContext, engine } = data;

  const dayLabel = useMemo(
    () => lifeContext.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
    [lifeContext.now],
  );

  const contextHeadline = useMemo(() => {
    const window = lifeContext.primaryWindow;
    if (lifeContext.recoveryActive) return 'Keep today lighter. I’ll filter accordingly.';
    if (lifeContext.taskPressure.label === 'heavy') return 'Your day is loaded. Only high-fit ideas make the cut.';
    if (window?.isToday) return `${formatDuration(window.durationMinutes)} open ${window.label.toLowerCase()}.`;
    if (window) return `Your next useful opening is ${window.label.toLowerCase()}.`;
    return 'A selective edit built around your life right now.';
  }, [lifeContext]);

  const openOpportunity = useCallback((item: DiscoverOpportunity) => {
    data.feedback.markPositive(item.key, item.kind);
    router.push(item.route as never);
  }, [data.feedback]);

  const primaryAction = useCallback((item: DiscoverOpportunity) => {
    if (item.kind === 'event' && item.event) {
      data.feedback.markPositive(item.key, item.kind);
      void data.saved.toggleSaved(item.event);
      return;
    }
    openOpportunity(item);
  }, [data.feedback, data.saved, openOpportunity]);

  const tuneOpportunity = useCallback((item: DiscoverOpportunity) => {
    const apply = (reason: DiscoverFeedbackReason) => data.feedback.dismiss(item.key, item.kind, reason);
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: 'Not for me', onPress: () => apply('not_for_me') },
      { text: 'Bad timing', onPress: () => apply('bad_timing') },
    ];
    if (item.kind === 'event') {
      options.push({ text: 'Too far', onPress: () => apply('too_far') });
      options.push({ text: 'Too expensive', onPress: () => apply('too_expensive') });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Tune this recommendation', item.title, options);
  }, [data.feedback]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await data.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [data]);

  const windowTimeline = useMemo(() => {
    const used = new Set<string>();
    return lifeContext.openWindows.slice(0, 5).map((window) => {
      const timed = engine.ranked.find((item) => {
        if (used.has(item.key) || !item.startsAt) return false;
        return item.startsAt >= window.start && item.startsAt < window.end;
      });
      const flexible = engine.ranked.find((item) => {
        if (used.has(item.key) || item.startsAt) return false;
        return (item.durationMinutes ?? 45) <= window.durationMinutes;
      });
      const pick = timed ?? flexible ?? null;
      if (pick) used.add(pick.key);
      return { window, pick };
    });
  }, [engine.ranked, lifeContext.openWindows]);

  const identityOpportunity = useMemo(() => {
    const goals = lifeContext.identityGoals.map(normalize).filter(Boolean);
    if (!goals.length) return null;
    return engine.ranked.find((item) => {
      const text = normalize(`${item.title} ${item.subtitle} ${item.reasons.join(' ')}`);
      return goals.some((goal) => {
        if (text.includes(goal)) return true;
        const words = goal.split(' ').filter((word) => word.length >= 5);
        return words.some((word) => text.includes(word));
      });
    }) ?? null;
  }, [engine.ranked, lifeContext.identityGoals]);

  const friendPick = data.friendEventData.friendsPickEvents[0] ?? null;
  const friendPickOpportunity = friendPick
    ? engine.eventPicks.find((item) => item.event?.id === friendPick.id) ?? null
    : null;

  const plan = useMemo(
    () => planWindow ? buildPlanForWindow(planWindow, engine.ranked) : null,
    [planWindow, engine.ranked],
  );

  const groupNear = useMemo(() => {
    const today: DiscoverOpportunity[] = [];
    const tomorrow: DiscoverOpportunity[] = [];
    const week: DiscoverOpportunity[] = [];
    const later: DiscoverOpportunity[] = [];
    for (const item of engine.eventPicks) {
      if (!item.event) continue;
      const days = getDaysUntilEvent(item.event);
      if (days === 0) today.push(item);
      else if (days === 1) tomorrow.push(item);
      else if (days != null && days <= 7) week.push(item);
      else later.push(item);
    }
    return { today, tomorrow, week, later };
  }, [engine.eventPicks]);

  const topAiSignal = data.intelligence.topRecommendations[0] ?? data.intelligence.actionableInsights[0] ?? null;

  const hero = engine.hero;
  const heroSaved = hero?.kind === 'event' && hero.event ? data.saved.isSaved(hero.event.id) : false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 44,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={[styles.dateLine, { color: colors.textSecondary }]}>{dayLabel.toUpperCase()}{data.areaLabel ? ` · ${data.areaLabel.toUpperCase()}` : ''}</Text>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Discover</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{contextHeadline}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/profile')} style={[styles.tuneButton, { backgroundColor: isDark ? '#1B1E25' : '#F1F3F7' }]}>
              <SlidersHorizontal size={19} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRail}>
            {MODES.map((item) => {
              const active = item === mode;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => setMode(item)}
                  style={[
                    styles.modeChip,
                    { backgroundColor: active ? colors.text : isDark ? '#171A20' : '#F1F3F6' },
                  ]}
                >
                  <Text style={[styles.modeChipText, { color: active ? colors.background : colors.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {mode === 'For You' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextRail}>
              <ContextPill
                icon={<Clock3 size={17} color="#315ED8" />}
                label="OPEN TIME"
                value={lifeContext.primaryWindow ? `${formatDuration(lifeContext.primaryWindow.durationMinutes)} · ${lifeContext.primaryWindow.label}` : 'No clear gap'}
                accent="#315ED8"
                isDark={isDark}
              />
              <ContextPill
                icon={<Zap size={17} color="#A45B00" />}
                label="LOAD"
                value={titleCase(lifeContext.taskPressure.label)}
                accent="#D98B00"
                isDark={isDark}
              />
              <ContextPill
                icon={lifeContext.energy.windDown ? <Sparkles size={17} color="#7057E8" /> : <Sun size={17} color="#0E9B62" />}
                label="ENERGY"
                value={lifeContext.energy.label}
                accent={lifeContext.energy.windDown ? '#7057E8' : '#0E9B62'}
                isDark={isDark}
              />
              {data.weather ? (
                <ContextPill
                  icon={data.weather.isRaining ? <CloudRain size={17} color="#0D97C8" /> : <Sun size={17} color="#D98B00" />}
                  label="OUTSIDE"
                  value={`${Math.round(data.weather.temp)}° · ${data.weather.description}`}
                  accent={data.weather.isRaining ? '#0D97C8' : '#D98B00'}
                  isDark={isDark}
                />
              ) : null}
            </ScrollView>

            <View style={styles.editHeader}>
              <View style={styles.editLabelRow}>
                <Compass size={14} color={colors.primary} />
                <Text style={[styles.editLabel, { color: colors.primary }]}>THE ONE PAGER EDIT</Text>
              </View>
              <Text style={[styles.editHeadline, { color: colors.text }]}>The strongest move for your life right now.</Text>
            </View>

            <View style={styles.heroWrap}>
              {data.isLoading && !hero ? (
                <View style={[styles.heroLoading, { backgroundColor: isDark ? '#171A20' : '#EEF2F7' }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.heroLoadingText, { color: colors.textSecondary }]}>Reading the shape of your day…</Text>
                </View>
              ) : hero ? (
                <View style={[styles.heroCard, { backgroundColor: isDark ? '#151821' : '#E9EDF6' }]}>
                  {hero.image ? (
                    <ImageBackground source={{ uri: hero.image }} style={styles.heroMedia} imageStyle={styles.heroRadius}>
                      <LinearGradient colors={['rgba(4,7,14,0.03)', 'rgba(4,7,14,0.34)', 'rgba(4,7,14,0.95)']} style={styles.heroOverlay}>
                        <View style={styles.heroTopRow}>
                          <View style={styles.heroKindChip}>
                            <KindIcon kind={hero.kind} size={12} />
                            <Text style={styles.heroKindText}>{hero.eyebrow}</Text>
                          </View>
                          <TouchableOpacity onPress={() => tuneOpportunity(hero)} style={styles.heroTuneButton}>
                            <MoreHorizontal size={19} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.heroBottom}>
                          <Text style={styles.heroTitle} numberOfLines={3}>{hero.title}</Text>
                          <Text style={styles.heroMeta} numberOfLines={2}>{hero.subtitle}</Text>
                          <View style={styles.heroReasons}>
                            {hero.reasons.slice(0, 2).map((reason) => <ReasonLine key={reason} text={reason} />)}
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={[hero.accent, '#111827']} style={styles.heroMedia}>
                      <View style={styles.heroOverlay}>
                        <View style={styles.heroTopRow}>
                          <View style={styles.heroKindChip}><KindIcon kind={hero.kind} size={12} /><Text style={styles.heroKindText}>{hero.eyebrow}</Text></View>
                          <TouchableOpacity onPress={() => tuneOpportunity(hero)} style={styles.heroTuneButton}><MoreHorizontal size={19} color="#FFFFFF" /></TouchableOpacity>
                        </View>
                        <View style={styles.heroBottom}>
                          <Text style={styles.heroTitle}>{hero.title}</Text>
                          <Text style={styles.heroMeta}>{hero.subtitle}</Text>
                          <View style={styles.heroReasons}>{hero.reasons.slice(0, 2).map((reason) => <ReasonLine key={reason} text={reason} />)}</View>
                        </View>
                      </View>
                    </LinearGradient>
                  )}
                  <View style={[styles.heroActionBar, { backgroundColor: isDark ? '#11141A' : '#FFFFFF' }]}>
                    <TouchableOpacity activeOpacity={0.82} onPress={() => primaryAction(hero)} style={[styles.heroPrimaryButton, { backgroundColor: heroSaved ? '#E7F7EE' : colors.primary }]}>
                      {hero.kind === 'event' ? (heroSaved ? <Check size={17} color="#128A50" /> : <Plus size={17} color="#FFFFFF" />) : <ArrowRight size={17} color="#FFFFFF" />}
                      <Text style={[styles.heroPrimaryText, { color: heroSaved ? '#128A50' : '#FFFFFF' }]}>{hero.kind === 'event' ? (heroSaved ? 'In my life' : 'Add to my life') : hero.actionLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.82} onPress={() => openOpportunity(hero)} style={[styles.heroSecondaryButton, { backgroundColor: isDark ? '#252A34' : '#F2F4F7' }]}>
                      <Text style={[styles.heroSecondaryText, { color: colors.text }]}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyHero, { backgroundColor: isDark ? '#171A20' : '#F2F4F7' }]}>
                  <Sparkles size={28} color={colors.primary} />
                  <Text style={[styles.emptyHeroTitle, { color: colors.text }]}>Discover needs a little more signal</Text>
                  <Text style={[styles.emptyHeroCopy, { color: colors.textSecondary }]}>Connect your calendar, follow interests or save something and this surface will start making stronger decisions.</Text>
                </View>
              )}
            </View>

            {lifeContext.signalChips.length > 0 ? (
              <View style={styles.signalBlock}>
                <Text style={[styles.signalLabel, { color: colors.textSecondary }]}>WHAT ONE PAGER IS USING</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signalRail}>
                  {lifeContext.signalChips.map((signal) => (
                    <View key={signal} style={[styles.signalChip, { backgroundColor: isDark ? '#171A20' : '#F3F4F6' }]}>
                      <Text style={[styles.signalText, { color: colors.text }]}>{titleCase(signal)}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {engine.alternatives.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader
                  title={lifeContext.primaryWindow?.isToday ? `Also fits ${lifeContext.primaryWindow.label.toLowerCase()}` : 'Other strong moves'}
                  subtitle="Different ways to use the same slice of your life."
                  colors={colors}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunityRail}>
                  {engine.alternatives.map((item) => (
                    <OpportunityCard key={item.key} item={item} isDark={isDark} colors={colors} onOpen={() => openOpportunity(item)} onTune={() => tuneOpportunity(item)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {windowTimeline.length > 1 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Your next few openings" subtitle="Calendar space paired with something that genuinely fits." action="Open time" onAction={() => setMode('Open Time')} colors={colors} />
                <View style={[styles.timelineCard, { backgroundColor: isDark ? '#15181E' : '#FFFFFF' }]}>
                  {windowTimeline.slice(0, 4).map(({ window, pick }, index) => (
                    <TouchableOpacity key={window.id} activeOpacity={0.84} onPress={() => setPlanWindow(window)} style={[styles.timelineRow, index > 0 && { borderTopColor: isDark ? '#252932' : '#ECEEF2', borderTopWidth: StyleSheet.hairlineWidth }]}> 
                      <View style={styles.timelineDateCol}>
                        <Text style={[styles.timelineDay, { color: colors.text }]}>{window.label.split(' ')[0]}</Text>
                        <Text style={[styles.timelineRange, { color: colors.textSecondary }]}>{window.rangeLabel}</Text>
                      </View>
                      <View style={[styles.timelineDot, { backgroundColor: pick?.accent ?? colors.primary }]} />
                      <View style={styles.timelineCopy}>
                        <Text style={[styles.timelineDuration, { color: colors.textSecondary }]}>{formatDuration(window.durationMinutes)} open</Text>
                        <Text style={[styles.timelinePick, { color: colors.text }]} numberOfLines={1}>{pick?.title ?? 'Keep this space open'}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {topAiSignal ? (
              <View style={styles.sectionBlock}>
                <View style={[styles.aiNotice, { backgroundColor: isDark ? '#161C2B' : '#F0F4FF' }]}>
                  <View style={[styles.aiNoticeIcon, { backgroundColor: isDark ? '#222C44' : '#DEE8FF' }]}><Sparkles size={18} color={colors.primary} /></View>
                  <View style={styles.aiNoticeCopy}>
                    <Text style={[styles.aiNoticeKicker, { color: colors.primary }]}>ONE PAGER NOTICED</Text>
                    <Text style={[styles.aiNoticeTitle, { color: colors.text }]}>{topAiSignal.title}</Text>
                    <Text style={[styles.aiNoticeBody, { color: colors.textSecondary }]} numberOfLines={3}>{topAiSignal.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} style={styles.aiNoticeArrow}><ChevronRight size={18} color={colors.primary} /></TouchableOpacity>
                </View>
              </View>
            ) : null}

            {friendPickOpportunity ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Your people are into this" subtitle="A social opportunity, not another social feed." colors={colors} />
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOpportunity(friendPickOpportunity)} style={[styles.socialCard, { backgroundColor: isDark ? '#19171F' : '#FFF8FC' }]}>
                  {friendPickOpportunity.image ? <Image source={{ uri: friendPickOpportunity.image }} style={styles.socialImage} /> : <View style={[styles.socialImageFallback, { backgroundColor: '#F6E8F1' }]}><Users size={24} color="#B03B7E" /></View>}
                  <View style={styles.socialCopy}>
                    <Text style={styles.socialKicker}>FRIENDS' PICK</Text>
                    <Text style={[styles.socialTitle, { color: colors.text }]} numberOfLines={2}>{friendPickOpportunity.title}</Text>
                    <Text style={[styles.socialMeta, { color: colors.textSecondary }]} numberOfLines={2}>{friendPickOpportunity.reasons.find((reason) => reason.includes('friend')) ?? friendPickOpportunity.subtitle}</Text>
                  </View>
                  <ChevronRight size={17} color="#B03B7E" />
                </TouchableOpacity>
              </View>
            ) : null}

            {identityOpportunity && lifeContext.identityGoals[0] ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="For the person you're becoming" subtitle={`One Pager is keeping “${lifeContext.identityGoals[0]}” in the recommendation mix.`} colors={colors} />
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOpportunity(identityOpportunity)} style={[styles.identityCard, { borderColor: isDark ? '#293328' : '#DCE9DC' }]}>
                  <View style={[styles.identityIcon, { backgroundColor: isDark ? '#1B2A1F' : '#EDF8EF' }]}><Sparkles size={20} color="#238A4B" /></View>
                  <View style={styles.identityCopy}>
                    <Text style={[styles.identityTitle, { color: colors.text }]} numberOfLines={2}>{identityOpportunity.title}</Text>
                    <Text style={[styles.identityReason, { color: colors.textSecondary }]} numberOfLines={2}>{identityOpportunity.reasons.find((reason) => /goal|habit|because/i.test(reason)) ?? identityOpportunity.reasons[0]}</Text>
                  </View>
                  <ArrowRight size={17} color="#238A4B" />
                </TouchableOpacity>
              </View>
            ) : null}

            {data.mediaSignals.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Fresh for your watchlist" subtitle="Your existing library is used as taste data, then filtered out." action="Open Watch" onAction={() => router.push({ pathname: '/(tabs)/shows', params: { subtab: 'for-you' } } as never)} colors={colors} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRail}>
                  {data.mediaSignals.slice(0, 8).map((pick) => (
                    <TouchableOpacity key={pick.id} activeOpacity={0.9} onPress={() => router.push({ pathname: '/(tabs)/shows', params: { subtab: 'for-you' } } as never)} style={styles.posterCard}>
                      {pick.posterUrl ? <Image source={{ uri: pick.posterUrl }} style={styles.posterImage} /> : <LinearGradient colors={['#4D3FA8', '#231C4D']} style={styles.posterFallback}><Clapperboard size={26} color="#FFFFFF" /></LinearGradient>}
                      <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={2}>{pick.title}</Text>
                      <View style={styles.posterMetaRow}>{pick.rating ? <><Star size={11} color="#F5A623" fill="#F5A623" /><Text style={[styles.posterMeta, { color: colors.textSecondary }]}>{pick.rating.toFixed(1)}</Text></> : <Text style={[styles.posterMeta, { color: colors.textSecondary }]}>{pick.mediaType === 'tv' ? 'Series' : 'Movie'}</Text>}</View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {engine.serendipity ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Outside your usual" subtitle="A little controlled serendipity keeps Discover from becoming predictable." colors={colors} />
                <TouchableOpacity activeOpacity={0.9} onPress={() => openOpportunity(engine.serendipity!)} style={[styles.serendipityCard, { backgroundColor: isDark ? '#201A14' : '#FFF8EE' }]}>
                  <View style={styles.serendipityCopy}>
                    <Text style={styles.serendipityKicker}>TRY SOMETHING DIFFERENT</Text>
                    <Text style={[styles.serendipityTitle, { color: colors.text }]}>{engine.serendipity.title}</Text>
                    <Text style={[styles.serendipityMeta, { color: colors.textSecondary }]} numberOfLines={2}>{engine.serendipity.subtitle}</Text>
                  </View>
                  {engine.serendipity.image ? <Image source={{ uri: engine.serendipity.image }} style={styles.serendipityImage} /> : <View style={styles.serendipityIcon}><Compass size={25} color="#B66C16" /></View>}
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <SectionHeader title="Explore your world" subtitle="Go deep when you want to — without putting every feature in the tab bar." colors={colors} />
              <View style={[styles.exploreList, { backgroundColor: isDark ? '#15181E' : '#FFFFFF' }]}>
                {[
                  { label: 'Events', note: data.areaLabel ? `Around ${data.areaLabel}` : 'Things near you', route: '/(tabs)/events', icon: MapPin, accent: '#315ED8' },
                  { label: 'Watch', note: data.watchSignal?.title ?? 'Movies, TV & streaming', route: '/(tabs)/shows', icon: Clapperboard, accent: '#7057E8' },
                  { label: 'Sports', note: data.sportSignals[0]?.favoriteTeamName ?? 'Teams, fights & race weekends', route: '/(tabs)/sports', icon: Trophy, accent: '#D98B00' },
                  { label: 'Habits', note: data.habitSignals[0] ? `${data.habitSignals[0].streak}-day momentum` : 'Routines & programs', route: '/(tabs)/discover', icon: Dumbbell, accent: '#0E9B62' },
                  { label: 'Learn', note: lifeContext.interests[0] ? titleCase(lifeContext.interests[0]) : 'Books, ideas & courses', route: '/(tabs)/learning', icon: BookOpen, accent: '#0D97C8' },
                  { label: 'Cook', note: data.recipeSignal?.title ?? 'Ideas for your kitchen', route: '/(tabs)/cooking', icon: ChefHat, accent: '#EA6A37' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity key={item.label} activeOpacity={0.82} onPress={() => router.push(item.route as never)} style={[styles.exploreRow, index > 0 && { borderTopColor: isDark ? '#252932' : '#ECEEF2', borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={[styles.exploreIcon, { backgroundColor: `${item.accent}18` }]}><Icon size={20} color={item.accent} /></View>
                      <View style={styles.exploreCopy}><Text style={[styles.exploreTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.exploreNote, { color: colors.textSecondary }]} numberOfLines={1}>{item.note}</Text></View>
                      <ChevronRight size={17} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {mode === 'Open Time' ? (
          <View style={styles.modeContent}>
            <View style={styles.modeIntro}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>Your open time</Text>
              <Text style={[styles.modeBody, { color: colors.textSecondary }]}>{eventKit.hasPermission ? 'Real gaps from your calendar, ranked against things One Pager knows you care about.' : 'Calendar access is not active, so these are inferred openings. Connect Calendar from Today for much sharper planning.'}</Text>
            </View>

            {lifeContext.openWindows.length === 0 ? (
              <View style={[styles.emptyMode, { backgroundColor: isDark ? '#171A20' : '#F4F5F7' }]}>
                <CalendarDays size={28} color={colors.primary} />
                <Text style={[styles.emptyModeTitle, { color: colors.text }]}>No useful opening detected</Text>
                <Text style={[styles.emptyModeCopy, { color: colors.textSecondary }]}>A busy calendar should make Discover quieter, not noisier.</Text>
              </View>
            ) : (
              lifeContext.openWindows.slice(0, 7).map((window) => {
                const suggestions = engine.ranked.filter((item) => {
                  if (item.startsAt) return item.startsAt >= window.start && item.startsAt < window.end;
                  return (item.durationMinutes ?? 45) <= window.durationMinutes;
                }).slice(0, 3);
                return (
                  <View key={window.id} style={[styles.windowCard, { backgroundColor: isDark ? '#15181E' : '#FFFFFF' }]}>
                    <View style={styles.windowTop}>
                      <View>
                        <Text style={[styles.windowLabel, { color: colors.text }]}>{window.label}</Text>
                        <Text style={[styles.windowRange, { color: colors.textSecondary }]}>{window.rangeLabel} · {formatDuration(window.durationMinutes)}</Text>
                      </View>
                      <TouchableOpacity activeOpacity={0.82} onPress={() => setPlanWindow(window)} style={[styles.planButton, { backgroundColor: colors.primary }]}><Sparkles size={14} color="#FFFFFF" /><Text style={styles.planButtonText}>Plan it</Text></TouchableOpacity>
                    </View>
                    {suggestions.length > 0 ? (
                      <View style={styles.windowSuggestions}>
                        {suggestions.map((item) => (
                          <TouchableOpacity key={item.key} activeOpacity={0.82} onPress={() => openOpportunity(item)} style={[styles.windowSuggestion, { borderColor: isDark ? '#2B3039' : '#E5E7EB' }]}>
                            <View style={[styles.windowSuggestionIcon, { backgroundColor: `${item.accent}18` }]}><KindIcon kind={item.kind} color={item.accent} size={15} /></View>
                            <View style={styles.windowSuggestionCopy}><Text style={[styles.windowSuggestionTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text><Text style={[styles.windowSuggestionMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.reasons[0] ?? item.subtitle}</Text></View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {mode === 'Near You' ? (
          <View style={styles.modeContent}>
            <View style={styles.modeIntro}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>{data.areaLabel ? `Around ${data.areaLabel}` : 'Around you'}</Text>
              <Text style={[styles.modeBody, { color: colors.textSecondary }]}>Sorted by relevance, timing, distance, your calendar and the things you already care about.</Text>
            </View>
            {data.eventsLoading && engine.eventPicks.length === 0 ? <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View> : null}
            {([
              ['Today', groupNear.today],
              ['Tomorrow', groupNear.tomorrow],
              ['This week', groupNear.week],
              ['Later', groupNear.later],
            ] as const).map(([label, rows]) => rows.length ? (
              <View key={label} style={styles.nearGroup}>
                <Text style={[styles.nearGroupTitle, { color: colors.text }]}>{label}</Text>
                {rows.slice(0, 8).map((item) => <NearbyEventRow key={item.key} item={item} isDark={isDark} colors={colors} onOpen={() => openOpportunity(item)} onTune={() => tuneOpportunity(item)} />)}
              </View>
            ) : null)}
            {!data.eventsLoading && engine.eventPicks.length === 0 ? (
              <View style={[styles.emptyMode, { backgroundColor: isDark ? '#171A20' : '#F4F5F7' }]}><MapPin size={28} color={colors.primary} /><Text style={[styles.emptyModeTitle, { color: colors.text }]}>Nothing strong enough nearby yet</Text><Text style={[styles.emptyModeCopy, { color: colors.textSecondary }]}>That is intentional — Discover should not fill space with weak recommendations.</Text></View>
            ) : null}
            <TouchableOpacity activeOpacity={0.84} onPress={() => router.push('/(tabs)/events')} style={[styles.fullEventsButton, { borderColor: isDark ? '#2B3039' : '#E4E7EC' }]}><CalendarDays size={18} color={colors.primary} /><Text style={[styles.fullEventsText, { color: colors.text }]}>Open full Events discovery</Text><ArrowRight size={18} color={colors.primary} /></TouchableOpacity>
          </View>
        ) : null}

        {mode === 'Saved' ? (
          <View style={styles.modeContent}>
            <View style={styles.modeIntro}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>Things you chose</Text>
              <Text style={[styles.modeBody, { color: colors.textSecondary }]}>Events, watchlist titles, recipes, pinned matches and books — one memory layer across One Pager.</Text>
            </View>

            {data.saved.upcomingSaved.length === 0 && savedLibrary.shows.length === 0 && savedLibrary.recipes.length === 0 && savedLibrary.matches.length === 0 && savedLibrary.books.length === 0 ? (
              <View style={[styles.emptyMode, { backgroundColor: isDark ? '#171A20' : '#F4F5F7' }]}><Sparkles size={28} color={colors.primary} /><Text style={[styles.emptyModeTitle, { color: colors.text }]}>Your saved life is empty</Text><Text style={[styles.emptyModeCopy, { color: colors.textSecondary }]}>Save an event, show, recipe, match or book and Discover will remember it here.</Text></View>
            ) : (
              <>
                <SavedSectionTitle title="Upcoming events" count={data.saved.upcomingSaved.length} colors={colors} />
                {data.saved.upcomingSaved.slice(0, 6).map((event) => (
                  <TouchableOpacity key={event.id} activeOpacity={0.86} onPress={() => router.push(`/(root)/event/${event.id}` as never)} style={[styles.savedRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}>
                    {event.image ? <Image source={{ uri: event.image }} style={styles.savedThumb} /> : <View style={[styles.savedThumbFallback, { backgroundColor: isDark ? '#1D263A' : '#EDF3FF' }]}><MapPin size={18} color={colors.primary} /></View>}
                    <View style={styles.savedCopy}><Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text><Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{[getEventCountdownLabel(event), event.time, event.venue].filter(Boolean).join(' · ')}</Text></View>
                    <ChevronRight size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}

                <SavedSectionTitle title="Watchlist" count={savedLibrary.shows.length} colors={colors} />
                {savedLibrary.shows.slice(0, 6).map((show) => (
                  <TouchableOpacity key={show.id} activeOpacity={0.84} onPress={() => router.push('/(tabs)/shows')} style={[styles.savedSimpleRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}><View style={[styles.savedSimpleIcon, { backgroundColor: '#7057E818' }]}><Clapperboard size={18} color="#7057E8" /></View><View style={styles.savedCopy}><Text style={[styles.savedTitle, { color: colors.text }]}>{show.title}</Text><Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{show.platform} · {show.status}</Text></View><ChevronRight size={16} color={colors.textSecondary} /></TouchableOpacity>
                ))}

                <SavedSectionTitle title="Recipes" count={savedLibrary.recipes.length} colors={colors} />
                {savedLibrary.recipes.slice(0, 6).map((recipe) => (
                  <TouchableOpacity key={recipe.id} activeOpacity={0.84} onPress={() => router.push('/(tabs)/cooking')} style={[styles.savedRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}>{recipe.image ? <Image source={{ uri: recipe.image }} style={styles.savedThumb} /> : <View style={[styles.savedThumbFallback, { backgroundColor: '#EA6A3718' }]}><ChefHat size={18} color="#EA6A37" /></View>}<View style={styles.savedCopy}><Text style={[styles.savedTitle, { color: colors.text }]}>{recipe.title}</Text><Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{recipe.readyInMinutes} min · {recipe.category}</Text></View><ChevronRight size={16} color={colors.textSecondary} /></TouchableOpacity>
                ))}

                <SavedSectionTitle title="Pinned matches" count={savedLibrary.matches.length} colors={colors} />
                {savedLibrary.matches.slice(0, 6).map((match) => (
                  <TouchableOpacity key={match.id} activeOpacity={0.84} onPress={() => router.push('/(tabs)/sports')} style={[styles.savedSimpleRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}><View style={[styles.savedSimpleIcon, { backgroundColor: '#D98B0018' }]}>{match.homeTeamLogo ? <Image source={{ uri: match.homeTeamLogo }} style={styles.savedTeamLogo} /> : <Trophy size={18} color="#D98B00" />}</View><View style={styles.savedCopy}><Text style={[styles.savedTitle, { color: colors.text }]}>{match.homeTeam} vs {match.awayTeam}</Text><Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{match.league} · {match.time}</Text></View><ChevronRight size={16} color={colors.textSecondary} /></TouchableOpacity>
                ))}

                <SavedSectionTitle title="Books" count={savedLibrary.books.length} colors={colors} />
                {savedLibrary.books.slice(0, 6).map((book) => (
                  <TouchableOpacity key={book.id} activeOpacity={0.84} onPress={() => router.push('/(tabs)/learning')} style={[styles.savedSimpleRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}><View style={[styles.savedSimpleIcon, { backgroundColor: '#0D97C818' }]}><BookOpen size={18} color="#0D97C8" /></View><View style={styles.savedCopy}><Text style={[styles.savedTitle, { color: colors.text }]}>{book.title}</Text><Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{book.author}</Text></View><ChevronRight size={16} color={colors.textSecondary} /></TouchableOpacity>
                ))}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(planWindow)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPlanWindow(null)}>
        <View style={[styles.planModal, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
          <View style={styles.planModalHeader}>
            <View style={styles.planModalHeaderCopy}>
              <Text style={[styles.planModalKicker, { color: colors.primary }]}>ONE PAGER PLAN</Text>
              <Text style={[styles.planModalTitle, { color: colors.text }]}>{planWindow?.label}</Text>
              <Text style={[styles.planModalMeta, { color: colors.textSecondary }]}>{planWindow ? `${planWindow.rangeLabel} · ${formatDuration(planWindow.durationMinutes)}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => setPlanWindow(null)} style={[styles.planClose, { backgroundColor: isDark ? '#1C2028' : '#F0F2F5' }]}><X size={20} color={colors.text} /></TouchableOpacity>
          </View>

          <Text style={[styles.planIntro, { color: colors.textSecondary }]}>This is composed from your strongest current recommendations and the time actually available. Nothing is added to your calendar automatically.</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.planItems}>
            {plan?.items.length ? plan.items.map((planItem, index) => (
              <TouchableOpacity key={planItem.id} activeOpacity={0.86} onPress={() => openOpportunity(planItem.opportunity)} style={[styles.planItem, { backgroundColor: isDark ? '#15181E' : '#FFFFFF' }]}>
                <View style={styles.planTimeCol}><Text style={[styles.planTime, { color: colors.text }]}>{planItem.timeLabel.split('–')[0]?.trim()}</Text><View style={[styles.planLine, { backgroundColor: planItem.opportunity.accent }]} /></View>
                <View style={[styles.planKindIcon, { backgroundColor: `${planItem.opportunity.accent}18` }]}><KindIcon kind={planItem.opportunity.kind} color={planItem.opportunity.accent} size={18} /></View>
                <View style={styles.planItemCopy}><Text style={[styles.planItemKicker, { color: planItem.opportunity.accent }]}>{planItem.opportunity.eyebrow}</Text><Text style={[styles.planItemTitle, { color: colors.text }]}>{planItem.opportunity.title}</Text><Text style={[styles.planItemMeta, { color: colors.textSecondary }]}>{planItem.timeLabel}</Text></View>
                <ChevronRight size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            )) : (
              <View style={[styles.emptyMode, { backgroundColor: isDark ? '#171A20' : '#F4F5F7' }]}><Sparkles size={26} color={colors.primary} /><Text style={[styles.emptyModeTitle, { color: colors.text }]}>Keep this window open</Text><Text style={[styles.emptyModeCopy, { color: colors.textSecondary }]}>Nothing currently scores highly enough to fill it. That is a valid recommendation too.</Text></View>
            )}
          </ScrollView>

          {plan?.items.length ? (
            <View style={[styles.planSummary, { borderTopColor: isDark ? '#252932' : '#E8EAF0' }]}>
              <Text style={[styles.planSummaryText, { color: colors.textSecondary }]}>{formatDuration(plan.usedMinutes)} planned · {formatDuration(plan.freeMinutes)} intentionally left free</Text>
              <TouchableOpacity onPress={() => setPlanWindow(null)} style={[styles.planDone, { backgroundColor: colors.primary }]}><Text style={styles.planDoneText}>Done</Text></TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 18 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1 },
  dateLine: { ...appFont('600'), fontSize: 11, letterSpacing: 1.25, fontWeight: '600' as const },
  pageTitle: { ...appFont('700', { display: true }), fontSize: 42, lineHeight: 47, letterSpacing: -1.7, marginTop: 4, fontWeight: '700' as const },
  pageSubtitle: { ...appFont('400'), fontSize: 15, lineHeight: 21, marginTop: 5, maxWidth: 330 },
  tuneButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  modeRail: { gap: 8, paddingTop: 18, paddingRight: 20 },
  modeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  modeChipText: { ...appFont('600'), fontSize: 13, fontWeight: '600' as const },
  contextRail: { paddingHorizontal: 20, gap: 10, paddingBottom: 22 },
  contextPill: { width: 194, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 12 },
  contextPillIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  contextPillCopy: { flex: 1 },
  contextPillLabel: { ...appFont('700'), fontSize: 9, letterSpacing: 1, fontWeight: '700' as const },
  contextPillValue: { ...appFont('600'), fontSize: 13, marginTop: 3, fontWeight: '600' as const },
  editHeader: { paddingHorizontal: 20, marginBottom: 12 },
  editLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  editLabel: { ...appFont('700'), fontSize: 10, letterSpacing: 1.4, fontWeight: '700' as const },
  editHeadline: { ...appFont('600', { display: true }), fontSize: 23, lineHeight: 29, letterSpacing: -0.55, marginTop: 6, maxWidth: 340, fontWeight: '600' as const },
  heroWrap: { paddingHorizontal: 20 },
  heroCard: { borderRadius: 28, overflow: 'hidden' },
  heroMedia: { height: 430 },
  heroRadius: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  heroOverlay: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroKindChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(5,8,14,0.68)', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8, maxWidth: '82%' },
  heroKindText: { ...appFont('700'), color: '#FFFFFF', fontSize: 10, letterSpacing: 1, fontWeight: '700' as const },
  heroTuneButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(5,8,14,0.55)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { gap: 7 },
  heroTitle: { ...appFont('700', { display: true }), color: '#FFFFFF', fontSize: 34, lineHeight: 38, letterSpacing: -1.1, fontWeight: '700' as const },
  heroMeta: { ...appFont('500'), color: 'rgba(255,255,255,0.84)', fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  heroReasons: { gap: 4, marginTop: 6 },
  reasonLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  reasonText: { ...appFont('500'), flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  heroActionBar: { flexDirection: 'row', gap: 10, padding: 12 },
  heroPrimaryButton: { flex: 1, minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroPrimaryText: { ...appFont('700'), fontSize: 15, fontWeight: '700' as const },
  heroSecondaryButton: { paddingHorizontal: 20, minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroSecondaryText: { ...appFont('600'), fontSize: 14, fontWeight: '600' as const },
  heroLoading: { height: 300, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heroLoadingText: { ...appFont('500'), fontSize: 14 },
  emptyHero: { borderRadius: 26, padding: 26, gap: 10 },
  emptyHeroTitle: { ...appFont('700'), fontSize: 20, fontWeight: '700' as const },
  emptyHeroCopy: { ...appFont('400'), fontSize: 14, lineHeight: 20 },
  signalBlock: { paddingHorizontal: 20, marginTop: 18 },
  signalLabel: { ...appFont('700'), fontSize: 9, letterSpacing: 1.2, fontWeight: '700' as const, marginBottom: 9 },
  signalRail: { gap: 8, paddingRight: 20 },
  signalChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  signalText: { ...appFont('600'), fontSize: 12, fontWeight: '600' as const },
  sectionBlock: { marginTop: 34 },
  sectionHeader: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { ...appFont('700', { display: true }), fontSize: 25, lineHeight: 30, letterSpacing: -0.6, fontWeight: '700' as const },
  sectionSubtitle: { ...appFont('400'), fontSize: 13, lineHeight: 18, marginTop: 4 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  sectionActionText: { ...appFont('700'), fontSize: 13, fontWeight: '700' as const },
  opportunityRail: { paddingHorizontal: 20, gap: 12, paddingRight: 24 },
  opportunityCard: { width: 258, borderRadius: 22, overflow: 'hidden' },
  opportunityImage: { height: 154 },
  opportunityImageRadius: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  opportunityImageOverlay: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, maxWidth: '80%' },
  kindChipText: { ...appFont('700'), color: '#FFFFFF', fontSize: 9, letterSpacing: 0.75, fontWeight: '700' as const },
  cardTuneButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(7,9,15,0.62)', alignItems: 'center', justifyContent: 'center' },
  opportunityFallback: { height: 112, padding: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  fallbackIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  opportunityBody: { padding: 15 },
  opportunityEyebrow: { ...appFont('700'), fontSize: 9, letterSpacing: 1, fontWeight: '700' as const },
  opportunityTitle: { ...appFont('700'), fontSize: 20, lineHeight: 24, letterSpacing: -0.35, fontWeight: '700' as const, marginTop: 5 },
  opportunityMeta: { ...appFont('400'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  opportunityReason: { ...appFont('500'), fontSize: 12, lineHeight: 17, marginTop: 9 },
  opportunityFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 13 },
  opportunityAction: { ...appFont('700'), fontSize: 13, fontWeight: '700' as const },
  timelineCard: { marginHorizontal: 20, borderRadius: 22, overflow: 'hidden' },
  timelineRow: { minHeight: 82, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  timelineDateCol: { width: 88 },
  timelineDay: { ...appFont('700'), fontSize: 13, fontWeight: '700' as const },
  timelineRange: { ...appFont('400'), fontSize: 10, marginTop: 3 },
  timelineDot: { width: 7, height: 7, borderRadius: 4 },
  timelineCopy: { flex: 1 },
  timelineDuration: { ...appFont('500'), fontSize: 10, fontWeight: '500' as const },
  timelinePick: { ...appFont('600'), fontSize: 14, marginTop: 3, fontWeight: '600' as const },
  aiNotice: { marginHorizontal: 20, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiNoticeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiNoticeCopy: { flex: 1 },
  aiNoticeKicker: { ...appFont('700'), fontSize: 9, letterSpacing: 1.1, fontWeight: '700' as const },
  aiNoticeTitle: { ...appFont('700'), fontSize: 16, marginTop: 3, fontWeight: '700' as const },
  aiNoticeBody: { ...appFont('400'), fontSize: 12, lineHeight: 17, marginTop: 4 },
  aiNoticeArrow: { padding: 6 },
  socialCard: { marginHorizontal: 20, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  socialImage: { width: 74, height: 74, borderRadius: 17 },
  socialImageFallback: { width: 74, height: 74, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  socialCopy: { flex: 1 },
  socialKicker: { ...appFont('700'), color: '#B03B7E', fontSize: 9, letterSpacing: 1, fontWeight: '700' as const },
  socialTitle: { ...appFont('700'), fontSize: 16, lineHeight: 20, marginTop: 3, fontWeight: '700' as const },
  socialMeta: { ...appFont('400'), fontSize: 12, lineHeight: 17, marginTop: 4 },
  identityCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1 },
  identityTitle: { ...appFont('700'), fontSize: 16, lineHeight: 21, fontWeight: '700' as const },
  identityReason: { ...appFont('400'), fontSize: 12, lineHeight: 17, marginTop: 4 },
  posterRail: { paddingHorizontal: 20, gap: 12, paddingRight: 24 },
  posterCard: { width: 128 },
  posterImage: { width: 128, height: 190, borderRadius: 18 },
  posterFallback: { width: 128, height: 190, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  posterTitle: { ...appFont('600'), fontSize: 13, lineHeight: 17, marginTop: 8, fontWeight: '600' as const },
  posterMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  posterMeta: { ...appFont('500'), fontSize: 11, fontWeight: '500' as const },
  serendipityCard: { marginHorizontal: 20, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  serendipityCopy: { flex: 1 },
  serendipityKicker: { ...appFont('700'), color: '#B66C16', fontSize: 9, letterSpacing: 1.1, fontWeight: '700' as const },
  serendipityTitle: { ...appFont('700'), fontSize: 19, lineHeight: 24, marginTop: 4, fontWeight: '700' as const },
  serendipityMeta: { ...appFont('400'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  serendipityImage: { width: 82, height: 92, borderRadius: 18 },
  serendipityIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#FFEACB', alignItems: 'center', justifyContent: 'center' },
  exploreList: { marginHorizontal: 20, borderRadius: 22, overflow: 'hidden' },
  exploreRow: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  exploreIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  exploreCopy: { flex: 1 },
  exploreTitle: { ...appFont('700'), fontSize: 14, fontWeight: '700' as const },
  exploreNote: { ...appFont('400'), fontSize: 11, marginTop: 2 },
  modeContent: { paddingHorizontal: 20 },
  modeIntro: { marginBottom: 22 },
  modeTitle: { ...appFont('700', { display: true }), fontSize: 31, lineHeight: 36, letterSpacing: -0.9, fontWeight: '700' as const },
  modeBody: { ...appFont('400'), fontSize: 14, lineHeight: 20, marginTop: 7 },
  emptyMode: { borderRadius: 22, padding: 24, gap: 9, alignItems: 'flex-start' },
  emptyModeTitle: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  emptyModeCopy: { ...appFont('400'), fontSize: 13, lineHeight: 19 },
  windowCard: { borderRadius: 22, padding: 16, marginBottom: 12 },
  windowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  windowLabel: { ...appFont('700'), fontSize: 18, fontWeight: '700' as const },
  windowRange: { ...appFont('400'), fontSize: 12, marginTop: 3 },
  planButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9 },
  planButtonText: { ...appFont('700'), color: '#FFFFFF', fontSize: 12, fontWeight: '700' as const },
  windowSuggestions: { marginTop: 14, gap: 8 },
  windowSuggestion: { borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  windowSuggestionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  windowSuggestionCopy: { flex: 1 },
  windowSuggestionTitle: { ...appFont('600'), fontSize: 13, fontWeight: '600' as const },
  windowSuggestionMeta: { ...appFont('400'), fontSize: 10, marginTop: 2 },
  nearGroup: { marginBottom: 24 },
  nearGroupTitle: { ...appFont('700'), fontSize: 21, marginBottom: 7, fontWeight: '700' as const },
  nearbyRow: { minHeight: 104, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  nearbyThumb: { width: 82, height: 82, borderRadius: 17 },
  nearbyThumbFallback: { width: 82, height: 82, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  nearbyCopy: { flex: 1 },
  nearbyTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nearbyKicker: { ...appFont('700'), fontSize: 9, letterSpacing: 0.9, fontWeight: '700' as const },
  nearbyTitle: { ...appFont('700'), fontSize: 15, lineHeight: 19, marginTop: 3, fontWeight: '700' as const },
  nearbyMeta: { ...appFont('400'), fontSize: 11, marginTop: 4 },
  nearbyReason: { ...appFont('500'), fontSize: 10, marginTop: 4, fontWeight: '500' as const },
  inlineTuneButton: { padding: 6 },
  fullEventsButton: { marginTop: 6, minHeight: 54, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  fullEventsText: { ...appFont('700'), flex: 1, fontSize: 14, fontWeight: '700' as const },
  centerState: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  savedSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 5 },
  savedSectionTitle: { ...appFont('700'), fontSize: 20, fontWeight: '700' as const },
  savedCount: { ...appFont('600'), fontSize: 12, fontWeight: '600' as const },
  savedRow: { minHeight: 88, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  savedThumb: { width: 64, height: 64, borderRadius: 14 },
  savedThumbFallback: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  savedSimpleRow: { minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  savedSimpleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  savedTeamLogo: { width: 27, height: 27, resizeMode: 'contain' },
  savedCopy: { flex: 1 },
  savedTitle: { ...appFont('700'), fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  savedMeta: { ...appFont('400'), fontSize: 11, marginTop: 3 },
  planModal: { flex: 1 },
  planModalHeader: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planModalHeaderCopy: { flex: 1 },
  planModalKicker: { ...appFont('700'), fontSize: 9, letterSpacing: 1.2, fontWeight: '700' as const },
  planModalTitle: { ...appFont('700', { display: true }), fontSize: 31, lineHeight: 35, marginTop: 3, fontWeight: '700' as const },
  planModalMeta: { ...appFont('400'), fontSize: 13, marginTop: 4 },
  planClose: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planIntro: { ...appFont('400'), fontSize: 13, lineHeight: 19, paddingHorizontal: 20, marginTop: 8 },
  planItems: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120, gap: 10 },
  planItem: { minHeight: 88, borderRadius: 20, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  planTimeCol: { width: 62, alignItems: 'flex-start' },
  planTime: { ...appFont('700'), fontSize: 12, fontWeight: '700' as const },
  planLine: { width: 26, height: 3, borderRadius: 2, marginTop: 8 },
  planKindIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  planItemCopy: { flex: 1 },
  planItemKicker: { ...appFont('700'), fontSize: 8, letterSpacing: 0.9, fontWeight: '700' as const },
  planItemTitle: { ...appFont('700'), fontSize: 15, lineHeight: 19, marginTop: 3, fontWeight: '700' as const },
  planItemMeta: { ...appFont('400'), fontSize: 10, marginTop: 3 },
  planSummary: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26, backgroundColor: 'rgba(255,255,255,0.98)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  planSummaryText: { ...appFont('500'), flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
  planDone: { borderRadius: 15, paddingHorizontal: 18, paddingVertical: 11 },
  planDoneText: { ...appFont('700'), color: '#FFFFFF', fontSize: 13, fontWeight: '700' as const },
});
