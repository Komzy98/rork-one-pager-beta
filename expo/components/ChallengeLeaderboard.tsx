import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
} from 'react-native';
import {
  Trophy,
  Users,
  Target,
  Clock,
  ChevronRight,
  Crown,
  Medal,
  Flame,
  Plus,
  X,
  Calendar,
  Share2,
  UserPlus,
} from 'lucide-react-native';
import { Challenge, ChallengeParticipant, Leaderboard, LeaderboardEntry } from '@/types/gamification';

interface ChallengeLeaderboardProps {
  challenges: Challenge[];
  leaderboard?: Leaderboard;
  currentUserId?: string;
  onJoinChallenge?: (challenge: Challenge) => void;
  onLeaveChallenge?: (challengeId: string) => void;
  onCreateChallenge?: () => void;
  onShareChallenge?: (challenge: Challenge) => void;
  onInviteFriend?: (challenge: Challenge) => void;
  compact?: boolean;
}

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return '#666';
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown size={16} color="#FFD700" />;
    case 2: return <Medal size={16} color="#C0C0C0" />;
    case 3: return <Medal size={16} color="#CD7F32" />;
    default: return null;
  }
};

const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
};

const ParticipantRow: React.FC<{
  participant: ChallengeParticipant;
  maxProgress: number;
  isCurrentUser: boolean;
}> = ({ participant, maxProgress, isCurrentUser }) => {
  const progressPercent = (participant.progress / maxProgress) * 100;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  return (
    <View style={[styles.participantRow, isCurrentUser && styles.currentUserRow]}>
      <View style={styles.rankContainer}>
        {getRankIcon(participant.rank) || (
          <Text style={styles.rankNumber}>{participant.rank}</Text>
        )}
      </View>

      {participant.avatar ? (
        <Image source={{ uri: participant.avatar }} style={styles.participantAvatar} />
      ) : (
        <View style={[styles.participantAvatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {participant.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.participantInfo}>
        <Text style={[styles.participantName, isCurrentUser && styles.currentUserName]}>
          {participant.userName}
          {isCurrentUser && ' (You)'}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getRankColor(participant.rank),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {participant.progress}/{maxProgress}
          </Text>
        </View>
      </View>
    </View>
  );
};

const ChallengeCard: React.FC<{
  challenge: Challenge;
  currentUserId?: string;
  onPress: () => void;
  onJoin?: () => void;
}> = ({ challenge, currentUserId, onPress, onJoin }) => {
  const daysRemaining = getDaysRemaining(challenge.endDate);
  const isParticipant = challenge.participants.some(p => p.userId === currentUserId);
  const currentUserProgress = challenge.participants.find(p => p.userId === currentUserId);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.challengeCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.challengeHeader, { backgroundColor: challenge.color + '15' }]}>
          <View style={[styles.challengeIconContainer, { backgroundColor: challenge.color }]}>
            <Target size={24} color="#FFFFFF" />
          </View>
          <View style={styles.challengeHeaderInfo}>
            <Text style={styles.challengeName}>{challenge.name}</Text>
            <View style={styles.challengeMeta}>
              <View style={styles.metaItem}>
                <Users size={12} color="#666" />
                <Text style={styles.metaText}>{challenge.participants.length}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={12} color="#666" />
                <Text style={styles.metaText}>{daysRemaining}d left</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      challenge.status === 'active'
                        ? '#4CAF5020'
                        : challenge.status === 'upcoming'
                        ? '#2196F320'
                        : '#9E9E9E20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        challenge.status === 'active'
                          ? '#4CAF50'
                          : challenge.status === 'upcoming'
                          ? '#2196F3'
                          : '#9E9E9E',
                    },
                  ]}
                >
                  {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.challengeDescription} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.challengeGoal}>
          <Flame size={14} color={challenge.color} />
          <Text style={styles.goalText}>{challenge.goal.description}</Text>
        </View>

        {isParticipant && currentUserProgress && (
          <View style={styles.yourProgress}>
            <Text style={styles.yourProgressLabel}>Your Progress</Text>
            <View style={styles.yourProgressBar}>
              <View
                style={[
                  styles.yourProgressFill,
                  {
                    width: `${(currentUserProgress.progress / challenge.goal.target) * 100}%`,
                    backgroundColor: challenge.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.yourProgressText}>
              {currentUserProgress.progress}/{challenge.goal.target} • Rank #{currentUserProgress.rank}
            </Text>
          </View>
        )}

        <View style={styles.challengeFooter}>
          <View style={styles.participantAvatars}>
            {challenge.participants.slice(0, 4).map((p, index) => (
              <View
                key={p.userId}
                style={[styles.miniAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }]}
              >
                {p.avatar ? (
                  <Image source={{ uri: p.avatar }} style={styles.miniAvatarImage} />
                ) : (
                  <View style={[styles.miniAvatarImage, styles.miniAvatarPlaceholder]}>
                    <Text style={styles.miniAvatarInitial}>
                      {p.userName.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {challenge.participants.length > 4 && (
              <View style={[styles.miniAvatar, { marginLeft: -8 }]}>
                <View style={[styles.miniAvatarImage, styles.moreParticipants]}>
                  <Text style={styles.moreText}>+{challenge.participants.length - 4}</Text>
                </View>
              </View>
            )}
          </View>

          {!isParticipant && onJoin && (
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: challenge.color }]}
              onPress={onJoin}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}

          {isParticipant && (
            <ChevronRight size={20} color="#BDBDBD" />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const LeaderboardSection: React.FC<{
  entries: LeaderboardEntry[];
  title: string;
}> = ({ entries, title }) => {
  return (
    <View style={styles.leaderboardSection}>
      <View style={styles.leaderboardHeader}>
        <Trophy size={18} color="#FFD700" />
        <Text style={styles.leaderboardTitle}>{title}</Text>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.emptyText}>No entries yet</Text>
      ) : (
        entries.map((entry) => (
          <View
            key={entry.userId}
            style={[
              styles.leaderboardEntry,
              entry.isCurrentUser && styles.currentUserEntry,
            ]}
          >
            <View style={styles.entryRank}>
              {getRankIcon(entry.rank) || (
                <Text style={[styles.entryRankNumber, { color: getRankColor(entry.rank) }]}>
                  {entry.rank}
                </Text>
              )}
            </View>

            {entry.avatar ? (
              <Image source={{ uri: entry.avatar }} style={styles.entryAvatar} />
            ) : (
              <View style={[styles.entryAvatar, styles.entryAvatarPlaceholder]}>
                <Text style={styles.entryAvatarInitial}>
                  {entry.userName.charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.entryInfo}>
              <Text style={[styles.entryName, entry.isCurrentUser && styles.currentUserName]}>
                {entry.userName}
                {entry.isCurrentUser && ' (You)'}
              </Text>
              {entry.change !== 0 && (
                <Text
                  style={[
                    styles.entryChange,
                    { color: entry.change > 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {entry.change > 0 ? '↑' : '↓'} {Math.abs(entry.change)}
                </Text>
              )}
            </View>

            <Text style={styles.entryScore}>{entry.score}</Text>
          </View>
        ))
      )}
    </View>
  );
};

export const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  challenges,
  leaderboard,
  currentUserId,
  onJoinChallenge,
  onLeaveChallenge,
  onCreateChallenge,
  onShareChallenge,
  onInviteFriend,
  compact = false,
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  const filteredChallenges = challenges.filter(c => c.status === activeTab);

  const content = (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Target size={24} color="#6366F1" />
            <Text style={styles.headerTitle}>Challenges</Text>
          </View>
          {onCreateChallenge && (
            <TouchableOpacity style={styles.createButton} onPress={onCreateChallenge}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.tabs}>
        {(['active', 'upcoming', 'completed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredChallenges.length === 0 ? (
        <View style={styles.emptyState}>
          <Target size={48} color="#E0E0E0" />
          <Text style={styles.emptyStateTitle}>No {activeTab} challenges</Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'active'
              ? 'Join or create a challenge to get started!'
              : activeTab === 'upcoming'
              ? 'Check back later for new challenges'
              : 'Complete challenges to see them here'}
          </Text>
        </View>
      ) : (
        filteredChallenges.map(challenge => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            currentUserId={currentUserId}
            onPress={() => setSelectedChallenge(challenge)}
            onJoin={() => onJoinChallenge?.(challenge)}
          />
        ))
      )}

      {leaderboard && leaderboard.entries.length > 0 && (
        <LeaderboardSection entries={leaderboard.entries} title={leaderboard.name} />
      )}

    </View>
  );

  if (compact) {
    return (
      <>
        {content}
        <Modal
          visible={!!selectedChallenge}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedChallenge(null)}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedChallenge && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setSelectedChallenge(null)}
                  >
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{selectedChallenge.name}</Text>
                  <View style={styles.modalActions}>
                    {onShareChallenge && (
                      <TouchableOpacity
                        style={styles.modalAction}
                        onPress={() => onShareChallenge(selectedChallenge)}
                      >
                        <Share2 size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                    {onInviteFriend && (
                      <TouchableOpacity
                        style={styles.modalAction}
                        onPress={() => onInviteFriend(selectedChallenge)}
                      >
                        <UserPlus size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View
                    style={[
                      styles.modalBanner,
                      { backgroundColor: selectedChallenge.color + '20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalIcon,
                        { backgroundColor: selectedChallenge.color },
                      ]}
                    >
                      <Target size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.modalBannerInfo}>
                      <View style={styles.modalDateRow}>
                        <Calendar size={14} color="#666" />
                        <Text style={styles.modalDate}>
                          {formatDate(selectedChallenge.startDate)} -{' '}
                          {formatDate(selectedChallenge.endDate)}
                        </Text>
                      </View>
                      <Text style={styles.modalDaysLeft}>
                        {getDaysRemaining(selectedChallenge.endDate)} days remaining
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modalDescription}>
                    {selectedChallenge.description}
                  </Text>

                  <View style={styles.modalGoalSection}>
                    <Text style={styles.sectionTitle}>Goal</Text>
                    <View style={styles.modalGoalCard}>
                      <Flame size={20} color={selectedChallenge.color} />
                      <Text style={styles.modalGoalText}>
                        {selectedChallenge.goal.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalParticipantsSection}>
                    <Text style={styles.sectionTitle}>
                      Leaderboard ({selectedChallenge.participants.length} participants)
                    </Text>
                    {selectedChallenge.participants.map(participant => (
                      <ParticipantRow
                        key={participant.userId}
                        participant={participant}
                        maxProgress={selectedChallenge.goal.target}
                        isCurrentUser={participant.userId === currentUserId}
                      />
                    ))}
                  </View>

                  {selectedChallenge.rewards.length > 0 && (
                    <View style={styles.modalRewardsSection}>
                      <Text style={styles.sectionTitle}>Rewards</Text>
                      {selectedChallenge.rewards.map((reward, index) => (
                        <View key={index} style={styles.rewardRow}>
                          <View
                            style={[
                              styles.rewardRank,
                              { backgroundColor: getRankColor(reward.rank) + '20' },
                            ]}
                          >
                            {getRankIcon(reward.rank) || (
                              <Text style={{ color: getRankColor(reward.rank) }}>
                                #{reward.rank}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.rewardDescription}>{reward.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selectedChallenge.participants.some(p => p.userId === currentUserId) ? (
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={() => {
                        onLeaveChallenge?.(selectedChallenge.id);
                        setSelectedChallenge(null);
                      }}
                    >
                      <Text style={styles.leaveButtonText}>Leave Challenge</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinButtonLarge, { backgroundColor: selectedChallenge.color }]}
                      onPress={() => {
                        onJoinChallenge?.(selectedChallenge);
                        setSelectedChallenge(null);
                      }}
                    >
                      <Text style={styles.joinButtonLargeText}>Join Challenge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      </>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {content}
      <Modal
        visible={!!selectedChallenge}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedChallenge(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedChallenge && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setSelectedChallenge(null)}
                  >
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{selectedChallenge.name}</Text>
                  <View style={styles.modalActions}>
                    {onShareChallenge && (
                      <TouchableOpacity
                        style={styles.modalAction}
                        onPress={() => onShareChallenge(selectedChallenge)}
                      >
                        <Share2 size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                    {onInviteFriend && (
                      <TouchableOpacity
                        style={styles.modalAction}
                        onPress={() => onInviteFriend(selectedChallenge)}
                      >
                        <UserPlus size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View
                    style={[
                      styles.modalBanner,
                      { backgroundColor: selectedChallenge.color + '20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalIcon,
                        { backgroundColor: selectedChallenge.color },
                      ]}
                    >
                      <Target size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.modalBannerInfo}>
                      <View style={styles.modalDateRow}>
                        <Calendar size={14} color="#666" />
                        <Text style={styles.modalDate}>
                          {formatDate(selectedChallenge.startDate)} -{' '}
                          {formatDate(selectedChallenge.endDate)}
                        </Text>
                      </View>
                      <Text style={styles.modalDaysLeft}>
                        {getDaysRemaining(selectedChallenge.endDate)} days remaining
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modalDescription}>
                    {selectedChallenge.description}
                  </Text>

                  <View style={styles.modalGoalSection}>
                    <Text style={styles.sectionTitle}>Goal</Text>
                    <View style={styles.modalGoalCard}>
                      <Flame size={20} color={selectedChallenge.color} />
                      <Text style={styles.modalGoalText}>
                        {selectedChallenge.goal.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalParticipantsSection}>
                    <Text style={styles.sectionTitle}>
                      Leaderboard ({selectedChallenge.participants.length} participants)
                    </Text>
                    {selectedChallenge.participants.map(participant => (
                      <ParticipantRow
                        key={participant.userId}
                        participant={participant}
                        maxProgress={selectedChallenge.goal.target}
                        isCurrentUser={participant.userId === currentUserId}
                      />
                    ))}
                  </View>

                  {selectedChallenge.rewards.length > 0 && (
                    <View style={styles.modalRewardsSection}>
                      <Text style={styles.sectionTitle}>Rewards</Text>
                      {selectedChallenge.rewards.map((reward, index) => (
                        <View key={index} style={styles.rewardRow}>
                          <View
                            style={[
                              styles.rewardRank,
                              { backgroundColor: getRankColor(reward.rank) + '20' },
                            ]}
                          >
                            {getRankIcon(reward.rank) || (
                              <Text style={{ color: getRankColor(reward.rank) }}>
                                #{reward.rank}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.rewardDescription}>{reward.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selectedChallenge.participants.some(p => p.userId === currentUserId) ? (
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={() => {
                        onLeaveChallenge?.(selectedChallenge.id);
                        setSelectedChallenge(null);
                      }}
                    >
                      <Text style={styles.leaveButtonText}>Leave Challenge</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinButtonLarge, { backgroundColor: selectedChallenge.color }]}
                      onPress={() => {
                        onJoinChallenge?.(selectedChallenge);
                        setSelectedChallenge(null);
                      }}
                    >
                      <Text style={styles.joinButtonLargeText}>Join Challenge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
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
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tabActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1A1A2E',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    marginTop: 8,
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeHeaderInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  challengeGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalText: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '500' as const,
  },
  yourProgress: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 12,
    borderRadius: 8,
  },
  yourProgressLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  yourProgressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  yourProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  yourProgressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  participantAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 14,
  },
  miniAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  miniAvatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarInitial: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
  },
  moreParticipants: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#666',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  leaderboardSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  currentUserEntry: {
    backgroundColor: '#F0F4FF',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  entryRank: {
    width: 32,
    alignItems: 'center',
  },
  entryRankNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  entryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  entryAvatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryAvatarInitial: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1A1A2E',
  },
  currentUserName: {
    fontWeight: '700' as const,
    color: '#6366F1',
  },
  entryChange: {
    fontSize: 11,
    marginTop: 2,
  },
  entryScore: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  currentUserRow: {
    backgroundColor: '#F0F4FF',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#666',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1A1A2E',
    marginBottom: 6,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 45,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalClose: {
    padding: 4,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    textAlign: 'center' as const,
    marginHorizontal: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalAction: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBannerInfo: {
    flex: 1,
  },
  modalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 13,
    color: '#666',
  },
  modalDaysLeft: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A2E',
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    marginBottom: 12,
  },
  modalGoalSection: {
    marginBottom: 20,
  },
  modalGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  modalGoalText: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '500' as const,
    flex: 1,
  },
  modalParticipantsSection: {
    marginBottom: 20,
  },
  modalRewardsSection: {
    marginBottom: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rewardRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardDescription: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  joinButtonLarge: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  leaveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
  },
  leaveButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default ChallengeLeaderboard;
