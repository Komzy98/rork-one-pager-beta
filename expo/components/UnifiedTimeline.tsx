import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { Calendar, Clock, TrendingUp, Lightbulb, Target, AlertCircle, ChevronRight, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, cardShadow } from '@/constants/design';
import { UnifiedActivity, ActivityInsight, SmartRecommendation, CrossActivityInsight } from '@/types/activity';

interface UnifiedTimelineProps {
  activities: UnifiedActivity[];
  insights: ActivityInsight[];
  recommendations: SmartRecommendation[];
  crossInsights?: CrossActivityInsight[];
  onActivityPress?: (activity: UnifiedActivity) => void;
  onInsightPress?: (insight: ActivityInsight) => void;
  onRecommendationPress?: (recommendation: SmartRecommendation) => void;
  onCrossInsightPress?: (insight: CrossActivityInsight) => void;
}

const AnimatedProgressBar = React.memo(function AnimatedProgressBar({ progress, color, delay = 0 }: { progress: number; color: string; delay?: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 1000,
      delay,
      useNativeDriver: false,
    }).start();
  }, [progress, delay]);
  
  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <Animated.View 
      style={[
        styles.progressFill,
        { 
          width: animatedWidth,
          backgroundColor: color
        }
      ]} 
    />
  );
});

