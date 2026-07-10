import type { LucideIcon } from 'lucide-react-native';
import {
  Music,
  Trophy,
  Smile,
  Star,
  Wine,
  Palette,
  Users,
  Moon,
  Sparkles,
  LayoutGrid,
} from 'lucide-react-native';
import { BRAND } from '@/constants/brand';
import {
  BENTO_CATEGORY_IDS,
  getSubCategoriesForBento,
  type BentoCategoryId,
  type EventSubCategory,
} from '@/utils/eventCategories';

export interface EventCategoryMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  /** Sub-tags merged into this bento tile (fitness → sports, family → arts, etc.). */
  subCategories?: EventSubCategory[];
}

export const EVENT_CATEGORY_META: EventCategoryMeta[] = [
  { id: 'all', label: 'All', icon: Sparkles, color: BRAND.light.primary },
  { id: 'music', label: 'Music', icon: Music, color: BRAND.light.accent },
  {
    id: 'sports',
    label: 'Sports',
    icon: Trophy,
    color: '#00B894',
    subCategories: getSubCategoriesForBento('sports'),
  },
  { id: 'comedy', label: 'Comedy', icon: Smile, color: '#FDCB6E' },
  { id: 'theatre', label: 'Theatre', icon: Star, color: '#E17055' },
  { id: 'food', label: 'Food & Drink', icon: Wine, color: '#D63031' },
  {
    id: 'arts',
    label: 'Arts',
    icon: Palette,
    color: '#A29BFE',
    subCategories: getSubCategoriesForBento('arts'),
  },
  {
    id: 'networking',
    label: 'Networking',
    icon: Users,
    color: '#0984E3',
    subCategories: getSubCategoriesForBento('networking'),
  },
  { id: 'nightlife', label: 'Nightlife', icon: Moon, color: '#636E72' },
  { id: 'other', label: 'Other', icon: LayoutGrid, color: '#8E99A4' },
];

export { BENTO_CATEGORY_IDS, type BentoCategoryId };

const META_BY_ID = Object.fromEntries(
  EVENT_CATEGORY_META.map((item) => [item.id, item])
) as Record<string, EventCategoryMeta>;

export function getEventCategoryMeta(categoryId: string): EventCategoryMeta {
  return META_BY_ID[categoryId] ?? META_BY_ID.all;
}
