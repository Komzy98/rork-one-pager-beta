import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Menu, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { brandIconGradient } from '@/constants/brand';
import { OP_LAYOUT, OP_RADIUS, OP_SHADOW, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';

interface CustomHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showMenu?: boolean;
  onSearchPress?: () => void;
  onMenuPress?: () => void;
  rightComponent?: React.ReactNode;
  showBorder?: boolean;
  /** When true, shows the gradient icon beside the title. */
  showTitleIcon?: boolean;
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
  showBorder = false,
  showTitleIcon = false,
  icon,
  iconGradientColors,
}: CustomHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const resolvedIconGradient = iconGradientColors ?? brandIconGradient(isDark);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + OP_SPACING.md,
          backgroundColor: colors.background,
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
          }],
        },
        showBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {showTitleIcon ? (
            <View style={[styles.headerIconContainer, { shadowColor: resolvedIconGradient[0] }]}>
              <LinearGradient
                colors={resolvedIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconGradient}
              >
                {icon || <User size={20} color="#FFFFFF" strokeWidth={2.4} />}
              </LinearGradient>
            </View>
          ) : null}
          <View style={styles.headerTitleGroup}>
            <Text style={[OP_TYPE.pageTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[OP_TYPE.body, styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
        </View>

        {(rightComponent || showSearch || showMenu) ? (
          <View style={styles.headerActions}>
            {showMenu ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onMenuPress}>
                <Menu size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            {showSearch ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onSearchPress}>
                <Search size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            {rightComponent}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: OP_SPACING.md },
  content: { paddingHorizontal: OP_LAYOUT.screenPadding, width: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: OP_SPACING.sm },
  headerIconContainer: { borderRadius: OP_RADIUS.medium, overflow: 'hidden', ...OP_SHADOW },
  headerIconGradient: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, justifyContent: 'center', alignItems: 'center' },
  headerTitleGroup: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: OP_SPACING.xs, marginTop: OP_SPACING.sm },
  actionBtn: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
