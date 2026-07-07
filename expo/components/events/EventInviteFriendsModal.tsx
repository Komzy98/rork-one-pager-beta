import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Send, UserPlus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SocialProfile } from '@/utils/friendsService';
import type { EventsPalette } from '@/utils/eventsPalette';
import { buildEventLink } from '@/utils/deepLinks';

interface EventInviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  palette: EventsPalette;
  eventTitle: string;
  eventDateLabel?: string | null;
  eventTimeLabel?: string | null;
  venueName?: string | null;
  eventId: string;
  inviterUsername?: string | null;
  friends: SocialProfile[];
  onInviteFriend: (friend: SocialProfile, message: string) => Promise<void>;
}

function initials(name: string | null, username: string): string {
  const base = (name || username || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function displayName(friend: SocialProfile): string {
  return friend.displayName ?? `@${friend.username}`;
}

export function EventInviteFriendsModal({
  visible,
  onClose,
  palette,
  eventTitle,
  eventDateLabel,
  eventTimeLabel,
  venueName,
  eventId,
  inviterUsername,
  friends,
  onInviteFriend,
}: EventInviteFriendsModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const name = (f.displayName ?? '').toLowerCase();
      const username = f.username.toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [friends, query]);

  const buildMessage = useCallback(() => {
    const link = buildEventLink(eventId, { from: inviterUsername });
    return [
      `Join me for ${eventTitle}`,
      `${eventDateLabel ?? ''} ${eventTimeLabel ?? ''}`.trim(),
      venueName ?? '',
      link,
    ]
      .filter(Boolean)
      .join('\n');
  }, [eventDateLabel, eventId, eventTimeLabel, eventTitle, inviterUsername, venueName]);

  const handleInvite = useCallback(
    async (friend: SocialProfile) => {
      setBusyId(friend.id);
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const message = buildMessage();
        await onInviteFriend(friend, message);
        setInvitedIds((prev) => new Set(prev).add(friend.id));
      } finally {
        setBusyId(null);
      }
    },
    [buildMessage, onInviteFriend],
  );

  const handleShareLink = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = buildMessage();
    await Share.share({
      message,
      ...(Platform.OS === 'ios' ? { url: buildEventLink(eventId, { from: inviterUsername }) } : {}),
    });
  }, [buildMessage, eventId, inviterUsername]);

  const handleClose = useCallback(() => {
    setQuery('');
    setInvitedIds(new Set());
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.text }]}>Invite friends</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={2}>
              {eventTitle}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { borderColor: palette.border }]}>
            <X size={18} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Search size={16} color={palette.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search friends..."
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyWrap}>
            <UserPlus size={28} color={palette.textMuted} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No friends yet</Text>
            <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
              Add friends from Profile → Accountability Partners, then invite them here.
            </Text>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: palette.primary }]}
              onPress={() => void handleShareLink()}
              activeOpacity={0.85}
            >
              <Text style={[styles.shareBtnText, { color: palette.textInverse }]}>Share event link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filtered.length === 0 ? (
              <Text style={[styles.noResults, { color: palette.textMuted }]}>No friends match &quot;{query}&quot;</Text>
            ) : (
              filtered.map((friend) => {
                const invited = invitedIds.has(friend.id);
                const busy = busyId === friend.id;
                return (
                  <View
                    key={friend.id}
                    style={[styles.friendRow, { backgroundColor: palette.card, borderColor: palette.border }]}
                  >
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: palette.primaryLight }]}>
                        <Text style={[styles.avatarText, { color: palette.primary }]}>
                          {initials(friend.displayName, friend.username)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.friendCopy}>
                      <Text style={[styles.friendName, { color: palette.text }]} numberOfLines={1}>
                        {displayName(friend)}
                      </Text>
                      <Text style={[styles.friendHandle, { color: palette.textMuted }]} numberOfLines={1}>
                        @{friend.username}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.inviteBtn,
                        {
                          backgroundColor: invited ? palette.primaryLight : palette.primary,
                          borderColor: invited ? palette.primary : 'transparent',
                          borderWidth: invited ? 1 : 0,
                        },
                      ]}
                      onPress={() => void handleInvite(friend)}
                      disabled={busy || invited}
                      activeOpacity={0.85}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={invited ? palette.primary : palette.textInverse} />
                      ) : (
                        <>
                          <Send size={13} color={invited ? palette.primary : palette.textInverse} />
                          <Text
                            style={[
                              styles.inviteBtnText,
                              { color: invited ? palette.primary : palette.textInverse },
                            ]}
                          >
                            {invited ? 'Sent' : 'Invite'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={[styles.shareLinkBtn, { borderColor: palette.border }]}
              onPress={() => void handleShareLink()}
              activeOpacity={0.85}
            >
              <Text style={[styles.shareLinkText, { color: palette.primary }]}>Share link outside the app</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  friendCopy: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
  },
  friendHandle: {
    fontSize: 12,
    fontWeight: '500',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 84,
    minHeight: 36,
    justifyContent: 'center',
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noResults: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 24,
  },
  shareLinkBtn: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  shareLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