function UnifiedTimelineComponent({
  activities,
  insights,
  recommendations,
  crossInsights = [],
  onActivityPress,
  onInsightPress,
  onRecommendationPress,
  onCrossInsightPress
}: UnifiedTimelineProps) {
  
  const getActivityIcon = (activity: UnifiedActivity) => {
    switch (activity.type) {
      case 'habit':
        return '🔄';
      case 'task':
        return '✅';
      case 'show':
        return '🎬';
      case 'sport':
        return '⚽';
      case 'calendar':
        return '📅';
      default:
        return '📋';
    }
  };

  const getActivityColor = (activity: UnifiedActivity) => {
    switch (activity.priority) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return COLORS.textLight;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'active':
        return '#3B82F6';
      case 'overdue':
        return '#EF4444';
      default:
        return COLORS.textLight;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp size={16} color={COLORS.primary} />;
      case 'recommendation':
        return <Lightbulb size={16} color="#F59E0B" />;
      case 'achievement':
        return <Target size={16} color="#10B981" />;
      case 'warning':
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Lightbulb size={16} color={COLORS.textLight} />;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-GB', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.primary + '15', COLORS.primary + '05']}
          style={styles.headerGradient}
        >
          <View style={styles.headerIconContainer}>
            <Calendar size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Unified Timeline</Text>
          <Text style={styles.headerSubtitle}>Your day at a glance</Text>
        </LinearGradient>
      </View>

      {recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Smart Recommendations</Text>
          </View>
          
          {recommendations.slice(0, 2).map((recommendation, index) => {
            const AnimatedCard = ({ children }: { children: React.ReactNode }) => {
              const fadeAnim = useRef(new Animated.Value(0)).current;
              const slideAnim = useRef(new Animated.Value(20)).current;
              
              useEffect(() => {
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    delay: index * 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(slideAnim, {
                    toValue: 0,
                    delay: index * 100,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                ]).start();
              }, []);
              
              return (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {children}
                </Animated.View>
              );
            };

            return (
              <AnimatedCard key={recommendation.id || `rec-${index}`}>
                <TouchableOpacity
                  style={styles.recommendationCard}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    if (recommendation?.id && recommendation.title?.trim()) {
                      onRecommendationPress?.(recommendation);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FEF3C7', '#FDE68A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.recommendationGradient}
                  >
                    <View style={styles.recommendationIconContainer}>
                      <Zap size={20} color="#F59E0B" fill="#F59E0B" />
                    </View>
                    <View style={styles.recommendationContent}>
                      <View style={styles.recommendationHeader}>
                        <Text style={styles.recommendationTitle} numberOfLines={1}>{recommendation.title}</Text>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>
                            {Math.round(recommendation.confidence * 100)}%
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recommendationDescription} numberOfLines={2}>
                        {recommendation.description}
                      </Text>
                      {recommendation.suggestedTime && (
                        <View style={styles.timeContainer}>
                          <Clock size={12} color="#92400E" />
                          <Text style={styles.timeText}>
                            {formatTime(recommendation.suggestedTime)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={20} color="#F59E0B" style={styles.chevron} />
                  </LinearGradient>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Today&apos;s Activities</Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Target size={40} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyStateText}>No activities scheduled for today</Text>
            <Text style={styles.emptyStateSubtext}>Add tasks, habits, or events to get started</Text>
          </View>
        ) : (
          activities.map((activity, index) => {
            const AnimatedActivityCard = ({ children }: { children: React.ReactNode }) => {
              const fadeAnim = useRef(new Animated.Value(0)).current;
              const slideAnim = useRef(new Animated.Value(30)).current;
              const scaleAnim = useRef(new Animated.Value(0.95)).current;
              
              useEffect(() => {
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    delay: index * 80,
                    useNativeDriver: true,
                  }),
                  Animated.spring(slideAnim, {
                    toValue: 0,
                    delay: index * 80,
                    tension: 40,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    delay: index * 80,
                    tension: 40,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                ]).start();
              }, []);
              
              return (
                <Animated.View style={{ 
                  opacity: fadeAnim, 
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ]
                }}>
                  {children}
                </Animated.View>
              );
            };

            return (
              <AnimatedActivityCard key={activity.id || `activity-${index}`}>
                <TouchableOpacity
                  style={[
                    styles.activityCard,
                    activity.type === 'habit' && activity.status === 'completed' ? styles.completedHabitCard : {}
                  ]}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    if (activity?.id && activity.title?.trim()) {
                      onActivityPress?.(activity);
                    }
                  }}
                  disabled={activity.type === 'habit' && activity.status === 'completed'}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityHeader}>
                    <View style={styles.activityTitleContainer}>
                      <View style={styles.activityIconContainer}>
                        <Text style={styles.activityIcon}>
                          {getActivityIcon(activity)}
                        </Text>
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {activity.title}
                        </Text>
                        <Text style={styles.activityCategory}>
                          {activity.category}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.activityMeta}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(activity.status) }
                      ]}>
                        <Text style={styles.statusText}>
                          {activity.status}
                        </Text>
                      </View>
                      
                      {activity.scheduledTime && (
                        <View style={styles.timeContainer}>
                          <Clock size={12} color={COLORS.textLight} />
                          <Text style={styles.timeTextSecondary}>
                            {formatTime(activity.scheduledTime)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {activity.description && (
                    <Text style={styles.activityDescription} numberOfLines={2}>
                      {activity.description}
                    </Text>
                  )}

                  {activity.progress !== undefined && activity.progress > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <AnimatedProgressBar 
                          progress={activity.progress} 
                          color={getActivityColor(activity)}
                          delay={index * 80 + 200}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round(activity.progress)}%
                      </Text>
                    </View>
                  )}

                  {activity.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {activity.tags.slice(0, 3).map((tag) => (
                        <View key={`${activity.id}-${tag}`} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedActivityCard>
            );
          })
        )}
      </View>

      {crossInsights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Cross-Activity Insights</Text>
          </View>
          
          {crossInsights.slice(0, 2).map((insight, index) => {
            const AnimatedInsightCard = ({ children }: { children: React.ReactNode }) => {
              const fadeAnim = useRef(new Animated.Value(0)).current;
              const slideAnim = useRef(new Animated.Value(20)).current;
              
              useEffect(() => {
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    delay: index * 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(slideAnim, {
                    toValue: 0,
                    delay: index * 100,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                ]).start();
              }, []);
              
              return (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {children}
                </Animated.View>
              );
            };

            return (
              <AnimatedInsightCard key={insight.id || `insight-${index}`}>
                <TouchableOpacity
                  style={styles.crossInsightCard}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    if (insight?.id && insight.title?.trim()) {
                      onCrossInsightPress?.(insight);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.crossInsightHeader}>
                    <Text style={styles.crossInsightTitle}>{insight.title}</Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.confidenceText, { color: '#8B5CF6' }]}>
                        {Math.round(insight.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.crossInsightDescription} numberOfLines={2}>
                    {insight.description}
                  </Text>
                  
                  <View style={styles.correlationContainer}>
                    {insight.correlatedActivities.slice(0, 2).map((correlation, idx) => (
                      <View key={`${insight.id}-${idx}`} style={styles.correlationItem}>
                        <View style={[
                          styles.correlationDot,
                          { backgroundColor: correlation.impact === 'positive' ? '#10B981' : 
                                            correlation.impact === 'negative' ? '#EF4444' : '#6B7280' }
                        ]} />
                        <Text style={styles.correlationText}>
                          {correlation.activityType} ({Math.round(Math.abs(correlation.correlation) * 100)}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.insightContainer}>
                    <Text style={styles.insightText}>💡 {insight.insight}</Text>
                  </View>
                </TouchableOpacity>
              </AnimatedInsightCard>
            );
          })}
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Activity Insights</Text>
          </View>
          
          {insights.slice(0, 3).map((insight, index) => {
            const AnimatedInsightCard = ({ children }: { children: React.ReactNode }) => {
              const fadeAnim = useRef(new Animated.Value(0)).current;
              const slideAnim = useRef(new Animated.Value(20)).current;
              
              useEffect(() => {
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    delay: index * 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(slideAnim, {
                    toValue: 0,
                    delay: index * 100,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                ]).start();
              }, []);
              
              return (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {children}
                </Animated.View>
              );
            };

            return (
              <AnimatedInsightCard key={insight.id || `insight-${index}`}>
                <TouchableOpacity
                  style={styles.insightCard}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    if (insight?.id && insight.title?.trim()) {
                      onInsightPress?.(insight);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.insightHeader}>
                    {getInsightIcon(insight.type)}
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(insight.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightDescription} numberOfLines={3}>
                    {insight.description}
                  </Text>
                  {insight.actionable && insight.actions && insight.actions.length > 0 && (
                    <View style={styles.actionContainer}>
                      <Text style={styles.actionLabel}>
                        💡 {insight.actions[0]?.label || 'Take Action'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedInsightCard>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerGradient: {
    padding: SPACING.lg,
    borderRadius: 24,
    alignItems: 'center',
    ...cardShadow(2),
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...cardShadow(2),
  },
  headerTitle: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  section: {
    paddingVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  
  recommendationCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
    ...cardShadow(3),
  },
  recommendationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  recommendationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadow(2),
  },
  recommendationContent: {
    flex: 1,
  },
  chevron: {
    opacity: 0.6,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '700',
    flex: 1,
    marginRight: SPACING.sm,
    letterSpacing: -0.3,
  },
  recommendationDescription: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
  },
  
  activityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...cardShadow(2),
    overflow: 'hidden',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIconContainer: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow(1),
  },
  activityIcon: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 52,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  activityCategory: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  activityDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...cardShadow(1),
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...cardShadow(1),
  },
  confidenceText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  timeTextSecondary: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    ...cardShadow(1),
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    minWidth: 35,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...cardShadow(1),
  },
  tagText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  
  insightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...cardShadow(2),
    overflow: 'hidden',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  insightTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  insightDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  actionContainer: {
    backgroundColor: COLORS.surfaceSecondary,
    padding: 12,
    borderRadius: 12,
    ...cardShadow(1),
  },
  actionLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...cardShadow(1),
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  crossInsightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    ...cardShadow(2),
    overflow: 'hidden',
  },
  crossInsightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  crossInsightTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
    letterSpacing: -0.2,
  },
  crossInsightDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  correlationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  correlationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    ...cardShadow(1),
  },
  correlationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  correlationText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  insightContainer: {
    backgroundColor: '#F8FAFC',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...cardShadow(1),
  },
  insightText: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  
  completedHabitCard: {
    opacity: 0.75,
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
});

export default React.memo(UnifiedTimelineComponent);
