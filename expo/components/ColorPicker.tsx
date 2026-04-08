import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { HABIT_COLORS } from '@/constants/colors';
import { Check } from 'lucide-react-native';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelectColor }) => {
  return (
    <View style={styles.container}>
      {HABIT_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[styles.colorOption, { backgroundColor: color }]}
          onPress={() => onSelectColor(color)}
          testID={`color-option-${color}`}
        >
          {selectedColor === color && (
            <Check size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(ColorPicker);