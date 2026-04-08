import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Menu, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface CustomHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showMenu?: boolean;
  onSearchPress?: () => void;
  onMenuPress?: () => void;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  showBorder?: boolean;
  icon?: React.ReactNode;
  iconGradientColors?: [string, string];
}

export default function CustomHeader({
  title,
  subtitle,
  showSearch = false,
  showMenu = false,
  onSearchPress,
  onMenuPress,
  rightComponent,
  leftComponent,
  showBorder = false,
  icon,
  iconGradientColors = ['#3B82F6', '#8B5CF6'],
}: CustomHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        paddingTop: insets.top + 12,
        opacity: headerAnim,
        transform: [{
          translateY: headerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-30, 0],
          })
        }]
      },
      showBorder && styles.withBorder
    ]}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.backgroundSecondary] : [colors.background, colors.surface]}
        style={styles.headerGradient}
      >
        <View style={styles.content}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconContainer, { shadowColor: iconGradientColors[0] }]}>
                <LinearGradient
                  colors={iconGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconGradient}
                >
                  {icon || <User size={20} color="#FFFFFF" strokeWidth={2.5} />}
                </LinearGradient>
              </View>
              <View style={styles.headerTitleGroup}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          {(rightComponent || showSearch || showMenu) && (
            <View style={styles.headerActions}>
              {showMenu && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.surface }]} 
                  onPress={onMenuPress}
                >
                  <Menu size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              {showSearch && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.surface }]} 
                  onPress={onSearchPress}
                >
                  <Search size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              {rightComponent}
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingTop: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 0,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});