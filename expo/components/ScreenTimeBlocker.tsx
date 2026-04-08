import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Smartphone,
  PhoneOff,
  Play,
  Square,
  ChevronRight,
  Plus,
  Flame,
  Clock,
  Shield,
  Trophy,
  Timer,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useScreenTime } from '@/hooks/useScreenTime';
import { useTheme } from '@/hooks/useTheme';
import { TimeBlock } from '@/types/screenTime';
import { router } from 'expo-router';

const getTodayFormatted = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

interface ActiveTimerCardProps {
  block: TimeBlock;
}

const ActiveTimerCard = React.memo(({ block }: ActiveTimerCardProps) => {
  const { getElapsedSeconds, getTargetSeconds, completeSession, cancelSession } = useScreenTime();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const elapsed = getElapsedSeconds(block);
  const target = getTargetSeconds(block);
  const progress = Math.min(elapsed / target, 1);
  const remaining = Math.max(target - elapsed, 0);
  const isComplete = progress >= 1;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (isComplete) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeSession(block.id);
    }
  }, [isComplete, block.id, completeSession]);

  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelSession(block.id);
  }, [block.id, cancelSession]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.activeTimerCard, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={[block.color, adjustColor(block.color, -30)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activeTimerGradient}
      >
        <View style={styles.activeTimerHeader}>
          <View style={styles.activeTimerLeft}>
            <View style={styles.activeTimerIconRing}>
              <PhoneOff size={20} color="#fff" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.activeTimerName}>{block.name}</Text>
              <Text style={styles.activeTimerSubtext}>
                {block.blockedApps.length > 0
                  ? `Blocking ${block.blockedApps.length} categories`
                  : 'Full phone block'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <View style={styles.activeTimerBody}>
          <Text style={styles.timerDisplay}>{formatTime(remaining)}</Text>
          <Text style={styles.timerLabel}>remaining</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth as any }]} />
        </View>

        <View style={styles.activeTimerFooter}>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}% complete</Text>
          <View style={styles.activeTimerBadge}>
            <Shield size={12} color="#fff" />
            <Text style={styles.activeTimerBadgeText}>Focus Active</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

ActiveTimerCard.displayName = 'ActiveTimerCard';

interface BlockCardProps {
  block: TimeBlock;
  isCompleted: boolean;
}

