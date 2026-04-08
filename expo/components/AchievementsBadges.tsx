import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import {
  Award,
  Flame,
  Trophy,
  Star,
  Users,
  Target,
  Crown,
  CheckCircle,
  Lock,
  ChevronRight,
  X,
  Zap,
} from 'lucide-react-native';
import { Badge, Achievement, getRarityColor, UserStats } from '@/types/gamification';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AchievementsBadgesProps {
  badges: Badge[];
  achievements: Achievement[];
  stats: UserStats;
  onBadgePress?: (badge: Badge) => void;
  onAchievementPress?: (achievement: Achievement) => void;
  compact?: boolean;
}

const getIconComponent = (iconName: string, size: number, color: string) => {
  const icons: Record<string, React.ReactNode> = {
    'flame': <Flame size={size} color={color} />,
    'trophy': <Trophy size={size} color={color} />,
    'star': <Star size={size} color={color} />,
    'users': <Users size={size} color={color} />,
    'target': <Target size={size} color={color} />,
    'crown': <Crown size={size} color={color} />,
    'check-circle': <CheckCircle size={size} color={color} />,
    'award': <Award size={size} color={color} />,
    'plus-circle': <CheckCircle size={size} color={color} />,
    'calendar-check': <CheckCircle size={size} color={color} />,
    'sunrise': <Star size={size} color={color} />,
    'moon': <Star size={size} color={color} />,
    'heart': <Star size={size} color={color} />,
    'grid': <Target size={size} color={color} />,
  };
  return icons[iconName] || <Award size={size} color={color} />;
};

const BadgeCard: React.FC<{
  badge: Badge;
  onPress?: () => void;
  compact?: boolean;
}> = ({ badge, onPress, compact }) => {
  const isUnlocked = !!badge.unlockedAt;
  const progress = badge.progress || 0;
  const maxProgress = badge.maxProgress || 1;
  const progressPercent = Math.min(100, (progress / maxProgress) * 100);
  const rarityColor = getRarityColor(badge.rarity);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.badgeCompact,
            { transform: [{ scale: scaleAnim }] },
            !isUnlocked && styles.badgeLocked,
          ]}
        >
          <View
            style={[
              styles.badgeIconCompact,
              { backgroundColor: isUnlocked ? badge.color + '20' : '#E0E0E0' },
            ]}
          >
            {getIconComponent(badge.icon, 20, isUnlocked ? badge.color : '#9E9E9E')}
            {!isUnlocked && (
              <View style={styles.lockOverlayCompact}>
                <Lock size={10} color="#666" />
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.badgeCard,
          { transform: [{ scale: scaleAnim }] },
          !isUnlocked && styles.badgeLocked,
        ]}
      >
        <View style={[styles.rarityIndicator, { backgroundColor: rarityColor }]} />
        
        <View
          style={[
            styles.badgeIcon,
            { backgroundColor: isUnlocked ? badge.color + '20' : '#F5F5F5' },
          ]}
        >
          {getIconComponent(badge.icon, 28, isUnlocked ? badge.color : '#BDBDBD')}
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Lock size={14} color="#666" />
            </View>
          )}
        </View>

        <Text
          style={[styles.badgeName, !isUnlocked && styles.textMuted]}
          numberOfLines={1}
        >
          {badge.name}
        </Text>

        <Text
          style={[styles.badgeDescription, !isUnlocked && styles.textMuted]}
          numberOfLines={2}
        >
          {badge.description}
        </Text>

        {!isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: badge.color }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress}/{maxProgress}
            </Text>
          </View>
        )}

        {isUnlocked && (
          <View style={[styles.unlockedBadge, { backgroundColor: badge.color + '20' }]}>
            <CheckCircle size={12} color={badge.color} />
            <Text style={[styles.unlockedText, { color: badge.color }]}>Unlocked</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const AchievementRow: React.FC<{
  achievement: Achievement;
  onPress?: () => void;
}> = ({ achievement, onPress }) => {
  const progressPercent = (achievement.progress / achievement.maxProgress) * 100;
  const rarityColor = getRarityColor(achievement.rarity);

  return (
    <TouchableOpacity
      style={[styles.achievementRow, achievement.isUnlocked && styles.achievementUnlocked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.achievementIcon,
          {
            backgroundColor: achievement.isUnlocked
              ? achievement.color + '20'
              : '#F5F5F5',
          },
        ]}
      >
        {getIconComponent(
          achievement.icon,
          24,
          achievement.isUnlocked ? achievement.color : '#BDBDBD'
        )}
      </View>

      <View style={styles.achievementInfo}>
        <View style={styles.achievementHeader}>
          <Text
            style={[
              styles.achievementName,
              !achievement.isUnlocked && styles.textMuted,
            ]}
          >
            {achievement.name}
          </Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.achievementDescription, !achievement.isUnlocked && styles.textMuted]}
          numberOfLines={1}
        >
          {achievement.description}
        </Text>

        {!achievement.isUnlocked && (
          <View style={styles.achievementProgress}>
            <View style={styles.progressBarSmall}>
              <View
                style={[
                  styles.progressFillSmall,
                  { width: `${progressPercent}%`, backgroundColor: achievement.color },
                ]}
              />
            </View>
            <Text style={styles.progressTextSmall}>
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
        )}
      </View>

      <ChevronRight size={20} color="#BDBDBD" />
    </TouchableOpacity>
  );
};

