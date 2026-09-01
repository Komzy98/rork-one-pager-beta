import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Dumbbell,
  MapPin,
  Medal,
  Search,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';

type FilterKey = 'For You' | 'Events' | 'Watch' | 'Sports' | 'Learn';

type DiscoveryCard = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  filter: Exclude<FilterKey, 'For You'> | 'Habits';
  route: '/(tabs)/events' | '/(tabs)/shows' | '/(tabs)/sports' | '/(tabs)/learning' | '/(tabs)/discover';
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
};

const FILTERS: FilterKey[] = ['For You', 'Events', 'Watch', 'Sports', 'Learn'];

const CARDS: DiscoveryCard[] = [
  {
    id: 'events-nearby',
    eyebrow: 'NEAR YOU',
    title: 'Find something worth leaving the house for',
    subtitle: 'Local events, nights out and things happening around you.',
    cta: 'Explore events',
    filter: 'Events',
    route: '/(tabs)/events',
    icon: MapPin,
  },
  {
    id: 'continue-watching',
    eyebrow: 'WATCH',
    title: 'Pick up where you left off',
    subtitle: 'Your shows and streaming activity, without opening five apps.',
    cta: 'See your shows',
    filter: 'Watch',
    route: '/(tabs)/shows',
    icon: Clapperboard,
  },
  {
    id: 'sports',
    eyebrow: 'SPORTS',
    title: 'The games you actually care about',
    subtitle: 'Fixtures, upcoming action and favourites in one place.',
    cta: 'Open sports',
    filter: 'Sports',
    route: '/(tabs)/sports',
    icon: Medal,
  },
  {
    id: 'learning',
    eyebrow: 'LEARN',
    title: 'Learn something useful today',
    subtitle: 'Keep useful learning close to the rest of your day.',
    cta: 'Explore learning',
    filter: 'Learn',
    route: '/(tabs)/learning',
    icon: BookOpen,
  },
  {
    id: 'habits',
    eyebrow: 'BUILD YOURSELF',
    title: 'Find a habit worth adding',
    subtitle: 'Your original habit marketplace is still here when you want it.',
    cta: 'Browse habits',
    filter: 'Habits',
    route: '/(tabs)/discover',
    icon: Dumbbell,
  },
];

export default function DiscoverHomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('For You');

  const visibleCards = useMemo(() => {
    if (activeFilter === 'For You') return CARDS;
    return CARDS.filter((card) => card.filter === activeFilter);
  }, [activeFilter]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 28,
        }}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: isDark ? '#1E2230' : '#EEF2FF' }]}> 
              <Sparkles size={19} color={colors.primary} strokeWidth={2.3} />
            </View>
            <Text style={[styles.kicker, { color: colors.primary }]}>FOR YOU</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Things worth watching, doing, following and learning — chosen around your life.</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? '#17191F' : '#F4F6FA',
                borderColor: isDark ? '#292C35' : '#E6E9F0',
              },
            ]}
          >
            <Search size={19} color={colors.textSecondary} />
            <Text style={[styles.searchText, { color: colors.textSecondary }]}>Search everything</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : isDark
                        ? '#17191F'
                        : '#FFFFFF',
                    borderColor: active
                      ? colors.primary
                      : isDark
                        ? '#292C35'
                        : '#E4E7EE',
                  },
                ]}
              >
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.text }]}> {filter} </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeFilter === 'For You' ? (
          <View style={styles.sectionIntro}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Picked for you</Text>
            <Text style={[styles.sectionCopy, { color: colors.textSecondary }]}>One feed across the parts of life One Pager already understands.</Text>
          </View>
        ) : null}

        <View style={styles.cards}>
          {visibleCards.map((card, index) => {
            const Icon = card.icon;
            const featured = activeFilter === 'For You' && index === 0;

            return (
              <TouchableOpacity
                key={card.id}
                activeOpacity={0.88}
                onPress={() => router.push(card.route)}
                style={[
                  styles.card,
                  featured && styles.featuredCard,
                  {
                    backgroundColor: featured
                      ? isDark
                        ? '#17213A'
                        : '#EEF4FF'
                      : isDark
                        ? '#17191F'
                        : '#FFFFFF',
                    borderColor: featured
                      ? isDark
                        ? '#2C4A7E'
                        : '#D5E3FF'
                      : isDark
                        ? '#292C35'
                        : '#E6E9F0',
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.cardIcon,
                      {
                        backgroundColor: featured
                          ? colors.primary
                          : isDark
                            ? '#232630'
                            : '#F3F5F9',
                      },
                    ]}
                  >
                    <Icon size={21} color={featured ? '#FFFFFF' : colors.primary} strokeWidth={2.2} />
                  </View>

                  <View style={styles.cardTextBlock}>
                    <Text style={[styles.eyebrow, { color: colors.primary }]}>{card.eyebrow}</Text>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{card.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.ctaText, { color: colors.primary }]}>{card.cta}</Text>
                  <ChevronRight size={18} color={colors.primary} strokeWidth={2.4} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/events')}
          style={[
            styles.weekendCard,
            {
              backgroundColor: isDark ? '#101B17' : '#F1FBF6',
              borderColor: isDark ? '#1D3C30' : '#D8F1E4',
            },
          ]}
        >
          <View style={styles.weekendIcon}>
            <CalendarDays size={22} color={'#21A366'} strokeWidth={2.2} />
          </View>
          <View style={styles.weekendText}>
            <Text style={[styles.weekendTitle, { color: colors.text }]}>What should I do this week?</Text>
            <Text style={[styles.weekendSubtitle, { color: colors.textSecondary }]}>Start with what is happening around you.</Text>
          </View>
          <ChevronRight size={19} color={'#21A366'} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 8,
  },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.6,
  },
  subtitle: {
    marginTop: 7,
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 560,
  },
  searchBox: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  searchText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filters: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 9,
  },
  filterPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionIntro: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sectionCopy: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
  },
  cards: {
    paddingHorizontal: 22,
    gap: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  featuredCard: {
    paddingVertical: 21,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
  },
  cardFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekendCard: {
    marginHorizontal: 22,
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekendIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(33,163,102,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekendText: {
    flex: 1,
  },
  weekendTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekendSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
});
