import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Goal,
  Heart,
  Palette,
  Shield,
  SlidersHorizontal,
  Trophy,
  UserRound,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { OP_DOMAIN, OP_LAYOUT, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import {
  ListRow,
  PageHeader,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '@/components/ui/OnePagerUI';

export default function YouPrimaryV2() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, isGuest } = useAuth();
  const { profile } = useUserProfile();

  const displayName = profile?.name?.trim() || (isGuest ? 'Guest' : user?.email?.split('@')[0] || 'You');
  const initial = displayName.slice(0, 1).toUpperCase();
  const interests = profile?.interests ?? [];
  const goals = profile?.identityGoals ?? [];
  const teams = (profile?.favoriteTeams?.length ?? 0) + (profile?.favoriteNBATeams?.length ?? 0);

  const identityLine = useMemo(() => {
    const parts: string[] = [];
    if (profile?.chronotype) parts.push(profile.chronotype.replace(/[-_]/g, ' '));
    if (interests.length) parts.push(`${interests.length} interests`);
    if (teams) parts.push(`${teams} teams`);
    return parts.join(' · ') || 'Shape what One Pager understands about you.';
  }, [profile?.chronotype, interests.length, teams]);

  const openProfile = () => router.push('/(tabs)/profile' as never);

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
        eyebrow="You"
        title="The person behind the context."
        subtitle="Identity, preferences and controls that help One Pager make better decisions for you."
      />

      <SurfaceCard variant="hero" style={styles.identityCard}>
        <View style={styles.identityTop}>
          <View style={[styles.avatar, { backgroundColor: isDark ? `${colors.primary}25` : `${colors.primary}12` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
          </View>
          <StatusPill label={isGuest ? 'Guest' : 'Your identity'} tone="info" />
        </View>
        <View>
          <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>{displayName}</Text>
          {!isGuest && user?.email ? <Text style={[OP_TYPE.meta, styles.email, { color: colors.textSecondary }]}>{user.email}</Text> : null}
          <Text style={[OP_TYPE.body, styles.identityMeta, { color: colors.textSecondary }]}>{identityLine}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={[styles.statValue, { color: colors.text }]}>{interests.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>interests</Text></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}><Text style={[styles.statValue, { color: colors.text }]}>{teams}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>teams</Text></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}><Text style={[styles.statValue, { color: colors.text }]}>{goals.length}</Text><Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>goals</Text></View>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="What shapes your One Pager" subtitle="The strongest inputs behind personalisation." />
        <SurfaceCard variant="list">
          <ListRow
            icon={<Heart size={18} color={colors.primary} />}
            eyebrow="Interests"
            title={interests.length ? interests.slice(0, 4).join(' · ') : 'Choose what you care about'}
            detail={interests.length > 4 ? `+${interests.length - 4} more interests` : 'Used as a starting signal, then behaviour takes over.'}
            onPress={openProfile}
          />
          <ListRow
            icon={<Trophy size={18} color={OP_DOMAIN.sports} />}
            eyebrow="Sport"
            title={teams ? `${teams} team${teams === 1 ? '' : 's'} followed` : 'No teams followed yet'}
            detail="Fixtures and sport moments can surface in Today and Discover."
            accent={OP_DOMAIN.sports}
            onPress={openProfile}
            divided
          />
          <ListRow
            icon={<Goal size={18} color={OP_DOMAIN.routines} />}
            eyebrow="Direction"
            title={goals[0] ?? 'Add an identity goal'}
            detail={goals.length > 1 ? `${goals.length} goals shaping longer-term context` : 'Goals help My Life understand what you are building toward.'}
            accent={OP_DOMAIN.routines}
            onPress={openProfile}
            divided
          />
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Controls" subtitle="Keep the main tab calm; deeper settings live one level down." />
        <SurfaceCard variant="list">
          <ListRow icon={<SlidersHorizontal size={18} color={colors.primary} />} title="Profile & preferences" detail="Interests, teams, nationality, personalisation and app behaviour." onPress={openProfile} />
          <ListRow icon={<Bell size={18} color={colors.primary} />} title="Notifications" detail="Choose which interruptions are genuinely worth receiving." onPress={openProfile} divided />
          <ListRow icon={<Palette size={18} color={colors.primary} />} title="Appearance" detail="Theme and display preferences." onPress={openProfile} divided />
          <ListRow icon={<Shield size={18} color={colors.primary} />} title="Account, privacy & data" detail="Security, social controls, cloud data and account actions." onPress={openProfile} divided />
        </SurfaceCard>
      </View>

      {goals.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Your goals" subtitle="Direction that should influence My Life and future recommendations." />
          <SurfaceCard variant="list">
            {goals.slice(0, 4).map((goal, index) => (
              <ListRow key={`${goal}-${index}`} icon={<Goal size={18} color={OP_DOMAIN.routines} />} title={goal} divided={index > 0} />
            ))}
          </SurfaceCard>
        </View>
      ) : null}

      <SurfaceCard variant="list">
        <ListRow
          icon={<UserRound size={18} color={colors.primary} />}
          title="Open all settings"
          detail="Account, notifications, social, appearance, achievements and advanced controls."
          onPress={openProfile}
        />
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: OP_SPACING.sm },
  identityCard: { gap: OP_SPACING.md },
  identityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  avatar: { width: 54, height: 54, borderRadius: OP_RADIUS.card, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...OP_TYPE.heroTitle, fontSize: 22, lineHeight: 27 },
  email: { marginTop: 3 },
  identityMeta: { marginTop: OP_SPACING.xs },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1 },
  statValue: { ...OP_TYPE.cardTitle, fontSize: 20, lineHeight: 24 },
  divider: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: OP_SPACING.sm },
});
