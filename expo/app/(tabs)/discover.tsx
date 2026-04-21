import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  TextInput,
  Alert,
  Animated,
  StatusBar,
  Dimensions
} from 'react-native';
import { 
  Search, 
  Heart, 
  Bookmark, 
  Flame,
  Plus,
  Check,
  X,
  CheckCircle,
  Sparkles,
  Clock,
  Target,
  Package,
  TrendingUp,
  ChevronRight,
  Zap,
  Star,
  ArrowRight,
  Users,
  Crown,
  Eye,
  Dumbbell,
  BookOpen,
  Droplet,
  Footprints,
  Smartphone,
  Utensils,
  Brain,
  CircleDot,
  PenTool,
  Moon,
  Music,
  Wind,
  HeartPulse,
  Egg,
  Sun,
  Calendar,
  Droplets,
  Salad,
  AlarmClock,
  Link,
  Trees,
  RotateCw,
  Code,
  GraduationCap,
  Leaf,
  ClipboardCheck,
  Palette,
  Ban,
  Carrot,
  CandyOff,
  Wallet,
  Briefcase,
  Home,
  Globe,
  Activity
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMUNITY_HABITS, HABIT_CATEGORIES } from '@/mocks/communityHabits';
import { 
  HABIT_BUNDLES, 
  CURATED_COLLECTIONS, 
  getCollectionHabits, 
  getBundleHabits,
  getForYouRecommendations,
  HabitBundle,
  CuratedCollection
} from '@/mocks/habitBundles';
import { CommunityHabit } from '@/types/habit';
import { useSavedHabits } from '@/hooks/useHabitsEnhancement';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useApp } from '@/hooks/useHabitsStore';
import HabitDetailModal from '@/components/HabitDetailModal';
import * as Haptics from 'expo-haptics';
import TabWalkthrough from '@/components/TabWalkthrough';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_CARD_WIDTH = SCREEN_WIDTH - 48;

const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'All': { icon: Globe, color: '#007AFF' },
  'Fitness': { icon: Dumbbell, color: '#FF6B35' },
  'Health': { icon: Activity, color: '#34C759' },
  'Mindfulness': { icon: CircleDot, color: '#AF52DE' },
  'Productivity': { icon: Zap, color: '#FF9500' },
  'Learning': { icon: BookOpen, color: '#5856D6' },
  'Creative': { icon: Palette, color: '#FF2D55' },
  'Religion': { icon: Heart, color: '#8E8E93' },
  'Finance': { icon: Wallet, color: '#30D158' },
  'Self-Care': { icon: Sparkles, color: '#FF6B9D' },
  'Social': { icon: Users, color: '#007AFF' },
  'Career': { icon: Briefcase, color: '#636366' },
  'Household': { icon: Home, color: '#AC8E68' },
};

const TRENDING_SEARCHES = [
  'Morning routine', 'Meditation', 'Cold shower', 'Reading',
  'Gratitude', 'Fitness', 'No sugar', 'Journaling'
];

const HERO_TAGLINES: Record<string, string> = {
  'Fitness': 'Build your strongest self',
  'Health': 'Fuel your body right',
  'Mindfulness': 'Find your inner peace',
  'Productivity': 'Master your output',
  'Learning': 'Grow every single day',
  'Creative': 'Express your vision',
  'Religion': 'Deepen your practice',
  'Finance': 'Build lasting wealth',
  'Self-Care': 'You deserve this',
  'Social': 'Strengthen your bonds',
  'Career': 'Level up professionally',
  'Household': 'Create your sanctuary',
};

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'Easy': return '#34C759';
    case 'Medium': return '#FF9500';
    case 'Hard': return '#FF3B30';
    default: return COLORS.textLight;
  }
};

const getFrequencyText = (days: number[]) => {
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return `${days.length}x/week`;
};

const ICON_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'dumbbell': Dumbbell, 'sparkles': Sparkles, 'book-open': BookOpen, 'clock': Clock,
  'droplet': Droplet, 'heart': Heart, 'book': BookOpen, 'footprints': Footprints,
  'smartphone': Smartphone, 'utensils': Utensils, 'brain': Brain, 'circle': CircleDot,
  'pen-tool': PenTool, 'moon': Moon, 'music': Music, 'wind': Wind,
  'zap': Zap, 'heart-pulse': HeartPulse, 'egg': Egg, 'sun': Sun,
  'calendar': Calendar, 'droplets': Droplets, 'flame': Flame, 'salad': Salad,
  'alarm-clock': AlarmClock, 'users': Users, 'pen-line': PenTool, 'link': Link,
  'trees': Trees, 'rotate-3d': RotateCw, 'moon-star': Moon, 'code': Code,
  'utensils-crossed': Utensils, 'graduation-cap': GraduationCap, 'leaf': Leaf,
  'clipboard-check': ClipboardCheck, 'palette': Palette, 'ban': Ban, 'carrot': Carrot,
  'candy-off': CandyOff, 'wallet': Wallet,
};

const getHabitIcon = (icon: string, size: number = 18, color: string = '#007AFF') => {
  const IconComp = ICON_COMPONENT_MAP[icon] || Sparkles;
  return <IconComp size={size} color={color} />;
};

