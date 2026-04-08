import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import HabitIcon from './HabitIcon';

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  color: string;
}

const ICONS = [
  'book',
  'book-open',
  'dumbbell',
  'droplet',
  'coffee',
  'bed',
  'brain',
  'utensils',
  'pencil',
  'code',
  'music',
  'heart',
  'bike',
  'smartphone',
  'zap',
  'check-circle',
  'check',
];

const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon, color }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Choose an icon</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.iconsContainer}>
          {ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.iconOption,
                selectedIcon === icon && { borderColor: color, borderWidth: 2 }
              ]}
              onPress={() => onSelectIcon(icon)}
              testID={`icon-option-${icon}`}
            >
              <HabitIcon name={icon} color={color} size={24} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  scrollView: {
    flexGrow: 0,
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});

export default React.memo(IconPicker);