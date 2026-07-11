import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Check, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useCommunity } from '@/hooks/useCommunity';
import { useSocialActivity } from '@/hooks/useSocialActivity';

const CATEGORIES = [
  'Fitness', 'Health', 'Productivity', 'Mindfulness', 'Learning',
  'Social', 'Creative', 'Finance', 'Self-Care', 'Career', 'Household', 'Other',
];

const DIFFICULTIES: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

const COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function PublishHabitScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const community = useCommunity();
  const { logPublishedHabit } = useSocialActivity();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [category, setCategory] = useState('Fitness');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [duration, setDuration] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [publishing, setPublishing] = useState(false);

  const toggleDay = useCallback((d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }, []);

  const canPublish = name.trim().length >= 3 && !publishing && community.available === true;

  const handlePublish = useCallback(async () => {
    if (!canPublish) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPublishing(true);
    try {
      await community.publish({
        name: name.trim(),
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        category,
        difficulty,
        color,
        estimatedDuration: duration.trim() || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 6),
        frequency: { type: days.length === 7 ? 'daily' : 'weekly', days },
      });
      void logPublishedHabit(name.trim(), category);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert('Published 🎉', 'Your routine is now live in Discover for the community.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Could not publish', (e as Error)?.message || 'Please try again.');
    } finally {
      setPublishing(false);
    }
  }, [canPublish, community, name, description, longDescription, category, difficulty, color, duration, tags, days, logPublishedHabit]);

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.label, { color: colors.textTertiary }]}>{children}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <X size={22} color={colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Publish a routine</Text>
        <View style={styles.headerBtn} />
      </View>

      {community.available === false ? (
        <View style={styles.center}>
          <Globe size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Setup required</Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
            {community.isSignedIn
              ? 'The community backend isn\u2019t set up yet. Apply the 003_community.sql migration in Supabase, then try again.'
              : 'Sign in to publish your routines to the community.'}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <Label>NAME</Label>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="e.g. 5am Morning Reset"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />

            <Label>SHORT DESCRIPTION</Label>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="One line that sells it"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              maxLength={120}
            />

            <Label>CATEGORY</Label>
            <View style={styles.chipWrap}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.chip,
                      { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : colors.card },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label>DIFFICULTY</Label>
            <View style={styles.row}>
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[
                      styles.segment,
                      { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : colors.card },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label>SCHEDULE</Label>
            <View style={styles.row}>
              {DAY_LABELS.map((lbl, i) => {
                const active = days.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleDay(i)}
                    style={[
                      styles.dayBtn,
                      { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card },
                    ]}
                  >
                    <Text style={[styles.dayText, { color: active ? colors.textInverse : colors.textSecondary }]}>{lbl}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label>ESTIMATED TIME (OPTIONAL)</Label>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="e.g. 20 min"
              placeholderTextColor={colors.textTertiary}
              value={duration}
              onChangeText={setDuration}
              maxLength={24}
            />

            <Label>TAGS (COMMA SEPARATED, OPTIONAL)</Label>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="morning, focus, energy"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              value={tags}
              onChangeText={setTags}
            />

            <Label>DETAILS (OPTIONAL)</Label>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="How it works, what to expect, tips..."
              placeholderTextColor={colors.textTertiary}
              value={longDescription}
              onChangeText={setLongDescription}
              multiline
            />

            <Label>ACCENT COLOR</Label>
            <View style={styles.row}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }]}
                />
              ))}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.publishBtn, { backgroundColor: canPublish ? colors.primary : colors.surfaceSecondary }]}
              onPress={handlePublish}
              disabled={!canPublish}
            >
              {publishing ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Check size={18} color={canPublish ? colors.textInverse : colors.textTertiary} />
                  <Text style={[styles.publishText, { color: canPublish ? colors.textInverse : colors.textTertiary }]}>
                    Publish to Discover
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
    fontSize: 15,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1, minWidth: 90 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '700' },
  swatch: { width: 38, height: 38, borderRadius: 19 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  publishText: { fontSize: 16, fontWeight: '700' },
});