const LevelProgress: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const progressPercent = (stats.xp / stats.xpToNextLevel) * 100;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  return (
    <View style={styles.levelContainer}>
      <View style={styles.levelHeader}>
        <View style={styles.levelBadge}>
          <Zap size={16} color="#FFD700" />
          <Text style={styles.levelNumber}>Level {stats.level}</Text>
        </View>
        <Text style={styles.levelTitle}>{stats.title}</Text>
      </View>

      <View style={styles.xpContainer}>
        <View style={styles.xpBar}>
          <Animated.View
            style={[
              styles.xpFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.xpText}>
          {stats.xp} / {stats.xpToNextLevel} XP
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalCompletions}</Text>
          <Text style={styles.statLabel}>Completions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
      </View>
    </View>
  );
};

export const AchievementsBadges: React.FC<AchievementsBadgesProps> = ({
  badges,
  achievements,
  stats,
  onBadgePress,
  onAchievementPress,
  compact = false,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);
  const displayBadges = compact ? unlockedBadges.slice(0, 6) : badges;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.compactTitleRow}>
            <Trophy size={18} color="#FFD700" />
            <Text style={styles.compactTitle}>Achievements</Text>
          </View>
          <TouchableOpacity onPress={() => onBadgePress?.(displayBadges[0])}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.compactBadgesRow}>
          {displayBadges.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              compact
              onPress={() => {
                setSelectedBadge(badge);
                onBadgePress?.(badge);
              }}
            />
          ))}
          {unlockedBadges.length === 0 && (
            <Text style={styles.noBadgesText}>Complete habits to earn badges!</Text>
          )}
        </View>

        <View style={styles.compactStats}>
          <View style={styles.compactStatItem}>
            <Flame size={14} color="#FF6B35" />
            <Text style={styles.compactStatValue}>{stats.currentStreak}</Text>
            <Text style={styles.compactStatLabel}>Streak</Text>
          </View>
          <View style={styles.compactStatItem}>
            <Star size={14} color="#FFD700" />
            <Text style={styles.compactStatValue}>{stats.level}</Text>
            <Text style={styles.compactStatLabel}>Level</Text>
          </View>
          <View style={styles.compactStatItem}>
            <Award size={14} color="#9B59B6" />
            <Text style={styles.compactStatValue}>{unlockedBadges.length}</Text>
            <Text style={styles.compactStatLabel}>Badges</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LevelProgress stats={stats} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>
              {unlockedBadges.length}/{badges.length}
            </Text>
          </View>
        </View>

        {unlockedBadges.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Unlocked</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.badgesScroll}
              contentContainerStyle={styles.badgesContent}
            >
              {unlockedBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  onPress={() => {
                    setSelectedBadge(badge);
                    onBadgePress?.(badge);
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}

        {lockedBadges.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>In Progress</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.badgesScroll}
              contentContainerStyle={styles.badgesContent}
            >
              {lockedBadges.slice(0, 10).map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  onPress={() => {
                    setSelectedBadge(badge);
                    onBadgePress?.(badge);
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Award size={20} color="#9B59B6" />
          <Text style={styles.sectionTitle}>Achievements</Text>
        </View>

        {achievements.map(achievement => (
          <AchievementRow
            key={achievement.id}
            achievement={achievement}
            onPress={() => onAchievementPress?.(achievement)}
          />
        ))}
      </View>

      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.badgeModal}>
            {selectedBadge && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedBadge(null)}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>

                <View
                  style={[
                    styles.modalBadgeIcon,
                    { backgroundColor: selectedBadge.color + '20' },
                  ]}
                >
                  {getIconComponent(selectedBadge.icon, 48, selectedBadge.color)}
                </View>

                <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                
                <View
                  style={[
                    styles.modalRarity,
                    { backgroundColor: getRarityColor(selectedBadge.rarity) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRarityText,
                      { color: getRarityColor(selectedBadge.rarity) },
                    ]}
                  >
                    {selectedBadge.rarity.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.modalDescription}>
                  {selectedBadge.description}
                </Text>

                {selectedBadge.unlockedAt ? (
                  <View style={styles.modalUnlocked}>
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text style={styles.modalUnlockedText}>
                      Unlocked on{' '}
                      {new Date(selectedBadge.unlockedAt).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalProgress}>
                    <View style={styles.modalProgressBar}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            width: `${((selectedBadge.progress || 0) / (selectedBadge.maxProgress || 1)) * 100}%`,
                            backgroundColor: selectedBadge.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.modalProgressText}>
                      {selectedBadge.progress || 0} / {selectedBadge.maxProgress || 1}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600' as const,
  },
  compactBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  compactStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  compactStatLabel: {
    fontSize: 11,
    color: '#666',
  },
  noBadgesText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic' as const,
  },
  levelContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  xpContainer: {
    marginBottom: 16,
  },
  xpBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8E8',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    flex: 1,
  },
  badgeCount: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  badgesScroll: {
    paddingLeft: 16,
  },
  badgesContent: {
    paddingRight: 16,
    gap: 12,
  },
  badgeCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeCompact: {
    alignItems: 'center',
  },
  badgeLocked: {
    opacity: 0.7,
  },
  rarityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
  },
  lockOverlayCompact: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1A1A2E',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center' as const,
    lineHeight: 14,
    marginBottom: 8,
  },
  textMuted: {
    color: '#BDBDBD',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  achievementUnlocked: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1A2E',
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 11,
    color: '#999',
    minWidth: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH - 64,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalBadgeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    marginBottom: 8,
  },
  modalRarity: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalRarityText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalUnlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalUnlockedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500' as const,
  },
  modalProgress: {
    width: '100%',
    alignItems: 'center',
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalProgressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500' as const,
  },
});

export default AchievementsBadges;
