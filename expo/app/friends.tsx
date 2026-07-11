import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Platform,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  X,
  UserPlus,
  Flame,
  Search,
  Check,
  Hand,
  Share2,
  Clock,
  Users,
  PartyPopper,
  Globe,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useFriends } from '@/hooks/useFriends';
import { useActivity } from '@/hooks/useActivity';
import { useUserProfile } from '@/hooks/useUserProfile';
import { buildUserLink } from '@/utils/deepLinks';
import type { SocialProfile } from '@/utils/friendsService';
import {
  VISIBILITY_OPTIONS,
  confirmBeforeFirstPartner,
  getVisibilityCopy,
  UNFRIEND_REVOKE_MESSAGE,
} from '@/utils/partnerPrivacy';
import {
  mergeSocialPrivacy,
  partnerPresenceLabel,
  type SocialPrivacyPreferences,
} from '@/utils/socialPrivacy';
import {
  canUseSocialFeatures,
  isValidBirthYear,
  MIN_SOCIAL_AGE,
  socialRestrictionMessage,
} from '@/utils/socialAgeConsent';
import type { PartnerReportReason } from '@/utils/socialCompliance';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const VISIBILITY_SEGMENT_OPTIONS = VISIBILITY_OPTIONS.map(({ key, label }) => ({ key, label }));

