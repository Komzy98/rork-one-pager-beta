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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Calendar, Repeat, Shield } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useHabits } from '@/hooks/useHabitsStore';
import { NewHabitFormData, FrequencyType } from '@/types/habit';
import ColorPicker from '@/components/ColorPicker';
import IconPicker from '@/components/IconPicker';
import DaySelector from '@/components/DaySelector';

export default function NewHabitScreen() {
  const router = useRouter();
  const { addHabit } = useHabits();
  
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [color, setColor] = useState<string>(COLORS.primary);
  const [icon, setIcon] = useState<string>('check');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('specific_days');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);
  const [gracePeriodEnabled, setGracePeriodEnabled] = useState<boolean>(false);
  
  const handleColorSelect = useCallback((selectedColor: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColor(selectedColor);
  }, []);
  
  const handleIconSelect = useCallback((selectedIcon: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIcon(selectedIcon);
  }, []);
  
  const handleDaySelect = useCallback((day: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  }, []);
  
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (frequencyType === 'specific_days' && selectedDays.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    const newHabit: NewHabitFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      frequency: {
        type: frequencyType,
        days: frequencyType === 'specific_days' ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
        timesPerWeek: frequencyType === 'times_per_week' ? timesPerWeek : undefined,
      },
      gracePeriodEnabled,
    };
    
    addHabit(newHabit);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, description, icon, color, frequencyType, selectedDays, timesPerWeek, gracePeriodEnabled, addHabit, router]);
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Drink Water, Read, Exercise"
            value={name}
            onChangeText={setName}
            maxLength={50}
            testID="habit-name-input"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add details about your habit"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
            testID="habit-description-input"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Color</Text>
          <ColorPicker selectedColor={color} onSelectColor={handleColorSelect} />
        </View>
        
        <IconPicker selectedIcon={icon} onSelectIcon={handleIconSelect} color={color} />
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Schedule Type</Text>
          <View style={styles.frequencyTypeRow}>
            <TouchableOpacity
              style={[
                styles.frequencyTypeButton,
                frequencyType === 'specific_days' && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFrequencyType('specific_days');
              }}
              testID="frequency-specific-days"
            >
              <Calendar size={18} color={frequencyType === 'specific_days' ? '#fff' : COLORS.textMuted} />
              <Text style={[
                styles.frequencyTypeText,
                frequencyType === 'specific_days' && styles.frequencyTypeTextActive,
              ]}>Specific Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyTypeButton,
                frequencyType === 'times_per_week' && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFrequencyType('times_per_week');
              }}
              testID="frequency-times-per-week"
            >
              <Repeat size={18} color={frequencyType === 'times_per_week' ? '#fff' : COLORS.textMuted} />
              <Text style={[
                styles.frequencyTypeText,
                frequencyType === 'times_per_week' && styles.frequencyTypeTextActive,
              ]}>X Times / Week</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {frequencyType === 'specific_days' ? (
          <DaySelector selectedDays={selectedDays} onSelectDay={handleDaySelect} color={color} />
        ) : (
          <View style={styles.formGroup}>
            <Text style={styles.label}>How many times per week?</Text>
            <View style={styles.timesPerWeekRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.timesPerWeekButton,
                    timesPerWeek === num && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTimesPerWeek(num);
                  }}
                >
                  <Text style={[
                    styles.timesPerWeekText,
                    timesPerWeek === num && styles.timesPerWeekTextActive,
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              Complete this habit {timesPerWeek}x per week — on any days you choose
            </Text>
          </View>
        )}

        <View style={styles.optionCard}>
          <View style={styles.optionCardLeft}>
            <View style={[styles.optionIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Shield size={20} color="#D97706" />
            </View>
            <View style={styles.optionCardInfo}>
              <Text style={styles.optionCardTitle}>Grace Period</Text>
              <Text style={styles.optionCardSubtitle}>
                24h window to recover a missed day without losing your streak
              </Text>
            </View>
          </View>
          <Switch
            value={gracePeriodEnabled}
            onValueChange={(val) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGracePeriodEnabled(val);
            }}
            trackColor={{ false: '#E5E7EB', true: color + '80' }}
            thumbColor={gracePeriodEnabled ? color : '#f4f3f4'}
            testID="grace-period-switch"
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: color }]}
          onPress={handleSave}
          disabled={!name.trim() || (frequencyType === 'specific_days' && selectedDays.length === 0)}
          testID="save-habit-button"
        >
          <Text style={styles.saveButtonText}>Save Habit</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  frequencyTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  frequencyTypeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  frequencyTypeTextActive: {
    color: '#fff',
  },
  timesPerWeekRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  timesPerWeekButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  timesPerWeekText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  timesPerWeekTextActive: {
    color: '#fff',
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  optionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  optionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCardInfo: {
    flex: 1,
  },
  optionCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  optionCardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: '600',
  },
});