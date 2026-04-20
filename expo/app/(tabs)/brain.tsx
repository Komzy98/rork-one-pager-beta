import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Waves,
  ChevronRight,
  CircleDot,
} from 'lucide-react-native';

import { useAIBrain, BrainDomain, DomainSignal } from '@/hooks/useAIBrain';
import { useTheme } from '@/hooks/useTheme';
import { useUserProfile } from '@/hooks/useUserProfile';

const DOMAIN_ROUTE: Record<BrainDomain, string> = {
  habits: '/(tabs)/tasks',
  productivity: '/(tabs)/tasks',
  entertainment: '/(tabs)/shows',
  sports: '/(tabs)/sports',
  lifestyle: '/(tabs)/events',
};

const MOOD_COLORS: Record<string, [string, string, string]> = {
  optimized: ['#0b1d2a', '#093a4a', '#0ea5a4'],
  balanced: ['#0b1020', '#1b2347', '#5b6cf5'],
  strained: ['#1b0d1f', '#3a1533', '#e3427a'],
  recovering: ['#0f0a1c', '#231438', '#7c3aed'],
};

function PulsingCore({ score, color }: { score: number; color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [pulse, rotate]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.1] });
  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.coreWrap}>
      <Animated.View
        style={[
          styles.coreRing,
          { transform: [{ scale }], borderColor: color, opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.coreRingOuter,
          { transform: [{ rotate: spin }], borderColor: `${color}55` },
        ]}
      />
      <View style={[styles.coreInner, { borderColor: color }]}>
        <Brain size={30} color={color} strokeWidth={2.2} />
        <Text style={[styles.coreScore, { color }]}>{score}</Text>
        <Text style={styles.coreLabel}>system score</Text>
      </View>
    </View>
  );
}

