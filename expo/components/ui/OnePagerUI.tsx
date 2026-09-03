import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewProps,
} from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { OP_LAYOUT, OP_RADIUS, OP_SHADOW, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderTop}>
        <View style={styles.pageHeaderCopy}>
          <Text style={[OP_TYPE.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text>
          {meta ? <Text style={[OP_TYPE.meta, styles.pageMeta, { color: colors.textSecondary }]}>{meta}</Text> : null}
        </View>
        {right}
      </View>
      <Text style={[OP_TYPE.pageTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={[OP_TYPE.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[OP_TYPE.meta, styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={[OP_TYPE.meta, styles.sectionActionText, { color: colors.primary }]}>{actionLabel}</Text>
          <ChevronRight size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SurfaceCard({
  children,
  variant = 'standard',
  accent,
  style,
  ...props
}: ViewProps & {
  variant?: 'hero' | 'standard' | 'list';
  accent?: string;
}) {
  const { colors, isDark } = useTheme();
  const background = variant === 'hero'
    ? (isDark ? colors.surfaceSecondary : '#F5F8FF')
    : colors.card;
  return (
    <View
      {...props}
      style={[
        styles.surface,
        variant === 'hero' && styles.heroSurface,
        variant === 'list' && styles.listSurface,
        {
          backgroundColor: background,
          borderColor: accent ? `${accent}35` : colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
  accent,
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'info';
  accent?: string;
}) {
  const { colors, isDark } = useTheme();
  const resolved = accent ?? (
    tone === 'positive' ? colors.success
      : tone === 'warning' ? colors.warning
        : tone === 'danger' ? colors.error
          : tone === 'info' ? colors.primary
            : colors.textSecondary
  );
  return (
    <View style={[styles.statusPill, { backgroundColor: isDark ? `${resolved}22` : `${resolved}12` }]}>
      <Text style={[OP_TYPE.eyebrow, styles.statusText, { color: resolved }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** Sparkles are reserved for a connection One Pager made for the user. */
export function ContextCue({
  label,
  text,
  tone = 'info',
  onPress,
}: {
  label: string;
  text: string;
  tone?: 'info' | 'warning' | 'positive' | 'neutral';
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const accent = tone === 'warning'
    ? colors.warning
    : tone === 'positive'
      ? colors.success
      : tone === 'neutral'
        ? colors.textSecondary
        : colors.primary;
  const body = (
    <View style={styles.contextInner}>
      <View style={[styles.contextIcon, { backgroundColor: isDark ? `${accent}24` : `${accent}12` }]}>
        <Sparkles size={15} color={accent} />
      </View>
      <View style={styles.contextCopy}>
        <Text style={[OP_TYPE.eyebrow, { color: accent }]}>{label.toUpperCase()}</Text>
        <Text style={[OP_TYPE.body, styles.contextText, { color: colors.text }]}>{text}</Text>
      </View>
      {onPress ? <ChevronRight size={17} color={colors.textSecondary} /> : null}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        style={[styles.contextCue, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.contextCue, { backgroundColor: colors.card, borderColor: colors.border }]}>{body}</View>;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F3F6' }]}>
      {items.map((item) => {
        const selected = item === value;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onChange(item)}
            style={[
              styles.segmentButton,
              selected && [styles.segmentSelected, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}
          >
            <Text style={[OP_TYPE.meta, styles.segmentText, { color: selected ? colors.text : colors.textSecondary }]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  kind = 'primary',
  icon,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'tertiary';
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const primary = kind === 'primary';
  const secondary = kind === 'secondary';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.84}
      style={[
        styles.actionButton,
        compact && styles.actionCompact,
        primary && { backgroundColor: colors.primary },
        secondary && { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F3F6' },
        kind === 'tertiary' && { backgroundColor: 'transparent' },
      ]}
    >
      {icon}
      <Text style={[OP_TYPE.meta, styles.actionLabel, { color: primary ? colors.textInverse : kind === 'tertiary' ? colors.textSecondary : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ListRow({
  icon,
  eyebrow,
  title,
  detail,
  accent,
  onPress,
  divided = false,
}: {
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  detail?: string;
  accent?: string;
  onPress?: () => void;
  divided?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const content = (
    <View style={styles.rowInner}>
      {icon ? <View style={[styles.rowIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#F3F5F8' }]}>{icon}</View> : null}
      <View style={styles.rowCopy}>
        {eyebrow ? <Text style={[OP_TYPE.eyebrow, { color: accent ?? colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[OP_TYPE.cardTitle, styles.rowTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {detail ? <Text style={[OP_TYPE.meta, styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={2}>{detail}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={17} color={colors.textSecondary} /> : null}
    </View>
  );
  const containerStyle = [
    styles.listRow,
    divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  ];
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={containerStyle}>{content}</TouchableOpacity>
  ) : (
    <View style={containerStyle}>{content}</View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { gap: OP_SPACING.xs },
  pageHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: OP_SPACING.sm },
  pageHeaderCopy: { flex: 1 },
  pageMeta: { marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: OP_SPACING.sm },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionSubtitle: { marginTop: 3, maxWidth: 360 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  sectionActionText: { fontWeight: '700' },
  surface: { borderWidth: 1, borderRadius: OP_RADIUS.card, padding: OP_SPACING.md, ...OP_SHADOW },
  heroSurface: { borderRadius: OP_RADIUS.hero, padding: OP_SPACING.lg },
  listSurface: { padding: 0, overflow: 'hidden' },
  statusPill: { alignSelf: 'flex-start', borderRadius: OP_RADIUS.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 9, lineHeight: 12, letterSpacing: 0.85 },
  contextCue: { borderWidth: 1, borderRadius: OP_RADIUS.card, padding: 13 },
  contextInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contextIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  contextCopy: { flex: 1, minWidth: 0 },
  contextText: { marginTop: 3 },
  segmented: { flexDirection: 'row', borderRadius: OP_RADIUS.medium, padding: 4, gap: 4 },
  segmentButton: { flex: 1, minHeight: 38, borderRadius: OP_RADIUS.control, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  segmentSelected: { ...OP_SHADOW },
  segmentText: { fontWeight: '700' },
  actionButton: { minHeight: 46, borderRadius: OP_RADIUS.medium, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionCompact: { minHeight: 38, paddingHorizontal: 12 },
  actionLabel: { fontWeight: '700' },
  listRow: { minHeight: OP_LAYOUT.rowMinHeight, paddingHorizontal: 14, paddingVertical: 11 },
  rowInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { marginTop: 2 },
  rowDetail: { marginTop: 2 },
});
