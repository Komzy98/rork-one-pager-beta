import React, { useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Shield,
  Tv2,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Link2,
  Unlink,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useYounify, YounifyConnectionStatus } from '@/hooks/useYounify';

const STREAMING_SERVICES = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', initial: 'N' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E1', initial: 'P' },
  { id: 'disney', name: 'Disney+', color: '#113CCF', initial: 'D' },
  { id: 'hbo', name: 'Max', color: '#5822B4', initial: 'M' },
  { id: 'apple', name: 'Apple TV+', color: '#1D1D1F', initial: 'A' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783', initial: 'H' },
  { id: 'peacock', name: 'Peacock', color: '#000000', initial: 'P' },
  { id: 'paramount', name: 'Paramount+', color: '#0064FF', initial: 'P' },
];

function StatusIndicator({ status }: { status: YounifyConnectionStatus }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const config = {
    disconnected: { color: '#6B7280', icon: WifiOff, label: 'Not Connected', bg: '#1F1F23' },
    connecting: { color: '#FBBF24', icon: Wifi, label: 'Connecting...', bg: '#2D2A1F' },
    connected: { color: '#4ADE80', icon: CheckCircle2, label: 'Connected', bg: '#1A2E1F' },
    error: { color: '#EF4444', icon: AlertCircle, label: 'Connection Error', bg: '#2E1A1A' },
    expired: { color: '#F59E0B', icon: Clock, label: 'Session Expired', bg: '#2E2A1A' },
  }[status];

  const IconComponent = config.icon;

  return (
    <Animated.View style={[statusStyles.container, { backgroundColor: config.bg, opacity: status === 'connecting' ? pulseAnim : 1 }]}>
      <View style={[statusStyles.dot, { backgroundColor: config.color }]} />
      <IconComponent size={18} color={config.color} />
      <Text style={[statusStyles.label, { color: config.color }]}>{config.label}</Text>
    </Animated.View>
  );
}

export default function StreamingServicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    connectionStatus,
    isConnecting,
    lastError,
    connect,
    disconnect,
    reconnect,
  } = useYounify();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleConnect = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await connect();
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Disconnect Streaming Services',
      'This will remove your streaming service connections. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            await disconnect();
          },
        },
      ]
    );
  }, [disconnect]);

  const handleReconnect = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await reconnect();
  }, [reconnect]);

  const isConnected = connectionStatus === 'connected';
  const isExpired = connectionStatus === 'expired';
  const hasError = connectionStatus === 'error';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0A0A0F', '#111118', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="close-streaming-services"
        >
          <X size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streaming Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <StatusIndicator status={connectionStatus} />

          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <LinearGradient
                colors={isConnected ? ['#065F46', '#064E3B'] : ['#1E1E28', '#16161E']}
                style={styles.heroIconGradient}
              >
                <Tv2 size={36} color={isConnected ? '#4ADE80' : '#6B7280'} />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>
              {isConnected ? 'Services Connected' : 'Connect Your Streaming'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isConnected
                ? 'Your streaming services are synced. Watchlists, continue watching, and recommendations are available.'
                : 'Link your streaming accounts to get personalized watchlists, continue watching, and recommendations all in one place.'}
            </Text>
          </View>

          {lastError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color="#EF4444" />
              <Text style={styles.errorText}>{lastError}</Text>
            </View>
          )}

          {!isConnected && !isConnecting && (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnect}
              activeOpacity={0.85}
              testID="connect-streaming"
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8', '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.connectGradient}
              >
                <Link2 size={22} color="#FFF" />
                <Text style={styles.connectButtonText}>Connect Streaming Services</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isConnecting && (
            <View style={styles.connectingCard}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.connectingText}>Connecting to streaming services...</Text>
              <Text style={styles.connectingSubtext}>This may take a moment</Text>
            </View>
          )}

          {(isExpired || hasError) && (
            <TouchableOpacity
              style={styles.reconnectButton}
              onPress={handleReconnect}
              activeOpacity={0.85}
              testID="reconnect-streaming"
            >
              <LinearGradient
                colors={['#D97706', '#B45309']}
                style={styles.reconnectGradient}
              >
                <RefreshCw size={20} color="#FFF" />
                <Text style={styles.reconnectButtonText}>
                  {isExpired ? 'Renew Session' : 'Retry Connection'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isConnected && (
            <View style={styles.connectedActions}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleReconnect}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <RefreshCw size={20} color="#3B82F6" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Refresh Connection</Text>
                  <Text style={styles.actionSubtitle}>Re-sync your streaming data</Text>
                </View>
                <ChevronRight size={18} color="#4B5563" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleDisconnect}
                activeOpacity={0.75}
                testID="disconnect-streaming"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Unlink size={20} color="#EF4444" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Disconnect</Text>
                  <Text style={styles.actionSubtitle}>Remove all streaming connections</Text>
                </View>
                <ChevronRight size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>
              {isConnected ? 'Available Services' : 'Supported Services'}
            </Text>
            <View style={styles.servicesGrid}>
              {STREAMING_SERVICES.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                    <Text style={styles.serviceInitial}>{service.initial}</Text>
                  </View>
                  <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.featureSection}>
            <Text style={styles.sectionTitle}>What You Get</Text>
            {[
              { icon: Zap, title: 'Unified Watchlist', desc: 'See all your watchlists in one place', color: '#FBBF24' },
              { icon: Tv2, title: 'Continue Watching', desc: 'Pick up where you left off across services', color: '#4ADE80' },
              { icon: Shield, title: 'Recommendations', desc: 'Personalized suggestions based on your taste', color: '#818CF8' },
            ].map((feature, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: feature.color + '15' }]}>
                  <feature.icon size={22} color={feature.color} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Shield size={16} color="#6B7280" />
            <Text style={styles.privacyText}>
              Your credentials are handled securely through Younify. We never store your streaming passwords.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F5F5F7',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIconWrap: {
    marginBottom: 20,
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F5F5F7',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#8E8E9A',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FCA5A5',
    lineHeight: 18,
  },
  connectButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  connectingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    gap: 12,
  },
  connectingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#93C5FD',
  },
  connectingSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  reconnectButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reconnectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  reconnectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  connectedActions: {
    gap: 10,
    marginBottom: 28,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141A',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  servicesSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F7',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceCard: {
    width: '23%' as any,
    alignItems: 'center',
    gap: 8,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  serviceName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E9A',
    textAlign: 'center',
  },
  featureSection: {
    marginBottom: 28,
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141A',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
});