function initials(name: string | null, username: string): string {
  const base = (name || username || '?').trim();
  if (!base || base === '?') return '?';
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function PrivacyToggleRow({
  title,
  body,
  value,
  onValueChange,
  colors,
}: {
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.genericCopyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.genericCopyCopy}>
        <Text style={[styles.genericCopyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.genericCopyBody, { color: colors.textTertiary }]}>{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const friends = useFriends();
  const activity = useActivity();
  const { profile, updateDisplayPreferences, updateProfile } = useUserProfile();
  const params = useLocalSearchParams<{ addUsername?: string }>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const autoAddHandled = useRef(false);

  const {
    available,
    isSignedIn,
    myProfile,
    friends: friendList,
    incomingRequests,
    outgoingRequests,
    nudges,
    isRefreshing,
    refresh,
    search,
    requestByUserId,
    requestByUsername,
    accept,
    reject,
    cancel,
    unfriend,
    block,
    report,
    nudge,
    markAllNudgesRead,
    patchMyProfile,
    updatePartnerPrivacy,
    blockNudges,
    socialAllowed,
  } = friends;

  const privacyPrefs = mergeSocialPrivacy(profile?.socialPrivacy);

  const socialRestriction = socialRestrictionMessage(profile);
  const partnersEnabled = socialAllowed && canUseSocialFeatures(profile);

  const haptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Mark nudges as read when the screen opens.
  useEffect(() => {
    if (available) void markAllNudgesRead();
  }, [available, markAllNudgesRead]);

  // Debounced username search.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await search(query);
          setResults(r);
        } catch (e) {
          setResults([]);
          if ((e as { code?: string })?.code === 'RATE_LIMITED') {
            Alert.alert('Slow down', (e as Error).message);
          }
        } finally {
          setSearching(false);
        }
      })();
    }, 350);
    return () => clearTimeout(t);
  }, [query, search]);

  // Deep link: onepager://u/{username} → auto-send a friend request.
  useEffect(() => {
    const target = params.addUsername;
    if (!target || autoAddHandled.current || available !== true) return;
    autoAddHandled.current = true;
    void (async () => {
      try {
        if (myProfile?.id) {
          const ok = await confirmBeforeFirstPartner(myProfile.id);
          if (!ok) return;
        }
        const res = await requestByUsername(String(target));
        if (res.ok) {
          Alert.alert('Request sent', `Your friend request to @${target} is on its way.`);
        } else if (res.reason === 'already_friends') {
          Alert.alert("You're already partners", `You and @${target} are already accountability partners.`);
        } else if (res.reason === 'already_requested') {
          Alert.alert('Already requested', `You already have a pending request with @${target}.`);
        } else if (res.reason !== 'self') {
          Alert.alert('Could not add', res.message || `We couldn't find @${target}.`);
        }
        refresh();
      } catch {
        Alert.alert('Could not add', 'Please try again in a moment.');
      }
    })();
  }, [params.addUsername, available, requestByUsername, refresh, myProfile?.id]);

  const handleRefresh = useCallback(() => {
    refresh();
    activity.refresh();
  }, [refresh, activity.refresh]);

  const patchPrivacy = useCallback(
    async (patch: Partial<SocialPrivacyPreferences>) => {
      let next = mergeSocialPrivacy({ ...profile?.socialPrivacy, ...patch });
      if (patch.shareStreakOnly === true) {
        next = { ...next, shareEventsOnly: false };
      }
      if (patch.shareEventsOnly === true) {
        next = { ...next, shareStreakOnly: false };
      }
      updateProfile({ socialPrivacy: next });
      try {
        const updated = await updatePartnerPrivacy({
          shareStreakOnly: next.shareStreakOnly,
          shareEventsOnly: next.shareEventsOnly,
          hideLastActive: next.hideLastActive,
          blockNudges: next.blockNudges,
        });
        if (updated) patchMyProfile(updated);
      } catch {
        Alert.alert(
          'Could not save setting',
          'Partner controls need the latest database migration (009_social_privacy). Run it in Supabase, then try again.',
        );
      }
    },
    [profile?.socialPrivacy, updateProfile, updatePartnerPrivacy, patchMyProfile],
  );

  const handleGenericActivity = useCallback(
    (value: boolean) => {
      updateDisplayPreferences({ genericSocialActivity: value });
      void patchPrivacy({ shareHabitsGeneric: value });
    },
    [updateDisplayPreferences, patchPrivacy],
  );

  const confirmIfFirstPartner = useCallback(async (): Promise<boolean> => {
    if (!myProfile?.id) return true;
    return confirmBeforeFirstPartner(myProfile.id);
  }, [myProfile?.id]);

  const handleAdd = useCallback(
    async (profile: SocialProfile) => {
      if (!partnersEnabled) {
        Alert.alert('Not available', socialRestriction || 'Accountability partners are not available for this account.');
        return;
      }
      haptic();
      const ok = await confirmIfFirstPartner();
      if (!ok) return;
      setBusyId(profile.id);
      try {
        const res = await requestByUserId(profile.id);
        if (res.ok) {
          setRequestedIds((prev) => new Set(prev).add(profile.id));
        } else if (res.reason === 'already_friends') {
          refresh();
          Alert.alert(
            'Already partners',
            `You and @${profile.username} are already connected. Your partner list has been refreshed.`,
          );
        } else if (res.reason === 'already_requested') {
          setRequestedIds((prev) => new Set(prev).add(profile.id));
        } else if (res.reason !== 'self') {
          Alert.alert('Could not add', res.message || 'Please try again.');
        }
      } finally {
        setBusyId(null);
      }
    },
    [requestByUserId, haptic, confirmIfFirstPartner, partnersEnabled, socialRestriction, refresh],
  );

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      if (!partnersEnabled) {
        Alert.alert('Not available', socialRestriction || 'Accountability partners are not available for this account.');
        return;
      }
      haptic();
      const ok = await confirmIfFirstPartner();
      if (!ok) return;
      setBusyId(requestId);
      try {
        await accept(requestId);
      } finally {
        setBusyId(null);
      }
    },
    [accept, haptic, confirmIfFirstPartner, partnersEnabled, socialRestriction],
  );

  const handleNudge = useCallback(
    async (friend: SocialProfile) => {
      if (friend.blockNudges) {
        Alert.alert('Nudges off', 'This partner is not accepting nudges right now.');
        return;
      }
      haptic();
      setBusyId(friend.id);
      try {
        await nudge(friend.id);
        Alert.alert('Nudge sent 👋', `${friend.displayName || '@' + friend.username} will get a little push to keep their streak going.`);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'NUDGES_BLOCKED') {
          Alert.alert('Nudges off', 'This partner is not accepting nudges right now.');
        } else {
          Alert.alert('Could not send', 'Please try again in a moment.');
        }
      } finally {
        setBusyId(null);
      }
    },
    [nudge, haptic],
  );

  const handleUnfriend = useCallback(
    (friend: SocialProfile) => {
      const name = friend.displayName || '@' + friend.username;
      Alert.alert(
        'Remove partner?',
        `${name} will be removed from your accountability partners.\n\n${UNFRIEND_REVOKE_MESSAGE}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove partner',
            style: 'destructive',
            onPress: async () => {
              setBusyId(friend.id);
              try {
                await unfriend(friend.id);
              } finally {
                setBusyId(null);
              }
            },
          },
        ],
      );
    },
    [unfriend],
  );

  const handleBlock = useCallback(
    (friend: SocialProfile) => {
      const name = friend.displayName || '@' + friend.username;
      Alert.alert(
        'Block partner?',
        `${name} will be removed and immediately lose access to your profile, activity, and plans. They cannot re-add you unless you unblock them (contact support).`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              setBusyId(friend.id);
              try {
                await block(friend.id);
                Alert.alert('Blocked', `${name} can no longer see your social data.`);
              } catch {
                Alert.alert('Could not block', 'Please try again in a moment.');
              } finally {
                setBusyId(null);
              }
            },
          },
        ],
      );
    },
    [block],
  );

  const submitReport = useCallback(
    async (friend: SocialProfile, reason: PartnerReportReason) => {
      setBusyId(friend.id);
      try {
        await report(friend.id, reason);
        Alert.alert('Report submitted', 'Thank you. Our team will review this report.');
      } catch {
        Alert.alert('Could not submit report', 'Please try again in a moment.');
      } finally {
        setBusyId(null);
      }
    },
    [report],
  );

  const handleReport = useCallback(
    (friend: SocialProfile) => {
      Alert.alert('Report partner', 'What would you like to report?', [
        { text: 'Harassment', onPress: () => void submitReport(friend, 'harassment') },
        { text: 'Spam', onPress: () => void submitReport(friend, 'spam') },
        { text: 'Inappropriate content', onPress: () => void submitReport(friend, 'inappropriate') },
        { text: 'Other', onPress: () => void submitReport(friend, 'other') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [submitReport],
  );

  const handlePartnerLongPress = useCallback(
    (friend: SocialProfile) => {
      haptic();
      Alert.alert(friend.displayName || '@' + friend.username, undefined, [
        { text: 'Report', onPress: () => handleReport(friend) },
        { text: 'Block', style: 'destructive', onPress: () => handleBlock(friend) },
        { text: 'Remove partner', style: 'destructive', onPress: () => handleUnfriend(friend) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [haptic, handleReport, handleBlock, handleUnfriend],
  );

  const handleGoPrivate = useCallback(() => {
    haptic();
    if (activity.visibility === 'private') return;
    Alert.alert(
      'Go private?',
      'Partners will stop seeing your activity, saved events, and RSVPs. They can still see your name, avatar, and streak.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go private',
          onPress: () => void activity.setVisibility('private'),
        },
      ],
    );
  }, [activity, haptic]);

  const handleShareInvite = useCallback(async () => {
    if (!myProfile?.username) {
      Alert.alert('Almost ready', 'Your partner handle is still being set up. Pull to refresh and try again.');
      return;
    }
    const link = buildUserLink(myProfile.username);
    try {
      await Share.share({
        message: `Be my accountability partner on One Pager 💪 We'll keep each other's streaks alive.\n${link}`,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      });
    } catch {
      // dismissed
    }
  }, [myProfile]);

  const Avatar = ({ profile, size = 48 }: { profile: SocialProfile; size?: number }) => (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary + '22' },
      ]}
    >
      {profile.avatarUrl ? (
        <Image source={{ uri: profile.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.36 }]}>
          {initials(profile.displayName, profile.username)}
        </Text>
      )}
    </View>
  );

  const visibilityCopy = getVisibilityCopy(activity.visibility);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Accountability Partners</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerClose}>
          <X size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {!isSignedIn ? (
        <View style={styles.center}>
          <Users size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to add partners</Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
            Accountability partners sync across devices, so you'll need an account to connect with friends.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      ) : available === false ? (
        <View style={styles.center}>
          <Clock size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Almost there</Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
            The friends backend isn't set up on this project yet. Apply the {`002_social.sql`} migration in Supabase, then reopen this screen.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {/* Invite card */}
          {myProfile && (
            <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Avatar profile={myProfile} size={44} />
              <View style={styles.inviteInfo}>
                <Text style={[styles.inviteName, { color: colors.text }]} numberOfLines={1}>
                  {myProfile.displayName || 'You'}
                </Text>
                <Text style={[styles.inviteHandle, { color: colors.textTertiary }]}>
                  {myProfile.username ? `@${myProfile.username}` : 'Setting up your handle…'}
                </Text>
              </View>
              <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.primary }]} onPress={handleShareInvite}>
                <Share2 size={16} color={colors.textInverse} />
                <Text style={[styles.inviteBtnText, { color: colors.textInverse }]}>Invite</Text>
              </TouchableOpacity>
            </View>
          )}

          {!partnersEnabled && socialRestriction ? (
            <View style={[styles.privateActiveBanner, { backgroundColor: '#FF950012', borderColor: '#FF950033', marginBottom: 8 }]}>
              <Lock size={14} color="#FF9500" />
              <Text style={[styles.privateActiveText, { color: colors.textSecondary }]}>
                {socialRestriction} Set your birth year in Profile → Your data. Ages {MIN_SOCIAL_AGE - 3}–{MIN_SOCIAL_AGE - 1} need parental consent.
              </Text>
            </View>
          ) : null}

          {/* Partner alerts — requests & nudges land here first */}
          {incomingRequests.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
                REQUESTS ({incomingRequests.length})
              </Text>
              {incomingRequests.map((req) => (
                <View key={req.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Avatar profile={req.from} />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {req.from.displayName || req.from.username}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textTertiary }]}>Wants to be your partner</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                    onPress={() => void handleAcceptRequest(req.id)}
                  >
                    <Check size={18} color={colors.textInverse} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary, marginLeft: 8 }]}
                    onPress={() => reject(req.id)}
                  >
                    <X size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {!blockNudges && nudges.filter((n) => !n.read).length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
                NUDGES ({nudges.filter((n) => !n.read).length})
              </Text>
              {nudges
                .filter((n) => !n.read)
                .map((nudgeItem) => (
                  <View
                    key={nudgeItem.id}
                    style={[styles.nudgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Hand size={18} color={colors.primary} />
                    <View style={styles.nudgeCardBody}>
                      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                        {nudgeItem.from?.displayName || nudgeItem.from?.username || 'A partner'}
                      </Text>
                      <Text style={[styles.feedSub, { color: colors.textTertiary }]} numberOfLines={3}>
                        {nudgeItem.message?.trim() || 'Keep your streak going — they’re cheering you on!'}
                      </Text>
                    </View>
                  </View>
                ))}
            </>
          )}

          {/* Activity privacy */}
          {activity.available === true && (
            <>
              <View style={styles.privacyRow}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
                  SHARE MY ACTIVITY
                </Text>
              </View>

              {activity.visibility !== 'private' ? (
                <TouchableOpacity
                  style={[styles.goPrivateBanner, { backgroundColor: '#FF3B3012', borderColor: '#FF3B3033' }]}
                  onPress={handleGoPrivate}
                  activeOpacity={0.85}
                >
                  <Lock size={16} color="#FF3B30" strokeWidth={2.4} />
                  <View style={styles.goPrivateCopy}>
                    <Text style={[styles.goPrivateTitle, { color: colors.text }]}>Go private</Text>
                    <Text style={[styles.goPrivateBody, { color: colors.textTertiary }]}>
                      One tap to hide activity, saves, and RSVPs from partners
                    </Text>
                  </View>
                  <Text style={[styles.goPrivateAction, { color: '#FF3B30' }]}>Hide</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.privateActiveBanner, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Lock size={14} color={colors.primary} />
                  <Text style={[styles.privateActiveText, { color: colors.textSecondary }]}>
                    Private mode on — activity hidden. Partners still see your name, avatar, and streak.
                  </Text>
                </View>
              )}

              <View style={[styles.segmentGroup, { backgroundColor: colors.surfaceSecondary }]}>
                {VISIBILITY_SEGMENT_OPTIONS.map((opt) => {
                  const active = activity.visibility === opt.key;
                  const Icon = opt.key === 'public' ? Globe : opt.key === 'private' ? Lock : Users;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.segmentItem, active && { backgroundColor: colors.card }]}
                      onPress={() => activity.setVisibility(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Icon size={14} color={active ? colors.primary : colors.textTertiary} />
                      <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textTertiary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.visibilityInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.visibilityInfoTitle, { color: colors.text }]}>
                  {visibilityCopy.label}
                </Text>
                <Text style={[styles.visibilityInfoBody, { color: colors.textTertiary }]}>
                  {visibilityCopy.summary}
                </Text>
                {activity.visibility === 'public' ? (
                  <Text style={[styles.visibilityInfoWarning, { color: '#FF9500' }]}>
                    Public is broader than partners-only. Partners is the recommended default.
                  </Text>
                ) : null}
              </View>

              <View style={[styles.genericCopyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.genericCopyCopy}>
                  <Text style={[styles.genericCopyTitle, { color: colors.text }]}>Share habits (generic)</Text>
                  <Text style={[styles.genericCopyBody, { color: colors.textTertiary }]}>
                    Show “Checked in today” without habit names. Health and recovery habits are never shared.
                  </Text>
                </View>
                <Switch
                  value={privacyPrefs.shareHabitsGeneric}
                  onValueChange={handleGenericActivity}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 16 }]}>
                PARTNER CONTROLS
              </Text>
              <Text style={[styles.hint, { color: colors.textTertiary, marginTop: 0, marginBottom: 8 }]}>
                Fine-tune what partners see beyond your visibility setting. Streak leaderboard always stays visible unless you go private.
              </Text>

              <PrivacyToggleRow
                colors={colors}
                title="Share streak only"
                body="Leaderboard and streak count only — no activity feed, event saves, or habit check-ins."
                value={privacyPrefs.shareStreakOnly}
                onValueChange={(value) => void patchPrivacy({ shareStreakOnly: value })}
              />

              <PrivacyToggleRow
                colors={colors}
                title="Share events only"
                body="Plans and RSVPs without habit logging, sports pins, or watchlist activity."
                value={privacyPrefs.shareEventsOnly}
                onValueChange={(value) => void patchPrivacy({ shareEventsOnly: value })}
              />

              <PrivacyToggleRow
                colors={colors}
                title="Hide last active"
                body="Remove online/offline presence and “at risk” signals from partners."
                value={privacyPrefs.hideLastActive}
                onValueChange={(value) => void patchPrivacy({ hideLastActive: value })}
              />

              <PrivacyToggleRow
                colors={colors}
                title="Block nudges"
                body="Receive no partner pings — incoming nudges are hidden and new ones are declined."
                value={privacyPrefs.blockNudges}
                onValueChange={(value) => void patchPrivacy({ blockNudges: value })}
              />

              {/* Activity feed */}
              <View style={styles.feedHeaderRow}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>ACTIVITY</Text>
                {!!activity.presenceLabel && (
                  <View style={[styles.presencePill, { backgroundColor: '#34C759' + '1A' }]}>
                    <View style={styles.presenceLiveDot} />
                    <Text style={styles.presencePillText}>{activity.presenceLabel}</Text>
                  </View>
                )}
              </View>
              {activity.feed.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  No activity yet. When you and your partners hit streaks or publish routines, it shows up here.
                </Text>
              ) : (
                activity.feed.map((event) => (
                  <View key={event.id} style={[styles.feedItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View
                      style={[
                        styles.avatar,
                        { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      {event.author?.avatarUrl ? (
                        <Image source={{ uri: event.author.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                      ) : (
                        <Text style={[styles.avatarText, { color: colors.primary, fontSize: 14 }]}>
                          {initials(event.author?.displayName ?? null, event.author?.username ?? '?')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.feedBody}>
                      <Text style={[styles.feedTitle, { color: colors.text }]} numberOfLines={2}>
                        {event.title}
                      </Text>
                      {!!event.body && (
                        <Text style={[styles.feedSub, { color: colors.textTertiary }]} numberOfLines={2}>
                          {event.body}
                        </Text>
                      )}
                      <Text style={[styles.feedTime, { color: colors.textTertiary }]}>{timeAgo(event.createdAt)} ago</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.cheerBtn,
                        { borderColor: event.cheeredByMe ? '#F59E0B' : colors.border, backgroundColor: event.cheeredByMe ? '#F59E0B18' : 'transparent' },
                      ]}
                      onPress={() => {
                        haptic();
                        void activity.cheer(event.id, !event.cheeredByMe);
                      }}
                      activeOpacity={0.7}
                    >
                      <PartyPopper size={15} color={event.cheeredByMe ? '#F59E0B' : colors.textTertiary} />
                      {event.cheersCount > 0 && (
                        <Text style={[styles.cheerCount, { color: event.cheeredByMe ? '#F59E0B' : colors.textTertiary }]}>
                          {event.cheersCount}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {/* Search / add */}
          {partnersEnabled ? (
            <>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ADD A PARTNER</Text>
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
            />
            {searching && <ActivityIndicator size="small" color={colors.textTertiary} />}
          </View>

          {results.map((p) => {
            const requested = requestedIds.has(p.id);
            return (
              <View key={p.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Avatar profile={p} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                    {p.displayName || p.username}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textTertiary }]}>@{p.username}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: requested ? colors.surfaceSecondary : colors.primary }]}
                  disabled={requested || busyId === p.id}
                  onPress={() => handleAdd(p)}
                >
                  {busyId === p.id ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : requested ? (
                    <Text style={[styles.addBtnText, { color: colors.textTertiary }]}>Requested</Text>
                  ) : (
                    <>
                      <UserPlus size={15} color={colors.textInverse} />
                      <Text style={[styles.addBtnText, { color: colors.textInverse }]}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <Text style={[styles.hint, { color: colors.textTertiary }]}>No users found for “{query.trim()}”.</Text>
          )}
            </>
          ) : null}

          {/* Pending (outgoing) */}
          {outgoingRequests.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PENDING</Text>
              {outgoingRequests.map((req) => (
                <View key={req.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.avatar, { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceSecondary }]}>
                    <Clock size={20} color={colors.textTertiary} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {req.to?.displayName || req.to?.username || 'Pending'}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textTertiary }]}>Waiting to accept</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => cancel(req.id)}
                  >
                    <Text style={[styles.addBtnText, { color: colors.textTertiary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Friends */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            PARTNERS ({friendList.length})
          </Text>
          {friendList.length === 0 ? (
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              No partners yet. Share your invite link or add someone by username. Partners see your streak and activity summaries — switch to Private anytime.
            </Text>
          ) : (
            friendList.map((f) => {
              const p = partnerPresenceLabel(f) ?? { label: 'Offline', color: '#8E8E93' };
              const showPresenceDot = !f.hideLastActive;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onLongPress={() => handlePartnerLongPress(f)}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View>
                    <Avatar profile={f} />
                    {showPresenceDot ? (
                      <View style={[styles.presenceDot, { backgroundColor: p.color, borderColor: colors.card }]} />
                    ) : null}
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {f.displayName || f.username}
                    </Text>
                    <View style={styles.streakRow}>
                      <Flame size={14} color="#FF6A3D" />
                      <Text style={[styles.streakText, { color: colors.textSecondary }]}>
                        {f.currentStreak} day{f.currentStreak === 1 ? '' : 's'}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textTertiary }]}> · {p.label}</Text>
                    </View>
                  </View>
                  {f.blockNudges ? (
                    <View style={[styles.nudgeBtn, { borderColor: colors.border, opacity: 0.5 }]}>
                      <Hand size={15} color={colors.textTertiary} />
                      <Text style={[styles.nudgeText, { color: colors.textTertiary }]}>Off</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.nudgeBtn, { borderColor: colors.primary }]}
                      disabled={busyId === f.id}
                      onPress={() => handleNudge(f)}
                    >
                      {busyId === f.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Hand size={15} color={colors.primary} />
                          <Text style={[styles.nudgeText, { color: colors.primary }]}>Nudge</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerClose: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  inviteInfo: { flex: 1 },
  inviteName: { fontSize: 16, fontWeight: '700' },
  inviteHandle: { fontSize: 13, marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  inviteBtnText: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  searchInput: { flex: 1, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 8,
  },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  streakText: { fontSize: 13, fontWeight: '600' },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontWeight: '700' },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 76,
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 84,
    justifyContent: 'center',
  },
  nudgeText: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goPrivateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  goPrivateCopy: {
    flex: 1,
    gap: 2,
  },
  goPrivateTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  goPrivateBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  goPrivateAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  privateActiveBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  privateActiveText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  visibilityInfoCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  visibilityInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  visibilityInfoBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  visibilityInfoWarning: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  genericCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  genericCopyCopy: {
    flex: 1,
    gap: 4,
  },
  genericCopyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  genericCopyBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  segmentGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
  feedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 16,
  },
  presenceLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
  presencePillText: { fontSize: 12, fontWeight: '700', color: '#1E9E4A' },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 8,
  },
  feedBody: { flex: 1, marginLeft: 12 },
  feedTitle: { fontSize: 14, fontWeight: '700' },
  feedSub: { fontSize: 13, marginTop: 2 },
  feedTime: { fontSize: 11, marginTop: 4 },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 48,
    justifyContent: 'center',
  },
  cheerCount: { fontSize: 13, fontWeight: '700' },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 8,
  },
  nudgeCardBody: {
    flex: 1,
    gap: 4,
  },
});
