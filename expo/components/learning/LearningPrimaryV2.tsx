import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BookOpen, CheckCircle2, Clock3, Goal, GraduationCap, PauseCircle } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAppSafe } from '@/hooks/useHabitsStore';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { OP_DOMAIN, OP_LAYOUT, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import {
  ActionButton,
  ListRow,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/ui/OnePagerUI';
import type { Book } from '@/types/habit';

function bookProgress(book: Book) {
  if (book.status === 'Completed') return 100;
  if (!book.totalPages || book.totalPages <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)));
}

function bookStatusIcon(book: Book) {
  if (book.status === 'Completed') return CheckCircle2;
  if (book.status === 'Paused') return PauseCircle;
  if (book.status === 'Want to Read') return Clock3;
  return BookOpen;
}

function statusTone(status: Book['status']): 'positive' | 'warning' | 'info' | 'neutral' {
  if (status === 'Completed') return 'positive';
  if (status === 'Paused') return 'warning';
  if (status === 'Reading') return 'info';
  return 'neutral';
}

function BookRow({ book, divided }: { book: Book; divided?: boolean }) {
  const { colors, isDark } = useTheme();
  const Icon = bookStatusIcon(book);
  const progress = bookProgress(book);
  return (
    <View style={[styles.bookRow, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCover, styles.bookFallback, { backgroundColor: isDark ? colors.surfaceSecondary : '#F2F4F7' }]}>
          <Icon size={19} color={OP_DOMAIN.learning} />
        </View>
      )}
      <View style={styles.bookCopy}>
        <View style={styles.bookTopline}>
          <Text style={[OP_TYPE.eyebrow, { color: OP_DOMAIN.learning }]}>{book.status.toUpperCase()}</Text>
          <StatusPill label={progress ? `${progress}%` : book.status} tone={statusTone(book.status)} accent={OP_DOMAIN.learning} />
        </View>
        <Text style={[OP_TYPE.cardTitle, styles.bookTitle, { color: colors.text }]} numberOfLines={2}>{book.title}</Text>
        <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]} numberOfLines={1}>{book.author}</Text>
        {book.status === 'Reading' && book.totalPages ? (
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surfaceSecondary : '#EEF1F5' }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: OP_DOMAIN.learning }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function LearningPrimaryV2() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile } = useUserProfile();
  const app = useAppSafe();

  const books = profile?.favoriteBooks ?? [];
  const reading = useMemo(() => books.filter((book) => book.status === 'Reading'), [books]);
  const wantToRead = useMemo(() => books.filter((book) => book.status === 'Want to Read'), [books]);
  const completedBooks = useMemo(() => books.filter((book) => book.status === 'Completed'), [books]);
  const learningActivities = useMemo(
    () => app.activities.filter((activity) => activity.category === 'Learning'),
    [app.activities],
  );
  const activeLearning = useMemo(
    () => learningActivities.filter((activity) => activity.status === 'In Progress'),
    [learningActivities],
  );
  const completedLearning = useMemo(
    () => learningActivities.filter((activity) => activity.status === 'Completed'),
    [learningActivities],
  );
  const goals = profile?.identityGoals ?? [];
  const focusBook = reading[0] ?? null;
  const focusActivity = activeLearning[0] ?? null;

  const totalLearningMinutes = learningActivities.reduce((sum, activity) => sum + (activity.timeSpent ?? 0), 0);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: OP_LAYOUT.screenPadding,
        paddingTop: insets.top + OP_SPACING.md,
        paddingBottom: floatingTabBarScrollPadding(insets.bottom),
        gap: OP_LAYOUT.sectionGap,
      }}
    >
      <PageHeader
        eyebrow="Learning"
        title="Keep what you’re learning in motion."
        subtitle="Real books, learning projects and direction from your One Pager — no sample dashboard data."
        right={<View style={[styles.headerIcon, { backgroundColor: isDark ? `${OP_DOMAIN.learning}22` : `${OP_DOMAIN.learning}11` }]}><GraduationCap size={20} color={OP_DOMAIN.learning} /></View>}
      />

      <SurfaceCard variant="hero" style={styles.hero}>
        <View style={styles.heroTop}>
          <StatusPill label={focusBook || focusActivity ? 'In progress' : 'Ready when you are'} tone={focusBook || focusActivity ? 'info' : 'neutral'} accent={OP_DOMAIN.learning} />
          <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>{totalLearningMinutes} min logged</Text>
        </View>
        {focusBook ? (
          <>
            <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>{focusBook.title}</Text>
            <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>{focusBook.author} · {bookProgress(focusBook)}% read</Text>
            <View style={[styles.heroProgressTrack, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8EDF4' }]}>
              <View style={[styles.heroProgressFill, { width: `${bookProgress(focusBook)}%`, backgroundColor: OP_DOMAIN.learning }]} />
            </View>
          </>
        ) : focusActivity ? (
          <>
            <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>{focusActivity.title}</Text>
            <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>{focusActivity.timeSpent} minutes invested so far{focusActivity.description ? ` · ${focusActivity.description}` : ''}</Text>
          </>
        ) : (
          <>
            <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>Nothing active right now.</Text>
            <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>Add a book or learning goal when there is something you genuinely want to keep moving.</Text>
          </>
        )}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Text style={[styles.heroValue, { color: colors.text }]}>{reading.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>reading</Text></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.heroStat}><Text style={[styles.heroValue, { color: colors.text }]}>{wantToRead.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>want to read</Text></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.heroStat}><Text style={[styles.heroValue, { color: colors.text }]}>{completedBooks.length + completedLearning.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>completed</Text></View>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Your books" subtitle="What you are reading, saving and finishing." actionLabel="Manage" onAction={() => router.push('/(tabs)/profile' as never)} />
        {books.length > 0 ? (
          <SurfaceCard variant="list">
            {[...reading, ...wantToRead, ...books.filter((book) => book.status === 'Paused'), ...completedBooks]
              .slice(0, 8)
              .map((book, index) => <BookRow key={book.id} book={book} divided={index > 0} />)}
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <Text style={[OP_TYPE.cardTitle, { color: colors.text }]}>No books saved yet</Text>
            <Text style={[OP_TYPE.body, styles.emptyText, { color: colors.textSecondary }]}>Keep this quiet until there is something you actually want to read.</Text>
            <View style={styles.emptyAction}><ActionButton label="Manage books" kind="secondary" onPress={() => router.push('/(tabs)/profile' as never)} /></View>
          </SurfaceCard>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Learning projects" subtitle="Longer learning efforts you are actively tracking." />
        {learningActivities.length > 0 ? (
          <SurfaceCard variant="list">
            {learningActivities
              .sort((a, b) => {
                const rank = { 'In Progress': 0, 'Not Started': 1, Completed: 2 } as const;
                return rank[a.status] - rank[b.status];
              })
              .slice(0, 6)
              .map((activity, index) => (
                <ListRow
                  key={activity.id}
                  icon={<GraduationCap size={18} color={OP_DOMAIN.learning} />}
                  eyebrow={activity.status}
                  title={activity.title}
                  detail={`${activity.timeSpent} min logged${activity.description ? ` · ${activity.description}` : ''}`}
                  accent={OP_DOMAIN.learning}
                  divided={index > 0}
                />
              ))}
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <Text style={[OP_TYPE.cardTitle, { color: colors.text }]}>No learning projects in motion</Text>
            <Text style={[OP_TYPE.body, styles.emptyText, { color: colors.textSecondary }]}>That is better than filling the page with pretend courses. Learning will become richer as real activity is added.</Text>
          </SurfaceCard>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Direction" subtitle="Goals can tell One Pager what kinds of learning are worth recommending." actionLabel="Manage" onAction={() => router.push('/(tabs)/profile' as never)} />
        <SurfaceCard variant="list">
          {goals.length > 0 ? goals.slice(0, 4).map((goal, index) => (
            <ListRow key={`${goal}-${index}`} icon={<Goal size={18} color={OP_DOMAIN.learning} />} title={goal} divided={index > 0} />
          )) : (
            <ListRow icon={<Goal size={18} color={OP_DOMAIN.learning} />} title="Add a goal" detail="Give future learning recommendations some direction." onPress={() => router.push('/(tabs)/profile' as never)} />
          )}
        </SurfaceCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerIcon: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: OP_SPACING.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  heroProgressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 4 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1 },
  heroValue: { ...OP_TYPE.cardTitle, fontSize: 20, lineHeight: 24 },
  divider: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: OP_SPACING.sm },
  section: { gap: OP_SPACING.sm },
  bookRow: { minHeight: 98, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookCover: { width: 52, height: 76, borderRadius: 9 },
  bookFallback: { alignItems: 'center', justifyContent: 'center' },
  bookCopy: { flex: 1, minWidth: 0 },
  bookTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bookTitle: { marginTop: 5 },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  emptyText: { marginTop: OP_SPACING.xs },
  emptyAction: { alignSelf: 'flex-start', marginTop: OP_SPACING.sm },
});
