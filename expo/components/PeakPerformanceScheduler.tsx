import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  Target, 
  Zap, 
  ChevronRight,
  AlertCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useTasks } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getChronotypeInfo } from '@/constants/chronotypes';
import { Task } from '@/types/task';

interface PeakPerformanceSchedulerProps {
  visible: boolean;
  onClose: () => void;
  peakStartHour?: number;
  peakEndHour?: number;
}

export const PeakPerformanceScheduler: React.FC<PeakPerformanceSchedulerProps> = ({
  visible,
  onClose,
  peakStartHour: propStartHour = 9,
  peakEndHour: propEndHour = 11,
}) => {
  const { allTasks, updateTask } = useTasks();
  const { profile } = useUserProfile();
  const chronoInfo = profile?.chronotype ? getChronotypeInfo(profile.chronotype) : undefined;
  const peakStartHour = chronoInfo ? chronoInfo.peakHours.start : propStartHour;
  const peakEndHour = chronoInfo ? chronoInfo.peakHours.end : propEndHour;
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingComplete, setSchedulingComplete] = useState(false);

  const eligibleTasks = useMemo(() => {
    return allTasks.filter(task => 
      !task.isHabit && 
      task.status !== 'completed' && 
      task.status !== 'cancelled' &&
      (task.priority === 'high' || task.priority === 'urgent' || task.priority === 'medium')
    ).sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [allTasks]);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return COLORS.textLight;
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return priority;
    }
  };

  const toggleTaskSelection = useCallback(async (taskId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  }, []);

  const selectAllHighPriority = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const highPriorityIds = eligibleTasks
      .filter(t => t.priority === 'urgent' || t.priority === 'high')
      .map(t => t.id);
    setSelectedTasks(highPriorityIds);
  }, [eligibleTasks]);

  const applySchedule = useCallback(async () => {
    if (selectedTasks.length === 0) return;
    
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setIsScheduling(true);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let currentDate = today.getHours() < peakEndHour ? today : tomorrow;
    let currentMinute = 0;
    
    for (let i = 0; i < selectedTasks.length; i++) {
      const taskId = selectedTasks[i];
      const task = allTasks.find(t => t.id === taskId);
      
      if (task) {
        const scheduledDate = new Date(currentDate);
        scheduledDate.setHours(peakStartHour, currentMinute, 0, 0);
        
        const dueDate = scheduledDate.toISOString().split('T')[0];
        const scheduledTime = `${String(peakStartHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        updateTask(taskId, {
          dueDate,
          description: task.description 
            ? `${task.description}\n\n📅 Scheduled for peak performance: ${scheduledTime}`
            : `📅 Scheduled for peak performance: ${scheduledTime}`,
        });
        
        currentMinute += task.estimatedDuration || 30;
        
        if (currentMinute >= 60) {
          currentMinute = 0;
          if (peakStartHour + 1 < peakEndHour) {
            currentDate.setHours(peakStartHour + 1);
          } else {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(peakStartHour);
          }
        }
      }
    }
    
    setTimeout(() => {
      setIsScheduling(false);
      setSchedulingComplete(true);
      console.log('✅ Peak performance scheduling applied to', selectedTasks.length, 'tasks');
    }, 1000);
  }, [selectedTasks, allTasks, updateTask, peakStartHour, peakEndHour]);

  const handleClose = useCallback(() => {
    setSelectedTasks([]);
    setSchedulingComplete(false);
    onClose();
  }, [onClose]);

  const formatTimeWindow = () => {
    const formatHour = (hour: number) => {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    };
    return `${formatHour(peakStartHour)} - ${formatHour(peakEndHour)}`;
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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Peak Performance Scheduler</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoBanner}
          >
            <View style={[styles.infoBannerIcon, chronoInfo && { backgroundColor: chronoInfo.color + '20' }]}>
              {chronoInfo ? (
                <Text style={{ fontSize: 24 }}>{chronoInfo.emoji}</Text>
              ) : (
                <Clock size={24} color="#10B981" />
              )}
            </View>
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>
                {chronoInfo ? `${chronoInfo.name} Peak Window` : 'Your Peak Performance Window'}
              </Text>
              <Text style={[styles.infoBannerTime, chronoInfo && { color: chronoInfo.color }]}>{formatTimeWindow()}</Text>
              <Text style={styles.infoBannerText}>
                {chronoInfo
                  ? `As a ${chronoInfo.name}, your energy peaks during this window. Schedule your hardest tasks here.`
                  : 'Schedule your most important tasks during this time for maximum productivity.'}
              </Text>
            </View>
          </LinearGradient>

          {schedulingComplete ? (
            <View style={styles.successContainer}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']}
                style={styles.successGradient}
              >
                <View style={styles.successIconWrapper}>
                  <CheckCircle2 size={48} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Schedule Applied!</Text>
                <Text style={styles.successText}>
                  {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} scheduled for your peak performance window.
                </Text>
                <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Target size={20} color="#7c3aed" />
                  <Text style={styles.sectionTitle}>Select Tasks to Schedule</Text>
                </View>
                {eligibleTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length > 0 && (
                  <TouchableOpacity onPress={selectAllHighPriority} style={styles.selectAllBtn}>
                    <Text style={styles.selectAllText}>Select High Priority</Text>
                  </TouchableOpacity>
                )}
              </View>

              {eligibleTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <AlertCircle size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyStateTitle}>No Tasks Available</Text>
                  <Text style={styles.emptyStateText}>
                    Create some tasks first to schedule them for peak performance.
                  </Text>
                </View>
              ) : (
                eligibleTasks.map((task) => {
                  const isSelected = selectedTasks.includes(task.id);
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.taskCard, isSelected && styles.taskCardSelected]}
                      onPress={() => toggleTaskSelection(task.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.taskCheckbox,
                        isSelected && styles.taskCheckboxSelected
                      ]}>
                        {isSelected && <CheckCircle2 size={20} color="#fff" />}
                      </View>
                      <View style={styles.taskContent}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}20` }]}>
                            <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                              {getPriorityLabel(task.priority)}
                            </Text>
                          </View>
                          {task.estimatedDuration && (
                            <View style={styles.durationBadge}>
                              <Clock size={12} color={COLORS.textLight} />
                              <Text style={styles.durationText}>{task.estimatedDuration} min</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <ChevronRight size={18} color={isSelected ? '#10B981' : COLORS.textLight} />
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {!schedulingComplete && eligibleTasks.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedCount}>
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.applyButton, selectedTasks.length === 0 && styles.applyButtonDisabled]}
              onPress={applySchedule}
              disabled={selectedTasks.length === 0 || isScheduling}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedTasks.length > 0 ? ['#10B981', '#059669'] : ['#9CA3AF', '#9CA3AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButtonGradient}
              >
                <Zap size={20} color="#fff" />
                <Text style={styles.applyButtonText}>
                  {isScheduling ? 'Scheduling...' : 'Apply Schedule'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  infoBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoBannerTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 8,
  },
  infoBannerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  taskCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  taskCheckboxSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  successContainer: {
    paddingVertical: 24,
  },
  successGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 32,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedCount: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  applyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PeakPerformanceScheduler;
