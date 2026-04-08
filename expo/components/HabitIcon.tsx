import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Book,
  BookOpen,
  Dumbbell,
  Droplet,
  Coffee,
  Bed,
  Brain,
  Utensils,
  Pencil,
  Code,
  Music,
  Heart,
  Bike,
  Smartphone,
  Zap,
  CheckCircle,
  Check,
} from 'lucide-react-native';


interface HabitIconProps {
  name: string;
  color: string;
  size?: number;
  backgroundColor?: string;
}

const HabitIcon: React.FC<HabitIconProps> = ({
  name,
  color,
  size = 24,
  backgroundColor,
}) => {
  const getIcon = () => {
    switch (name) {
      case 'book':
        return <Book size={size} color={color} />;
      case 'book-open':
        return <BookOpen size={size} color={color} />;
      case 'dumbbell':
        return <Dumbbell size={size} color={color} />;
      case 'droplet':
        return <Droplet size={size} color={color} />;
      case 'coffee':
        return <Coffee size={size} color={color} />;
      case 'bed':
        return <Bed size={size} color={color} />;
      case 'brain':
        return <Brain size={size} color={color} />;
      case 'utensils':
        return <Utensils size={size} color={color} />;
      case 'pencil':
        return <Pencil size={size} color={color} />;
      case 'code':
        return <Code size={size} color={color} />;
      case 'music':
        return <Music size={size} color={color} />;
      case 'heart':
        return <Heart size={size} color={color} />;
      case 'bike':
        return <Bike size={size} color={color} />;
      case 'smartphone':
        return <Smartphone size={size} color={color} />;
      case 'zap':
        return <Zap size={size} color={color} />;
      case 'check-circle':
        return <CheckCircle size={size} color={color} />;
      case 'check':
      default:
        return <Check size={size} color={color} />;
    }
  };

  if (backgroundColor) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {getIcon()}
      </View>
    );
  }

  return getIcon();
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(HabitIcon);