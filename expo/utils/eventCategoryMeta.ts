import type { LucideIcon } from 'lucide-react-native';
import {
  Music,
  Trophy,
  Smile,
  Star,
  Wine,
  Palette,
  Monitor,
  Moon,
  Sparkles,
} from 'lucide-react-native';

export interface EventCategoryMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const EVENT_CATEGORY_META: EventCategoryMeta[] = [
  { id: 'all', label: 'All', icon: Sparkles, color: '#E84393' },
  { id: 'music', label: 'Music', icon: Music, color: '#6C5CE7' },
  { id: 'sports', label: 'Sports', icon: Trophy, color: '#00B894' },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: '#FDCB6E' },
  { id: 'theatre', label: 'Theatre', icon: Star, color: '#E17055' },
  { id: 'food', label: 'Food & Drink', icon: Wine, color: '#D63031' },
  { id: 'arts', label: 'Arts', icon: Palette, color: '#A29BFE' },
  { id: 'tech', label: 'Tech', icon: Monitor, color: '#0984E3' },
  { id: 'nightlife', label: 'Nightlife', icon: Moon, color: '#636E72' },
];

const META_BY_ID = Object.fromEntries(
  EVENT_CATEGORY_META.map((item) => [item.id, item])
) as Record<string, EventCategoryMeta>;

export function getEventCategoryMeta(categoryId: string): EventCategoryMeta {
  return META_BY_ID[categoryId] ?? META_BY_ID.all;
}
