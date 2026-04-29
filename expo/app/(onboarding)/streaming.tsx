import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, Tv } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import OnboardingProgress from '@/components/OnboardingProgress';
import { ONBOARDING } from '@/constants/onboardingTheme';
import { COLORS } from '@/constants/colors';
import { configureYounify, fetchYounifyServices } from '@/services/younify';

type YounifyService = {
  id?: string | number;
  name?: string;
  title?: string;
  connected?: boolean;
  isConnected?: boolean;
  active?: boolean;
  linked?: boolean;
  enabled?: boolean;
  status?: string;
  connectionStatus?: string;
  link?: { profileName?: string };
  [key: string]: unknown;
};

const TOTAL_STEPS = 6;

export default function OnboardingStreamingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [services, setServices] = useState<YounifyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingServiceId, setActingServiceId] = useState<string | null>(null);

  const getServiceIdentityKey = (item: YounifyService) =>
    String(item.id ?? item.serviceId ?? item.slug ?? `${item.name ?? ''}-${item.title ?? ''}`)
      .trim()
      .toLowerCase();

  const getServiceMatchKey = (item: YounifyService) =>
    String(item.id ?? `${item.name ?? ''}-${item.title ?? ''}`).trim().toLowerCase();

  const loadServices = async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);

      const connect = await configureYounify();
      const fetchedServices = await fetchYounifyServices();
      const list = (
        Array.isArray(fetchedServices)
          ? fetchedServices
          : Array.isArray((fetchedServices as { services?: YounifyService[] })?.services)
            ? (fetchedServices as { services: YounifyService[] }).services
            : []
      ) as YounifyService[];

      let linkedServices: YounifyService[] = [];
      try {
        const linkedResult = await connect.fetchLinkedServices(null);
        linkedServices = (
          Array.isArray(linkedResult)
            ? linkedResult
            : Array.isArray((linkedResult as { services?: YounifyService[] })?.services)
              ? (linkedResult as { services: YounifyService[] }).services
              : []
        ) as YounifyService[];
      } catch {
        /* non-fatal */
      }

      const linkedKeys = new Set(linkedServices.map((svc) => getServiceMatchKey(svc)));
      const merged: YounifyService[] = list.map((svc) => ({
        ...svc,
        linked: Boolean(svc.linked) || linkedKeys.has(getServiceMatchKey(svc)),
      }));

      setServices(merged);
    } catch (err) {
      console.error('[Onboarding streaming]', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadServices('initial');
  }, []);

  const isConnected = useCallback((item: YounifyService) => {
    const flags = [
      item.connected,
      item.isConnected,
      item.active,
      item.linked,
      item.enabled,
      Boolean(item.link),
      item.status === 'connected',
      item.connectionStatus === 'connected',
    ];
    return flags.some(Boolean);
  }, []);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => Number(isConnected(b)) - Number(isConnected(a))),
    [services, isConnected],
  );

  const connectedCount = useMemo(
    () => services.filter(isConnected).length,
    [services, isConnected],
  );

  const handleServiceAction = async (item: YounifyService) => {
    const serviceKey = getServiceIdentityKey(item);
    if (!serviceKey) {
      Alert.alert('Unavailable', 'This service cannot be identified right now.');
      return;
    }
    const connected = isConnected(item);
    try {
      setActingServiceId(serviceKey);
      const connect = await configureYounify();
      if (connected) {
        await connect.manageLinkedService(item as never, null);
      } else {
        const success = await connect.linkService(item as never, null);
        if (!success) return;
      }
      await loadServices('refresh');
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setActingServiceId(null);
    }
  };

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(onboarding)/chronotype' as any);
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: { item: YounifyService; index: number }) => {
      const label = item.name || item.title || `Service ${index + 1}`;
      const connected = isConnected(item);
      const serviceKey = getServiceIdentityKey(item);
      const isActing = actingServiceId === serviceKey;

      return (
        <View style={styles.serviceCard}>
          <View style={styles.serviceRow}>
            <View style={styles.serviceIconWrap}>
              <Tv size={20} color={COLORS.primary} />
            </View>
            <View style={styles.serviceMeta}>
              <Text style={styles.serviceName}>{label}</Text>
              <Text style={styles.serviceSub} numberOfLines={2}>
                {connected
                  ? item.link?.profileName
                    ? `Connected as ${item.link.profileName}`
                    : 'Linked to your account'
                  : 'Tap Connect to link your subscription'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.linkBtn,
                connected ? styles.linkBtnManage : styles.linkBtnPrimary,
                pressed && styles.pressed,
              ]}
              onPress={() => void handleServiceAction(item)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator size="small" color={connected ? COLORS.primary : '#FFF'} />
              ) : (
                <Text style={[styles.linkBtnText, connected ? styles.linkBtnTextManage : styles.linkBtnTextPrimary]}>
                  {connected ? 'Manage' : 'Connect'}
                </Text>
              )}
            </Pressable>
          </View>
          {connected ? (
            <View style={styles.connectedPill}>
              <Check size={12} color={COLORS.success} />
              <Text style={styles.connectedPillText}>Connected</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [actingServiceId, handleServiceAction, isConnected],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} accessibilityRole="button">
          <ArrowLeft size={20} color={ONBOARDING.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={2} totalSteps={TOTAL_STEPS} />
        </View>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.stepLabel}>STEP 2</Text>
        <Text style={styles.title}>Streaming services</Text>
        <Text style={styles.subtitle}>
          Link Netflix, Disney+, Prime Video, and more to sync Continue watching and personalised picks.
          You can skip and connect later in Profile → Streaming.
        </Text>
        {!loading && !error ? (
          <Text style={styles.countLine}>
            {connectedCount}/{services.length} connected
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Loading providers…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load services</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void loadServices('initial')}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedServices}
          keyExtractor={(item, index) => getServiceIdentityKey(item) || `svc-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadServices('refresh')} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No providers available right now. You can continue and link later.</Text>
          }
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryCta} onPress={goNext} activeOpacity={0.9}>
          <Text style={styles.primaryCtaText}>Continue</Text>
          <ArrowRight size={18} color={ONBOARDING.primaryOnWhite} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={styles.secondarySkip}>
          <Text style={styles.secondarySkipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ONBOARDING.headerBtnBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  hero: {
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ONBOARDING.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ONBOARDING.text,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: ONBOARDING.textSecondary,
  },
  countLine: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  list: {
    paddingBottom: 120,
  },
  serviceCard: {
    backgroundColor: ONBOARDING.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ONBOARDING.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: ONBOARDING.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ONBOARDING.chipBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceMeta: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: ONBOARDING.text,
  },
  serviceSub: {
    fontSize: 13,
    color: ONBOARDING.textMuted,
    marginTop: 2,
  },
  linkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  linkBtnManage: {
    backgroundColor: ONBOARDING.chipBg,
    borderWidth: 1,
    borderColor: ONBOARDING.border,
  },
  pressed: {
    opacity: 0.85,
  },
  linkBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  linkBtnTextPrimary: {
    color: '#FFF',
  },
  linkBtnTextManage: {
    color: COLORS.primary,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.success}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  connectedPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerText: {
    marginTop: 12,
    fontSize: 15,
    color: ONBOARDING.textMuted,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ONBOARDING.text,
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: ONBOARDING.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: ONBOARDING.textMuted,
    paddingVertical: 24,
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryCtaText: {
    fontSize: 17,
    fontWeight: '700',
    color: ONBOARDING.primaryOnWhite,
  },
  secondarySkip: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondarySkipText: {
    fontSize: 15,
    fontWeight: '600',
    color: ONBOARDING.textMuted,
  },
});
