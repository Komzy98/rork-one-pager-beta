import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import type { EventFriendProfile } from '@/utils/eventSocialProof';
import type { EventsPalette } from '@/utils/eventsPalette';
import { EventFriendsAvatarStack } from '@/components/events/EventFriendsAvatarStack';

interface EventSocialProofRowProps {
  label: string;
  friends: EventFriendProfile[];
  palette: EventsPalette;
  compact?: boolean;
}

export const EventSocialProofRow = React.memo(function EventSocialProofRow({
  label,
  friends,
  palette,
  compact = false,
}: EventSocialProofRowProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <EventFriendsAvatarStack friends={friends} palette={palette} size={compact ? 18 : 22} />
      <Users size={compact ? 11 : 12} color={palette.primary} />
      <Text
        style={[styles.label, { color: palette.primary }, compact && styles.labelCompact]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCompact: {
    gap: 5,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  labelCompact: {
    fontSize: 11,
  },
});
