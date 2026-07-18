import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import {
  Search,
  Clock,
  ChevronRight,
  Plus,
  Check,
  X,
  Bookmark,
  Target,
  Star,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { KeyboardAvoidingScreen } from '@/components/KeyboardAvoidingScreen';



interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
  currentPage: number;
  category: string;
  rating?: number;
}

interface Course {
  id: string;
  title: string;
  platform: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  image: string;
  category: string;
  duration: string;
}

interface DailyChallenge {
  id: string;
  type: 'trivia' | 'word' | 'quote';
  title: string;
  content: string;
  source?: string;
  completed: boolean;
}

interface LearningGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  emoji: string;
  color: string;
}

const MOCK_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Atomic Habits',
    author: 'James Clear',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300',
    totalPages: 320,
    currentPage: 187,
    category: 'Self-Improvement',
  },
  {
    id: '2',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300',
    totalPages: 499,
    currentPage: 112,
    category: 'Psychology',
  },
  {
    id: '3',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    cover: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=300',
    totalPages: 443,
    currentPage: 443,
    category: 'History',
    rating: 4.8,
  },
  {
    id: '4',
    title: 'Deep Work',
    author: 'Cal Newport',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300',
    totalPages: 296,
    currentPage: 45,
    category: 'Productivity',
  },
];

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Machine Learning Fundamentals',
    platform: 'Coursera',
    progress: 0.65,
    totalLessons: 24,
    completedLessons: 16,
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400',
    category: 'Technology',
    duration: '6 weeks',
  },
  {
    id: '2',
    title: 'Spanish for Beginners',
    platform: 'Duolingo',
    progress: 0.42,
    totalLessons: 50,
    completedLessons: 21,
    image: 'https://images.unsplash.com/photo-1551279880-03041531948f?w=400',
    category: 'Language',
    duration: '3 months',
  },
  {
    id: '3',
    title: 'Financial Markets',
    platform: 'Yale Online',
    progress: 0.28,
    totalLessons: 18,
    completedLessons: 5,
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    category: 'Finance',
    duration: '8 weeks',
  },
];

const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: '1',
    type: 'word',
    title: 'Word of the Day',
    content: 'Serendipity',
    source: 'The occurrence of events by chance in a happy way',
    completed: false,
  },
  {
    id: '2',
    type: 'quote',
    title: 'Daily Quote',
    content: '"The only true wisdom is in knowing you know nothing."',
    source: 'Socrates',
    completed: false,
  },
  {
    id: '3',
    type: 'trivia',
    title: 'Quick Trivia',
    content: 'What percentage of the ocean floor has been explored?',
    source: 'Only about 5%',
    completed: false,
  },
];

const LEARNING_GOALS: LearningGoal[] = [
  { id: '1', title: 'Read', target: 30, current: 22, unit: 'min/day', emoji: '📖', color: '#3B82F6' },
  { id: '2', title: 'Courses', target: 5, current: 3, unit: 'lessons/week', emoji: '🎯', color: '#10B981' },
  { id: '3', title: 'Streak', target: 30, current: 12, unit: 'days', emoji: '🔥', color: '#F59E0B' },
];

const QUICK_STATS = [
  { label: 'Books Read', value: '7', emoji: '📚' },
  { label: 'Hours Learned', value: '48', emoji: '⏱️' },
  { label: 'Day Streak', value: '12', emoji: '🔥' },
];



const RECOMMENDED_ARTICLES = [
  {
    id: '1',
    title: 'How Spaced Repetition Supercharges Memory',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
    tag: 'Science',
  },
  {
    id: '2',
    title: 'The Feynman Technique: Learn Anything Fast',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    tag: 'Study Tips',
  },
  {
    id: '3',
    title: '10 Books Every Lifelong Learner Should Read',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    tag: 'Reading',
  },
];

