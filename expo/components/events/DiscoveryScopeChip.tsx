import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type Props = {
  label: string;
  Icon: LucideIcon;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

/** Scope pill — e.g. Worldwide search vs Near you browse. */
export default function DiscoveryScopeChip({
  label,
  Icon,
  color,
  backgroundColor,
  borderColor,
}: Props) {
  return (
    <View style={[styles.chip, { backgroundColor, borderColor }]}>
      <Icon size={11} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
