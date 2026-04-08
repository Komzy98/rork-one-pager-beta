import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SwipeableTabContainerProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export default function SwipeableTabContainer({ children }: SwipeableTabContainerProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="swipeable-tab-container">
      {React.Children.map(children, (child, index) => {
        if (typeof child === 'string' || typeof child === 'number') {
          if (__DEV__) {
            console.warn('Filtered string child from SwipeableTabContainer', { child, index });
          }
          return null;
        }

        if (React.isValidElement(child)) {
          return child;
        }

        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
