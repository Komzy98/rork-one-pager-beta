import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Compass } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';

export default function TodaySynthesisCue({
  conflict,
  observation,
}: {
  conflict?: string | null;
  observation?: string | null;
}) {
  const { colors, isDark } = useTheme();
  const message = conflict ?? observation;
  if (!message) return null;

  const isConflict = Boolean(conflict);
  const accent = isConflict ? '#D97706' : colors.primary;

  return (
    <View style={styles.wrap}>
      <View style={[styles.rule, { backgroundColor: isDark ? '#2A2F39' : '#E7EAF0' }]} />
      <View style={styles.row}>
        {isConflict ? <AlertTriangle size={16} color={accent} /> : <Compass size={16} color={accent} />}
        <View style={styles.copy}>
          <Text style={[styles.label, { color: accent }]}>{isConflict ? 'SCHEDULE CONFLICT' : 'WORTH KNOWING'}</Text>
          <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12, gap: 12 },
  rule: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.15 },
  text: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '650' as any },
});
