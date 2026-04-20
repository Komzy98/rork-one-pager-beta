import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { X, Calendar, Trash2, Clock, ChevronDown, Repeat, Tag, Flag, Palette } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Task, TaskPriority, TaskCategory, TASK_PRIORITIES, TASK_CATEGORIES } from '@/types/task';
import { COLORS, HABIT_COLORS } from '@/constants/colors';
import { soundManager } from '@/utils/soundManager';

interface TaskEditModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  isCreating?: boolean;
  isHabit?: boolean;
}

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  low: { bg: '#E8F5E9', border: '#66BB6A', text: '#2E7D32', icon: '#43A047' },
  medium: { bg: '#FFF3E0', border: '#FFA726', text: '#E65100', icon: '#FB8C00' },
  high: { bg: '#FBE9E7', border: '#EF5350', text: '#C62828', icon: '#E53935' },
  urgent: { bg: '#FCE4EC', border: '#D32F2F', text: '#B71C1C', icon: '#C62828' },
};

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  work: { bg: '#E3F2FD', border: '#42A5F5', text: '#1565C0' },
  personal: { bg: '#EDE7F6', border: '#7E57C2', text: '#4527A0' },
  health: { bg: '#E8F5E9', border: '#66BB6A', text: '#2E7D32' },
  learning: { bg: '#FFF3E0', border: '#FFA726', text: '#E65100' },
  finance: { bg: '#E0F2F1', border: '#26A69A', text: '#00695C' },
  social: { bg: '#FCE4EC', border: '#EC407A', text: '#AD1457' },
  other: { bg: '#F5F5F5', border: '#9E9E9E', text: '#616161' },
};

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  visible,
  task,
  onClose,
  onSave,
  onDelete,
  isCreating = false,
  isHabit = false,
}) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [habitColor, setHabitColor] = useState<string>(HABIT_COLORS[0]);
  const [habitIcon, setHabitIcon] = useState<string>('target');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setCategory(task.category);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      if (task.habitFrequency) {
        setSelectedDays(task.habitFrequency.days || [1, 2, 3, 4, 5]);
      }
      if (task.color) {
        setHabitColor(task.color);
      }
      if (task.icon) {
        setHabitIcon(task.icon);
      }
      setIsRecurring(task.isRecurring || false);
      if (task.recurringPattern) {
        if (task.recurringPattern.type === 'weekly' && task.recurringPattern.daysOfWeek) {
          setRecurringType('custom');
          setRecurringDays(task.recurringPattern.daysOfWeek);
        } else {
          setRecurringType(task.recurringPattern.type as 'daily' | 'weekly' | 'monthly');
        }
      }
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('personal');
      setDueDate(null);
      setSelectedDays([1, 2, 3, 4, 5]);
      setHabitColor(HABIT_COLORS[0]);
      setHabitIcon('target');
      setIsRecurring(false);
      setRecurringType('daily');
      setRecurringDays([1, 2, 3, 4, 5]);
      setShowFrequencyPicker(false);
    }
  }, [task]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', `${isHabit ? 'Habit' : 'Task'} title is required`);
      return;
    }

    if (isHabit && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for your habit');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void soundManager.playSound('tap', 0.3);
    }

    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
    };

    if (isHabit) {
      updates.habitFrequency = { days: selectedDays };
      updates.color = habitColor;
      updates.icon = habitIcon;
    } else {
      updates.dueDate = dueDate ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}` : undefined;
      updates.isRecurring = isRecurring;
      if (isRecurring) {
        if (recurringType === 'custom') {
          updates.recurringPattern = {
            type: 'weekly',
            interval: 1,
            daysOfWeek: recurringDays,
          };
        } else {
          updates.recurringPattern = {
            type: recurringType === 'monthly' ? 'monthly' : recurringType === 'weekly' ? 'weekly' : 'daily',
            interval: 1,
          };
        }
      } else {
        updates.recurringPattern = undefined;
      }
    }

    onSave(task?.id || '', updates);
    onClose();
  };

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onDelete(task.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') return;
      if (selectedDate) {
        setTempDate(selectedDate);
        setTimeout(() => setShowTimePicker(true), 100);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedDate) {
        const newDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          dueDate?.getHours() || 9,
          dueDate?.getMinutes() || 0
        );
        setTempDate(newDate);
      }
    } else {
      if (selectedDate) {
        const newDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          dueDate?.getHours() || 9,
          dueDate?.getMinutes() || 0
        );
        setDueDate(newDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'dismissed') {
        setTempDate(null);
        return;
      }
      if (selectedTime) {
        const baseDate = tempDate || dueDate || new Date();
        const newDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          selectedTime.getHours(),
          selectedTime.getMinutes()
        );
        setDueDate(newDate);
        setTempDate(null);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedTime) {
        const baseDate = tempDate || dueDate || new Date();
        const newDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          selectedTime.getHours(),
          selectedTime.getMinutes()
        );
        setTempDate(newDate);
      }
    } else {
      if (selectedTime && dueDate) {
        const newDate = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          selectedTime.getHours(),
          selectedTime.getMinutes()
        );
        setDueDate(newDate);
      }
    }
  };

  const handleQuickDate = async (days: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    const now = new Date();
    const quickDate = new Date(now);
    quickDate.setDate(now.getDate() + days);
    quickDate.setHours(9, 0, 0, 0);
    setTempDate(quickDate);
  };

  const getQuickDateLabel = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === 7) return 'Next Week';
    return `In ${days} days`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const DAYS = [
    { id: 0, name: 'S', full: 'Sunday' },
    { id: 1, name: 'M', full: 'Monday' },
    { id: 2, name: 'T', full: 'Tuesday' },
    { id: 3, name: 'W', full: 'Wednesday' },
    { id: 4, name: 'T', full: 'Thursday' },
    { id: 5, name: 'F', full: 'Friday' },
    { id: 6, name: 'S', full: 'Saturday' },
  ];

  const handleDaySelect = async (day: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    setSelectedDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const handleRecurringDaySelect = async (day: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setRecurringDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const getFrequencyLabel = () => {
    if (!isRecurring) return 'Once';
    switch (recurringType) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'monthly': return 'Every month';
      case 'custom':
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (recurringDays.length === 7) return 'Every day';
        if (recurringDays.length === 0) return 'Select days';
        return [...recurringDays].sort((a, b) => a - b).map(d => dayNames[d]).join(', ');
      default: return 'Once';
    }
  };

  const RECURRING_TYPES = [
    { id: 'once' as const, label: 'Once', short: '1x' },
    { id: 'daily' as const, label: 'Daily', short: 'D' },
    { id: 'weekly' as const, label: 'Weekly', short: 'W' },
    { id: 'monthly' as const, label: 'Monthly', short: 'M' },
    { id: 'custom' as const, label: 'Custom', short: 'C' },
  ];

  const handleColorSelect = (color: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setHabitColor(color);
  };

  const renderSectionHeader = (icon: React.ReactNode, label: string) => (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="task-edit-close"
            activeOpacity={0.7}
          >
            <X color="#8E8E93" size={20} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isCreating ? (isHabit ? 'New Habit' : 'New Task') : (isHabit ? 'Edit Habit' : 'Edit Task')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {task && onDelete && !isCreating && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                testID="task-edit-delete"
                activeOpacity={0.7}
              >
                <Trash2 color="#FF3B30" size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              testID="task-edit-save"
              activeOpacity={0.8}
              disabled={!title.trim()}
            >
              <Text style={[styles.saveButtonText, !title.trim() && styles.saveButtonTextDisabled]}>
                {isCreating ? 'Create' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.card}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder={isHabit ? "What habit to build?" : "What needs to be done?"}
                placeholderTextColor="#C7C7CC"
                testID="task-edit-title"
                autoFocus={isCreating}
              />
              <View style={styles.dividerThin} />
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Add notes..."
                placeholderTextColor="#C7C7CC"
                multiline
                numberOfLines={3}
                testID="task-edit-description"
              />
            </View>

            <View style={styles.card}>
              {renderSectionHeader(
                <Flag size={16} color="#FF9500" />,
                'Priority'
              )}
              <View style={styles.priorityRow}>
                {TASK_PRIORITIES.map((p) => {
                  const pStyle = PRIORITY_STYLES[p.value] || PRIORITY_STYLES.medium;
                  const isActive = priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.priorityChip,
                        isActive && { backgroundColor: pStyle.bg, borderColor: pStyle.border },
                      ]}
                      onPress={() => {
                        setPriority(p.value);
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      }}
                      testID={`task-edit-priority-${p.value}`}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: isActive ? pStyle.border : '#D1D1D6' }]} />
                      <Text style={[
                        styles.priorityText,
                        isActive && { color: pStyle.text, fontWeight: '600' as const },
                      ]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              {renderSectionHeader(
                <Tag size={16} color="#5856D6" />,
                'Category'
              )}
              <View style={styles.categoryGrid}>
                {TASK_CATEGORIES.map((c) => {
                  const cStyle = CATEGORY_STYLES[c.value] || CATEGORY_STYLES.other;
                  const isActive = category === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[
                        styles.categoryChip,
                        isActive && { backgroundColor: cStyle.bg, borderColor: cStyle.border },
                      ]}
                      onPress={() => {
                        setCategory(c.value);
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      }}
                      testID={`task-edit-category-${c.value}`}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.categoryText,
                        isActive && { color: cStyle.text, fontWeight: '600' as const },
                      ]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {isHabit ? (
              <>
                <View style={styles.card}>
                  {renderSectionHeader(
                    <Palette size={16} color="#FF2D55" />,
                    'Color'
                  )}
                  <View style={styles.colorRow}>
                    {HABIT_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorDot,
                          { backgroundColor: color },
                          habitColor === color && styles.colorDotSelected,
                          habitColor === color && { borderColor: color },
                        ]}
                        onPress={() => handleColorSelect(color)}
                        testID={`habit-color-${color}`}
                        activeOpacity={0.7}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.card}>
                  {renderSectionHeader(
                    <Repeat size={16} color="#34C759" />,
                    'Schedule'
                  )}
                  <Text style={styles.scheduleHint}>Select the days for this habit</Text>
                  <View style={styles.daysRow}>
                    {DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.dayCircle,
                            isSelected && { backgroundColor: habitColor, borderColor: habitColor },
                          ]}
                          onPress={() => handleDaySelect(day.id)}
                          testID={`habit-day-${day.id}`}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.dayLetter,
                            isSelected && styles.dayLetterActive,
                          ]}>
                            {day.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.daysSummary}>
                    <Text style={styles.daysSummaryText}>
                      {selectedDays.length === 7 ? 'Every day' :
                       selectedDays.length === 0 ? 'No days selected' :
                       `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} per week`}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.card}>
                  {renderSectionHeader(
                    <Repeat size={16} color="#34C759" />,
                    'Frequency'
                  )}
                  <TouchableOpacity
                    style={styles.frequencyToggle}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setShowFrequencyPicker(!showFrequencyPicker);
                    }}
                    activeOpacity={0.7}
                    testID="task-frequency-toggle"
                  >
                    <View style={[styles.frequencyIconBadge, isRecurring && styles.frequencyIconBadgeActive]}>
                      <Repeat size={18} color={isRecurring ? '#fff' : '#8E8E93'} />
                    </View>
                    <View style={styles.frequencyToggleInfo}>
                      <Text style={[styles.frequencyToggleLabel, isRecurring && styles.frequencyToggleLabelActive]}>
                        {getFrequencyLabel()}
                      </Text>
                      <Text style={styles.frequencyToggleHint}>
                        {isRecurring ? 'Repeating task' : 'One-time task'}
                      </Text>
                    </View>
                    <ChevronDown 
                      size={18} 
                      color="#C7C7CC" 
                      style={{ transform: [{ rotate: showFrequencyPicker ? '180deg' : '0deg' }] }} 
                    />
                  </TouchableOpacity>

                  {showFrequencyPicker && (
                    <View style={styles.frequencyExpandedArea}>
                      <View style={styles.frequencyChipRow}>
                        {RECURRING_TYPES.map((type) => {
                          const isActive = type.id === 'once' ? !isRecurring : (isRecurring && recurringType === type.id);
                          return (
                            <TouchableOpacity
                              key={type.id}
                              style={[
                                styles.frequencyChip,
                                isActive && styles.frequencyChipActive,
                              ]}
                              onPress={() => {
                                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                                if (type.id === 'once') {
                                  setIsRecurring(false);
                                } else {
                                  setIsRecurring(true);
                                  setRecurringType(type.id);
                                }
                              }}
                              activeOpacity={0.7}
                              testID={`task-frequency-${type.id}`}
                            >
                              <Text style={[
                                styles.frequencyChipLabel,
                                isActive && styles.frequencyChipLabelActive,
                              ]}>
                                {type.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {isRecurring && recurringType === 'custom' && (
                        <View style={styles.customDaysSection}>
                          <Text style={styles.customDaysTitle}>Select days</Text>
                          <View style={styles.daysRow}>
                            {DAYS.map((day) => {
                              const isSelected = recurringDays.includes(day.id);
                              return (
                                <TouchableOpacity
                                  key={day.id}
                                  style={[
                                    styles.dayCircle,
                                    isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                                  ]}
                                  onPress={() => handleRecurringDaySelect(day.id)}
                                  testID={`task-recurring-day-${day.id}`}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.dayLetter,
                                    isSelected && styles.dayLetterActive,
                                  ]}>
                                    {day.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.card}>
                  {renderSectionHeader(
                    <Calendar size={16} color={COLORS.primary} />,
                    'Due Date & Time'
                  )}
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(true);
                      } else {
                        setShowDateTimeModal(true);
                      }
                    }}
                    testID="task-edit-due-date"
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateIconBadge}>
                      <Calendar size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.dateInfo}>
                      {dueDate ? (
                        <>
                          <Text style={styles.dateMainText}>{formatDate(dueDate)}</Text>
                          <Text style={styles.dateSubText}>{formatTime(dueDate)}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.datePlaceholder}>Select date & time</Text>
                          <Text style={styles.dateHint}>Optional</Text>
                        </>
                      )}
                    </View>
                    {dueDate && (
                      <TouchableOpacity
                        style={styles.clearDateBtn}
                        onPress={() => {
                          setDueDate(null);
                          setShowDatePicker(false);
                          setShowTimePicker(false);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {!isHabit && showDateTimeModal && Platform.OS === 'ios' && (
              <View style={styles.card}>
                <View style={styles.dateTimeModalHeader}>
                  <Text style={styles.dateTimeModalTitle}>Select Date & Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (tempDate) {
                        setDueDate(tempDate);
                        setTempDate(null);
                      }
                      setShowDateTimeModal(false);
                    }}
                    style={styles.modalDoneButton}
                  >
                    <Text style={styles.modalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.quickDatesRow}>
                  {[0, 1, 2, 7].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={styles.quickDateChip}
                      onPress={() => handleQuickDate(days)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickDateChipText}>{getQuickDateLabel(days)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.pickerArea}>
                  <View style={styles.pickerLabelRow}>
                    <Calendar size={14} color="#8E8E93" />
                    <Text style={styles.pickerLabelText}>Date</Text>
                  </View>
                  <DateTimePicker
                    value={tempDate || dueDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={styles.picker}
                  />
                </View>
                
                <View style={styles.pickerArea}>
                  <View style={styles.pickerLabelRow}>
                    <Clock size={14} color="#8E8E93" />
                    <Text style={styles.pickerLabelText}>Time</Text>
                  </View>
                  <DateTimePicker
                    value={tempDate || dueDate || new Date()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    style={styles.picker}
                  />
                </View>
              </View>
            )}

            {!isHabit && showDatePicker && Platform.OS === 'ios' && !showDateTimeModal && (
              <View style={styles.card}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.datePickerDone}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.picker}
                />
              </View>
            )}

            {!isHabit && showTimePicker && dueDate && Platform.OS === 'ios' && !showDateTimeModal && (
              <View style={styles.card}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.datePickerDone}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.picker}
                />
              </View>
            )}

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
        
        {!isHabit && showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
        
        {!isHabit && showTimePicker && dueDate && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF1F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D1D6',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1C1E',
    paddingVertical: 8,
    letterSpacing: -0.3,
  },
  dividerThin: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  descriptionInput: {
    fontSize: 15,
    color: '#3C3C43',
    paddingVertical: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 1.15 }],
  },
  scheduleHint: {
    fontSize: 13,
    color: '#AEAEB2',
    marginBottom: 14,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  dayLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  dayLetterActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  daysSummary: {
    marginTop: 10,
    alignItems: 'center',
  },
  daysSummaryText: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  frequencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  frequencyIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  frequencyIconBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  frequencyToggleInfo: {
    flex: 1,
  },
  frequencyToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 1,
  },
  frequencyToggleLabelActive: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  frequencyToggleHint: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  frequencyExpandedArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  frequencyChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  frequencyChipActive: {
    backgroundColor: COLORS.primary + '12',
    borderColor: COLORS.primary,
  },
  frequencyChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AEAEB2',
    textAlign: 'center',
  },
  frequencyChipLabelActive: {
    color: COLORS.primary,
  },
  customDaysSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  customDaysTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 1,
  },
  dateSubText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 15,
    fontWeight: '500',
    color: '#C7C7CC',
    marginBottom: 1,
  },
  dateHint: {
    fontSize: 12,
    color: '#D1D1D6',
  },
  clearDateBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  dateTimeModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  modalDoneButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  modalDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickDatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  quickDateChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    alignItems: 'center',
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C3C43',
  },
  pickerArea: {
    marginTop: 8,
  },
  pickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pickerLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  picker: {
    height: 140,
    marginTop: -8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    marginBottom: 4,
  },
  datePickerDone: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  datePickerDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
