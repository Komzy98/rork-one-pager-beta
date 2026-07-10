import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  ActionSheetIOS,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Users,
  Heart,
  Bell,
  Plus,
  X,
  Trophy,
  LogOut,
  ChevronRight,
  Cloud,
  Camera,
  Sparkles,
  Check,
  Moon,
  Sun,
  Palette,
  Flame,
  BookOpen,
  Target,
  Edit3,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  GripVertical,
  LayoutGrid,
  RotateCcw,
  Search,
  Shield,
  FileText,
  Dumbbell,
  Clapperboard,
  CookingPot,
  GraduationCap,
  Zap,
  Briefcase,
  Swords,
  Car,
  Ticket,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import {
  getAutoSummarySchedule,
  getTodayYmd,
  setAutoSummaryEnabled,
  setAutoSummaryTime,
  setDailySummaryNotifyEnabled,
  formatAutoSummaryTime,
  isAutoSummaryEnabled,
} from '@/utils/dailySummaryStats';
import { enterRecoveryModeManual, exitRecoveryMode } from '@/utils/recoveryMode';
import JoySourcesEditor from '@/components/JoySourcesEditor';
import { inferJoySources, isJoySourcesEmpty } from '@/utils/joySources';
import type { JoySources } from '@/types/habit';
import { syncDailySummaryNotification } from '@/utils/dailySummaryNotifications';
import { useNotificationsSafe } from '@/hooks/useBackgroundServices';
import { useGamification } from '@/hooks/useHabitsEnhancement';
import { useTheme } from '@/hooks/useTheme';
import SwipeableTabContainer from '@/components/SwipeableTabContainer';
import CustomHeader from '@/components/CustomHeader';

import { useCloudSync } from '@/hooks/useCloudSync';
import { CheckCircle2, AlertCircle, RefreshCw, Download } from 'lucide-react-native';
import {
  migrateLocalDataToSupabaseUser,
  getLastGuestUserId,
} from '@/utils/localToSupabaseMigration';
import type { CloudMergeStats } from '@/utils/syncMerge';
import { AchievementsBadges } from '@/components/AchievementsBadges';
import { ChallengeLeaderboard } from '@/components/ChallengeLeaderboard';
import { ProgressShareSheet } from '@/components/ProgressShareSheet';
import {
  buildAchievementPayload,
  buildStreakPayload,
  buildChallengePayload,
  type SharePayload,
} from '@/utils/shareProgress';
import { buildChallengeLink } from '@/utils/deepLinks';
import type { Achievement, Challenge } from '@/types/gamification';
import { useFriends } from '@/hooks/useFriends';
import { resolveDisplayAvatarUrl } from '@/utils/avatarUtils';
import { uploadProfileAvatar } from '@/utils/avatarService';
import { updateProfileAvatar } from '@/utils/friendsService';
import { MOCK_CHALLENGES } from '@/mocks/socialData';
import { ThemeSettings } from '@/components/ThemeSettings';
import { GOOGLE_G_LOGO } from '@/constants/googleBrandAssets';

import { UserTeam, UserCountry, NBAFavoriteTeam, UserNationality } from '@/types/habit';
import { FOOTBALL_COUNTRIES, FOOTBALL_TEAMS, getFootballTeamLogoUrl, searchTeams as searchAllTeams } from '@/constants/footballData';
import { ALL_NBA_TEAMS, searchNBATeams, NBATeamInfo } from '@/constants/nbaData';
import { ALL_NATIONS } from '@/constants/nations';
import { MAX_FOLLOWED_NATIONALITIES } from '@/constants/nationalTeams';
import TabWalkthrough from '@/components/TabWalkthrough';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { NationFlag } from '@/components/NationFlag';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatMergeSummary(summary: CloudMergeStats | null): string | null {
  if (!summary) return null;
  const parts: string[] = [];
  if (summary.habitsMerged) parts.push('habits');
  if (summary.tasksMerged) parts.push('tasks');
  if (summary.profileMerged) parts.push('profile');
  if (summary.projectsMerged) parts.push('projects');
  if (summary.activitiesMerged) parts.push('activities');
  if (summary.showsMerged) parts.push('shows');
  if (summary.sportsMerged) parts.push('sports');
  if (parts.length === 0) return 'No changes from cloud';
  return `Merged ${parts.join(', ')}`;
}

const INTEREST_ICONS: Record<string, React.ComponentType<any>> = {
  'football': Trophy,
  'ufc': Swords,
  'nba': Trophy,
  'f1': Car,
  'fitness': Dumbbell,
  'movies': Clapperboard,
  'cooking': CookingPot,
  'learning': GraduationCap,
  'events': Ticket,
  'productivity': Zap,
  'work': Briefcase,
};

const AVAILABLE_INTERESTS = [
  { id: 'football', name: 'Football', color: '#34C759', tabs: ['sports'] },
  { id: 'ufc', name: 'UFC', color: '#D32F2F', tabs: ['sports'] },
  { id: 'nba', name: 'NBA', color: '#F57C00', tabs: ['sports'] },
  { id: 'f1', name: 'Formula 1', color: '#E10600', tabs: ['sports'] },
  { id: 'fitness', name: 'Fitness', color: '#FF9500', tabs: ['habits', 'tasks'] },
  { id: 'movies', name: 'Movies & TV', color: '#FF2D55', tabs: ['shows'] },
  { id: 'cooking', name: 'Cooking', color: '#00C7BE', tabs: ['habits'] },
  { id: 'learning', name: 'Learning', color: '#FF9500', tabs: ['activities', 'tasks'] },
  { id: 'events', name: 'Events', color: '#AF52DE', tabs: ['events'] },
  { id: 'productivity', name: 'Productivity', color: '#007AFF', tabs: ['tasks'] },
  { id: 'work', name: 'Work', color: '#8E8E93', tabs: ['tasks'] },
];

type ExpandedSection = 'favorites' | 'notifications' | 'recovery' | 'security' | 'appearance' | 'achievements' | 'challenges' | null;

