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
import { buildUserLink } from '@/utils/deepLinks';
import type { SocialProfile, ActivityVisibility } from '@/utils/friendsService';

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

const VISIBILITY_OPTIONS: { key: ActivityVisibility; label: string }[] = [
  { key: 'public', label: 'Public' },
  { key: 'friends', label: 'Partners' },
  { key: 'private', label: 'Private' },
];

function initials(name: string | null, username: string): string {
  const base = (name || username || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function presence(lastActiveAt: string): { label: string; color: string } {
  const diffMin = (Date.now() - new Date(lastActiveAt).getTime()) / 60000;
  if (diffMin < 5) return { label: 'Online', color: '#34C759' };
  if (diffMin < 60) return { label: 'Away', color: '#FF9500' };
  return { label: 'Offline', color: '#8E8E93' };
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const friends = useFriends();
  const activity = useActivity();
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
    isRefreshing,
    refresh,
    search,
    requestByUserId,
    requestByUsername,
    accept,
    reject,
    cancel,
    unfriend,
    nudge,
    markAllNudgesRead,
  } = friends;

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
    const t = setTimeout(async () => {
      const r = await search(query);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, search]);

  // Deep link: onepager://u/{username} → auto-send a friend request.
  useEffect(() => {
    const target = params.addUsername;
    if (!target || autoAddHandled.current || available !== true) return;
    autoAddHandled.current = true;
    (async () => {
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
    })();
  }, [params.addUsername, available, requestByUsername, refresh]);

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleAdd = useCallback(
    async (profile: SocialProfile) => {
      haptic();
      setBusyId(profile.id);
      try {
        const res = await requestByUserId(profile.id);
        if (res.ok) {
          setRequestedIds((prev) => new Set(prev).add(profile.id));
        } else if (res.reason === 'already_friends') {
          Alert.alert("Already partners", `You and @${profile.username} are already connected.`);
        } else if (res.reason === 'already_requested') {
          setRequestedIds((prev) => new Set(prev).add(profile.id));
        } else if (res.reason !== 'self') {
          Alert.alert('Could not add', res.message || 'Please try again.');
        }
      } finally {
        setBusyId(null);
      }
    },
    [requestByUserId, haptic],
  );

  const handleNudge = useCallback(
    async (friend: SocialProfile) => {
      haptic();
      setBusyId(friend.id);
      try {
        await nudge(friend.id);
        Alert.alert('Nudge sent 👋', `${friend.displayName || '@' + friend.username} will get a little push to keep their streak going.`);
      } catch {
        Alert.alert('Could not send', 'Please try again in a moment.');
      } finally {
        setBusyId(null);
      }
    },
    [nudge, haptic],
  );

  const handleUnfriend = useCallback(
    (friend: SocialProfile) => {
      Alert.alert(
        'Remove partner',
        `Remove ${friend.displayName || '@' + friend.username} from your accountability partners?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
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

  const handleShareInvite = useCallback(async () => {
    if (!myProfile) return;
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* Invite card */}
          {myProfile && (
            <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Avatar profile={myProfile} size={44} />
              <View style={styles.inviteInfo}>
                <Text style={[styles.inviteName, { color: colors.text }]} numberOfLines={1}>
                  {myProfile.displayName || 'You'}
                </Text>
                <Text style={[styles.inviteHandle, { color: colors.textTertiary }]}>@{myProfile.username}</Text>
              </View>
              <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.primary }]} onPress={handleShareInvite}>
                <Share2 size={16} color={colors.textInverse} />
                <Text style={[styles.inviteBtnText, { color: colors.textInverse }]}>Invite</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Activity privacy */}
          {activity.available === true && (
            <>
              <View style={styles.privacyRow}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
                  SHARE MY ACTIVITY
                </Text>
              </View>
              <View style={[styles.segmentGroup, { backgroundColor: colors.surfaceSecondary }]}>
                {VISIBILITY_OPTIONS.map((opt) => {
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

          {/* Incoming requests */}
          {incomingRequests.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                REQUESTS ({incomingRequests.length})
              </Text>
              {incomingRequests.map((req) => (
                <View key={req.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Avatar profile={req.from} />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {req.from.displayName || req.from.username}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textTertiary }]}>@{req.from.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                    onPress={() => accept(req.id)}
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
              No partners yet. Share your invite link or add someone by username to start keeping each other accountable.
            </Text>
          ) : (
            friendList.map((f) => {
              const p = presence(f.lastActiveAt);
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onLongPress={() => handleUnfriend(f)}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View>
                    <Avatar profile={f} />
                    <View style={[styles.presenceDot, { backgroundColor: p.color, borderColor: colors.card }]} />
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
});