export default function LearningScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [books] = useState<Book[]>(MOCK_BOOKS);
  const [courses] = useState<Course[]>(MOCK_COURSES);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>(DAILY_CHALLENGES);
  const [showChallengeAnswer, setShowChallengeAnswer] = useState<Record<string, boolean>>({});

  const headerScale = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerScale, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [headerScale]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleChallengeComplete = useCallback((challengeId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDailyChallenges(prev =>
      prev.map(c => c.id === challengeId ? { ...c, completed: !c.completed } : c)
    );
  }, []);

  const toggleChallengeAnswer = useCallback((challengeId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowChallengeAnswer(prev => ({ ...prev, [challengeId]: !prev[challengeId] }));
  }, []);

  const completedChallenges = useMemo(
    () => dailyChallenges.filter(c => c.completed).length,
    [dailyChallenges]
  );

  const accent = '#F59E0B';
  const accentLight = '#FEF3C7';

  const bg = isDark ? '#111014' : '#FDFBF7';
  const cardBg = isDark ? '#1E1C22' : '#FFFFFF';
  const cardBorder = isDark ? '#2E2C32' : '#F0ECE4';
  const subtleText = isDark ? '#9A9498' : '#8C8086';
  const mainText = isDark ? '#F5F0ED' : '#1E1218';
  const secondaryBg = isDark ? '#1A181E' : '#FAF6F0';

  return (
    <KeyboardAvoidingScreen>
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Animated.View style={[styles.headerContent, { transform: [{ scale: headerScale }] }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🎓</Text>
            <View>
              <Text style={[styles.headerTitle, { color: mainText }]}>Learning</Text>
              <Text style={[styles.headerSubtitle, { color: subtleText }]}>Keep growing every day</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.headerAction, { backgroundColor: isDark ? '#2E2C32' : accentLight }]}
            onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Bookmark size={20} color={accent} />
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Search size={18} color={subtleText} />
          <TextInput
            style={[styles.searchInput, { color: mainText }]}
            placeholder="Search books, courses, topics..."
            placeholderTextColor={subtleText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={subtleText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.statsRow}>
          {QUICK_STATS.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={[styles.statValue, { color: mainText }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: subtleText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🎯</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Daily Goals</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsScroll}>
            {LEARNING_GOALS.map((goal) => {
              const progress = goal.current / goal.target;
              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.goalTop}>
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <Text style={[styles.goalPercent, { color: goal.color }]}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  <Text style={[styles.goalTitle, { color: mainText }]}>{goal.title}</Text>
                  <Text style={[styles.goalMeta, { color: subtleText }]}>
                    {goal.current}/{goal.target} {goal.unit}
                  </Text>
                  <View style={[styles.goalProgressBg, { backgroundColor: isDark ? '#2A282E' : '#F0ECE4' }]}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        { backgroundColor: goal.color, width: `${Math.min(progress * 100, 100)}%` as any },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>⚡</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Daily Challenges</Text>
            </View>
            <View style={[styles.progressPill, { backgroundColor: isDark ? '#2E2C32' : accentLight }]}>
              <Text style={[styles.progressText, { color: accent }]}>
                {completedChallenges}/{dailyChallenges.length}
              </Text>
            </View>
          </View>

          {dailyChallenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={[styles.challengeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => toggleChallengeAnswer(challenge.id)}
              activeOpacity={0.8}
            >
              <View style={styles.challengeRow}>
                <View style={[
                  styles.challengeIcon,
                  {
                    backgroundColor: challenge.completed
                      ? (isDark ? '#1A2E1A' : '#E8F8E8')
                      : (isDark ? '#2A282E' : secondaryBg),
                  },
                ]}>
                  <Text style={styles.challengeIconText}>
                    {challenge.type === 'word' ? '💬' : challenge.type === 'quote' ? '💡' : '🧠'}
                  </Text>
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeType, { color: subtleText }]}>{challenge.title}</Text>
                  <Text style={[
                    styles.challengeContent,
                    { color: mainText },
                    challenge.completed && styles.challengeCompleted,
                  ]}>
                    {challenge.content}
                  </Text>
                  {showChallengeAnswer[challenge.id] && challenge.source && (
                    <Text style={[styles.challengeAnswer, { color: accent }]}>{challenge.source}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleChallengeComplete(challenge.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={[
                    styles.checkCircle,
                    {
                      backgroundColor: challenge.completed ? '#34C759' : 'transparent',
                      borderColor: challenge.completed ? '#34C759' : cardBorder,
                    },
                  ]}>
                    {challenge.completed && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>📚</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Currently Reading</Text>
            </View>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: accent }]}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksScroll}>
            {books.filter(b => b.currentPage < b.totalPages).map((book) => {
              const progress = book.currentPage / book.totalPages;
              return (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: book.cover }} style={styles.bookCover} />
                  <View style={styles.bookInfo}>
                    <Text style={[styles.bookTitle, { color: mainText }]} numberOfLines={2}>{book.title}</Text>
                    <Text style={[styles.bookAuthor, { color: subtleText }]} numberOfLines={1}>{book.author}</Text>
                    <View style={styles.bookProgressRow}>
                      <View style={[styles.bookProgressBg, { backgroundColor: isDark ? '#2A282E' : '#F0ECE4' }]}>
                        <View
                          style={[
                            styles.bookProgressFill,
                            { backgroundColor: accent, width: `${progress * 100}%` as any },
                          ]}
                        />
                      </View>
                      <Text style={[styles.bookPercent, { color: subtleText }]}>
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                    <Text style={[styles.bookPages, { color: subtleText }]}>
                      p.{book.currentPage} of {book.totalPages}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.addBookCard, { backgroundColor: isDark ? '#1A181E' : '#FAF6F0', borderColor: cardBorder }]}
              activeOpacity={0.7}
              onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.addBookIcon, { backgroundColor: isDark ? '#2E2C32' : accentLight }]}>
                <Plus size={22} color={accent} />
              </View>
              <Text style={[styles.addBookText, { color: subtleText }]}>Add Book</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {books.filter(b => b.currentPage >= b.totalPages).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>🏆</Text>
                <Text style={[styles.sectionTitle, { color: mainText }]}>Completed</Text>
              </View>
            </View>
            {books.filter(b => b.currentPage >= b.totalPages).map((book) => (
              <View
                key={book.id}
                style={[styles.completedBookCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              >
                <Image source={{ uri: book.cover }} style={styles.completedBookCover} />
                <View style={styles.completedBookInfo}>
                  <Text style={[styles.completedBookTitle, { color: mainText }]}>{book.title}</Text>
                  <Text style={[styles.completedBookAuthor, { color: subtleText }]}>{book.author}</Text>
                  <View style={styles.completedBookMeta}>
                    <View style={[styles.completedBadge, { backgroundColor: isDark ? '#1A2E1A' : '#E8F8E8' }]}>
                      <Check size={12} color="#34C759" strokeWidth={3} />
                      <Text style={styles.completedBadgeText}>Finished</Text>
                    </View>
                    {book.rating && (
                      <View style={styles.ratingBadge}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={[styles.ratingText, { color: mainText }]}>{book.rating}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🎓</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Active Courses</Text>
            </View>
            <Text style={[styles.resultCount, { color: subtleText }]}>{courses.length} courses</Text>
          </View>

          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={[styles.courseCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.85}
            >
              <Image source={{ uri: course.image }} style={styles.courseImage} />
              <View style={styles.courseInfo}>
                <View style={styles.courseTop}>
                  <View style={[styles.platformBadge, { backgroundColor: isDark ? '#2A282E' : secondaryBg }]}>
                    <Text style={[styles.platformText, { color: subtleText }]}>{course.platform}</Text>
                  </View>
                </View>
                <Text style={[styles.courseTitle, { color: mainText }]} numberOfLines={2}>{course.title}</Text>
                <View style={styles.courseMeta}>
                  <View style={styles.courseMetaItem}>
                    <Clock size={13} color={subtleText} />
                    <Text style={[styles.courseMetaText, { color: subtleText }]}>{course.duration}</Text>
                  </View>
                  <View style={styles.courseMetaItem}>
                    <Target size={13} color={subtleText} />
                    <Text style={[styles.courseMetaText, { color: subtleText }]}>
                      {course.completedLessons}/{course.totalLessons} lessons
                    </Text>
                  </View>
                </View>
                <View style={styles.courseProgressRow}>
                  <View style={[styles.courseProgressBg, { backgroundColor: isDark ? '#2A282E' : '#F0ECE4' }]}>
                    <View
                      style={[
                        styles.courseProgressFill,
                        { backgroundColor: '#10B981', width: `${course.progress * 100}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={[styles.coursePercent, { color: '#10B981' }]}>
                    {Math.round(course.progress * 100)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>📰</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Recommended</Text>
            </View>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: accent }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {RECOMMENDED_ARTICLES.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.85}
            >
              <Image source={{ uri: article.image }} style={styles.articleImage} />
              <View style={styles.articleInfo}>
                <View style={[styles.articleTag, { backgroundColor: isDark ? '#2A282E' : accentLight }]}>
                  <Text style={[styles.articleTagText, { color: accent }]}>{article.tag}</Text>
                </View>
                <Text style={[styles.articleTitle, { color: mainText }]} numberOfLines={2}>{article.title}</Text>
                <View style={styles.articleMeta}>
                  <Clock size={12} color={subtleText} />
                  <Text style={[styles.articleMetaText, { color: subtleText }]}>{article.readTime}</Text>
                </View>
              </View>
              <ChevronRight size={18} color={subtleText} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={[styles.tipCard, { backgroundColor: isDark ? '#1E1A22' : '#FFF8E8' }]}>
            <Text style={styles.tipEmoji}>🧠</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: mainText }]}>Learning Tip</Text>
              <Text style={[styles.tipText, { color: subtleText }]}>
                The best time to review new material is right before you sleep. Your brain consolidates memories during sleep, making bedtime review incredibly effective.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultCount: {
    fontSize: 13,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  goalsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  goalCard: {
    width: 140,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalEmoji: {
    fontSize: 24,
  },
  goalPercent: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  goalMeta: {
    fontSize: 11,
    marginBottom: 8,
  },
  goalProgressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  challengeCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconText: {
    fontSize: 22,
  },
  challengeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeType: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  challengeContent: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  challengeCompleted: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.5,
  },
  challengeAnswer: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  booksScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  bookCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bookCover: {
    width: '100%',
    height: 110,
  },
  bookInfo: {
    padding: 10,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 11,
    marginBottom: 8,
  },
  bookProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookProgressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bookProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bookPercent: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  bookPages: {
    fontSize: 10,
    marginTop: 4,
  },
  addBookCard: {
    width: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  addBookIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBookText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  completedBookCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  completedBookCover: {
    width: 52,
    height: 72,
    borderRadius: 8,
  },
  completedBookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  completedBookTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  completedBookAuthor: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  completedBookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  courseCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  courseImage: {
    width: '100%',
    height: 120,
  },
  courseInfo: {
    padding: 14,
  },
  courseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  platformText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  courseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  courseProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseProgressBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  courseProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  coursePercent: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  articleImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  articleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  articleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  articleTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  tipCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  tipEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
