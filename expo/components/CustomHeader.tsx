import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Menu, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/colors';
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
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        paddingTop: insets.top + 10,
        opacity: headerAnim,
        transform: [{
          translateY: headerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0],
          })
        }]
      },
      showBorder && [styles.withBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]
    ]}>
      <View style={[styles.headerGradient, { backgroundColor: colors.background }]}>
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
                  {icon || <User size={18} color="#FFFFFF" strokeWidth={2.5} />}
                </LinearGradient>
              </View>
              <View style={styles.headerTitleGroup}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
            {(rightComponent || showSearch || showMenu) && (
              <View style={styles.headerActions}>
                {showMenu && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
                    onPress={onMenuPress}
                  >
                    <Menu size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
                {showSearch && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
                    onPress={onSearchPress}
                  >
                    <Search size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
                {rightComponent}
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  withBorder: {
    borderBottomWidth: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  content: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  headerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 1,
    fontWeight: '500' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});