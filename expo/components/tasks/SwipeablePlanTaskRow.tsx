import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle2, Circle, Zap, Trash2, PlayCircle } from 'lucide-react-native';
import type { Task } from '@/types/task';
import { buildPlanRowMetaLines, isTaskOverdue } from '@/utils/taskPlanRowMeta';

const ACCENT = {
  green: '#18C383',
  blue: '#3578F6',
  red: '#EF4444',
  orange: '#F59E0B',
};

interface SwipeablePlanTaskRowProps {
  task: Task;
  taskColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  isDark: boolean;
  isFocusRow: boolean;
  isCompleted: boolean;
  meta: string;
  onPress: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onSetInProgress: () => void;
  onSetFocus: () => void;
  isLast?: boolean;
}

export default function SwipeablePlanTaskRow({
  task,
  taskColor,
  textColor,
  mutedColor,
  borderColor,
  isDark,
  isFocusRow,
  isCompleted,
  meta,
  onPress,
  onComplete,
  onDelete,
  onSetInProgress,
  onSetFocus,
  isLast,
}: SwipeablePlanTaskRowProps) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const completeScale = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });
    const deleteScale = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsRow}>
        {!isCompleted ? (
          <Animated.View style={[styles.actionWrap, { transform: [{ scale: completeScale }] }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ACCENT.green }]}
              onPress={() => {
                swipeRef.current?.close();
                onComplete();
              }}
            >
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.actionLabel}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.actionWrap, { transform: [{ scale: deleteScale }] }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: ACCENT.red }]}
            onPress={() => {
              swipeRef.current?.close();
              onDelete();
            }}
          >
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const showInProgressChip = !isCompleted && task.status !== 'in-progress';
  const overdue = isTaskOverdue(task, isCompleted);
  const metaLines = buildPlanRowMetaLines(task, isCompleted, meta);

  const handleLongPress = () => {
    Alert.alert(task.title, 'Choose an action', [
      { text: 'Set as focus', onPress: onSetFocus },
      { text: 'Mark in progress', onPress: onSetInProgress },
      { text: 'Edit', onPress: onPress },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onDelete,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.taskRow,
          { borderBottomColor: borderColor },
          overdue && !isCompleted && styles.taskRowOverdue,
          isFocusRow &&
            !isCompleted && {
              backgroundColor: isDark ? 'rgba(53,120,246,0.18)' : '#EFF5FF',
              borderRadius: 16,
              borderBottomWidth: 0,
              marginBottom: 2,
            },
          isLast && { borderBottomWidth: 0 },
        ]}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={280}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${overdue ? ', overdue' : ''}${isCompleted ? ', completed' : ''}`}
      >
        <TouchableOpacity
          onPress={onComplete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
        >
          {isCompleted ? (
            <CheckCircle2 size={27} color={ACCENT.green} fill={ACCENT.green} />
          ) : (
            <Circle size={27} color={taskColor} />
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              { color: textColor },
              isCompleted && styles.taskTitleDone,
              overdue && !isCompleted && { color: ACCENT.red },
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {metaLines.map((line, index) => (
              <Text
                key={`${line.text}-${index}`}
                style={[
                  styles.taskMeta,
                  {
                    color:
                      line.tone === 'overdue'
                        ? ACCENT.red
                        : line.tone === 'muted'
                          ? mutedColor
                          : textColor,
                  },
                  line.tone === 'overdue' && styles.taskMetaOverdue,
                ]}
                numberOfLines={1}
              >
                {line.text}
              </Text>
            ))}
            {task.status === 'in-progress' && !isCompleted ? (
              <View style={[styles.statusChip, { backgroundColor: ACCENT.blue + '22' }]}>
                <Text style={[styles.statusChipText, { color: ACCENT.blue }]}>In progress</Text>
              </View>
            ) : null}
          </View>
        </View>
        {showInProgressChip ? (
          <TouchableOpacity
            style={[styles.progressChip, { borderColor: ACCENT.orange }]}
            onPress={onSetInProgress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${task.title} in progress`}
          >
            <PlayCircle size={14} color={ACCENT.orange} />
          </TouchableOpacity>
        ) : null}
        {isFocusRow && !isCompleted ? (
          <View style={[styles.taskBadge, styles.focusBadge]}>
            <Zap size={13} color="#FFFFFF" />
            <Text style={[styles.taskBadgeText, { color: '#FFFFFF' }]}>FOCUS</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  taskRow: {
    minHeight: 65,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  taskRowOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT.red,
    paddingLeft: 5,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  taskMeta: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  taskMetaOverdue: {
    fontWeight: '900',
    textTransform: 'none',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  progressChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 9,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  focusBadge: {
    backgroundColor: ACCENT.blue,
  },
  taskBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionWrap: {
    justifyContent: 'center',
  },
  actionBtn: {
    width: 72,
    height: '90%',
    minHeight: 58,
    marginLeft: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
