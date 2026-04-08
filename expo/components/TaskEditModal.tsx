import React, { useState } from 'react';
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
} from 'react-native';
import { X, Calendar, Trash2, Clock, ChevronRight, Repeat } from 'lucide-react-native';
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
      // Reset for new task
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
      updates.dueDate = dueDate ? dueDate.toISOString().split('T')[0] : undefined;
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
      if (event.type === 'dismissed') {
        return;
      }
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
    { id: 0, name: 'Sun', full: 'Sunday' },
    { id: 1, name: 'Mon', full: 'Monday' },
    { id: 2, name: 'Tue', full: 'Tuesday' },
    { id: 3, name: 'Wed', full: 'Wednesday' },
    { id: 4, name: 'Thu', full: 'Thursday' },
    { id: 5, name: 'Fri', full: 'Friday' },
    { id: 6, name: 'Sat', full: 'Saturday' },
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
    { id: 'once' as const, label: 'Once', icon: '1' },
    { id: 'daily' as const, label: 'Daily', icon: 'D' },
    { id: 'weekly' as const, label: 'Weekly', icon: 'W' },
    { id: 'monthly' as const, label: 'Monthly', icon: 'M' },
    { id: 'custom' as const, label: 'Custom', icon: 'C' },
  ];

  const handleColorSelect = (color: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setHabitColor(color);
  };

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
          >
            <X color={COLORS.textLight} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCreating ? (isHabit ? 'New Habit' : 'New Task') : (isHabit ? 'Edit Habit' : 'Edit Task')}
          </Text>
          <View style={styles.headerRight}>
            {task && onDelete && !isCreating && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                testID="task-edit-delete"
              >
                <Trash2 color="#FF3B30" size={22} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              testID="task-edit-save"
            >
              <Text style={styles.saveButtonText}>{isCreating ? 'Create' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={COLORS.textLight}
              testID="task-edit-title"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              testID="task-edit-description"
            />
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.optionsContainer}>
              {TASK_PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.optionButton,
                    priority === p.value && styles.selectedOption,
                    { borderColor: p.color }
                  ]}
                  onPress={() => setPriority(p.value)}
                  testID={`task-edit-priority-${p.value}`}
                >
                  <Text
                    style={[
                      styles.optionText,
                      priority === p.value && { color: p.color }
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.optionsContainer}>
              {TASK_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.optionButton,
                    category === c.value && styles.selectedOption,
                    { borderColor: c.color }
                  ]}
                  onPress={() => setCategory(c.value)}
                  testID={`task-edit-category-${c.value}`}
                >
                  <Text
                    style={[
                      styles.optionText,
                      category === c.value && { color: c.color }
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Habit Frequency or Task Due Date */}
          {isHabit ? (
            <>
              {/* Habit Color */}
              <View style={styles.section}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorGrid}>
                  {HABIT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        habitColor === color && styles.colorButtonSelected,
                      ]}
                      onPress={() => handleColorSelect(color)}
                      testID={`habit-color-${color}`}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
              </View>

              {/* Habit Frequency */}
              <View style={styles.section}>
                <Text style={styles.label}>Frequency</Text>
                <Text style={styles.sublabel}>Select the days you want to build this habit</Text>
                <View style={styles.daysCalendar}>
                  {DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.id);
                    return (
                      <TouchableOpacity
                        key={day.id}
                        style={[
                          styles.dayCalendarButton,
                          isSelected && [
                            styles.dayCalendarButtonSelected,
                            { backgroundColor: habitColor },
                          ],
                        ]}
                        onPress={() => handleDaySelect(day.id)}
                        testID={`habit-day-${day.id}`}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayCalendarName,
                            isSelected && styles.dayCalendarNameSelected,
                          ]}
                        >
                          {day.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          ) : (
            <>
            <View style={styles.section}>
              <Text style={styles.label}>Frequency</Text>
              <TouchableOpacity
                style={styles.frequencyButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.selectionAsync();
                  }
                  setShowFrequencyPicker(!showFrequencyPicker);
                }}
                activeOpacity={0.7}
                testID="task-frequency-toggle"
              >
                <View style={styles.frequencyButtonContent}>
                  <View style={styles.frequencyIconContainer}>
                    <Repeat size={20} color={isRecurring ? COLORS.primary : '#9CA3AF'} />
                  </View>
                  <View style={styles.frequencyInfo}>
                    <Text style={[styles.frequencyLabel, isRecurring && styles.frequencyLabelActive]}>
                      {getFrequencyLabel()}
                    </Text>
                    <Text style={styles.frequencyHint}>
                      {isRecurring ? 'Repeating task' : 'One-time task'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" style={{ transform: [{ rotate: showFrequencyPicker ? '90deg' : '0deg' }] }} />
                </View>
              </TouchableOpacity>

              {showFrequencyPicker && (
                <View style={styles.frequencyPickerContainer}>
                  <View style={styles.frequencyOptions}>
                    {RECURRING_TYPES.map((type) => {
                      const isActive = type.id === 'once' ? !isRecurring : (isRecurring && recurringType === type.id);
                      return (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.frequencyOption,
                            isActive && styles.frequencyOptionActive,
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              void Haptics.selectionAsync();
                            }
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
                            styles.frequencyOptionIcon,
                            isActive && styles.frequencyOptionIconActive,
                          ]}>{type.icon}</Text>
                          <Text style={[
                            styles.frequencyOptionLabel,
                            isActive && styles.frequencyOptionLabelActive,
                          ]}>{type.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {isRecurring && recurringType === 'custom' && (
                    <View style={styles.customDaysContainer}>
                      <Text style={styles.customDaysLabel}>Select days</Text>
                      <View style={styles.daysCalendar}>
                        {DAYS.map((day) => {
                          const isSelected = recurringDays.includes(day.id);
                          return (
                            <TouchableOpacity
                              key={day.id}
                              style={[
                                styles.dayCalendarButton,
                                isSelected && [
                                  styles.dayCalendarButtonSelected,
                                  { backgroundColor: COLORS.primary },
                                ],
                              ]}
                              onPress={() => handleRecurringDaySelect(day.id)}
                              testID={`task-recurring-day-${day.id}`}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dayCalendarName,
                                  isSelected && styles.dayCalendarNameSelected,
                                ]}
                              >
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

            <View style={styles.section}>
              <Text style={styles.label}>Due Date & Time</Text>
            <TouchableOpacity
              style={styles.elegantDateButton}
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
              <View style={styles.dateTimeContent}>
                <View style={styles.dateTimeIconContainer}>
                  <Calendar size={20} color={COLORS.primary} />
                </View>
                <View style={styles.dateTimeInfo}>
                  {dueDate ? (
                    <>
                      <Text style={styles.dateTimeMain}>{formatDate(dueDate)}</Text>
                      <Text style={styles.dateTimeSecondary}>{formatTime(dueDate)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.dateTimePlaceholder}>Select date & time</Text>
                      <Text style={styles.dateTimeHint}>Optional</Text>
                    </>
                  )}
                </View>
                <ChevronRight size={20} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
            
            {dueDate && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setDueDate(null);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear date</Text>
              </TouchableOpacity>
            )}
            </View>
            </>
          )}

          {/* Elegant Date Time Modal - Only for Tasks */}
          {!isHabit && showDateTimeModal && Platform.OS === 'ios' && (
            <View style={styles.elegantDateTimeModal}>
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
              
              {/* Quick Date Presets */}
              <View style={styles.quickDatesContainer}>
                {[0, 1, 2, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={styles.quickDateButton}
                    onPress={() => handleQuickDate(days)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickDateLabel}>{getQuickDateLabel(days)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Date Picker */}
              <View style={styles.pickerSection}>
                <View style={styles.pickerLabelRow}>
                  <Calendar size={16} color={COLORS.textLight} />
                  <Text style={styles.pickerLabel}>Date</Text>
                </View>
                <DateTimePicker
                  value={tempDate || dueDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.inlinePicker}
                />
              </View>
              
              {/* Time Picker */}
              <View style={styles.pickerSection}>
                <View style={styles.pickerLabelRow}>
                  <Clock size={16} color={COLORS.textLight} />
                  <Text style={styles.pickerLabel}>Time</Text>
                </View>
                <DateTimePicker
                  value={tempDate || dueDate || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.inlinePicker}
                />
              </View>
            </View>
          )}

          {/* Date Picker for iOS - Fallback - Only for Tasks */}
          {!isHabit && showDatePicker && Platform.OS === 'ios' && !showDateTimeModal && (
            <View style={styles.datePickerContainer}>
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
                style={styles.datePicker}
              />
            </View>
          )}

          {/* Time Picker for iOS - Fallback - Only for Tasks */}
          {!isHabit && showTimePicker && dueDate && Platform.OS === 'ios' && !showDateTimeModal && (
            <View style={styles.datePickerContainer}>
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
                style={styles.datePicker}
              />
            </View>
          )}
        </ScrollView>
        
        {/* Date/Time Picker for Android - Only for Tasks */}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 64 : 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  selectedOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  datePickerDone: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  datePicker: {
    height: 200,
  },
  elegantDateButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dateTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateTimeMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dateTimeSecondary: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  dateTimePlaceholder: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  dateTimeHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  elegantDateTimeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dateTimeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dateTimeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  modalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  modalDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  quickDatesContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickDateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pickerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlinePicker: {
    height: 140,
    marginTop: -10,
  },
  sublabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 18,
  },
  daysCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayCalendarButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayCalendarButtonSelected: {
    borderColor: 'transparent',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCalendarName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayCalendarNameSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorButtonSelected: {
    borderColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.1 }],
  },
  frequencyButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  frequencyButtonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
  },
  frequencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
    marginBottom: 2,
  },
  frequencyLabelActive: {
    color: '#111827',
    fontWeight: '600' as const,
  },
  frequencyHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  frequencyPickerContainer: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  frequencyOptions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  frequencyOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  frequencyOptionIcon: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  frequencyOptionIconActive: {
    color: COLORS.primary,
  },
  frequencyOptionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  frequencyOptionLabelActive: {
    color: COLORS.primary,
  },
  customDaysContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  customDaysLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
});