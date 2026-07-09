import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { EventFriendProfile } from '@/utils/eventSocialProof';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventFriendsAvatarStackProps {
  friends: EventFriendProfile[];
  palette: EventsPalette;
  size?: number;
  maxVisible?: number;
}

function initials(name: string): string {
  const base = name.replace(/^@/, '').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export const EventFriendsAvatarStack = React.memo(function EventFriendsAvatarStack({
  friends,
  palette,
  size = 22,
  maxVisible = 3,
}: EventFriendsAvatarStackProps) {
  if (friends.length === 0) return null;

  const visible = friends.slice(0, maxVisible);
  const overflow = friends.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((friend, index) => (
        <View
          key={friend.id}
          style={[
            styles.avatarWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: index > 0 ? -(size * 0.28) : 0,
              borderColor: palette.card,
            },
          ]}
        >
          {friend.avatarUrl ? (
            <Image source={{ uri: friend.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: palette.primaryLight }]}>
              <Text style={[styles.avatarInitial, { color: palette.primary, fontSize: size * 0.38 }]}>
                {initials(friend.displayName)}
              </Text>
            </View>
          )}
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflowBadge,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -(size * 0.28),
              borderColor: palette.card,
              backgroundColor: palette.surfaceSecondary,
            },
          ]}
        >
          <Text style={[styles.overflowText, { color: palette.textSecondary, fontSize: size * 0.34 }]}>
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '800',
  },
  overflowBadge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontWeight: '800',
  },
});
