/**
 * Core visual tokens for the VNext One Pager interface.
 *
 * Components should compose from these values instead of inventing their own
 * spacing/radius/type scales. This keeps the app feeling like one product.
 */
export const OP_SPACING = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const OP_RADIUS = {
  control: 12,
  compactCard: 16,
  card: 20,
  featureCard: 22,
  pill: 999,
} as const;

export const OP_TYPE = {
  kicker: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  featureTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  meta: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500' as const,
  },
  action: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
  },
} as const;

export const OP_SURFACE = {
  lightCard: '#FFFFFF',
  lightMuted: '#F3F5F8',
  borderLight: 'rgba(15,23,42,0.08)',
  shadow: '#0F172A',
  primary: '#2563EB',
  interest: '#4F46E5',
  positive: '#16A34A',
  warning: '#D97706',
} as const;