export default function ProfileScreen() {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, supabaseUser, logout, deleteAccount, isGuest, mfa } = useAuth();
  const {
    profile,
    updateProfile,
    updateNotificationSettings,
    addFavoriteTeam,
    removeFavoriteTeam,
    addFavoriteCountry,
    removeFavoriteCountry,
    addNationality,
    removeNationality,
    updateDisplayPreferences,
    updateInterests,
    getPersonalizedTabs,
    updateTabOrder,
    resetTabOrder,
    resetOnboarding,
  } = useUserProfile();
  const { resetAllWalkthroughs } = useWalkthrough();
  const { dashboardSummary, shows } = useApp();
  const { allTasks } = useTasks();
  const { stats: todayHabitStats } = useTodayHabits();
  const {
    badges,
    achievements,
    stats: gamificationStats,
    challenges,
    joinChallenge,
    leaveChallenge,
    getLeaderboard,
    pendingWeeklyRewardXp,
    claimWeeklyReward,
  } = useGamification();
  const {
    isEnabled: notificationsEnabled,
    toggleNotificationSetting,
    sendTestNotification,
    requestPermissions,
    weeklyRecap,
  } = useNotificationsSafe();

  const {
    syncStatus,
    lastSyncTime,
    lastPullTime,
    lastMergeSummary,
    isCloudEnabled,
    syncToCloud,
    syncNow,
    enableCloudSync,
    error: syncError,
    latestSnapshotTime,
    restoreLatestSnapshot,
  } = useCloudSync();

  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [showNBATeamModal, setShowNBATeamModal] = useState<boolean>(false);
  const [showCountryModal, setShowCountryModal] = useState<boolean>(false);
  const [showNationalityModal, setShowNationalityModal] = useState<boolean>(false);
  const [showInterestsModal, setShowInterestsModal] = useState<boolean>(false);
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [nbaTeamSearch, setNbaTeamSearch] = useState<string>('');
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [nationalitySearch, setNationalitySearch] = useState<string>('');
  const [editingName, setEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(profile?.name || '');
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();

  useEffect(() => {
    if (challengeId) {
      setExpandedSection('challenges');
    }
  }, [challengeId]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [tempSelectedInterests, setTempSelectedInterests] = useState<string[]>([]);
  const [showTabOrderModal, setShowTabOrderModal] = useState<boolean>(false);
  const [tempTabOrder, setTempTabOrder] = useState<string[]>([]);
  const [isImportingLocal, setIsImportingLocal] = useState<boolean>(false);
  const profileUserId = user?.id || 'guest';
  const [autoSummaryEnabled, setAutoSummaryEnabledState] = useState(true);
  const [dailySummaryNotify, setDailySummaryNotify] = useState(true);
  const [summaryHour, setSummaryHour] = useState(20);
  const [summaryMinute, setSummaryMinute] = useState(0);

  const timeFormat = profile?.displayPreferences?.timeFormat === '24h' ? '24h' : '12h';

  const applySummarySchedule = useCallback(
    async (patch: {
      autoEnabled?: boolean;
      notifyEnabled?: boolean;
      hour?: number;
      minute?: number;
    }) => {
      const auto = patch.autoEnabled ?? autoSummaryEnabled;
      const notify = patch.notifyEnabled ?? dailySummaryNotify;
      const hour = patch.hour ?? summaryHour;
      const minute = patch.minute ?? summaryMinute;

      if (patch.autoEnabled !== undefined) {
        await setAutoSummaryEnabled(profileUserId, patch.autoEnabled);
        setAutoSummaryEnabledState(patch.autoEnabled);
      }
      if (patch.notifyEnabled !== undefined) {
        await setDailySummaryNotifyEnabled(profileUserId, patch.notifyEnabled);
        setDailySummaryNotify(patch.notifyEnabled);
      }
      if (patch.hour !== undefined || patch.minute !== undefined) {
        await setAutoSummaryTime(profileUserId, hour, minute);
        setSummaryHour(hour);
        setSummaryMinute(minute);
      }

      if (patch.notifyEnabled && !notificationsEnabled) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      await syncDailySummaryNotification({
        userId: profileUserId,
        autoEnabled: auto,
        notifyEnabled: notify,
        hour,
        minute,
      });
    },
    [
      profileUserId,
      autoSummaryEnabled,
      dailySummaryNotify,
      summaryHour,
      summaryMinute,
      notificationsEnabled,
      requestPermissions,
    ]
  );

  useEffect(() => {
    void (async () => {
      const [enabled, schedule] = await Promise.all([
        isAutoSummaryEnabled(profileUserId),
        getAutoSummarySchedule(profileUserId),
      ]);
      setAutoSummaryEnabledState(enabled);
      setDailySummaryNotify(schedule.notifyEnabled);
      setSummaryHour(schedule.hour);
      setSummaryMinute(schedule.minute);
    })();
  }, [profileUserId]);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState<string>('');

  const hasInterest = (interestId: string) => profile?.interests?.includes(interestId) ?? false;
  const hasSportsInterest = hasInterest('football');
  const hasNBAInterest = hasInterest('nba');
  const unlockedBadgesCount = badges.filter(b => b.unlockedAt).length;
  const googleProvider = supabaseUser?.app_metadata?.provider;
  const googleProviders = Array.isArray(supabaseUser?.app_metadata?.providers)
    ? (supabaseUser.app_metadata.providers as string[])
    : [];
  const isGoogleSignedIn =
    !isGuest && (googleProvider === 'google' || googleProviders.includes('google') || user?.id?.startsWith('google_'));
  const {
    friends: socialFriends,
    incomingRequests: socialIncoming,
    unreadNudges: socialUnreadNudges,
    friendsLeaderboard: socialLeaderboard,
    myProfile: socialProfile,
  } = useFriends();
  const partnerBadgeCount = socialIncoming.length + socialUnreadNudges.length;

  const profileAvatarUri = resolveDisplayAvatarUrl({
    profileAvatar: profile?.avatar,
    authAvatar: user?.avatar,
    socialAvatar: socialProfile?.avatarUrl,
  });

  useEffect(() => {
    if (isGuest) return;
    if (!user?.avatar) return;
    if (!profile?.avatar) {
      updateProfile({ avatar: user.avatar });
    }
  }, [isGuest, user?.avatar, profile?.avatar, updateProfile]);

  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const shareUsername =
    (profile?.name || user?.email?.split('@')[0] || '').trim() || undefined;

  const handleShareAchievement = useCallback(
    (achievement: Achievement) => {
      if (!achievement.isUnlocked) return;
      setSharePayload(
        buildAchievementPayload(achievement.name, achievement.description, shareUsername),
      );
    },
    [shareUsername],
  );

  const handleShareStreak = useCallback(() => {
    setSharePayload(
      buildStreakPayload(gamificationStats?.currentStreak ?? 0, shareUsername),
    );
  }, [gamificationStats, shareUsername]);

  const handleShareChallenge = useCallback(
    (challenge: Challenge) => {
      setSharePayload(
        buildChallengePayload(challenge.name, buildChallengeLink(challenge.id), shareUsername),
      );
    },
    [shareUsername],
  );

  const handleInviteToChallenge = useCallback(async (challenge: Challenge) => {
    const link = buildChallengeLink(challenge.id);
    try {
      await Share.share({
        message: `Join my "${challenge.name}" challenge on One Pager 🎯\n${link}`,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      });
    } catch {
      // user dismissed the share sheet
    }
  }, []);

  const handleClaimWeeklyReward = useCallback(() => {
    const result = claimWeeklyReward();
    if (result?.claimed) {
      Alert.alert('Reward claimed', `+${result.xp} XP added. Keep the streak alive this week.`);
      return;
    }
    Alert.alert('No reward available yet', 'Complete more habits this week to unlock your next weekly reward.');
  }, [claimWeeklyReward]);

  const toggleSection = useCallback((section: ExpandedSection) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [isDark, setThemeMode]);

  const mfaQrImageUri = useCallback((rawQr?: string | null) => {
    if (!rawQr) return null;
    if (rawQr.startsWith('data:image')) return rawQr;
    if (rawQr.trim().startsWith('<svg')) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(rawQr)}`;
    }
    return rawQr;
  }, []);

  const handleStartMfaSetup = useCallback(async () => {
    if (!mfa.isSupported) {
      Alert.alert('Unavailable', 'Two-factor authentication requires cloud auth on mobile.');
      return;
    }
    const result = await mfa.startSetup();
    if (!result.success || !result.factorId) {
      Alert.alert('2FA setup failed', result.error || 'Could not start setup');
      return;
    }
    setMfaFactorId(result.factorId);
    setMfaQrCode(result.qrCode || null);
    setMfaSecret(result.secret || null);
    setMfaCode('');
  }, [mfa]);

  const handleVerifyMfaSetup = useCallback(async () => {
    if (!mfaFactorId) return;
    const result = await mfa.verifySetup(mfaFactorId, mfaCode);
    if (!result.success) {
      Alert.alert('Verification failed', result.error || 'Invalid code');
      return;
    }
    Alert.alert('2FA enabled', 'Your account is now protected with two-factor authentication.');
    setMfaFactorId(null);
    setMfaQrCode(null);
    setMfaSecret(null);
    setMfaCode('');
    await mfa.refreshStatus();
  }, [mfa, mfaCode, mfaFactorId]);

  const handleDisableMfa = useCallback(async () => {
    Alert.alert(
      'Disable two-factor authentication?',
      'Your account will no longer require a one-time code at login.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            const result = await mfa.disable();
            if (!result.success) {
              Alert.alert('Could not disable 2FA', result.error || 'Please try again.');
              return;
            }
            Alert.alert('2FA disabled', 'Two-factor authentication has been turned off.');
            setMfaFactorId(null);
            setMfaQrCode(null);
            setMfaSecret(null);
            setMfaCode('');
          },
        },
      ]
    );
  }, [mfa]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const userId = user?.id;
        if (!userId) return;

        setIsUploadingImage(true);
        try {
          const remoteUrl = await uploadProfileAvatar(userId, imageUri);
          const avatar = remoteUrl ?? imageUri;
          updateProfile({ avatar });
          await updateProfileAvatar(userId, avatar);
        } catch (error) {
          Alert.alert(
            'Photo not saved',
            error instanceof Error ? error.message : 'Could not upload your profile photo.',
          );
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking image:', error);
      setIsUploadingImage(false);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [updateProfile, user?.id]);

  const showImagePickerOptions = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', ...(profile?.avatar ? ['Remove Photo'] : [])],
          cancelButtonIndex: 0,
          destructiveButtonIndex: profile?.avatar ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void pickImage('camera');
          else if (buttonIndex === 2) void pickImage('library');
          else if (buttonIndex === 3 && profile?.avatar) updateProfile({ avatar: undefined });
        }
      );
    } else {
      Alert.alert(
        'Profile Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => pickImage('camera') },
          { text: 'Choose from Library', onPress: () => pickImage('library') },
          ...(profile?.avatar ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => updateProfile({ avatar: undefined }) }] : []),
        ]
      );
    }
  }, [pickImage, profile?.avatar, updateProfile, user?.id]);

  if (!user) {
    return (
      <SwipeableTabContainer>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Please log in to view your profile</Text>
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login' as any)}
            >
              <Text style={[styles.loginButtonText, { color: colors.textInverse }]}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SwipeableTabContainer>
    );
  }

  if (!profile) {
    return (
      <SwipeableTabContainer>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary, marginTop: 12 }]}>Loading your profile...</Text>
          </View>
        </View>
      </SwipeableTabContainer>
    );
  }

  const filteredTeams = teamSearch.trim() 
    ? searchAllTeams(teamSearch)
    : FOOTBALL_TEAMS.slice(0, 50);

  const filteredNBATeams = nbaTeamSearch.trim()
    ? searchNBATeams(nbaTeamSearch)
    : ALL_NBA_TEAMS;

  const filteredCountries = FOOTBALL_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.leagues.some(league => league.toLowerCase().includes(countrySearch.toLowerCase()))
  );

  const nationalities = profile?.nationalities ?? [];
  const filteredNationalities = ALL_NATIONS.filter((nation) =>
    nation.name.toLowerCase().includes(nationalitySearch.toLowerCase()),
  );

  const handleSaveName = () => {
    updateProfile({ name: tempName });
    setEditingName(false);
  };

  const handleRemoveTeam = (teamId: string) => {
    Alert.alert('Remove Team', 'Remove this team from your favourites?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFavoriteTeam(teamId) }
    ]);
  };

  const handleAddTeam = (team: UserTeam) => {
    const isAlreadyAdded = profile.favoriteTeams.some(t => t.id === team.id);
    if (!isAlreadyAdded) {
      addFavoriteTeam(team);
      setShowTeamModal(false);
      setTeamSearch('');
    }
  };

  const handleAddNBATeam = (team: NBATeamInfo) => {
    const existing = profile.favoriteNBATeams || [];
    const isAlreadyAdded = existing.some(t => t.id === team.id);
    if (!isAlreadyAdded) {
      const newTeam: NBAFavoriteTeam = {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        conference: team.conference,
        logo: team.logo,
      };
      updateProfile({ favoriteNBATeams: [...existing, newTeam] });
      setShowNBATeamModal(false);
      setNbaTeamSearch('');
    }
  };

  const handleRemoveNBATeam = (teamId: string) => {
    Alert.alert('Remove Team', 'Remove this NBA team from your favourites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const updated = (profile.favoriteNBATeams || []).filter(t => t.id !== teamId);
          updateProfile({ favoriteNBATeams: updated });
        },
      },
    ]);
  };

  const handleRemoveCountry = (countryId: string) => {
    Alert.alert('Remove Country', 'Remove this country from your favourites?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFavoriteCountry(countryId) }
    ]);
  };

  const handleAddCountry = (country: UserCountry) => {
    const isAlreadyAdded = profile.favoriteCountries.some(c => c.id === country.id);
    if (!isAlreadyAdded) {
      addFavoriteCountry(country);
      setShowCountryModal(false);
      setCountrySearch('');
    }
  };

  const handleAddNationality = (nation: (typeof ALL_NATIONS)[number]) => {
    const isAlreadyAdded = nationalities.some((n) => n.id === nation.id);
    if (isAlreadyAdded || nationalities.length >= MAX_FOLLOWED_NATIONALITIES) return;
    const entry: UserNationality = {
      id: nation.id,
      name: nation.name,
      code: nation.code,
      flag: nation.flag,
      apiId: nation.apiId,
    };
    addNationality(entry);
    if (nationalities.length + 1 >= MAX_FOLLOWED_NATIONALITIES) {
      setShowNationalityModal(false);
      setNationalitySearch('');
    }
  };

  const handleRemoveNationality = (nationalityId: string) => {
    Alert.alert('Remove Country', 'Stop following this national team?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeNationality(nationalityId) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login' as any);
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: async () => {
          const result = await deleteAccount();
          if (result.success) router.replace('/(auth)/login' as any);
          else Alert.alert('Error', result.error || 'Failed to delete account');
        }}
      ]
    );
  };

  return (
    <SwipeableTabContainer>
      <TabWalkthrough tabName="profile" />
      <CustomHeader title="Profile" subtitle="Your account & preferences" />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Guest Banner */}
          {isGuest && (
            <View style={[styles.guestBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <View style={styles.guestBannerContent}>
                <Text style={[styles.guestBannerTitle, { color: colors.text }]}>Browsing as Guest</Text>
                <Text style={[styles.guestBannerText, { color: colors.textTertiary }]}>
                  Create an account to save your progress
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.guestCreateButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(auth)/signup' as any)}
              >
                <Text style={[styles.guestCreateButtonText, { color: colors.textInverse }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Profile Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroTop}>
              <TouchableOpacity 
                style={[styles.avatarContainer, { backgroundColor: colors.surfaceSecondary }]}
                onPress={!isGuest ? showImagePickerOptions : undefined}
                activeOpacity={isGuest ? 1 : 0.7}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : profileAvatarUri ? (
                  <Image source={{ uri: profileAvatarUri }} style={styles.avatarImage} contentFit="cover" transition={200} />
                ) : (
                  <User size={36} color={colors.primary} />
                )}
                {!isGuest && (
                  <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                    <Camera size={12} color={colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.heroInfo}>
                {editingName && !isGuest ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      style={[styles.nameInput, { color: colors.text, borderColor: colors.primary }]}
                      value={tempName}
                      onChangeText={setTempName}
                      onBlur={handleSaveName}
                      onSubmitEditing={handleSaveName}
                      autoFocus
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.nameRow}
                    onPress={() => !isGuest && setEditingName(true)}
                    activeOpacity={isGuest ? 1 : 0.7}
                  >
                    <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                      {isGuest ? 'Guest User' : profile.name}
                    </Text>
                    {!isGuest && <Edit3 size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                )}
                <Text style={[styles.heroEmail, { color: colors.textTertiary }]}>
                  {isGuest ? 'guest@example.com' : user.email}
                </Text>
                {isGoogleSignedIn && (
                  <View style={[styles.googleBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Image
                      source={GOOGLE_G_LOGO}
                      style={styles.googleBadgeLogo}
                      contentFit="contain"
                    />
                    <Text style={[styles.googleBadgeText, { color: colors.textSecondary }]}>Signed in with Google</Text>
                  </View>
                )}
              </View>

              {/* Dark Mode Toggle */}
              <TouchableOpacity
                style={[styles.darkModeButton, { backgroundColor: isDark ? colors.primary + '20' : colors.surfaceSecondary }]}
                onPress={handleToggleDarkMode}
                activeOpacity={0.7}
              >
                {isDark ? (
                  <Moon size={20} color={colors.primary} />
                ) : (
                  <Sun size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#FF9500' + '15' }]}>
                  <Flame size={16} color="#FF9500" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{todayHabitStats.currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Streak</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#34C759' + '15' }]}>
                  <Target size={16} color="#34C759" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{todayHabitStats.completedHabits}/{todayHabitStats.totalHabits}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Today</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#5856D6' + '15' }]}>
                  <BookOpen size={16} color="#5856D6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.favoriteBooks.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Books</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFD700' + '15' }]}>
                  <Trophy size={16} color="#FFD700" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{unlockedBadgesCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Badges</Text>
              </View>
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Interests</Text>
            <View style={[styles.interestsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {profile?.interests && profile.interests.length > 0 ? (
                <View style={styles.interestsList}>
                  {profile.interests.map(interestId => {
                    const interest = AVAILABLE_INTERESTS.find(i => i.id === interestId);
                    if (!interest) return null;
                    return (
                      <View 
                        key={interestId} 
                        style={[styles.interestTag, { backgroundColor: interest.color + '15', borderColor: interest.color + '40' }]}
                      >
                        {(() => { const IconComp = INTEREST_ICONS[interest.id] || Sparkles; return <IconComp size={14} color={interest.color} />; })()}
                        <Text style={[styles.interestText, { color: interest.color }]}>{interest.name}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.noInterestsText, { color: colors.textTertiary }]}>No interests selected</Text>
              )}
              <TouchableOpacity 
                style={[styles.manageButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  setTempSelectedInterests(profile?.interests || []);
                  setShowInterestsModal(true);
                }}
              >
                <Sparkles size={16} color={colors.primary} />
                <Text style={[styles.manageButtonText, { color: colors.primary }]}>Manage Interests</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings List */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            
            {/* Favorites (if sports interest) */}
            {(hasSportsInterest || hasNBAInterest) && (
              <TouchableOpacity 
                style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => toggleSection('favorites')}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#FF2D55' + '15' }]}>
                  <Heart size={18} color="#FF2D55" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Favorite Teams</Text>
                  <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                    {profile.favoriteTeams.length + (profile.favoriteNBATeams?.length || 0)} teams, {nationalities.length} countries, {profile.favoriteCountries.length} leagues
                  </Text>
                </View>
                {expandedSection === 'favorites' ? (
                  <ChevronUp size={20} color={colors.textTertiary} />
                ) : (
                  <ChevronDown size={20} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}

            {expandedSection === 'favorites' && (hasSportsInterest || hasNBAInterest) && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                {/* NBA Teams */}
                {hasNBAInterest && (
                  <View style={styles.favSubSection}>
                    <View style={styles.favSubHeader}>
                      <Text style={[styles.favSubTitle, { color: colors.text }]}>NBA Teams</Text>
                      <TouchableOpacity style={[styles.addSmallBtn, { backgroundColor: '#F26522' + '15' }]} onPress={() => setShowNBATeamModal(true)}>
                        <Plus size={14} color="#F26522" />
                      </TouchableOpacity>
                    </View>
                    {(profile.favoriteNBATeams?.length || 0) > 0 ? (
                      <View style={styles.favChipsList}>
                        {profile.favoriteNBATeams?.map(team => (
                          <View key={team.id} style={[styles.favChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Trophy size={12} color="#F26522" />
                            <Text style={[styles.favChipText, { color: colors.text }]} numberOfLines={1}>{team.name}</Text>
                            <TouchableOpacity onPress={() => handleRemoveNBATeam(team.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <X size={12} color={colors.textTertiary} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyFavText, { color: colors.textTertiary }]}>No NBA teams added</Text>
                    )}
                  </View>
                )}

                {/* Club Teams */}
                {hasSportsInterest && (<>
                <View style={styles.favSubSection}>
                  <View style={styles.favSubHeader}>
                    <Text style={[styles.favSubTitle, { color: colors.text }]}>Club Teams</Text>
                    <TouchableOpacity style={[styles.addSmallBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => setShowTeamModal(true)}>
                      <Plus size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {profile.favoriteTeams.length > 0 ? (
                    <View style={styles.favChipsList}>
                      {profile.favoriteTeams.map(team => (
                        <View key={team.id} style={[styles.favChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <Trophy size={12} color="#34C759" />
                          <Text style={[styles.favChipText, { color: colors.text }]} numberOfLines={1}>{team.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveTeam(team.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={12} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyFavText, { color: colors.textTertiary }]}>No teams added</Text>
                  )}
                </View>

                {/* National Teams (World Cup / international) */}
                <View style={styles.favSubSection}>
                  <View style={styles.favSubHeader}>
                    <Text style={[styles.favSubTitle, { color: colors.text }]}>National Teams</Text>
                    <TouchableOpacity
                      style={[styles.addSmallBtn, { backgroundColor: colors.primary + '15' }]}
                      onPress={() => setShowNationalityModal(true)}
                      disabled={nationalities.length >= MAX_FOLLOWED_NATIONALITIES}
                    >
                      <Plus size={14} color={nationalities.length >= MAX_FOLLOWED_NATIONALITIES ? colors.textTertiary : colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {nationalities.length > 0 ? (
                    <View style={styles.favChipsList}>
                      {nationalities.map((nation) => (
                        <View key={nation.id} style={[styles.favChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <Text style={styles.nationFlagChip}>{nation.flag}</Text>
                          <Text style={[styles.favChipText, { color: colors.text }]} numberOfLines={1}>{nation.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveNationality(nation.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={12} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyFavText, { color: colors.textTertiary }]}>
                      Follow countries to track World Cup matches
                    </Text>
                  )}
                  {nationalities.length > 0 && nationalities.length < MAX_FOLLOWED_NATIONALITIES ? (
                    <Text style={[styles.favHintText, { color: colors.textTertiary }]}>
                      Up to {MAX_FOLLOWED_NATIONALITIES} countries
                    </Text>
                  ) : null}
                </View>

                {/* Domestic Leagues */}
                <View style={[styles.favSubSection, { marginBottom: 0 }]}>
                  <View style={styles.favSubHeader}>
                    <Text style={[styles.favSubTitle, { color: colors.text }]}>Domestic Leagues</Text>
                    <TouchableOpacity style={[styles.addSmallBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => setShowCountryModal(true)}>
                      <Plus size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {profile.favoriteCountries.length > 0 ? (
                    <View style={styles.favChipsList}>
                      {profile.favoriteCountries.map(country => (
                        <View key={country.id} style={[styles.favChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <NationFlag code={country.code} width={22} borderRadius={4} />
                          <Text style={[styles.favChipText, { color: colors.text }]} numberOfLines={1}>{country.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveCountry(country.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={12} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyFavText, { color: colors.textTertiary }]}>No leagues added</Text>
                  )}
                </View>
                </>)}
              </View>
            )}

            {/* Notifications */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleSection('notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#007AFF' + '15' }]}>
                <Bell size={18} color="#007AFF" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.settingsItemSubtitle, { color: notificationsEnabled ? colors.success : colors.textTertiary }]}>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              {expandedSection === 'notifications' ? (
                <ChevronUp size={20} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {expandedSection === 'notifications' && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                {!notificationsEnabled && (
                  <TouchableOpacity style={[styles.enableBtn, { backgroundColor: colors.primary }]} onPress={requestPermissions}>
                    <Bell size={16} color={colors.textInverse} />
                    <Text style={[styles.enableBtnText, { color: colors.textInverse }]}>Enable Notifications</Text>
                  </TouchableOpacity>
                )}
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Live Match Alerts</Text>
                  <Switch
                    value={profile.notificationSettings.liveMatches}
                    onValueChange={(value) => toggleNotificationSetting('liveMatches', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Match Reminders</Text>
                  <Switch
                    value={profile.notificationSettings.matchReminders}
                    onValueChange={(value) => toggleNotificationSetting('matchReminders', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Goal Alerts</Text>
                  <Switch
                    value={profile.notificationSettings.goalAlerts}
                    onValueChange={(value) => toggleNotificationSetting('goalAlerts', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Habit Reminders</Text>
                  <Switch
                    value={profile.notificationSettings.habitReminders}
                    onValueChange={(value) => toggleNotificationSetting('habitReminders', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.notifLabel, { color: colors.text }]}>Cheers & social</Text>
                    <Text style={[styles.notifMetaText, { color: colors.textSecondary, marginTop: 2 }]}>
                      Friend requests, nudges, and cheers from partners
                    </Text>
                  </View>
                  <Switch
                    value={profile.notificationSettings.socialNotifications ?? true}
                    onValueChange={(value) => updateNotificationSettings({ socialNotifications: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.notifLabel, { color: colors.text }]}>Auto daily summary</Text>
                    <Text style={[styles.notifMetaText, { color: colors.textSecondary, marginTop: 2 }]}>
                      Builds your recap on Overview after your chosen time
                    </Text>
                  </View>
                  <Switch
                    value={autoSummaryEnabled}
                    onValueChange={(value) => {
                      void applySummarySchedule({ autoEnabled: value });
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                {autoSummaryEnabled ? (
                  <>
                    <View style={[styles.notifRow, { borderBottomColor: colors.border, alignItems: 'center' }]}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={[styles.notifLabel, { color: colors.text }]}>Summary time</Text>
                        <Text style={[styles.notifMetaText, { color: colors.textSecondary, marginTop: 2 }]}>
                          {formatAutoSummaryTime(summaryHour, summaryMinute, timeFormat)}
                        </Text>
                      </View>
                      <View style={styles.summaryTimeStepper}>
                        <TouchableOpacity
                          style={[styles.timeStepBtn, { backgroundColor: colors.surfaceSecondary }]}
                          onPress={() => {
                            const nextH = (summaryHour + 23) % 24;
                            void applySummarySchedule({ hour: nextH });
                          }}
                          accessibilityLabel="Earlier hour"
                        >
                          <Text style={[styles.timeStepBtnText, { color: colors.text }]}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.timeStepBtn, { backgroundColor: colors.surfaceSecondary }]}
                          onPress={() => {
                            const nextM = (summaryMinute + 45) % 60;
                            void applySummarySchedule({ minute: nextM });
                          }}
                          accessibilityLabel="Earlier 15 minutes"
                        >
                          <Text style={[styles.timeStepBtnText, { color: colors.textTertiary }]}>−15m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.timeStepBtn, { backgroundColor: colors.surfaceSecondary }]}
                          onPress={() => {
                            const nextM = (summaryMinute + 15) % 60;
                            void applySummarySchedule({ minute: nextM });
                          }}
                          accessibilityLabel="Later 15 minutes"
                        >
                          <Text style={[styles.timeStepBtnText, { color: colors.textTertiary }]}>+15m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.timeStepBtn, { backgroundColor: colors.surfaceSecondary }]}
                          onPress={() => {
                            const nextH = (summaryHour + 1) % 24;
                            void applySummarySchedule({ hour: nextH });
                          }}
                          accessibilityLabel="Later hour"
                        >
                          <Text style={[styles.timeStepBtnText, { color: colors.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={[styles.notifLabel, { color: colors.text }]}>Summary reminder</Text>
                        <Text style={[styles.notifMetaText, { color: colors.textSecondary, marginTop: 2 }]}>
                          Push notification at {formatAutoSummaryTime(summaryHour, summaryMinute, timeFormat)} to check Overview
                        </Text>
                      </View>
                      <Switch
                        value={dailySummaryNotify}
                        onValueChange={(value) => {
                          void applySummarySchedule({ notifyEnabled: value });
                        }}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                  </>
                ) : null}
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Habit Risk Nudges</Text>
                  <Switch
                    value={profile.notificationSettings.habitRiskAlerts ?? true}
                    onValueChange={(value) => updateNotificationSettings({ habitRiskAlerts: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Quiet Hours</Text>
                  <Switch
                    value={profile.notificationSettings.quietHoursEnabled ?? true}
                    onValueChange={(value) => updateNotificationSettings({ quietHoursEnabled: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <Text style={[styles.notifMetaText, { color: colors.textSecondary }]}>
                  Quiet hours: {profile.notificationSettings.quietHoursStart || '22:30'} - {profile.notificationSettings.quietHoursEnd || '07:00'}
                </Text>
                <View style={styles.notificationOptionRow}>
                  {[
                    { label: '22:00-07:00', start: '22:00', end: '07:00' },
                    { label: '22:30-07:00', start: '22:30', end: '07:00' },
                    { label: '23:00-07:30', start: '23:00', end: '07:30' },
                  ].map(option => {
                    const selected =
                      (profile.notificationSettings.quietHoursStart || '22:30') === option.start &&
                      (profile.notificationSettings.quietHoursEnd || '07:00') === option.end;
                    return (
                      <TouchableOpacity
                        key={option.label}
                        style={[
                          styles.notificationOptionPill,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary + '14' : colors.card,
                          },
                        ]}
                        onPress={() => updateNotificationSettings({ quietHoursStart: option.start, quietHoursEnd: option.end })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.notificationOptionPillText, { color: selected ? colors.primary : colors.textSecondary }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.notifMetaText, { color: colors.textSecondary }]}>Event reminder timing</Text>
                <View style={styles.notificationOptionRow}>
                  {[10, 30, 60].map((minutes) => {
                    const selected = (profile.notificationSettings.eventReminderLeadMinutes ?? 30) === minutes;
                    return (
                      <TouchableOpacity
                        key={minutes}
                        style={[
                          styles.notificationOptionPill,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary + '14' : colors.card,
                          },
                        ]}
                        onPress={() => updateNotificationSettings({ eventReminderLeadMinutes: minutes })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.notificationOptionPillText, { color: selected ? colors.primary : colors.textSecondary }]}>
                          {minutes}m before
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={[styles.recapPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.recapPreviewTitle, { color: colors.text }]}>Weekly Retention Snapshot</Text>
                  <Text style={[styles.recapPreviewText, { color: colors.textSecondary }]}>
                    {weeklyRecap.completedHabits} completions this week ({weeklyRecap.completionRate}% pace)
                    {weeklyRecap.topHabitName ? ` • Top: ${weeklyRecap.topHabitName}` : ''}
                    {weeklyRecap.atRiskHabits > 0 ? ` • ${weeklyRecap.atRiskHabits} streak at risk` : ' • No streaks at risk'}
                  </Text>
                  {pendingWeeklyRewardXp > 0 && (
                    <TouchableOpacity
                      style={[styles.claimRewardBtn, { backgroundColor: colors.primary }]}
                      onPress={handleClaimWeeklyReward}
                      activeOpacity={0.85}
                    >
                      <Sparkles size={14} color={colors.textInverse} />
                      <Text style={[styles.claimRewardBtnText, { color: colors.textInverse }]}>
                        Claim reward (+{pendingWeeklyRewardXp} XP)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity style={[styles.testNotifBtn, { borderColor: colors.primary + '40' }]} onPress={sendTestNotification}>
                  <Text style={[styles.testNotifBtnText, { color: colors.primary }]}>Send Test Notification</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recovery Mode */}
            <TouchableOpacity
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleSection('recovery')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#DB2777' + '15' }]}>
                <Heart size={18} color="#DB2777" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Recovery Mode</Text>
                <Text style={[styles.settingsItemSubtitle, { color: profile?.recoveryMode?.active ? '#DB2777' : colors.textTertiary }]}>
                  {profile?.recoveryMode?.active
                    ? 'Active — gentle coaching on Overview'
                    : 'Support during difficult periods'}
                </Text>
              </View>
              {expandedSection === 'recovery' ? (
                <ChevronUp size={20} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {expandedSection === 'recovery' && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.notifMetaText, { color: colors.textSecondary, marginBottom: 12 }]}>
                  One Pager adapts when life is hard — fewer streak reminders, Daily Hope, and tiny wins instead of overdue guilt.
                </Text>

                {profile?.recoveryMode?.active ? (
                  <TouchableOpacity
                    style={[styles.enableBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => {
                      const today = getTodayYmd();
                      updateProfile({
                        recoveryMode: exitRecoveryMode(profile.recoveryMode, 7, today),
                      });
                    }}
                  >
                    <Text style={[styles.enableBtnText, { color: colors.text }]}>I&apos;m feeling a bit better</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.enableBtn, { backgroundColor: '#DB2777' }]}
                    onPress={() => {
                      updateProfile({
                        recoveryMode: enterRecoveryModeManual(profile?.recoveryMode, new Date().toISOString()),
                      });
                    }}
                  >
                    <Heart size={16} color="#fff" />
                    <Text style={[styles.enableBtnText, { color: '#fff' }]}>I&apos;m going through a hard time</Text>
                  </TouchableOpacity>
                )}

                <View style={[styles.notifRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 8, paddingVertical: 14 }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Who you&apos;re becoming</Text>
                  <Text style={[styles.notifMetaText, { color: colors.textSecondary }]}>
                    Identity reminders shown in Recovery Mode (one per line)
                  </Text>
                  <TextInput
                    style={[
                      styles.recoveryGoalsInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    placeholder={'Get below 100 kg\nGrow Home Visuals UK\nHelp people with One Pager'}
                    placeholderTextColor={colors.textTertiary}
                    value={(profile?.identityGoals ?? []).join('\n')}
                    onChangeText={(text) => {
                      const goals = text
                        .split('\n')
                        .map((g) => g.trim())
                        .filter(Boolean);
                      updateProfile({ identityGoals: goals });
                    }}
                  />
                </View>

                <View style={[styles.notifRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'stretch', gap: 8, paddingVertical: 14 }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>What brings you joy</Text>
                  <Text style={[styles.notifMetaText, { color: colors.textSecondary }]}>
                    Used for Daily Hope — shows, sport, music, food, and more
                  </Text>
                  <JoySourcesEditor
                    compact
                    value={profile?.joySources}
                    suggested={inferJoySources({
                      profile,
                      shows: shows ?? [],
                      habitTasks: allTasks.filter((t) => t.isHabit),
                    })}
                    onChange={(next: JoySources) => {
                      updateProfile({ joySources: isJoySourcesEmpty(next) ? undefined : next });
                    }}
                  />
                </View>
              </View>
            )}

            {/* Security */}
            {!isGuest && (
              <>
                <TouchableOpacity 
                  style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => toggleSection('security')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.settingsIconBg, { backgroundColor: colors.warning + '15' }]}>
                    <Shield size={18} color={colors.warning} />
                  </View>
                  <View style={styles.settingsItemContent}>
                    <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Security</Text>
                    <Text style={[styles.settingsItemSubtitle, { color: mfa.isEnabled ? colors.success : colors.textTertiary }]}>
                      {mfa.isEnabled ? '2FA enabled. Data is isolated per account on this device.' : '2FA disabled. Data remains isolated per account on this device.'}
                    </Text>
                  </View>
                  {expandedSection === 'security' ? (
                    <ChevronUp size={20} color={colors.textTertiary} />
                  ) : (
                    <ChevronDown size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>

                {expandedSection === 'security' && (
                  <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                    {!mfa.isSupported ? (
                      <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                        2FA is available on mobile with cloud auth enabled.
                      </Text>
                    ) : (
                      <>
                        {!mfa.isEnabled && !mfaFactorId && (
                          <TouchableOpacity
                            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
                            onPress={handleStartMfaSetup}
                            disabled={mfa.isLoading}
                          >
                            {mfa.isLoading ? (
                              <ActivityIndicator size="small" color={colors.textInverse} />
                            ) : (
                              <Shield size={16} color={colors.textInverse} />
                            )}
                            <Text style={[styles.enableBtnText, { color: colors.textInverse }]}>Enable Two-Factor Authentication</Text>
                          </TouchableOpacity>
                        )}

                        {!mfa.isEnabled && !!mfaFactorId && (
                          <View style={styles.mfaSetupBox}>
                            <Text style={[styles.mfaSetupTitle, { color: colors.text }]}>Scan QR in your authenticator app</Text>
                            {(() => {
                              const uri = mfaQrImageUri(mfaQrCode);
                              if (!uri) return null;
                              return (
                                <Image
                                  source={{ uri }}
                                  style={styles.mfaQrImage}
                                  contentFit="contain"
                                />
                              );
                            })()}
                            {!!mfaSecret && (
                              <Text style={[styles.mfaSecretText, { color: colors.textTertiary }]}>
                                Manual code: {mfaSecret}
                              </Text>
                            )}
                            <TextInput
                              value={mfaCode}
                              onChangeText={setMfaCode}
                              keyboardType="number-pad"
                              placeholder="Enter 6-digit code"
                              placeholderTextColor={colors.textMuted}
                              style={[styles.mfaCodeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                              maxLength={6}
                            />
                            <View style={styles.mfaActionsRow}>
                              <TouchableOpacity
                                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                                onPress={() => {
                                  setMfaFactorId(null);
                                  setMfaQrCode(null);
                                  setMfaSecret(null);
                                  setMfaCode('');
                                }}
                              >
                                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                                onPress={handleVerifyMfaSetup}
                                disabled={mfa.isLoading || mfaCode.trim().length < 6}
                              >
                                {mfa.isLoading ? (
                                  <ActivityIndicator size="small" color={colors.textInverse} />
                                ) : (
                                  <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Verify & Enable</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {mfa.isEnabled && (
                          <TouchableOpacity
                            style={[styles.testNotifBtn, { borderColor: colors.error + '40' }]}
                            onPress={handleDisableMfa}
                            disabled={mfa.isLoading}
                          >
                            {mfa.isLoading ? (
                              <ActivityIndicator size="small" color={colors.error} />
                            ) : (
                              <Text style={[styles.testNotifBtnText, { color: colors.error }]}>Disable Two-Factor Authentication</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Appearance */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleSection('appearance')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#AF52DE' + '15' }]}>
                <Palette size={18} color="#AF52DE" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Appearance & Display</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  {isDark ? 'Dark' : 'Light'} mode, time format
                </Text>
              </View>
              {expandedSection === 'appearance' ? (
                <ChevronUp size={20} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {expandedSection === 'appearance' && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>Show Only Favorites</Text>
                  <Switch
                    value={profile.displayPreferences.showOnlyFavorites}
                    onValueChange={(value) => updateDisplayPreferences({ showOnlyFavorites: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.notifLabel, { color: colors.text }]}>24-Hour Time</Text>
                  <Switch
                    value={profile.displayPreferences.timeFormat === '24h'}
                    onValueChange={(value) => updateDisplayPreferences({ timeFormat: value ? '24h' : '12h' })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <View style={styles.themeSection}>
                  <ThemeSettings />
                </View>
              </View>
            )}

            {/* Tab Order */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setTempTabOrder(getPersonalizedTabs());
                setShowTabOrderModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#FF9500' + '15' }]}>
                <LayoutGrid size={18} color="#FF9500" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Tab Order</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  Customise your navigation tabs
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(root)/privacy-policy' as any)}
              activeOpacity={0.7}
              testID="privacy-policy-link"
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#34C759' + '15' }]}>
                <Shield size={18} color="#34C759" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  How we handle your data and account-level isolation
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Terms of Use */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(root)/terms-of-use' as any)}
              activeOpacity={0.7}
              testID="terms-of-use-link"
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#007AFF' + '15' }]}>
                <FileText size={18} color="#007AFF" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Terms of Use</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  Rules for using the app
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Re-do Onboarding */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Alert.alert(
                  'Re-do Onboarding',
                  'This will reset your interests and take you back to the onboarding flow. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        resetOnboarding();
                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        router.replace('/(onboarding)/welcome' as any);
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#FF9500' + '15' }]}>
                <RotateCcw size={18} color="#FF9500" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Re-do Onboarding</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  Reset interests and start fresh
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Replay Tab Tours */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                void resetAllWalkthroughs();
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Tours Reset', 'Tab walkthroughs will show again when you visit each tab.');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#5856D6' + '15' }]}>
                <RotateCcw size={18} color="#5856D6" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Replay Tab Tours</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  Show guided walkthroughs again
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

          </View>

          {/* Syncing Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Syncing</Text>
            <View style={[styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.syncCardHeader}>
                <View style={[styles.syncIconBg, { backgroundColor: (syncStatus === 'error' ? '#FF3B30' : syncStatus === 'syncing' ? '#007AFF' : '#00C7BE') + '15' }]}>
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : syncStatus === 'error' ? (
                    <AlertCircle size={20} color="#FF3B30" />
                  ) : isCloudEnabled && lastSyncTime ? (
                    <CheckCircle2 size={20} color="#00C7BE" />
                  ) : (
                    <Cloud size={20} color="#00C7BE" />
                  )}
                </View>
                <View style={styles.syncCardInfo}>
                  <Text style={[styles.syncCardTitle, { color: colors.text }]}>
                    {syncStatus === 'syncing'
                      ? 'Syncing...'
                      : syncStatus === 'error'
                      ? 'Sync failed'
                      : isCloudEnabled
                      ? 'Cloud sync active'
                      : 'Cloud sync'}
                  </Text>
                  <Text style={[styles.syncCardSubtitle, { color: colors.textTertiary }]}>
                    {syncStatus === 'error' && syncError
                      ? syncError
                      : lastPullTime || lastSyncTime
                      ? `Last synced ${formatRelativeTime(lastPullTime || lastSyncTime!)}`
                      : isCloudEnabled
                      ? 'Waiting for first sync...'
                      : 'Sign in to sync habits and tasks across devices'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.syncConflictNote, { color: colors.textTertiary }]}>
                Conflict-safe merge: newer edits win per item; habit and task completion days from both devices are kept.
              </Text>

              {lastPullTime && (
                <View style={[styles.syncDetailRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.syncDetailLabel, { color: colors.textTertiary }]}>Last pull</Text>
                  <Text style={[styles.syncDetailValue, { color: colors.text }]}>
                    {new Date(lastPullTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
              )}
              {lastSyncTime && (
                <View style={[styles.syncDetailRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.syncDetailLabel, { color: colors.textTertiary }]}>Last backup</Text>
                  <Text style={[styles.syncDetailValue, { color: colors.text }]}>
                    {new Date(lastSyncTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
              )}
              {lastMergeSummary && formatMergeSummary(lastMergeSummary) && (
                <View style={[styles.syncDetailRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.syncDetailLabel, { color: colors.textTertiary }]}>Last merge</Text>
                  <Text style={[styles.syncDetailValue, { color: colors.text }]}>
                    {formatMergeSummary(lastMergeSummary)}
                  </Text>
                </View>
              )}
              {latestSnapshotTime && (
                <View style={[styles.syncDetailRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.syncDetailLabel, { color: colors.textTertiary }]}>Recovery snapshot</Text>
                  <Text style={[styles.syncDetailValue, { color: colors.text }]}>
                    {new Date(latestSnapshotTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.syncBackupBtn,
                  { backgroundColor: colors.primary },
                  (syncStatus === 'syncing') && { opacity: 0.5 },
                ]}
                onPress={async () => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!isCloudEnabled) {
                    const ok = await enableCloudSync(true);
                    if (!ok) {
                      Alert.alert('Sync unavailable', syncError || 'Could not enable cloud sync. Check your internet connection and sign-in status.');
                      return;
                    }
                  }
                  const result = await syncNow();
                  if (!result) {
                    Alert.alert('Sync failed', syncError || 'Unable to sync with Supabase. Check console logs for details.');
                  } else {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color={colors.textInverse} />
                <Text style={[styles.syncBackupBtnText, { color: colors.textInverse }]}>
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.syncBackupBtn,
                  { backgroundColor: colors.surfaceSecondary, marginTop: 8 },
                  (syncStatus === 'syncing') && { opacity: 0.5 },
                ]}
                onPress={async () => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!isCloudEnabled) {
                    const ok = await enableCloudSync(true);
                    if (!ok) {
                      Alert.alert('Backup unavailable', syncError || 'Could not enable cloud sync.');
                      return;
                    }
                  }
                  const result = await syncToCloud();
                  if (!result) {
                    Alert.alert('Backup failed', syncError || 'Unable to back up to Supabase.');
                  } else {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.8}
              >
                <Cloud size={16} color={colors.text} />
                <Text style={[styles.syncBackupBtnText, { color: colors.text }]}>
                  {syncStatus === 'syncing' ? 'Backing up...' : 'Back Up Only'}
                </Text>
              </TouchableOpacity>

              {!isGuest && user?.email && (
                <TouchableOpacity
                  style={[
                    styles.syncBackupBtn,
                    { backgroundColor: colors.surfaceSecondary, marginTop: 8 },
                    isImportingLocal && { opacity: 0.5 },
                  ]}
                  onPress={async () => {
                    if (!user?.email || !user?.id) return;
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsImportingLocal(true);
                    try {
                      const guestUserId = await getLastGuestUserId();
                      const result = await migrateLocalDataToSupabaseUser(user.email, user.id, {
                        force: true,
                        sessionDisplayName: user.name,
                        guestUserId: guestUserId ?? undefined,
                      });
                      if (result.keysCopied > 0) {
                        if (isCloudEnabled) {
                          await syncNow();
                        }
                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert(
                          'Import complete',
                          `Merged ${result.keysCopied} data set${result.keysCopied === 1 ? '' : 's'} from your old local or guest account. Habits and tasks should appear after sync completes.`
                        );
                      } else if (result.oldUserId) {
                        Alert.alert('Nothing to import', 'Found an old local account but its data is already in this account.');
                      } else {
                        Alert.alert(
                          'No local data found',
                          'No old local account was found on this device with this email. Old streaks can only be recovered from a device that still has the local data.'
                        );
                      }
                    } catch (e: any) {
                      Alert.alert('Import failed', e?.message || 'Could not import local data.');
                    } finally {
                      setIsImportingLocal(false);
                    }
                  }}
                  disabled={isImportingLocal}
                  activeOpacity={0.8}
                >
                  {isImportingLocal ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Download size={16} color={colors.text} />
                  )}
                  <Text style={[styles.syncBackupBtnText, { color: colors.text }]}>
                    {isImportingLocal ? 'Importing...' : 'Import Old Local Data'}
                  </Text>
                </TouchableOpacity>
              )}

              {!isGuest && (
                <TouchableOpacity
                  style={[
                    styles.syncBackupBtn,
                    { backgroundColor: colors.surfaceSecondary, marginTop: 8 },
                  ]}
                  onPress={async () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      'Restore latest backup snapshot?',
                      'This will restore the latest local recovery snapshot for your account on this device. Restart the app afterward to fully reload all tabs.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Restore',
                          style: 'destructive',
                          onPress: async () => {
                            const result = await restoreLatestSnapshot();
                            if (!result.success) {
                              Alert.alert('Restore failed', result.error || 'No backup snapshot available yet.');
                              return;
                            }
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert(
                              'Snapshot restored',
                              'Latest backup snapshot restored locally. Please restart the app to reload synced data everywhere.'
                            );
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Download size={16} color={colors.text} />
                  <Text style={[styles.syncBackupBtnText, { color: colors.text }]}>
                    Restore Latest Snapshot
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Achievements Section */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleSection('achievements')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#FFD700' + '15' }]}>
                <Trophy size={18} color="#FFD700" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Badges & Achievements</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  {unlockedBadgesCount} badges unlocked
                </Text>
              </View>
              {expandedSection === 'achievements' ? (
                <ChevronUp size={20} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {expandedSection === 'achievements' && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={styles.shareStreakBtn}
                  onPress={handleShareStreak}
                  activeOpacity={0.85}
                >
                  <Flame size={16} color="#FFFFFF" />
                  <Text style={styles.shareStreakBtnText}>
                    Share my {gamificationStats?.currentStreak ?? 0}-day streak
                  </Text>
                </TouchableOpacity>
                <AchievementsBadges
                  badges={badges}
                  achievements={achievements}
                  stats={gamificationStats}
                  onAchievementPress={handleShareAchievement}
                  compact
                />
              </View>
            )}

            {/* Accountability Partners */}
            <TouchableOpacity
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/friends' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#FF6A3D' + '15' }]}>
                <Users size={18} color="#FF6A3D" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Accountability Partners</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  {socialFriends.length > 0
                    ? `${socialFriends.length} partner${socialFriends.length === 1 ? '' : 's'}`
                    : 'Add friends to keep each other on track'}
                </Text>
              </View>
              {partnerBadgeCount > 0 && (
                <View style={styles.partnerBadge}>
                  <Text style={styles.partnerBadgeText}>{partnerBadgeCount}</Text>
                </View>
              )}
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Challenges */}
            <TouchableOpacity 
              style={[styles.settingsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleSection('challenges')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: '#6366F1' + '15' }]}>
                <Users size={18} color="#6366F1" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Challenges</Text>
                <Text style={[styles.settingsItemSubtitle, { color: colors.textTertiary }]}>
                  {[...challenges, ...MOCK_CHALLENGES].filter(c => c.status === 'active').length} active
                </Text>
              </View>
              {expandedSection === 'challenges' ? (
                <ChevronUp size={20} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {expandedSection === 'challenges' && (
              <View style={[styles.expandedContent, { backgroundColor: colors.surfaceSecondary }]}>
                <ChallengeLeaderboard
                  challenges={[...challenges, ...MOCK_CHALLENGES]}
                  leaderboard={socialLeaderboard ?? getLeaderboard('friends')}
                  currentUserId="current_user"
                  onJoinChallenge={joinChallenge}
                  onLeaveChallenge={leaveChallenge}
                  onShareChallenge={handleShareChallenge}
                  onInviteFriend={handleInviteToChallenge}
                  compact
                />
              </View>
            )}
          </View>

          {/* Account Actions */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
            {!isGuest && (
              <View style={[styles.accountSecurityBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Shield size={14} color={mfa.isEnabled ? colors.success : colors.warning} />
                <Text style={[styles.accountSecurityBadgeText, { color: colors.textSecondary }]}>
                  {mfa.isEnabled ? '2FA is enabled on your account' : '2FA is off. Enable in Security for better protection.'}
                </Text>
              </View>
            )}
            
            {isGuest ? (
              <>
                <TouchableOpacity 
                  style={[styles.accountBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(auth)/signup' as any)}
                >
                  <User size={18} color={colors.textInverse} />
                  <Text style={[styles.accountBtnText, { color: colors.textInverse }]}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.accountBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => router.push('/(auth)/login' as any)}
                >
                  <LogOut size={18} color={colors.text} />
                  <Text style={[styles.accountBtnText, { color: colors.text }]}>Sign In</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.accountBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handleLogout}
                >
                  <LogOut size={18} color={colors.text} />
                  <Text style={[styles.accountBtnText, { color: colors.text }]}>Sign Out</Text>
                </TouchableOpacity>

              </>
            )}
          </View>

          {!isGuest && (
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.deleteAccountLink}
            >
              <Text style={[styles.deleteAccountText, { color: colors.textTertiary }]}>Delete Account</Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modals */}
        <Modal visible={showNBATeamModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add NBA Team</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { setShowNBATeamModal(false); setNbaTeamSearch(''); }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search NBA teams..."
                placeholderTextColor={colors.textTertiary}
                value={nbaTeamSearch}
                onChangeText={setNbaTeamSearch}
              />
            </View>
            <ScrollView style={styles.modalList}>
              {filteredNBATeams.map((team) => {
                const isAdded = (profile.favoriteNBATeams || []).some(t => t.id === team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.modalOption, { borderBottomColor: colors.border }, isAdded && styles.modalOptionDisabled]}
                    onPress={() => handleAddNBATeam(team)}
                    disabled={isAdded}
                  >
                    <View style={[styles.modalOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                      <Trophy size={18} color={isAdded ? colors.textTertiary : '#F26522'} />
                    </View>
                    <View style={styles.modalOptionInfo}>
                      <Text style={[styles.modalOptionName, { color: isAdded ? colors.textTertiary : colors.text }]}>{team.name}</Text>
                      <Text style={[styles.modalOptionSub, { color: colors.textTertiary }]}>{team.conference} Conference</Text>
                    </View>
                    {isAdded && <Text style={[styles.addedLabel, { color: colors.primary }]}>Added</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showTeamModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Team</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { setShowTeamModal(false); setTeamSearch(''); }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search teams..."
                placeholderTextColor={colors.textTertiary}
                value={teamSearch}
                onChangeText={setTeamSearch}
              />
            </View>
            <ScrollView style={styles.modalList}>
              {filteredTeams.map((team) => {
                const isAdded = profile.favoriteTeams.some(t => t.id === team.id);
                const logoUri = getFootballTeamLogoUrl(team);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.modalOption, { borderBottomColor: colors.border }, isAdded && styles.modalOptionDisabled]}
                    onPress={() => handleAddTeam(team)}
                    disabled={isAdded}
                  >
                    <View style={[styles.modalOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                      {logoUri ? (
                        <Image
                          source={{ uri: logoUri }}
                          style={styles.modalOptionTeamLogo}
                          contentFit="contain"
                        />
                      ) : (
                        <Trophy size={18} color={isAdded ? colors.textTertiary : '#34C759'} />
                      )}
                    </View>
                    <View style={styles.modalOptionInfo}>
                      <Text style={[styles.modalOptionName, { color: isAdded ? colors.textTertiary : colors.text }]}>{team.name}</Text>
                      <Text style={[styles.modalOptionSub, { color: colors.textTertiary }]}>{team.league}</Text>
                    </View>
                    {isAdded && <Text style={[styles.addedLabel, { color: colors.primary }]}>Added</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showCountryModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Country</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { setShowCountryModal(false); setCountrySearch(''); }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search countries..."
                placeholderTextColor={colors.textTertiary}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>
            <ScrollView style={styles.modalList}>
              {filteredCountries.map((country) => {
                const isAdded = profile.favoriteCountries.some(c => c.id === country.id);
                return (
                  <TouchableOpacity
                    key={country.id}
                    style={[styles.modalOption, { borderBottomColor: colors.border }, isAdded && styles.modalOptionDisabled]}
                    onPress={() => handleAddCountry(country)}
                    disabled={isAdded}
                  >
                    <NationFlag code={country.code} width={36} borderRadius={6} style={{ marginRight: 12 }} />
                    <View style={styles.modalOptionInfo}>
                      <Text style={[styles.modalOptionName, { color: isAdded ? colors.textTertiary : colors.text }]}>{country.name}</Text>
                      <Text style={[styles.modalOptionSub, { color: colors.textTertiary }]}>{country.leagues.join(', ')}</Text>
                    </View>
                    {isAdded && <Text style={[styles.addedLabel, { color: colors.primary }]}>Added</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showNationalityModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Follow National Team</Text>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  setShowNationalityModal(false);
                  setNationalitySearch('');
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              {nationalities.length}/{MAX_FOLLOWED_NATIONALITIES} selected — World Cup & international fixtures
            </Text>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search countries..."
                placeholderTextColor={colors.textTertiary}
                value={nationalitySearch}
                onChangeText={setNationalitySearch}
              />
            </View>
            <ScrollView style={styles.modalList}>
              {filteredNationalities.map((nation) => {
                const isAdded = nationalities.some((n) => n.id === nation.id);
                const atMax = nationalities.length >= MAX_FOLLOWED_NATIONALITIES && !isAdded;
                return (
                  <TouchableOpacity
                    key={nation.id}
                    style={[styles.modalOption, { borderBottomColor: colors.border }, (isAdded || atMax) && styles.modalOptionDisabled]}
                    onPress={() => handleAddNationality(nation)}
                    disabled={isAdded || atMax}
                  >
                    <Text style={styles.modalNationFlag}>{nation.flag}</Text>
                    <View style={styles.modalOptionInfo}>
                      <Text style={[styles.modalOptionName, { color: isAdded || atMax ? colors.textTertiary : colors.text }]}>
                        {nation.name}
                      </Text>
                    </View>
                    {isAdded ? <Text style={[styles.addedLabel, { color: colors.primary }]}>Following</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showTabOrderModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tab Order</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setShowTabOrderModal(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalInfoBanner, { backgroundColor: '#FF9500' + '15' }]}>
              <GripVertical size={16} color="#FF9500" />
              <Text style={[styles.modalInfoText, { color: colors.text, marginLeft: 8, flex: 1 }]}>Use the arrows to reorder your tabs</Text>
            </View>
            <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 20 }}>
              {tempTabOrder.map((tabName, index) => {
                const TAB_META: Record<string, { icon: React.ComponentType<{color: string; size?: number}>; label: string; color: string }> = {
                  activities: { icon: LayoutGrid, label: 'Overview', color: '#007AFF' },
                  shows: { icon: Sparkles, label: 'Shows', color: '#FF2D55' },
                  sports: { icon: Trophy, label: 'Sports', color: '#34C759' },
                  tasks: { icon: Target, label: 'Tasks', color: '#FF9500' },
                  discover: { icon: Search, label: 'Discover', color: '#5856D6' },
                  profile: { icon: User, label: 'Profile', color: '#8E8E93' },
                };
                const meta = TAB_META[tabName] || { icon: LayoutGrid, label: tabName, color: '#8E8E93' };
                const TabIcon = meta.icon;
                const isFirst = index === 0;
                const isLast = index === tempTabOrder.length - 1;

                return (
                  <View
                    key={tabName}
                    style={[styles.tabOrderItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.tabOrderRank, { backgroundColor: meta.color + '15' }]}>
                      <Text style={[styles.tabOrderRankText, { color: meta.color }]}>{index + 1}</Text>
                    </View>
                    <View style={[styles.tabOrderIconBg, { backgroundColor: meta.color + '15' }]}>
                      <TabIcon color={meta.color} size={20} />
                    </View>
                    <Text style={[styles.tabOrderLabel, { color: colors.text }]}>{meta.label}</Text>
                    <View style={styles.tabOrderArrows}>
                      <TouchableOpacity
                        style={[styles.tabOrderArrowBtn, { backgroundColor: isFirst ? colors.border + '40' : colors.primary + '15' }]}
                        disabled={isFirst}
                        onPress={() => {
                          const newOrder = [...tempTabOrder];
                          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                          setTempTabOrder(newOrder);
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <ArrowUp size={16} color={isFirst ? colors.textTertiary : colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tabOrderArrowBtn, { backgroundColor: isLast ? colors.border + '40' : colors.primary + '15' }]}
                        disabled={isLast}
                        onPress={() => {
                          const newOrder = [...tempTabOrder];
                          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                          setTempTabOrder(newOrder);
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <ArrowDown size={16} color={isLast ? colors.textTertiary : colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.resetTabBtn, { borderColor: colors.border }]}
                onPress={() => {
                  resetTabOrder();
                  setTempTabOrder(getPersonalizedTabs());
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <RotateCcw size={14} color={colors.textTertiary} />
                <Text style={[styles.resetTabBtnText, { color: colors.textTertiary }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  updateTabOrder(tempTabOrder);
                  setShowTabOrderModal(false);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>Save Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showInterestsModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Interests</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setShowInterestsModal(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalInfoBanner, { backgroundColor: '#FF9500' + '15' }]}>
              <Sparkles size={16} color="#FF9500" />
              <Text style={[styles.modalInfoText, { color: colors.text, marginLeft: 8, flex: 1 }]}>Select interests to customise your app experience</Text>
            </View>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.interestsListContent}>
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = tempSelectedInterests.includes(interest.id);
                return (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.interestOption,
                      { backgroundColor: colors.card, borderColor: isSelected ? interest.color : colors.border },
                      isSelected && { backgroundColor: interest.color + '10' }
                    ]}
                    onPress={() => {
                      setTempSelectedInterests(prev => 
                        prev.includes(interest.id) ? prev.filter(id => id !== interest.id) : [...prev, interest.id]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    {(() => { const IconComp = INTEREST_ICONS[interest.id] || Sparkles; return <IconComp size={22} color={isSelected ? interest.color : colors.textSecondary} style={{ marginRight: 12 }} />; })()}
                    <View style={styles.interestOptionInfo}>
                      <Text style={[styles.interestOptionName, { color: isSelected ? interest.color : colors.text }]}>{interest.name}</Text>
                      <Text style={[styles.interestOptionTabs, { color: colors.textTertiary }]}>
                        {interest.tabs.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                      </Text>
                    </View>
                    <View style={[styles.interestCheck, { borderColor: isSelected ? interest.color : colors.border, backgroundColor: isSelected ? interest.color : 'transparent' }]}>
                      {isSelected && <Check size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.modalFooterText, { color: colors.textTertiary }]}>
                {tempSelectedInterests.length} selected
              </Text>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => { updateInterests(tempSelectedInterests); setShowInterestsModal(false); }}
              >
                <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ProgressShareSheet
          visible={!!sharePayload}
          payload={sharePayload}
          onClose={() => setSharePayload(null)}
        />
      </View>
    </SwipeableTabContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  partnerBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  partnerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareStreakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6A3D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shareStreakBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  guestBannerContent: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  guestBannerText: {
    fontSize: 13,
  },
  guestCreateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  guestCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameEditRow: {
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  googleBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  googleBadgeLogo: {
    width: 14,
    height: 14,
  },
  googleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 2,
  },
  darkModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 48,
    alignSelf: 'center',
  },
  syncCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  syncCardInfo: {
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  syncCardSubtitle: {
    fontSize: 13,
  },
  syncConflictNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    marginBottom: 4,
  },
  syncDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  syncDetailLabel: {
    fontSize: 13,
  },
  syncDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  syncBackupBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionWrapper: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  interestsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  interestEmoji: {
    fontSize: 16,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noInterestsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  expandedContent: {
    borderRadius: 14,
    padding: 14,
    marginTop: -4,
    marginBottom: 8,
  },
  favSubSection: {
    marginBottom: 16,
  },
  favSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  favSubTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  addSmallBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favChipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  favChipText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 100,
  },
  emptyFavText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  favHintText: {
    fontSize: 12,
    marginTop: 6,
  },
  nationFlagChip: {
    fontSize: 14,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  enableBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recoveryGoalsInput: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notifLabel: {
    fontSize: 15,
  },
  notifMetaText: {
    fontSize: 12,
    marginTop: 10,
  },
  summaryTimeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeStepBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  timeStepBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notificationOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  notificationOptionPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notificationOptionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recapPreviewCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  recapPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recapPreviewText: {
    fontSize: 12,
    lineHeight: 17,
  },
  claimRewardBtn: {
    marginTop: 8,
    minHeight: 34,
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claimRewardBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  testNotifBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  testNotifBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mfaSetupBox: {
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  mfaSetupTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mfaQrImage: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    borderRadius: 8,
  },
  mfaSecretText: {
    fontSize: 12,
    lineHeight: 16,
  },
  mfaCodeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    letterSpacing: 1,
  },
  mfaActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeSection: {
    marginTop: 12,
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10,
  },
  accountBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountSecurityBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountSecurityBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  modalNationFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    paddingVertical: 14,
    fontSize: 16,
  },
  modalInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalInfoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionTeamLogo: {
    width: 26,
    height: 26,
  },
  modalFlag: {
    fontSize: 22,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalOptionSub: {
    fontSize: 13,
  },
  addedLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  interestsListContent: {
    paddingBottom: 20,
  },
  interestOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  interestOptionEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  interestOptionInfo: {
    flex: 1,
  },
  interestOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  interestOptionTabs: {
    fontSize: 12,
  },
  interestCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  modalFooterText: {
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  tabOrderRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tabOrderRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabOrderIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tabOrderLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  tabOrderArrows: {
    flexDirection: 'row',
    gap: 6,
  },
  tabOrderArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetTabBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteAccountLink: {
    alignItems: 'center' as const,
    paddingVertical: 16,
    marginTop: 24,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '400' as const,
    textDecorationLine: 'underline' as const,
  },
});