const HERO_GRADIENTS: [string, string, string][] = [
  ['#FF416C', '#FF4B2B', '#FF6B4A'],
  ['#0575E6', '#021B79', '#0984E3'],
  ['#11998e', '#38ef7d', '#00B894'],
  ['#F2994A', '#F2C94C', '#FDCB6E'],
  ['#8E2DE2', '#4A00E0', '#6C5CE7'],
  ['#FC5C7D', '#6A82FB', '#A29BFE'],
  ['#00c6ff', '#0072ff', '#38ADE5'],
  ['#56ab2f', '#a8e063', '#55E6C1'],
];

const SPOTLIGHT_GRADIENTS: [string, string][] = [
  ['#1a1a2e', '#16213e'],
  ['#0f0c29', '#302b63'],
  ['#1B1B3A', '#2D2D5E'],
];

const AnimatedSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const SpotlightCard = ({
  habit,
  onPress,
  onAdd,
  isAdded,
  isDark,
}: {
  habit: CommunityHabit;
  onPress: () => void;
  onAdd: () => void;
  isAdded: boolean;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const spotlightGradient = isDark ? SPOTLIGHT_GRADIENTS[0] : ['#1a1a2e', '#16213e'] as [string, string];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.spotlightOuter}
      >
        <LinearGradient
          colors={[...spotlightGradient, '#0D0D1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.spotlightGradient}
        >
          <View style={styles.spotlightGlow} />
          <View style={styles.spotlightContent}>
            <View style={styles.spotlightTopBadge}>
              <Crown size={11} color="#FFD700" />
              <Text style={styles.spotlightBadgeText}>HABIT OF THE DAY</Text>
            </View>

            <View style={styles.spotlightMain}>
              <View style={styles.spotlightEmojiContainer}>
                <View style={styles.spotlightEmojiRing}>
                  {getHabitIcon(habit.icon || 'sparkles', 24, '#FFFFFF')}
                </View>
              </View>

              <View style={styles.spotlightTextWrap}>
                <Text style={styles.spotlightCategory}>{habit.category}</Text>
                <Text style={styles.spotlightName} numberOfLines={2}>{habit.name}</Text>
                <Text style={styles.spotlightDesc} numberOfLines={2}>{habit.description}</Text>
              </View>
            </View>

            <View style={styles.spotlightFooter}>
              <View style={styles.spotlightFooterRow}>
                <View style={styles.spotlightStats}>
                  <View style={styles.spotlightStatItem}>
                    <Clock size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.spotlightStatText}>{habit.estimatedDuration}</Text>
                  </View>
                  <View style={styles.spotlightStatDivider} />
                  <View style={styles.spotlightStatItem}>
                    <Users size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.spotlightStatText}>{habit.likes?.toLocaleString()} joined</Text>
                  </View>
                  <View style={styles.spotlightStatDivider} />
                  <View style={styles.spotlightStatItem}>
                    <Zap size={12} color={getDifficultyColor(habit.difficulty)} />
                    <Text style={[styles.spotlightStatText, { color: getDifficultyColor(habit.difficulty) }]}>{habit.difficulty}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.spotlightAddBtn, isAdded && styles.spotlightAddBtnActive]}
                  onPress={(e) => { e.stopPropagation(); onAdd(); }}
                  activeOpacity={0.8}
                >
                  {isAdded ? (
                    <>
                      <Check size={14} color="#fff" />
                      <Text style={styles.spotlightAddText}>Added</Text>
                    </>
                  ) : (
                    <>
                      <Plus size={14} color="#fff" />
                      <Text style={styles.spotlightAddText}>Add to Routine</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HeroCard = ({ 
  habit, 
  index,
  onPress,
  onAdd,
  isAdded,
}: { 
  habit: CommunityHabit;
  index: number;
  onPress: () => void;
  onAdd: () => void;
  isAdded: boolean;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradient = HERO_GRADIENTS[index % HERO_GRADIENTS.length];
  const tagline = HERO_TAGLINES[habit.category] || 'Build a better you';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.965, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.heroCardOuter}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCardGradient}
        >
          <View style={styles.heroPatternOverlay} />
          <View style={styles.heroCardOverlay}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCategoryPill}>
                <Text style={styles.heroCategoryText}>{habit.category}</Text>
              </View>
              <View style={styles.heroTopRight}>
                {habit.trending && (
                  <View style={styles.heroTrendingPill}>
                    <Flame size={9} color="#FFD700" />
                    <Text style={styles.heroTrendingText}>HOT</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.heroEmojiCircle}>
                {getHabitIcon(habit.icon || 'sparkles', 22, '#FFFFFF')}
              </View>
              <View style={styles.heroTextContent}>
                <Text style={styles.heroTagline}>{tagline}</Text>
                <Text style={styles.heroName} numberOfLines={1}>{habit.name}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaPill}>
                    <Clock size={9} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroMetaPillText}>{habit.estimatedDuration}</Text>
                  </View>
                  <View style={styles.heroMetaPill}>
                    <Text style={styles.heroMetaPillText}>{habit.difficulty}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.heroAddBtn, isAdded && styles.heroAddBtnActive]}
                onPress={(e) => { e.stopPropagation(); onAdd(); }}
              >
                {isAdded ? <Check size={16} color="#fff" /> : <Plus size={16} color={gradient[0]} />}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CollectionCard = ({ 
  collection,
  onPress,
  count,
  isDark
}: { 
  collection: CuratedCollection;
  onPress: () => void;
  count: number;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity 
      activeOpacity={1}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.collectionCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={isDark
            ? [collection.color + '25', collection.color + '08']
            : [collection.color + '18', collection.color + '06']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.collectionGradientBg, { 
            borderColor: isDark ? collection.color + '20' : collection.color + '12',
          }]}
        >
          <View style={[styles.collectionEmojiWrap, { backgroundColor: collection.color + '20' }]}>
            {getHabitIcon(collection.emoji || 'sparkles', 18, collection.color)}
          </View>
          <Text style={[styles.collectionName, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]} numberOfLines={2}>{collection.name}</Text>
          <View style={styles.collectionBottom}>
            <Text style={[styles.collectionCount, { color: isDark ? '#6B6B80' : '#8E8E93' }]}>{count} habits</Text>
            <View style={[styles.collectionArrow, { backgroundColor: collection.color + '18' }]}>
              <ArrowRight size={10} color={collection.color} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const BundleCard = ({ 
  bundle,
  onPress,
  isAnyAdded,
  isDark,
}: { 
  bundle: HabitBundle;
  onPress: () => void;
  isAnyAdded: boolean;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accent = bundle.gradient[0];
  const accent2 = bundle.gradient[1] ?? accent;

  return (
    <TouchableOpacity 
      activeOpacity={1}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
      onPress={onPress}
      testID={`bundle-card-${bundle.id}`}
    >
      <Animated.View style={[
        styles.bundleCard, 
        { 
          backgroundColor: isDark ? '#0F0F1E' : '#fff',
          borderColor: isDark ? '#1F1F34' : '#EFEFF4',
          shadowColor: accent,
          shadowOpacity: isDark ? 0.28 : 0.14,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <LinearGradient
          colors={isDark
            ? [accent + '22', accent2 + '10', 'transparent']
            : [accent + '14', accent2 + '08', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.bundleGlow, { backgroundColor: accent }]} />
        <View style={[styles.bundleGlow2, { backgroundColor: accent2 }]} />

        <View style={styles.bundleBody}>
          <View style={styles.bundleHeader}>
            <LinearGradient
              colors={[accent, accent2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bundleIconWrap}
            >
              <View style={styles.bundleIconInner}>
                {getHabitIcon(bundle.emoji || 'sparkles', 18, accent)}
              </View>
            </LinearGradient>
            <View style={styles.bundleHeaderRight}>
              {isAnyAdded && (
                <View style={[styles.bundleAddedBadge, { backgroundColor: isDark ? '#0D3320' : '#D1FAE5' }]}>
                  <CheckCircle size={10} color="#34C759" />
                </View>
              )}
              <View style={[styles.bundleHabitCountBadge, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }]}>
                <Package size={9} color={accent} />
                <Text style={[styles.bundleHabitCountText, { color: accent }]}>{bundle.habitIds.length}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.bundleName, { color: isDark ? '#F5F5FA' : '#0A0A1A' }]} numberOfLines={1}>{bundle.name}</Text>
          <Text style={[styles.bundleDesc, { color: isDark ? '#8A8AA0' : '#6E6E7A' }]} numberOfLines={2}>{bundle.description}</Text>

          <View style={styles.bundleBenefitsRow}>
            {bundle.benefits.slice(0, 2).map((benefit, i) => (
              <View key={i} style={[styles.benefitChip, {
                backgroundColor: isDark ? accent + '1F' : accent + '12',
                borderColor: isDark ? accent + '30' : accent + '20',
              }]}>
                <Star size={8} color={accent} fill={accent} />
                <Text style={[styles.benefitText, { color: isDark ? accent : accent }]} numberOfLines={1}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.bundleFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={styles.bundleMetaItem}>
              <Clock size={10} color={isDark ? '#7A7A90' : '#8E8E93'} />
              <Text style={[styles.bundleMetaText, { color: isDark ? '#7A7A90' : '#6E6E7A' }]}>{bundle.estimatedTime}</Text>
            </View>
            <View style={[styles.bundleDifficulty, { backgroundColor: getDifficultyColor(bundle.difficulty) + '18' }]}>
              <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor(bundle.difficulty) }]} />
              <Text style={[styles.bundleDifficultyText, { color: getDifficultyColor(bundle.difficulty) }]}>
                {bundle.difficulty}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const RecentCard = ({ 
  habit, 
  onPress,
  isAdded,
  isDark,
}: { 
  habit: CommunityHabit;
  onPress: () => void;
  isAdded: boolean;
  isDark: boolean;
}) => {
  return (
    <TouchableOpacity style={[styles.recentCard, { backgroundColor: isDark ? '#161628' : '#fff' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.recentIcon, { backgroundColor: (habit.color || '#007AFF') + '12' }]}>
        {getHabitIcon(habit.icon || 'sparkles', 16, habit.color || '#007AFF')}
      </View>
      <Text style={[styles.recentName, { color: isDark ? '#A0A0B0' : '#3C3C43' }]} numberOfLines={1}>{habit.name}</Text>
      {isAdded && <View style={[styles.recentAddedDot, { borderColor: isDark ? '#161628' : '#fff' }]} />}
    </TouchableOpacity>
  );
};

const CompactHabitCard = ({ 
  habit, 
  onAdd,
  onPress,
  isAlreadyAdded,
  isDark,
}: { 
  habit: CommunityHabit; 
  onAdd: (habit: CommunityHabit) => void;
  onPress: (habit: CommunityHabit) => void;
  isAlreadyAdded: boolean;
  isDark: boolean;
}) => {
  const [justAdded, setJustAdded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isAdded = isAlreadyAdded || justAdded;
  const accentColor = habit.color || '#007AFF';

  const handleAdd = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJustAdded(false);
    onAdd(habit);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.015, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(habit)}>
      <Animated.View style={[
        styles.habitCard, 
        { 
          transform: [{ scale: scaleAnim }],
          backgroundColor: isDark ? '#161628' : '#fff',
        }
      ]}>

        <View style={styles.habitCardInner}>
          <View style={styles.habitCardRow}>
            <View style={[styles.habitIconBg, { backgroundColor: accentColor + '10' }]}>
              {getHabitIcon(habit.icon || 'sparkles', 18, accentColor)}
            </View>
            <View style={styles.habitCardContent}>
              <View style={styles.habitCardHeader}>
                <Text style={[styles.habitName, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]} numberOfLines={1}>{habit.name}</Text>
                {isAdded && (
                  <View style={[styles.addedTag, { backgroundColor: isDark ? '#0D3320' : '#D1FAE5' }]}>
                    <Check size={8} color="#34C759" />
                    <Text style={[styles.addedTagText, { color: isDark ? '#34C759' : '#059669' }]}>Added</Text>
                  </View>
                )}
                {!isAdded && habit.trending && (
                  <View style={[styles.miniTrendingBadge, { backgroundColor: isDark ? '#2D1A0A' : '#FFF3E0' }]}>
                    <Flame size={9} color="#FF6B35" />
                  </View>
                )}
              </View>
              <Text style={[styles.habitDescription, { color: isDark ? '#6B6B80' : '#8E8E93' }]} numberOfLines={1}>{habit.description}</Text>
              <View style={styles.habitMeta}>
                <View style={[styles.metaPillSmall, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}>
                  <Clock size={9} color={isDark ? '#5A5A6E' : '#8E8E93'} />
                  <Text style={[styles.metaPillSmallText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{habit.estimatedDuration}</Text>
                </View>
                <View style={[styles.metaPillSmall, { backgroundColor: getDifficultyColor(habit.difficulty) + '10' }]}>
                  <Text style={[styles.metaPillSmallText, { color: getDifficultyColor(habit.difficulty) }]}>{habit.difficulty}</Text>
                </View>
                <View style={[styles.metaPillSmall, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}>
                  <Text style={[styles.metaPillSmallText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{getFrequencyText(habit.frequency.days)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={[
                styles.addBtn, 
                { backgroundColor: isAdded ? '#34C759' : accentColor },
              ]}
              onPress={handleAdd}
              activeOpacity={0.7}
            >
              {isAdded ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
          <View style={[styles.habitCardFooter, { borderTopColor: isDark ? '#1F1F34' : '#F0F0F3' }]}>
            <View style={styles.statsRow}>
              <Heart size={11} color={isDark ? '#5A5A6E' : '#C7C7CC'} />
              <Text style={[styles.statText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{habit.likes.toLocaleString()}</Text>
            </View>
            <View style={styles.statsRow}>
              <Bookmark size={11} color={isDark ? '#5A5A6E' : '#C7C7CC'} />
              <Text style={[styles.statText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{habit.saves.toLocaleString()}</Text>
            </View>
            {habit.tags && habit.tags.length > 0 && (
              <View style={styles.footerTags}>
                {habit.tags.slice(0, 2).map((tag, i) => (
                  <View key={i} style={[styles.tagPill, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}>
                    <Text style={[styles.tagText, { color: isDark ? '#6B6B80' : '#8E8E93' }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ 
  icon, 
  iconColor: _iconColor, 
  iconBg, 
  title, 
  subtitle, 
  isDark,
  onSeeAll,
}: { 
  icon: React.ReactNode; 
  iconColor: string; 
  iconBg: string; 
  title: string; 
  subtitle: string; 
  isDark: boolean;
  onSeeAll?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View>
        <Text style={[styles.sectionTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{subtitle}</Text>
      </View>
    </View>
    {onSeeAll && (
      <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
        <Text style={[styles.seeAllText, { color: isDark ? '#5A8AFF' : '#007AFF' }]}>See all</Text>
        <ChevronRight size={14} color={isDark ? '#5A8AFF' : '#007AFF'} />
      </TouchableOpacity>
    )}
  </View>
);

const GradientDivider = ({ isDark }: { isDark: boolean }) => (
  <View style={styles.gradientDividerWrap}>
    <LinearGradient
      colors={isDark 
        ? ['transparent', '#2A2A3E', 'transparent'] 
        : ['transparent', '#E0E0E5', 'transparent']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradientDivider}
    />
  </View>
);

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { addCommunityHabit, removeSavedHabit, isHabitSaved, savedCount, communityHabitIds, savedHabits } = useSavedHabits();
  const { recentlyViewedIds, addRecentlyViewed } = useRecentlyViewed();
  const { habits } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedHabit, setSelectedHabit] = useState<CommunityHabit | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CuratedCollection | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<HabitBundle | null>(null);
  const [showSavedList, setShowSavedList] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const forYouHabits = useMemo(() => {
    const userHabitsData = habits.map(() => ({ category: undefined, tags: undefined }));
    return getForYouRecommendations(userHabitsData, communityHabitIds);
  }, [habits, communityHabitIds]);

  const spotlightHabit = useMemo(() => {
    const today = new Date();
    const dayIndex = today.getDate() % COMMUNITY_HABITS.length;
    const trending = COMMUNITY_HABITS.filter(h => h.trending);
    return trending.length > 0 ? trending[dayIndex % trending.length] : COMMUNITY_HABITS[dayIndex];
  }, []);

  const recentlyViewedHabits = useMemo(() => {
    return recentlyViewedIds
      .map(id => COMMUNITY_HABITS.find(h => h.id === id))
      .filter((h): h is CommunityHabit => h !== undefined)
      .slice(0, 6);
  }, [recentlyViewedIds]);

  const filteredHabits = useMemo(() => {
    let result = COMMUNITY_HABITS;

    if (selectedCollection) {
      result = getCollectionHabits(selectedCollection);
    } else if (selectedBundle) {
      result = getBundleHabits(selectedBundle);
    } else if (activeCategory !== 'All') {
      result = result.filter(h => h.category === activeCategory);
    }

    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(h => 
        h.name.toLowerCase().includes(query) ||
        h.description?.toLowerCase().includes(query) ||
        h.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [activeCategory, searchQuery, selectedCollection, selectedBundle]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleToggleHabit = useCallback((communityHabit: CommunityHabit) => {
    if (isHabitSaved(communityHabit.id)) {
      Alert.alert(
        'Remove Habit?',
        `Remove "${communityHabit.name}" from your routine?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              removeSavedHabit(communityHabit.id);
            },
          },
        ]
      );
      return;
    }
    
    Alert.alert(
      'Add to Routine?',
      `Add "${communityHabit.name}" to your daily routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            addCommunityHabit(communityHabit);
          },
        },
      ]
    );
  }, [isHabitSaved, addCommunityHabit, removeSavedHabit]);

  const handleHabitPress = useCallback((habit: CommunityHabit) => {
    addRecentlyViewed(habit.id);
    setSelectedHabit(habit);
    setModalVisible(true);
  }, [addRecentlyViewed]);

  const handleCloseModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedHabit(null), 300);
  };

  const handleCollectionPress = (collection: CuratedCollection) => {
    setSelectedCollection(collection);
    setSelectedBundle(null);
    setActiveCategory('All');
    setSearchFocused(false);
  };

  const handleBundlePress = (bundle: HabitBundle) => {
    setSelectedBundle(bundle);
    setSelectedCollection(null);
    setActiveCategory('All');
    setSearchFocused(false);
  };

  const clearFilters = () => {
    setSelectedCollection(null);
    setSelectedBundle(null);
    setActiveCategory('All');
    setSearchQuery('');
  };

  const handleTrendingSearch = (term: string) => {
    setSearchQuery(term);
    setSearchFocused(false);
  };

  const savedHabitDetails = useMemo(() => {
    return savedHabits.map(sh => {
      const community = COMMUNITY_HABITS.find(ch => ch.id === sh.communityHabitId);
      return { saved: sh, community };
    }).filter((item): item is { saved: typeof savedHabits[number]; community: CommunityHabit } => !!item.community);
  }, [savedHabits]);

  const isShowingFiltered = selectedCollection || selectedBundle || activeCategory !== 'All' || searchQuery.length > 0;
  const showHomeContent = !isShowingFiltered;
  const showTrending = searchFocused && searchQuery.length === 0;

  const bgColor = isDark ? '#0A0A18' : '#F5F6FA';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TabWalkthrough tabName="discover" />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Animated.View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 8,
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 0],
            })
          }],
          backgroundColor: bgColor,
        }
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleRow}>
              <View style={styles.headerTitleGroup}>
                <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Discover</Text>
                <Text style={[styles.headerSubtitle, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>
                  Explore habits that transform your life
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.savedBadge, { 
                backgroundColor: showSavedList ? '#007AFF' : (isDark ? '#161628' : '#FFFFFF'),
                borderColor: showSavedList ? '#007AFF' : (isDark ? '#1F1F34' : '#E5E5EA'),
              }]}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSavedList(prev => !prev);
                if (!showSavedList) {
                  setSelectedCollection(null);
                  setSelectedBundle(null);
                  setSearchQuery('');
                  setSearchFocused(false);
                }
              }}
            >
              <Bookmark size={13} color={showSavedList ? '#FFFFFF' : '#007AFF'} fill={showSavedList ? '#FFFFFF' : '#007AFF'} />
              <Text style={[styles.savedBadgeText, showSavedList && { color: '#FFFFFF' }]}>{savedCount}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.searchContainer, 
            { 
              backgroundColor: isDark ? '#161628' : '#FFFFFF',
              borderColor: searchFocused ? '#007AFF' : (isDark ? '#1F1F34' : '#E8E8EC'),
            }
          ]}>
            <Search size={17} color={searchFocused ? '#007AFF' : (isDark ? '#5A5A6E' : '#C7C7CC')} />
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}
              placeholder="Search habits, categories, tags..."
              placeholderTextColor={isDark ? '#3A3A4E' : '#C7C7CC'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={[styles.searchClearBtn, { backgroundColor: isDark ? '#2A2A3E' : '#E5E5EA' }]}
              >
                <X size={12} color={isDark ? '#8B8B9E' : '#8E8E93'} />
              </TouchableOpacity>
            )}
          </View>

          {showTrending && (
            <View style={styles.trendingContainer}>
              <View style={styles.trendingHeader}>
                <TrendingUp size={12} color={isDark ? '#5A5A6E' : '#C7C7CC'} />
                <Text style={[styles.trendingLabel, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>TRENDING SEARCHES</Text>
              </View>
              <View style={styles.trendingChips}>
                {TRENDING_SEARCHES.map((term, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.trendingChip, { 
                      backgroundColor: isDark ? '#161628' : '#FFFFFF',
                      borderColor: isDark ? '#1F1F34' : '#E8E8EC',
                    }]}
                    onPress={() => handleTrendingSearch(term)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.trendingChipText, { color: isDark ? '#A0A0B0' : '#3C3C43' }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {showSavedList && (
        <View style={[styles.filterHeader, {
          backgroundColor: isDark ? '#0F0F20' : '#FFFFFF',
          borderBottomColor: isDark ? '#1F1F34' : '#E8E8EC',
        }]}>
          <View style={styles.filterInfo}>
            <Text style={[styles.filterTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>My Habits</Text>
            <Text style={[styles.filterCount, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{savedCount} saved</Text>
          </View>
          <TouchableOpacity
            style={[styles.clearFilterBtn, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}
            onPress={() => setShowSavedList(false)}
            activeOpacity={0.7}
          >
            <X size={14} color={isDark ? '#A0A0B0' : '#8E8E93'} />
            <Text style={[styles.clearFilterText, { color: isDark ? '#A0A0B0' : '#8E8E93' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSavedList && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {savedHabitDetails.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#161628' : '#F0F4FF' }]}>
                <Bookmark size={28} color={isDark ? '#3A3A4E' : '#C7C7CC'} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>No saved habits yet</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>Browse and add habits to see them here</Text>
            </View>
          ) : (
            savedHabitDetails.map(({ saved, community }) => {
              return (
                <TouchableOpacity
                  key={saved.id}
                  style={[styles.habitCard, {
                    backgroundColor: isDark ? '#161628' : '#FFFFFF',
                    borderColor: isDark ? '#1F1F34' : '#F0F0F2',
                    borderWidth: 1,
                  }]}
                  activeOpacity={0.7}
                  onPress={() => handleHabitPress(community)}
                >
                  <View style={styles.habitCardInner}>
                    <View style={styles.habitCardRow}>
                      <View style={[styles.habitIconBg, { backgroundColor: (community.color || '#007AFF') + '18' }]}>
                        {getHabitIcon(community.icon || 'sparkles', 18, (community.color || '#007AFF'))}
                      </View>
                      <View style={styles.habitCardContent}>
                        <View style={styles.habitCardHeader}>
                          <Text style={[styles.habitName, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]} numberOfLines={1}>{community.name}</Text>
                        </View>
                        {community.description ? (
                          <Text style={[styles.habitDescription, { color: isDark ? '#6E6E82' : '#8E8E93' }]} numberOfLines={2}>{community.description}</Text>
                        ) : null}
                        <View style={styles.habitMeta}>
                          <View style={[styles.metaPillSmall, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}>
                            <Clock size={10} color={isDark ? '#5A5A6E' : '#8E8E93'} />
                            <Text style={[styles.metaPillSmallText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>
                              {getFrequencyText(community.frequency?.days || [])}
                            </Text>
                          </View>
                          {community.category ? (
                            <View style={[styles.metaPillSmall, { backgroundColor: isDark ? '#1F1F34' : '#F5F5F7' }]}>
                              <Text style={[styles.metaPillSmallText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>
                                {community.category}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: '#FF3B30' + '15' }]}
                        onPress={() => {
                          Alert.alert(
                            'Remove Habit?',
                            `Remove "${community.name}" from your routine?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => {
                                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  removeSavedHabit(community.id);
                                },
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {!showSavedList && isShowingFiltered && (
        <View style={[styles.filterHeader, { 
          backgroundColor: isDark ? '#0F0F20' : '#FFFFFF',
          borderBottomColor: isDark ? '#1F1F34' : '#E8E8EC',
        }]}>
          <View style={styles.filterInfo}>
            <Text style={[styles.filterTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>
              {selectedCollection?.name || selectedBundle?.name || activeCategory}
            </Text>
            <Text style={[styles.filterCount, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{filteredHabits.length} habits</Text>
          </View>
          <TouchableOpacity 
            style={[styles.clearFilterBtn, { 
              backgroundColor: isDark ? '#1F1F34' : '#F5F5F7',
            }]} 
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <X size={14} color={isDark ? '#A0A0B0' : '#8E8E93'} />
            <Text style={[styles.clearFilterText, { color: isDark ? '#A0A0B0' : '#8E8E93' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showSavedList && !isShowingFiltered && !showTrending && (
        <View style={styles.categoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {HABIT_CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip, 
                    { 
                      backgroundColor: isDark ? '#161628' : '#fff',
                      borderColor: isActive ? '#007AFF' : (isDark ? '#1F1F34' : '#E8E8EC'),
                    },
                    isActive && styles.categoryChipActive
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat.key);
                    setSelectedCollection(null);
                    setSelectedBundle(null);
                  }}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#007AFF', '#0055DD']}
                      style={styles.categoryChipGradient}
                    >
                      {(() => { const ci = CATEGORY_ICONS[cat.key]; const CatIcon = ci?.icon || Target; return <CatIcon size={14} color="#fff" />; })()}
                      <Text style={styles.categoryTextActive}>{cat.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.categoryChipInner}>
                      {(() => { const ci = CATEGORY_ICONS[cat.key]; const CatIcon = ci?.icon || Target; return <CatIcon size={14} color={ci?.color || '#8E8E93'} />; })()}
                      <Text style={[styles.categoryText, { color: isDark ? '#8B8B9E' : '#3C3C43' }]}>{cat.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!showSavedList && <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {showHomeContent && (
          <>
            {spotlightHabit && (
              <AnimatedSection delay={0}>
                <View style={styles.spotlightSection}>
                  <SpotlightCard
                    habit={spotlightHabit}
                    onPress={() => handleHabitPress(spotlightHabit)}
                    onAdd={() => handleToggleHabit(spotlightHabit)}
                    isAdded={isHabitSaved(spotlightHabit.id)}
                    isDark={isDark}
                  />
                </View>
              </AnimatedSection>
            )}

            {forYouHabits.length > 0 && (
              <AnimatedSection delay={100}>
                <View style={styles.section}>
                  <SectionHeader
                    icon={<Sparkles size={14} color="#AF52DE" />}
                    iconColor="#AF52DE"
                    iconBg="#AF52DE12"
                    title="For You"
                    subtitle="Personalised picks"
                    isDark={isDark}
                  />
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.heroScroll}
                    decelerationRate="fast"
                    snapToInterval={HERO_CARD_WIDTH + 12}
                    snapToAlignment="start"
                  >
                    {forYouHabits.slice(0, 6).map((habit, index) => (
                      <HeroCard
                        key={habit.id}
                        habit={habit}
                        index={index}
                        onPress={() => handleHabitPress(habit)}
                        onAdd={() => handleToggleHabit(habit)}
                        isAdded={isHabitSaved(habit.id)}
                        isDark={isDark}
                      />
                    ))}
                  </ScrollView>
                </View>
              </AnimatedSection>
            )}

            <AnimatedSection delay={200}>
              <View style={styles.section}>
                <SectionHeader
                  icon={<Target size={14} color="#007AFF" />}
                  iconColor="#007AFF"
                  iconBg="#007AFF12"
                  title="Collections"
                  subtitle="Curated for you"
                  isDark={isDark}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionsScroll}>
                  {CURATED_COLLECTIONS.slice(0, 6).map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onPress={() => handleCollectionPress(collection)}
                      count={getCollectionHabits(collection).length}
                      isDark={isDark}
                    />
                  ))}
                </ScrollView>
              </View>
            </AnimatedSection>

            <GradientDivider isDark={isDark} />

            <AnimatedSection delay={300}>
              <View style={styles.section}>
                <SectionHeader
                  icon={<Zap size={14} color="#FF9500" />}
                  iconColor="#FF9500"
                  iconBg="#FF950012"
                  title="Habit Stacks"
                  subtitle="Powerful combinations"
                  isDark={isDark}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bundlesScroll}>
                  {HABIT_BUNDLES.map((bundle) => (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      onPress={() => handleBundlePress(bundle)}
                      isAnyAdded={bundle.habitIds.some(id => isHabitSaved(id))}
                      isDark={isDark}
                    />
                  ))}
                </ScrollView>
              </View>
            </AnimatedSection>

            {recentlyViewedHabits.length > 0 && (
              <AnimatedSection delay={400}>
                <View style={styles.section}>
                  <SectionHeader
                    icon={<Eye size={14} color={isDark ? '#6B6B80' : '#8E8E93'} />}
                    iconColor={isDark ? '#6B6B80' : '#8E8E93'}
                    iconBg={isDark ? '#1F1F34' : '#F0F0F3'}
                    title="Recently Viewed"
                    subtitle="Pick up where you left off"
                    isDark={isDark}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
                    {recentlyViewedHabits.map((habit) => (
                      <RecentCard
                        key={habit.id}
                        habit={habit}
                        onPress={() => handleHabitPress(habit)}
                        isAdded={isHabitSaved(habit.id)}
                        isDark={isDark}
                      />
                    ))}
                  </ScrollView>
                </View>
              </AnimatedSection>
            )}

            <GradientDivider isDark={isDark} />
          </>
        )}

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View>
              <Text style={[styles.listTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>
                {selectedCollection?.name || selectedBundle?.name || (activeCategory === 'All' ? 'All Habits' : activeCategory)}
              </Text>
              <Text style={[styles.listCount, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>{filteredHabits.length} habits available</Text>
            </View>
          </View>

          {filteredHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#161628' : '#F5F5F7' }]}>
                <Search size={28} color={isDark ? '#3A3A4E' : '#C7C7CC'} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? '#E8E8F0' : '#1A1A2E' }]}>No habits found</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#5A5A6E' : '#8E8E93' }]}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            filteredHabits.map((habit) => (
              <CompactHabitCard 
                key={habit.id} 
                habit={habit}
                onAdd={handleToggleHabit}
                onPress={handleHabitPress}
                isAlreadyAdded={isHabitSaved(habit.id)}
                isDark={isDark}
              />
            ))
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>}

      <HabitDetailModal
        visible={modalVisible}
        habit={selectedHabit}
        onClose={handleCloseModal}
        onAdd={handleToggleHabit}
        isAdded={selectedHabit ? isHabitSaved(selectedHabit.id) : false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 6,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1.2,
  },
  headerSubtitle: {
    fontSize: 14,
    letterSpacing: -0.1,
    marginTop: 3,
    fontWeight: '400' as const,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
  },
  savedBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingContainer: {
    marginTop: 14,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  trendingLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
  },
  trendingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  trendingChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  categoryBar: {
    paddingBottom: 6,
    paddingTop: 8,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  categoryChipActive: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
  },
  categoryEmojiText: {
    fontSize: 13,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  categoryTextActive: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterInfo: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  filterCount: {
    fontSize: 13,
    marginTop: 2,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  spotlightSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  spotlightOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  spotlightGradient: {
    borderRadius: 22,
    minHeight: 200,
  },
  spotlightGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  spotlightContent: {
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 200,
  },
  spotlightTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  spotlightBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1.2,
  },
  spotlightMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 14,
  },
  spotlightEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightEmojiRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotlightEmoji: {
    fontSize: 32,
  },
  spotlightTextWrap: {
    flex: 1,
  },
  spotlightCategory: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  spotlightName: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  spotlightDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
    marginTop: 3,
  },
  spotlightFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  spotlightFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  spotlightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  spotlightStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  spotlightStatText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  spotlightStatDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  spotlightAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  spotlightAddBtnActive: {
    backgroundColor: '#34C759',
  },
  spotlightAddText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '400' as const,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heroScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heroCardOuter: {
    width: HERO_CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroCardGradient: {
    width: '100%',
    height: 170,
    borderRadius: 20,
  },
  heroPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 20,
  },
  heroCardOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTopRight: {
    flexDirection: 'row',
    gap: 6,
  },
  heroCategoryPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroCategoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  heroTrendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  heroTrendingText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEmojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 26,
  },
  heroTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroMetaPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500' as const,
  },
  heroAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  heroAddBtnActive: {
    backgroundColor: '#34C759',
  },
  collectionsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  collectionCard: {
    width: 140,
    borderRadius: 18,
    overflow: 'hidden',
  },
  collectionGradientBg: {
    padding: 14,
    borderRadius: 18,
    height: 165,
    justifyContent: 'flex-start',
    borderWidth: 1,
  },
  collectionEmojiWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  collectionEmoji: {
    fontSize: 24,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 19,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  collectionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto' as const,
  },
  collectionCount: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  collectionArrow: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bundlesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  bundleCard: {
    width: 230,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6,
  },
  bundleGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -70,
    right: -60,
    opacity: 0.18,
  },
  bundleGlow2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -70,
    left: -40,
    opacity: 0.1,
  },
  bundleGradientStrip: {
    height: 4,
    width: '100%',
  },
  bundleBody: {
    padding: 16,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bundleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  bundleIconInner: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bundleEmoji: {
    fontSize: 22,
  },
  bundleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bundleAddedBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bundleHabitCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  bundleName: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 5,
    letterSpacing: -0.4,
  },
  bundleDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  bundleBenefitsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  benefitText: {
    fontSize: 10,
    fontWeight: '500' as const,
    maxWidth: 80,
  },
  bundleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bundleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bundleMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  bundleDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bundleDifficultyText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  bundleHabitCountText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  recentScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  recentCard: {
    alignItems: 'center',
    width: 78,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recentIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentEmoji: {
    fontSize: 24,
  },
  recentName: {
    fontSize: 11,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  recentAddedDot: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
  },
  gradientDividerWrap: {
    paddingHorizontal: 40,
    marginTop: 24,
    marginBottom: 4,
  },
  gradientDivider: {
    height: 1,
  },
  listSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  listCount: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '400' as const,
  },
  habitCard: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  habitCardInner: {
    flex: 1,
    padding: 14,
  },
  habitCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  habitIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  habitIconEmoji: {
    fontSize: 22,
  },
  habitCardContent: {
    flex: 1,
    marginRight: 10,
  },
  habitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  miniTrendingBadge: {
    width: 20,
    height: 20,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  addedTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  habitDescription: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  metaPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaPillSmallText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  habitCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  footerTags: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
  },
});