function SignalNode({
  signal,
  onPress,
  index,
}: {
  signal: DomainSignal;
  onPress: () => void;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const flow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 2600 + index * 180,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [anim, flow, index]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const flowOpacity = flow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.6, 0.15],
  });

  const statusText =
    signal.status === 'strong'
      ? 'Strong signal'
      : signal.status === 'steady'
      ? 'Steady'
      : signal.status === 'weak'
      ? 'Weak'
      : 'Idle';

  return (
    <Animated.View
      style={[
        styles.signalCard,
        { opacity: anim, transform: [{ translateY }], borderColor: `${signal.color}33` },
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.signalTouchable}>
        <Animated.View
          style={[
            styles.signalFlowBar,
            { backgroundColor: signal.color, opacity: flowOpacity },
          ]}
        />
        <View style={styles.signalTopRow}>
          <View style={[styles.signalIconBox, { backgroundColor: `${signal.color}20` }]}>
            <Text style={styles.signalEmoji}>{signal.emoji}</Text>
          </View>
          <View style={styles.signalHead}>
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <View style={styles.signalStatusRow}>
              <CircleDot size={9} color={signal.color} />
              <Text style={[styles.signalStatus, { color: signal.color }]}>{statusText}</Text>
            </View>
          </View>
          <View style={styles.signalScoreBox}>
            <Text style={[styles.signalScore, { color: signal.color }]}>{signal.score}</Text>
            <Text style={styles.signalScoreUnit}>/100</Text>
          </View>
        </View>
        <Text style={styles.signalSummary}>{signal.summary}</Text>
        <View style={styles.signalMeta}>
          {signal.metrics.map((m) => (
            <View key={m.label} style={styles.signalMetaItem}>
              <Text style={styles.signalMetaValue}>{m.value}</Text>
              <Text style={styles.signalMetaLabel}>{m.label}</Text>
            </View>
          ))}
          <View style={styles.signalFeedLink}>
            <Waves size={11} color="rgba(255,255,255,0.55)" />
            <Text style={styles.signalFeedLinkText}>feeding brain</Text>
          </View>
        </View>
        <View style={styles.signalBarBg}>
          <View
            style={[
              styles.signalBarFg,
              { backgroundColor: signal.color, width: `${Math.max(4, signal.score)}%` },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BrainScreen() {
  const brain = useAIBrain();
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();

  const gradient = MOOD_COLORS[brain.mood];
  const primary = gradient[2];

  const onPressSignal = useCallback((domain: BrainDomain) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push(DOMAIN_ROUTE[domain] as never);
  }, []);

  const timeGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning brief';
    if (h < 17) return 'Afternoon brief';
    if (h < 21) return 'Evening brief';
    return 'Night brief';
  }, []);

  const topDirective = brain.directives[0];

  return (
    <View style={[styles.root, { backgroundColor: '#05060d' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`row-${i}`} style={[styles.gridLine, { top: `${i * 12.5}%` }]} />
        ))}
      </View>

      <ScrollView
        testID="brain-scroll"
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={brain.isThinking}
            onRefresh={() => {}}
            tintColor="#fff"
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.brandPill}>
              <Sparkles size={12} color={primary} />
              <Text style={[styles.brandText, { color: primary }]}>OS · v1</Text>
            </View>
            <Text style={styles.title}>{timeGreeting}</Text>
            <Text style={styles.subtitle}>
              {profile?.name ? `Hello, ${profile.name.split(' ')[0]}` : 'Welcome back'} — your brain is{' '}
              <Text style={{ color: primary }}>{brain.mood}</Text>.
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <PulsingCore score={brain.systemScore} color={primary} />
          <Text style={styles.tagline}>{brain.tagline}</Text>
          <View style={styles.moodRow}>
            <View style={[styles.moodChip, { borderColor: `${primary}55` }]}>
              <Zap size={11} color={primary} />
              <Text style={[styles.moodChipText, { color: primary }]}>
                {brain.isThinking ? 'thinking…' : 'live'}
              </Text>
            </View>
            <View style={[styles.moodChip, { borderColor: 'rgba(255,255,255,0.15)' }]}>
              <Clock size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.moodChipTextMuted}>updated now</Text>
            </View>
          </View>
        </View>

        {topDirective ? (
          <View style={[styles.directiveHero, { borderColor: `${primary}55` }]}>
            <View style={styles.directiveHeroHead}>
              <Text style={styles.directiveHeroKicker}>TODAY&apos;S DIRECTIVE</Text>
              <View style={[styles.impactPill, impactStyle(topDirective.impact)]}>
                <Text style={styles.impactPillText}>{topDirective.impact.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.directiveHeroTitle}>{topDirective.title}</Text>
            <Text style={styles.directiveHeroRationale}>{topDirective.rationale}</Text>
            <View style={styles.directiveDomains}>
              {topDirective.domains.map((d) => (
                <View key={d} style={styles.directiveDomainPill}>
                  <Text style={styles.directiveDomainText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionLabel}>NEURAL FEED</Text>
            <Text style={styles.sectionTitle}>Signals into the brain</Text>
          </View>
          <Text style={styles.sectionHint}>tap to open</Text>
        </View>
        <View style={styles.signals}>
          {brain.signals.map((s, i) => (
            <SignalNode
              key={s.id}
              signal={s}
              index={i}
              onPress={() => onPressSignal(s.id)}
            />
          ))}
        </View>

        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionLabel}>OPTIMISATION</Text>
            <Text style={styles.sectionTitle}>Directives for today</Text>
          </View>
        </View>
        <View style={styles.directiveList}>
          {brain.directives.map((d) => (
            <View key={d.id} style={styles.directiveRow}>
              <View style={styles.directiveBullet}>
                <ChevronRight size={14} color={primary} />
              </View>
              <View style={styles.directiveBody}>
                <View style={styles.directiveRowHead}>
                  <Text style={styles.directiveTitle}>{d.title}</Text>
                  <View style={[styles.timeframePill, impactStyle(d.impact)]}>
                    <Text style={styles.timeframeText}>{d.timeframe}</Text>
                  </View>
                </View>
                <Text style={styles.directiveReason}>{d.rationale}</Text>
                <View style={styles.directiveDomains}>
                  {d.domains.map((dom) => (
                    <View key={dom} style={styles.directiveDomainPill}>
                      <Text style={styles.directiveDomainText}>{dom}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionLabel}>PREDICTIONS</Text>
            <Text style={styles.sectionTitle}>What the brain expects</Text>
          </View>
        </View>
        <View style={styles.predRow}>
          {brain.predictions.map((p) => (
            <View key={p.id} style={styles.predCard}>
              <View style={styles.predHead}>
                <TrendingUp size={13} color={primary} />
                <Text style={styles.predHorizon}>{p.horizon}</Text>
              </View>
              <Text style={styles.predTitle}>{p.title}</Text>
              <Text style={styles.predDetail}>{p.detail}</Text>
              <View style={styles.confBar}>
                <View
                  style={[
                    styles.confBarFill,
                    { width: `${Math.round(p.confidence * 100)}%`, backgroundColor: primary },
                  ]}
                />
              </View>
              <Text style={styles.confText}>
                confidence {Math.round(p.confidence * 100)}%
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionLabel}>CROSS-DOMAIN</Text>
            <Text style={styles.sectionTitle}>Correlations the brain found</Text>
          </View>
        </View>
        <View style={styles.insightList}>
          {brain.insights.map((ins) => (
            <View key={ins.id} style={styles.insightCard}>
              <View style={styles.insightHead}>
                {ins.domains.map((d) => (
                  <View key={d} style={styles.insightDomain}>
                    <Text style={styles.insightDomainText}>{d}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.insightHeadline}>{ins.headline}</Text>
              <Text style={styles.insightDetail}>{ins.detail}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.viewAnalytics, { borderColor: `${primary}55` }]}
          onPress={() => router.push('/(root)/analytics' as never)}
          activeOpacity={0.85}
          testID="brain-analytics"
        >
          <Text style={styles.viewAnalyticsText}>Open deep analytics</Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.footerHint} pointerEvents="none">
        every tab feeds the brain · habits · productivity · entertainment · sports · lifestyle
      </Text>
    </View>
  );
}

function impactStyle(impact: 'low' | 'medium' | 'high') {
  switch (impact) {
    case 'high':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239,68,68,0.5)' };
    case 'medium':
      return { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245,158,11,0.5)' };
    default:
      return { backgroundColor: 'rgba(148,163,184,0.18)', borderColor: 'rgba(148,163,184,0.4)' };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  headerRow: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginTop: 4,
  },

  hero: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  coreWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coreRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  coreRingOuter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  coreInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.4,
    backgroundColor: 'rgba(5,6,13,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreScore: {
    fontSize: 30,
    fontWeight: '800' as const,
    marginTop: 4,
    letterSpacing: -0.6,
  },
  coreLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tagline: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 320,
    fontWeight: '500' as const,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  moodChipText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
  moodChipTextMuted: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  directiveHero: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  directiveHeroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  directiveHeroKicker: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
  },
  directiveHeroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  directiveHeroRationale: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  sectionHeadRow: {
    paddingHorizontal: 22,
    marginTop: 28,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  sectionHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  signals: { paddingHorizontal: 18, gap: 10 },
  signalCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  signalTouchable: { gap: 10 },
  signalFlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  signalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalEmoji: { fontSize: 22 },
  signalHead: { flex: 1 },
  signalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  signalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  signalStatus: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  signalScoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  signalScore: { fontSize: 24, fontWeight: '800' as const },
  signalScoreUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  signalSummary: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 18,
  },
  signalMeta: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 2 },
  signalMetaItem: {},
  signalMetaValue: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  signalMetaLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  signalFeedLink: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalFeedLinkText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  signalBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 4,
  },
  signalBarFg: { height: 4, borderRadius: 2 },

  directiveList: { paddingHorizontal: 18, gap: 10 },
  directiveRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  directiveBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  directiveBody: { flex: 1 },
  directiveRowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  directiveTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
  },
  directiveReason: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  directiveDomains: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  directiveDomainPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  directiveDomainText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  timeframePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  timeframeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  impactPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  impactPillText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
  },

  predRow: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  predCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 150,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  predHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predHorizon: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  predTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  predDetail: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  confBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  confBarFill: { height: 3, borderRadius: 2 },
  confText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.3,
  },

  insightList: { paddingHorizontal: 18, gap: 10 },
  insightCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  insightHead: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  insightDomain: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  insightDomainText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightHeadline: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  insightDetail: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  viewAnalytics: {
    marginHorizontal: 18,
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  viewAnalyticsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },

  footerHint: {
    position: 'absolute',
    bottom: 108,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingHorizontal: 40,
  },
});
