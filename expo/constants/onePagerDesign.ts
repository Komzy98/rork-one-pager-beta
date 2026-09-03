import type { TextStyle } from 'react-native';
import { appFont } from '@/constants/fonts';

export const OP_SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  section: 32,
} as const;

export const OP_RADIUS = {
  small: 10,
  control: 12,
  medium: 14,
  card: 18,
  hero: 24,
  pill: 999,
} as const;

export const OP_LAYOUT = {
  screenPadding: 20,
  sectionGap: 32,
  cardGap: 12,
  rowMinHeight: 68,
} as const;

export const OP_TYPE: Record<
  'pageTitle' | 'heroTitle' | 'sectionTitle' | 'cardTitle' | 'body' | 'meta' | 'eyebrow',
  TextStyle
> = {
  pageTitle: {
    ...appFont('700', { display: true }),
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  heroTitle: {
    ...appFont('700', { display: true }),
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.55,
  },
  sectionTitle: {
    ...appFont('700', { display: true }),
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  cardTitle: {
    ...appFont('700'),
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  body: {
    ...appFont('500'),
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  meta: {
    ...appFont('500'),
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  eyebrow: {
    ...appFont('700'),
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.25,
  },
};

/** Domain colour is an accent, never the whole surface. */
export const OP_DOMAIN = {
  tasks: '#3B63F3',
  routines: '#13A66A',
  calendar: '#6E56CF',
  watch: '#8A5CF6',
  sports: '#D88900',
  events: '#E05273',
  cooking: '#E56B3E',
  learning: '#2586C8',
} as const;

export const OP_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
} as const;