const BlockCard = React.memo(({ block, isCompleted }: BlockCardProps) => {
  const { startSession } = useScreenTime();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const duration = useMemo(() => {
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  }, [block.startTime, block.endTime]);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startSession(block.id);
  }, [block.id, startSession]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const format12h = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={isCompleted ? undefined : handleStart}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isCompleted}
        style={[styles.blockCard, isCompleted && styles.blockCardCompleted]}
      >
        <View style={[styles.blockColorStripe, { backgroundColor: block.color }]} />
        <View style={styles.blockCardContent}>
          <View style={styles.blockCardTop}>
            <View style={[styles.blockIconBg, { backgroundColor: block.color + '18' }]}>
              {isCompleted ? (
                <Shield size={20} color={block.color} />
              ) : (
                <Smartphone size={20} color={block.color} />
              )}
            </View>
            <View style={styles.blockCardInfo}>
              <Text style={[styles.blockName, isCompleted && styles.blockNameCompleted]}>
                {block.name}
              </Text>
              <View style={styles.blockMeta}>
                <Clock size={12} color="#8E8E93" />
                <Text style={styles.blockMetaText}>
                  {format12h(block.startTime)} – {format12h(block.endTime)} · {formatMinutes(duration)}
                </Text>
              </View>
            </View>
            {isCompleted ? (
              <View style={[styles.completedBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.completedBadgeText}>Done</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: block.color }]}
                onPress={handleStart}
              >
                <Play size={14} color="#fff" fill="#fff" />
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.blockCardBottom}>
            {block.blockedApps.length > 0 ? (
              <View style={styles.appTags}>
                {block.blockedApps.slice(0, 3).map((app) => (
                  <View key={app} style={[styles.appTag, { backgroundColor: block.color + '12' }]}>
                    <Text style={[styles.appTagText, { color: block.color }]}>{app}</Text>
                  </View>
                ))}
                {block.blockedApps.length > 3 && (
                  <Text style={styles.moreApps}>+{block.blockedApps.length - 3}</Text>
                )}
              </View>
            ) : (
              <View style={[styles.appTag, { backgroundColor: '#F4433612' }]}>
                <Text style={[styles.appTagText, { color: '#F44336' }]}>Full Phone Block</Text>
              </View>
            )}
            {block.stats.currentStreak > 0 && (
              <View style={styles.streakMini}>
                <Flame size={12} color="#F59E0B" />
                <Text style={styles.streakMiniText}>{block.stats.currentStreak}d</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

BlockCard.displayName = 'BlockCard';

export default function ScreenTimeBlocker() {
  const { todayBlocks, activeSession, screenTimeStats, blocks } = useScreenTime();
  const { colors } = useTheme();
  const today = getTodayFormatted();

  if (blocks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(244, 67, 54, 0.12)' }]}>
              <PhoneOff size={18} color="#F44336" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Screen Time Blocks</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.emptyState}
          onPress={() => router.push('/(root)/new-time-block' as any)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyGradient}
          >
            <View style={styles.emptyIconRing}>
              <PhoneOff size={32} color="#fff" strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>Take Control of Screen Time</Text>
            <Text style={styles.emptySubtext}>
              Create time blocks to build healthier phone habits. Track your focus streaks and reclaim your day.
            </Text>
            <View style={styles.emptyAction}>
              <Plus size={16} color="#fff" />
              <Text style={styles.emptyActionText}>Add First Time Block</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(244, 67, 54, 0.12)' }]}>
            <PhoneOff size={18} color="#F44336" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Screen Time</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(root)/new-time-block' as any)}
          style={styles.addBtn}
        >
          <Plus size={18} color="#F44336" />
        </TouchableOpacity>
      </View>

      {screenTimeStats.totalMinutesSaved > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: '#10B98118' }]}>
            <Timer size={14} color="#10B981" />
            <Text style={[styles.statChipText, { color: '#10B981' }]}>
              {formatMinutes(screenTimeStats.totalMinutesSaved)} saved
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#F59E0B18' }]}>
            <Flame size={14} color="#F59E0B" />
            <Text style={[styles.statChipText, { color: '#F59E0B' }]}>
              {screenTimeStats.currentStreak}d streak
            </Text>
          </View>
          {screenTimeStats.weeklyCompletionRate > 0 && (
            <View style={[styles.statChip, { backgroundColor: '#3B82F618' }]}>
              <Trophy size={14} color="#3B82F6" />
              <Text style={[styles.statChipText, { color: '#3B82F6' }]}>
                {screenTimeStats.weeklyCompletionRate}% weekly
              </Text>
            </View>
          )}
        </View>
      )}

      {activeSession && <ActiveTimerCard block={activeSession} />}

      <View style={styles.blocksList}>
        {todayBlocks
          .filter(b => b.id !== activeSession?.id)
          .map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              isCompleted={!!block.completions[today]}
            />
          ))}
      </View>

      {todayBlocks.length > 0 && (
        <View style={styles.progressSummary}>
          <View style={styles.summaryProgressBar}>
            <View
              style={[
                styles.summaryProgressFill,
                {
                  width: `${todayBlocks.length > 0
                    ? (screenTimeStats.todayCompleted / todayBlocks.length) * 100
                    : 0}%`,
                  backgroundColor: '#10B981',
                },
              ]}
            />
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {screenTimeStats.todayCompleted}/{todayBlocks.length} blocks completed today
          </Text>
        </View>
      )}
    </View>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  activeTimerCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  activeTimerGradient: {
    padding: 20,
    borderRadius: 20,
  },
  activeTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  activeTimerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeTimerIconRing: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTimerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  activeTimerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTimerBody: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '200' as const,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  activeTimerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPercent: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  activeTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTimerBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blocksList: {
    gap: 10,
  },
  blockCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  blockCardCompleted: {
    opacity: 0.65,
  },
  blockColorStripe: {
    width: 4,
  },
  blockCardContent: {
    flex: 1,
    padding: 14,
  },
  blockCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  blockIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockCardInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 3,
  },
  blockNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  blockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blockMetaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blockCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  appTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  appTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  moreApps: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  streakMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakMiniText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  progressSummary: {
    marginTop: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 28,
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
