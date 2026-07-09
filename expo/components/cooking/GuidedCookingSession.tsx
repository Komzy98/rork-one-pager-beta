import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  X,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  ChefHat,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import type { CookingRecipe } from '@/constants/cookingRecipes';
import { appFont } from '@/constants/fonts';
import { formatCountdown, getStepTimerDefault } from '@/utils/cookingTimers';

const ACCENT = '#2E9A3F';
const QUICK_TIMER_PRESETS = [60, 180, 300] as const;

type Props = {
  visible: boolean;
  recipe: CookingRecipe | null;
  isDark: boolean;
  onClose: () => void;
  onCompleteCook: () => void | Promise<void>;
};

export default function GuidedCookingSession({ visible, recipe, isDark, onClose, onCompleteCook }: Props) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [checkedIng, setCheckedIng] = useState<Record<string, boolean>>({});
  const [voiceOn, setVoiceOn] = useState(false);
  const lastSpokenStep = useRef<number>(-1);
  const voiceOnRef = useRef(false);
  voiceOnRef.current = voiceOn;

  const warmBg = isDark ? '#121412' : '#FAFBFA';
  const cardBg = isDark ? '#1D221E' : '#FFFFFF';
  const cardBorder = isDark ? '#2D352E' : '#EBEEF1';
  const subtleText = isDark ? '#A7B0A8' : '#667085';
  const mainText = isDark ? '#F2F5F2' : '#101828';
  const secondaryBg = isDark ? '#181C18' : '#F4F6F4';

  const resetSession = useCallback(() => {
    Speech.stop();
    setStepIndex(0);
    setTimerRunning(false);
    setCheckedIng({});
    lastSpokenStep.current = -1;
  }, []);

  useEffect(() => {
    if (!visible || !recipe) return;
    resetSession();
    const initial = getStepTimerDefault(recipe, 0);
    setTimerSeconds(initial ?? 0);
  }, [visible, recipe?.id, resetSession, recipe]);

  const applyStep = useCallback(
    (next: number) => {
      if (!recipe) return;
      const clamped = Math.max(0, Math.min(recipe.steps.length - 1, next));
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStepIndex(clamped);
      const def = getStepTimerDefault(recipe, clamped);
      setTimerSeconds(def ?? 0);
      setTimerRunning(false);
    },
    [recipe],
  );

  const speak = useCallback(
    (text: string, priority: 'step' | 'timer' = 'step') => {
      if (!voiceOn || !text.trim()) return;
      if (Platform.OS === 'web') return;
      try {
        Speech.stop();
        Speech.speak(text, {
          rate: priority === 'timer' ? 1.05 : 0.96,
          pitch: 1,
          language: 'en-GB',
        });
      } catch {
        /* ignore */
      }
    },
    [voiceOn],
  );

  useEffect(() => {
    if (!visible || !recipe || !voiceOn) return;
    if (lastSpokenStep.current === stepIndex) return;
    lastSpokenStep.current = stepIndex;
    const stepText = recipe.steps[stepIndex];
    const hint = recipe.stepHints?.[stepIndex];
    const line = hint ? `${stepText}. ${hint}` : stepText;
    speak(`Step ${stepIndex + 1}. ${line}`, 'step');
  }, [visible, recipe, stepIndex, voiceOn, speak]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (voiceOnRef.current && Platform.OS !== 'web') {
            try {
              Speech.stop();
              Speech.speak('Timer done', { rate: 1.05, language: 'en-GB' });
            } catch {
              /* ignore */
            }
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const stepDefault = useMemo(
    () => (recipe ? getStepTimerDefault(recipe, stepIndex) : null),
    [recipe, stepIndex],
  );

  const close = () => {
    Speech.stop();
    setTimerRunning(false);
    onClose();
  };

  if (!recipe) return null;

  const total = recipe.steps.length;
  const progress = (stepIndex + 1) / total;
  const stepBody = recipe.steps[stepIndex];
  const stepHint = recipe.stepHints?.[stepIndex];
  const hasSuggestedTimer = stepDefault != null && stepDefault > 0;

  const finish = async () => {
    Speech.stop();
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onCompleteCook();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.container, { backgroundColor: warmBg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: cardBorder }]}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: secondaryBg }]} onPress={close} accessibilityLabel="Close cooking mode">
            <X size={20} color={mainText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: mainText }]} numberOfLines={1}>
              {recipe.title}
            </Text>
            <Text style={[styles.headerSub, { color: subtleText }]}>
              Step {stepIndex + 1} of {total}
            </Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <View style={[styles.progressBg, { backgroundColor: cardBorder }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: ACCENT }]} />
        </View>

        <View style={[styles.voiceRow, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
          {voiceOn ? <Volume2 size={18} color={ACCENT} /> : <VolumeX size={18} color={subtleText} />}
          <Text style={[styles.voiceLabel, { color: mainText }]}>Read steps aloud</Text>
          <Switch
            value={voiceOn}
            onValueChange={(v) => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              if (!v) Speech.stop();
              else lastSpokenStep.current = -1;
              setVoiceOn(v);
            }}
            trackColor={{ false: cardBorder, true: '#A7D8AD' }}
            thumbColor={voiceOn ? ACCENT : '#f4f3f4'}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.stepBadge, { backgroundColor: ACCENT }]}>
              <Text style={styles.stepBadgeText}>{stepIndex + 1}</Text>
            </View>
            <Text style={[styles.stepTitle, { color: mainText }]}>{stepBody}</Text>
            {stepHint ? <Text style={[styles.stepHint, { color: subtleText }]}>{stepHint}</Text> : null}
          </View>

          <View style={[styles.timerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.timerHeader}>
              <Timer size={18} color={ACCENT} />
              <Text style={[styles.timerLabel, { color: subtleText }]}>
                {hasSuggestedTimer ? 'Suggested timer for this step' : 'Kitchen timer'}
              </Text>
            </View>
            {!hasSuggestedTimer ? (
              <Text style={[styles.timerHint, { color: subtleText }]}>
                No preset for this step — pick 1, 3 or 5 minutes (or use Reset after starting from a preset).
              </Text>
            ) : null}
            <Text
              style={[
                styles.timerDigits,
                { color: timerSeconds === 0 && !timerRunning ? ACCENT : mainText },
              ]}
            >
              {formatCountdown(timerSeconds)}
            </Text>
            <View style={styles.timerRow}>
              <TouchableOpacity
                style={[
                  styles.timerPrimary,
                  { backgroundColor: ACCENT, opacity: timerSeconds === 0 ? 0.45 : 1 },
                ]}
                disabled={timerSeconds === 0}
                onPress={() => {
                  if (timerSeconds === 0) return;
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setTimerRunning((r) => !r);
                }}
              >
                {timerRunning ? <Pause size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
                <Text style={styles.timerPrimaryText}>
                  {timerRunning ? 'Pause' : timerSeconds === 0 ? 'Start' : 'Resume'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerReset, { backgroundColor: secondaryBg, borderColor: cardBorder }]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimerRunning(false);
                  setTimerSeconds(hasSuggestedTimer ? stepDefault! : 0);
                }}
              >
                <RotateCcw size={18} color={mainText} />
              </TouchableOpacity>
            </View>
            <View style={styles.quickTimers}>
              <Text style={[styles.quickLabel, { color: subtleText }]}>Quick duration</Text>
              <View style={styles.quickRow}>
                {QUICK_TIMER_PRESETS.map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.quickChip, { borderColor: cardBorder, backgroundColor: secondaryBg }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setTimerRunning(false);
                      setTimerSeconds(sec);
                    }}
                  >
                    <Text style={[styles.quickChipText, { color: mainText }]}>{sec / 60} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.ingHeader}>
            <ChefHat size={16} color={ACCENT} />
            <Text style={[styles.ingTitle, { color: mainText }]}>Ingredients</Text>
            <Text style={[styles.ingHint, { color: subtleText }]}>Tap to check off</Text>
          </View>
          {recipe.ingredients.map((name, i) => {
            const key = `${recipe.id}-${i}`;
            const checked = !!checkedIng[key];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.ingRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setCheckedIng((prev) => ({ ...prev, [key]: !checked }));
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: checked ? ACCENT : 'transparent',
                      borderColor: checked ? ACCENT : cardBorder,
                    },
                  ]}
                >
                  {checked ? <Check size={12} color="#FFF" /> : null}
                </View>
                <Text
                  style={[
                    styles.ingName,
                    { color: mainText, opacity: checked ? 0.45 : 1, textDecorationLine: checked ? 'line-through' : 'none' },
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.nav, { paddingBottom: insets.bottom + 12, backgroundColor: cardBg, borderTopColor: cardBorder }]}>
          <TouchableOpacity
            style={[styles.navSide, { backgroundColor: secondaryBg, borderColor: cardBorder, opacity: stepIndex === 0 ? 0.45 : 1 }]}
            disabled={stepIndex === 0}
            onPress={() => applyStep(stepIndex - 1)}
          >
            <ChevronLeft size={20} color={mainText} />
            <Text style={[styles.navSideText, { color: mainText }]}>Back</Text>
          </TouchableOpacity>
          {stepIndex < total - 1 ? (
            <TouchableOpacity style={[styles.navPrimary, { backgroundColor: ACCENT }]} onPress={() => applyStep(stepIndex + 1)}>
              <Text style={styles.navPrimaryText}>Next step</Text>
              <ChevronRight size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.navPrimary, { backgroundColor: '#34C759' }]} onPress={() => void finish()}>
              <Check size={20} color="#FFF" />
              <Text style={styles.navPrimaryText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...appFont('700'), fontSize: 16, fontWeight: '700' as const },
  headerSub: { ...appFont('600'), fontSize: 12, marginTop: 2, fontWeight: '600' as const },
  progressBg: { height: 4, width: '100%' },
  progressFill: { height: 4 },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  voiceLabel: { ...appFont('700'), flex: 1, fontSize: 14, fontWeight: '700' as const },
  scroll: { flex: 1 },
  stepCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 16 },
  stepBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 10 },
  stepBadgeText: { ...appFont('700'), color: '#FFF', fontWeight: '700' as const, fontSize: 12 },
  stepTitle: { ...appFont('700'), fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
  stepHint: { ...appFont('500'), marginTop: 10, fontSize: 14, lineHeight: 21, fontWeight: '500' as const },
  timerCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerLabel: { ...appFont('600'), fontSize: 13, fontWeight: '600' as const },
  timerDigits: { ...appFont('700', { display: true }), marginTop: 10, fontSize: 44, fontWeight: '700' as const, letterSpacing: 1 },
  timerRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  timerPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  timerPrimaryText: { ...appFont('700'), color: '#FFF', fontWeight: '700' as const, fontSize: 15 },
  timerReset: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickTimers: { marginTop: 14 },
  quickLabel: { ...appFont('600'), fontSize: 12, fontWeight: '600' as const, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  quickChipText: { ...appFont('700'), fontWeight: '700' as const, fontSize: 13 },
  timerHint: { ...appFont('400'), marginTop: 8, fontSize: 13, lineHeight: 18 },
  ingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginHorizontal: 16, marginBottom: 8 },
  ingTitle: { ...appFont('700'), fontSize: 16, fontWeight: '700' as const, flex: 1 },
  ingHint: { ...appFont('600'), fontSize: 12, fontWeight: '600' as const },
  ingRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ingName: { ...appFont('600'), flex: 1, fontSize: 15, fontWeight: '600' as const },
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  navSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  navSideText: { ...appFont('700'), fontWeight: '700' as const, fontSize: 15 },
  navPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  navPrimaryText: { ...appFont('700'), color: '#FFF', fontWeight: '700' as const, fontSize: 16 },
});
