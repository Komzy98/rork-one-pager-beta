import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrainCircuit, ChevronLeft, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { Task } from '@/types/task';
import { useTheme } from '@/hooks/useTheme';
import { buildHabitEngineV2Setup } from '@/utils/habitEngineV2';

interface Props {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
}

const STEP_TITLES = ['Choose the cue', 'Choose the window', 'Plan for bad days', 'Baseline'];

export default function HabitEngineV2SetupModal({ visible, task, onClose, onSave }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [anchor, setAnchor] = useState('');
  const [firstStep, setFirstStep] = useState('');
  const [location, setLocation] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [fallback, setFallback] = useState('');
  const [reward, setReward] = useState('');
  const [automaticity, setAutomaticity] = useState<1 | 2 | 3 | 4 | 5 | undefined>();

  useEffect(() => {
    if (!visible || !task) return;
    const engine = task.habitEngine;
    setStep(0);
    setAnchor(engine?.anchor || '');
    setFirstStep(engine?.firstStep || '');
    setLocation(engine?.location || '');
    setWindowStart(engine?.windowStart || '');
    setWindowEnd(engine?.windowEnd || '');
    setMinimumVersion(engine?.minimumVersion || engine?.fallback || '');
    setObstacle(engine?.obstacle || '');
    setFallback(engine?.fallback || '');
    setReward(engine?.immediateReward || '');
    const last = engine?.automaticityCheckIns?.at(-1);
    setAutomaticity(last?.score);
  }, [visible, task]);

  const canContinue = useMemo(() => {
    if (step === 0) return anchor.trim().length > 1 && firstStep.trim().length > 1;
    if (step === 2) return minimumVersion.trim().length > 1;
    return true;
  }, [anchor, firstStep, minimumVersion, step]);

  const tap = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const next = () => {
    if (!canContinue) return;
    tap();
    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }
    if (!task) return;
    onSave(buildHabitEngineV2Setup(task, {
      anchor,
      firstStep,
      location,
      windowStart,
      windowEnd,
      obstacle,
      minimumVersion,
      fallback,
      immediateReward: reward,
      automaticityBaseline: automaticity,
    }));
    onClose();
  };

  if (!task) return null;

  const inputStyle = [
    styles.input,
    { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              tap();
              if (step > 0) setStep((value) => value - 1);
              else onClose();
            }}
          >
            {step > 0 ? <ChevronLeft size={20} color={colors.text} /> : <X size={20} color={colors.text} />}
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>HABIT ENGINE V2</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{STEP_TITLES[step]}</Text>
          </View>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>{step + 1}/4</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: ((step + 1) * 25 + '%') as `${number}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                <BrainCircuit size={26} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Make starting predictable</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Habit formation gets easier when the same cue reliably triggers the same first action.
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>After what?</Text>
              <TextInput
                style={inputStyle}
                value={anchor}
                onChangeText={setAnchor}
                placeholder="e.g. After I close my work laptop"
                placeholderTextColor={colors.textTertiary}
                testID="habit-engine-v2-anchor"
              />
              <Text style={[styles.label, { color: colors.text }]}>What is the first tiny action?</Text>
              <TextInput
                style={inputStyle}
                value={firstStep}
                onChangeText={setFirstStep}
                placeholder="e.g. Put on my gym clothes"
                placeholderTextColor={colors.textTertiary}
                testID="habit-engine-v2-first-step"
              />
              <Text style={[styles.label, { color: colors.text }]}>Where? <Text style={styles.optional}>optional</Text></Text>
              <TextInput
                style={inputStyle}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Gym near home"
                placeholderTextColor={colors.textTertiary}
              />
            </>
          )}

          {step === 1 && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Give it a realistic window</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                The engine uses this to intervene before the plan fails, not after.
              </Text>
              <View style={styles.timeRow}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.label, { color: colors.text }]}>Starts</Text>
                  <TextInput
                    style={inputStyle}
                    value={windowStart}
                    onChangeText={setWindowStart}
                    placeholder="17:30"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.timeColumn}>
                  <Text style={[styles.label, { color: colors.text }]}>Ends</Text>
                  <TextInput
                    style={inputStyle}
                    value={windowEnd}
                    onChangeText={setWindowEnd}
                    placeholder="19:00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <View style={[styles.note, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  If your habit is cue-based rather than time-based, you can leave the window blank.
                </Text>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Protect repetition on bad days</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                A minimum version keeps the cue-response loop alive when the full behaviour is unrealistic.
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>Minimum version</Text>
              <TextInput
                style={inputStyle}
                value={minimumVersion}
                onChangeText={setMinimumVersion}
                placeholder="e.g. One main lift for 10 minutes"
                placeholderTextColor={colors.textTertiary}
                testID="habit-engine-v2-minimum"
              />
              <Text style={[styles.label, { color: colors.text }]}>What usually gets in the way?</Text>
              <TextInput
                style={inputStyle}
                value={obstacle}
                onChangeText={setObstacle}
                placeholder="e.g. I am exhausted after work"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.label, { color: colors.text }]}>Fallback <Text style={styles.optional}>optional</Text></Text>
              <TextInput
                style={inputStyle}
                value={fallback}
                onChangeText={setFallback}
                placeholder="e.g. 10-minute home workout"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.label, { color: colors.text }]}>Immediate reward <Text style={styles.optional}>optional</Text></Text>
              <TextInput
                style={inputStyle}
                value={reward}
                onChangeText={setReward}
                placeholder="e.g. Favourite podcast on the walk home"
                placeholderTextColor={colors.textTertiary}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>How automatic does this feel today?</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Answer the same question every couple of weeks so One Pager measures automaticity instead of pretending a streak equals a habit.
              </Text>
              <Text style={[styles.question, { color: colors.text }]}>
                “{task.title} is something I do automatically.”
              </Text>
              <View style={styles.scaleRow}>
                {([1, 2, 3, 4, 5] as const).map((value) => {
                  const selected = automaticity === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.scaleButton,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => {
                        tap();
                        setAutomaticity(value);
                      }}
                    >
                      <Text style={[styles.scaleNumber, { color: selected ? '#fff' : colors.text }]}>{value}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.scaleLabels}>
                <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>Not at all</Text>
                <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>Completely</Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: canContinue ? colors.primary : colors.border },
            ]}
            disabled={!canContinue}
            onPress={next}
            testID="habit-engine-v2-next"
          >
            <Text style={styles.primaryButtonText}>{step === 3 ? 'Build my plan' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  stepCount: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 3, backgroundColor: 'rgba(128,128,128,0.12)' },
  progressFill: { height: 3, borderRadius: 999 },
  content: { padding: 24, paddingBottom: 40 },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  optional: { fontSize: 11, fontWeight: '500', color: '#8E8E93' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeColumn: { flex: 1 },
  note: { borderRadius: 14, padding: 14, marginTop: 18 },
  noteText: { fontSize: 13, lineHeight: 19 },
  question: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 22,
  },
  scaleRow: { flexDirection: 'row', gap: 9 },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleNumber: { fontSize: 18, fontWeight: '800' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scaleLabel: { fontSize: 11 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});