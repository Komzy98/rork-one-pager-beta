import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import type { EventFriendProfile } from '@/utils/eventSocialProof';

interface EventsMapMarkerProps {
  category: string;
  selected?: boolean;
  friendAvatars?: EventFriendProfile[];
}

function initials(name: string): string {
  const base = name.replace(/^@/, '').trim();
  return base.slice(0, 1).toUpperCase() || '?';
}

export const EventsMapMarker = React.memo(function EventsMapMarker({
  category,
  selected = false,
  friendAvatars = [],
}: EventsMapMarkerProps) {
  const meta = getEventCategoryMeta(category);
  const Icon = meta.icon;
  const friendsOnPin = friendAvatars.slice(0, 2);

  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]}>
      {friendsOnPin.length > 0 ? (
        <View style={styles.avatarRow}>
          {friendsOnPin.map((friend, index) => (
            <View
              key={friend.id}
              style={[
                styles.friendAvatar,
                { marginLeft: index > 0 ? -7 : 0, borderColor: meta.color },
              ]}
            >
              {friend.avatarUrl ? (
                <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatarImage} />
              ) : (
                <View style={[styles.friendAvatarFallback, { backgroundColor: '#FFF' }]}>
                  <Text style={[styles.friendAvatarInitial, { color: meta.color }]}>
                    {initials(friend.displayName)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.pin, { backgroundColor: meta.color, borderColor: selected ? '#FFF' : meta.color }]}>
        <Icon size={11} color="#FFF" strokeWidth={2.4} />
      </View>
      <View style={[styles.stem, { backgroundColor: meta.color }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapSelected: {
    transform: [{ scale: 1.12 }],
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  friendAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  friendAvatarImage: {
    width: '100%',
    height: '100%',
  },
  friendAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarInitial: {
    fontSize: 8,
    fontWeight: '800',
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stem: {
    width: 3,
    height: 8,
    borderRadius: 2,
    marginTop: -1,
  },
});
