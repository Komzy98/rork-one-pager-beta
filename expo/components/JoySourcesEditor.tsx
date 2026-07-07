import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { JoySources } from '@/types/habit';
import {
  JOY_SOURCE_FIELDS,
  type JoySourceKey,
  parseJoySourceInput,
} from '@/utils/joySources';

type Props = {
  value?: JoySources;
  onChange: (next: JoySources) => void;
  suggested?: JoySources;
  compact?: boolean;
};

export default function JoySourcesEditor({ value, onChange, suggested, compact = false }: Props) {
  const { colors, isDark } = useTheme();
  const [drafts, setDrafts] = useState<Partial<Record<JoySourceKey, string>>>({});

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addValue = useCallback(
    (key: JoySourceKey, raw: string) => {
      const parsed = parseJoySourceInput(raw);
      if (parsed.length === 0) return;
      const current = value?.[key] ?? [];
      const merged = [...current];
      for (const item of parsed) {
        if (!merged.some((m) => m.toLowerCase() === item.toLowerCase())) {
          merged.push(item);
        }
      }
      haptic();
      onChange({ ...(value ?? {}), [key]: merged });
      setDrafts((prev) => ({ ...prev, [key]: '' }));
    },
    [value, onChange, haptic]
  );

  const removeValue = useCallback(
    (key: JoySourceKey, item: string) => {
      haptic();
      const nextList = (value?.[key] ?? []).filter((v) => v !== item);
      const next = { ...(value ?? {}) };
      if (nextList.length === 0) {
        delete next[key];
      } else {
        next[key] = nextList;
      }
      onChange(next);
    },
    [value, onChange, haptic]
  );

  const suggestedChips = useMemo(() => {
    const chips: { key: JoySourceKey; label: string }[] = [];
    for (const field of JOY_SOURCE_FIELDS) {
      for (const label of suggested?.[field.key] ?? []) {
        const already = (value?.[field.key] ?? []).some((v) => v.toLowerCase() === label.toLowerCase());
        if (!already) chips.push({ key: field.key, label });
      }
    }
    return chips.slice(0, compact ? 6 : 12);
  }, [suggested, value, compact]);

  return (
    <View style={styles.wrap}>
      {suggestedChips.length > 0 ? (
        <View style={styles.suggestedBlock}>
          <Text style={[styles.suggestedLabel, { color: colors.textSecondary }]}>
            Suggested from your profile
          </Text>
          <View style={styles.chipRow}>
            {suggestedChips.map((chip) => (
              <TouchableOpacity
                key={`${chip.key}-${chip.label}`}
                style={[
                  styles.suggestChip,
                  { backgroundColor: isDark ? colors.card : '#FFF', borderColor: colors.border },
                ]}
                onPress={() => addValue(chip.key, chip.label)}
              >
                <Text style={[styles.suggestChipText, { color: colors.text }]}>+ {chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {JOY_SOURCE_FIELDS.map((field) => {
        const items = value?.[field.key] ?? [];
        const draft = drafts[field.key] ?? '';
        return (
          <View key={field.key} style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldEmoji}>{field.emoji}</Text>
              <View style={styles.fieldHeaderText}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                {!compact ? (
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>{field.hint}</Text>
                ) : null}
              </View>
            </View>

            {items.length > 0 ? (
              <View style={styles.chipRow}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={`${field.key}-${item}`}
                    style={[
                      styles.chip,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FDF2F8', borderColor: '#DB277733' },
                    ]}
                    onPress={() => removeValue(field.key, item)}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{item}</Text>
                    <X size={12} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={draft}
                onChangeText={(text) => setDrafts((prev) => ({ ...prev, [field.key]: text }))}
                onSubmitEditing={() => addValue(field.key, draft)}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#DB2777' }]}
                onPress={() => addValue(field.key, draft)}
                accessibilityLabel={`Add ${field.label}`}
              >
                <Plus size={18} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  suggestedBlock: {
    gap: 8,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldBlock: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fieldEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  fieldHeaderText: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  suggestChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
