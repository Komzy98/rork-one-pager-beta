import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';

interface DaySelectorProps {
  selectedDays: number[];
  onSelectDay: (day: number) => void;
  color: string;
}

const DAYS = [
  { id: 0, name: 'Sun' },
  { id: 1, name: 'Mon' },
  { id: 2, name: 'Tue' },
  { id: 3, name: 'Wed' },
  { id: 4, name: 'Thu' },
  { id: 5, name: 'Fri' },
  { id: 6, name: 'Sat' },
];

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onSelectDay, color }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Repeat on</Text>
      <View style={styles.daysContainer}>
        {DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.id);
          
          return (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                isSelected ? { backgroundColor: color } : null
              ]}
              onPress={() => onSelectDay(day.id)}
              testID={`day-button-${day.id}`}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected ? styles.selectedDayText : null
                ]}
              >
                {day.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  selectedDayText: {
    color: COLORS.card,
  },
});

export default React.memo(DaySelector);