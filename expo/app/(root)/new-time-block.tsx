import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Clock,
  SmartphoneNfc,
  Calendar,
  Repeat,
  Check,
} from 'lucide-react-native';

import { useScreenTime } from '@/hooks/useScreenTime';
import { NewTimeBlockFormData } from '@/types/screenTime';
import { APP_CATEGORIES } from '@/types/screenTime';

const BLOCK_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#009688', '#4CAF50',
  '#FF9800', '#795548',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESET_BLOCKS = [
  { name: 'Morning Focus', startTime: '06:00', endTime: '09:00', icon: 'sunrise', blockedApps: ['Social Media', 'Entertainment'], color: '#FF9800' },
  { name: 'Work Hours', startTime: '09:00', endTime: '17:00', icon: 'briefcase', blockedApps: ['Social Media', 'Games', 'Entertainment'], color: '#2196F3' },
  { name: 'Phone-Free Dinner', startTime: '18:00', endTime: '20:00', icon: 'utensils', blockedApps: [], color: '#4CAF50' },
  { name: 'Bedtime Wind Down', startTime: '21:00', endTime: '23:00', icon: 'moon', blockedApps: ['Social Media', 'News & Reading', 'Games'], color: '#673AB7' },
  { name: 'Study Block', startTime: '14:00', endTime: '16:00', icon: 'book', blockedApps: ['Social Media', 'Entertainment', 'Games', 'Shopping'], color: '#E91E63' },
];

