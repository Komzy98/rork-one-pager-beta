import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/constants/colors';

interface ProgressCircleProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  progress,
  size = 100,
  strokeWidth = 10,
  color = COLORS.primary,
  backgroundColor = COLORS.border,
  showPercentage = true,
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  // Calculate radius and center point
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Calculate circumference
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash offset based on progress
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      
      {showPercentage && (
        <View style={styles.textContainer}>
          <Text style={styles.progressText}>{Math.round(clampedProgress)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default React.memo(ProgressCircle);