export default function NewTimeBlockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addBlock } = useScreenTime();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [color, setColor] = useState<string>('#F44336');
  const [startHour, setStartHour] = useState<number>(9);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(17);
  const [endMinute, setEndMinute] = useState<number>(0);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'specific_days'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleApp = useCallback((appName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedApps(prev =>
      prev.includes(appName) ? prev.filter(a => a !== appName) : [...prev, appName]
    );
  }, []);

  const toggleDay = useCallback((day: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const applyPreset = useCallback((preset: typeof PRESET_BLOCKS[0]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setName(preset.name);
    setColor(preset.color);
    const [sh, sm] = preset.startTime.split(':').map(Number);
    const [eh, em] = preset.endTime.split(':').map(Number);
    setStartHour(sh);
    setStartMinute(sm);
    setEndHour(eh);
    setEndMinute(em);
    setSelectedApps(preset.blockedApps);
  }, []);

  const adjustTime = useCallback((
    setter: React.Dispatch<React.SetStateAction<number>>,
    value: number,
    max: number,
    delta: number,
  ) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(prev => {
      const next = prev + delta;
      if (next < 0) return max;
      if (next > max) return 0;
      return next;
    });
  }, []);

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour} ${ampm}`;
  };

  const getDuration = () => {
    let diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (frequencyType === 'specific_days' && selectedDays.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const data: NewTimeBlockFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: 'smartphone-off',
      color,
      startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      blockedApps: selectedApps,
      frequency: {
        type: frequencyType,
        days: frequencyType === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : selectedDays,
      },
    };

    addBlock(data);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, description, color, startHour, startMinute, endHour, endMinute, selectedApps, frequencyType, selectedDays, addBlock, router]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Time Block</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll} contentContainerStyle={styles.presetsContent}>
            {PRESET_BLOCKS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={[styles.presetCard, { borderColor: name === preset.name ? preset.color : '#E5E5EA' }]}
                onPress={() => applyPreset(preset)}
                activeOpacity={0.8}
              >
                <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
                <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
                <Text style={styles.presetTime}>{preset.startTime} – {preset.endTime}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Block Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning Focus, No Social After 9pm"
            value={name}
            onChangeText={setName}
            maxLength={40}
            testID="block-name-input"
          />

          <Text style={styles.sectionLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Why this block matters to you..."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={150}
          />

          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.colorRow}>
            {BLOCK_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setColor(c);
                }}
              >
                {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Time Window</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.timePicker}>
              <Text style={styles.timePickerLabel}>Start</Text>
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustTime(setStartHour, startHour, 23, -1)} style={styles.spinnerBtn}>
                  <Text style={styles.spinnerBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{formatHour(startHour)}</Text>
                <TouchableOpacity onPress={() => adjustTime(setStartHour, startHour, 23, 1)} style={styles.spinnerBtn}>
                  <Text style={styles.spinnerBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustTime(setStartMinute, startMinute, 59, -15)} style={styles.spinnerBtnSmall}>
                  <Text style={styles.spinnerBtnTextSmall}>−</Text>
                </TouchableOpacity>
                <Text style={styles.minuteValue}>:{String(startMinute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustTime(setStartMinute, startMinute, 59, 15)} style={styles.spinnerBtnSmall}>
                  <Text style={styles.spinnerBtnTextSmall}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeDivider}>
              <View style={[styles.durationBadge, { backgroundColor: color + '18' }]}>
                <Clock size={12} color={color} />
                <Text style={[styles.durationText, { color }]}>{getDuration()}</Text>
              </View>
            </View>

            <View style={styles.timePicker}>
              <Text style={styles.timePickerLabel}>End</Text>
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustTime(setEndHour, endHour, 23, -1)} style={styles.spinnerBtn}>
                  <Text style={styles.spinnerBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{formatHour(endHour)}</Text>
                <TouchableOpacity onPress={() => adjustTime(setEndHour, endHour, 23, 1)} style={styles.spinnerBtn}>
                  <Text style={styles.spinnerBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustTime(setEndMinute, endMinute, 59, -15)} style={styles.spinnerBtnSmall}>
                  <Text style={styles.spinnerBtnTextSmall}>−</Text>
                </TouchableOpacity>
                <Text style={styles.minuteValue}>:{String(endMinute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustTime(setEndMinute, endMinute, 59, 15)} style={styles.spinnerBtnSmall}>
                  <Text style={styles.spinnerBtnTextSmall}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Block What?</Text>
          <Text style={styles.helperText}>Select app categories to block, or leave empty for a full phone block.</Text>
          <View style={styles.appGrid}>
            {APP_CATEGORIES.map((cat) => {
              const isSelected = selectedApps.includes(cat.name);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.appCategoryCard,
                    isSelected && { backgroundColor: cat.color + '15', borderColor: cat.color },
                  ]}
                  onPress={() => toggleApp(cat.name)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.appCatIcon, { backgroundColor: isSelected ? cat.color : '#E5E5EA' }]}>
                    <SmartphoneNfc size={14} color={isSelected ? '#fff' : '#8E8E93'} />
                  </View>
                  <Text style={[styles.appCatName, isSelected && { color: cat.color, fontWeight: '600' as const }]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.appCatCheck, { backgroundColor: cat.color }]}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Repeat Schedule</Text>
          <View style={styles.frequencyRow}>
            <TouchableOpacity
              style={[styles.frequencyBtn, frequencyType === 'daily' && { backgroundColor: color, borderColor: color }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFrequencyType('daily');
                setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
              }}
            >
              <Repeat size={16} color={frequencyType === 'daily' ? '#fff' : '#8E8E93'} />
              <Text style={[styles.frequencyBtnText, frequencyType === 'daily' && { color: '#fff' }]}>Every Day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.frequencyBtn, frequencyType === 'specific_days' && { backgroundColor: color, borderColor: color }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFrequencyType('specific_days');
              }}
            >
              <Calendar size={16} color={frequencyType === 'specific_days' ? '#fff' : '#8E8E93'} />
              <Text style={[styles.frequencyBtnText, frequencyType === 'specific_days' && { color: '#fff' }]}>Specific Days</Text>
            </TouchableOpacity>
          </View>

          {frequencyType === 'specific_days' && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, index) => {
                const isSelected = selectedDays.includes(index);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.dayBtn, isSelected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[styles.dayBtnText, isSelected && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: color }]}
          onPress={handleSave}
          disabled={!name.trim() || (frequencyType === 'specific_days' && selectedDays.length === 0)}
          activeOpacity={0.85}
          testID="save-time-block-button"
        >
          <SmartphoneNfc size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Create Time Block</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 10,
    marginTop: 18,
  },
  helperText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 10,
    lineHeight: 18,
  },
  presetsScroll: {
    marginHorizontal: -16,
    marginBottom: 4,
  },
  presetsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  presetCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    width: 150,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  presetTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  timePicker: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8E8E93',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  timeSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spinnerBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerBtnText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  spinnerBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerBtnTextSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    minWidth: 60,
    textAlign: 'center' as const,
  },
  minuteValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    minWidth: 28,
    textAlign: 'center' as const,
  },
  timeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  appCatIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appCatName: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  appCatCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  frequencyBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  dayBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#F8F9FA',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
