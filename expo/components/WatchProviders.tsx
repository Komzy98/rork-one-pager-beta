import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ExternalLink, Play, ShoppingCart, Film } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { WatchProvider, tmdbApi } from '@/utils/tmdbApi';
import { COLORS } from '@/constants/colors';
import { openStreamingApp, getStreamingPlatform } from '@/utils/streamingLinks';

interface WatchProvidersProps {
  streaming: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  link?: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title?: string;
  year?: number;
  compact?: boolean;
}

export default function WatchProviders({ 
  streaming, 
  rent, 
  buy, 
  link, 
  tmdbId, 
  mediaType,
  title = '',
  year,
  compact = false
}: WatchProvidersProps) {
  
  const handleProviderPress = useCallback(async (provider: WatchProvider) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    console.log(`Opening ${provider.provider_name} for "${title}"`);
    await openStreamingApp(provider.provider_id, title, year, link);
  }, [title, year, link]);

  const renderProvider = useCallback((provider: WatchProvider, showLabel: boolean = true) => {
    const platform = getStreamingPlatform(provider.provider_id);
    const borderColor = platform?.color || COLORS.border;
    
    return (
      <TouchableOpacity
        key={provider.provider_id}
        style={[
          styles.providerButton,
          { borderColor: borderColor + '40' }
        ]}
        onPress={() => handleProviderPress(provider)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
          style={styles.providerLogo}
          contentFit="contain"
        />
        {showLabel && (
          <View style={styles.providerInfo}>
            <Text style={styles.providerName} numberOfLines={1}>
              {provider.provider_name}
            </Text>
            <View style={styles.watchBadge}>
              <Play size={10} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={styles.watchText}>Watch</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleProviderPress]);

  const renderCompactProvider = useCallback((provider: WatchProvider) => {
    const platform = getStreamingPlatform(provider.provider_id);
    const bgColor = platform?.color || COLORS.textMuted;
    
    return (
      <TouchableOpacity
        key={provider.provider_id}
        style={[styles.compactProvider, { backgroundColor: bgColor + '20' }]}
        onPress={() => handleProviderPress(provider)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
          style={styles.compactLogo}
          contentFit="contain"
        />
      </TouchableOpacity>
    );
  }, [handleProviderPress]);

  const tmdbWatchUrl = tmdbApi.getWhereToWatchUrl(tmdbId, mediaType);

  const handleOpenTMDBWatch = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const { Linking } = await import('react-native');
    await Linking.openURL(link || tmdbWatchUrl);
  }, [link, tmdbWatchUrl]);

  const renderProviderSection = (providers: WatchProvider[], title: string, icon: React.ReactNode) => {
    if (providers.length === 0) return null;

    if (compact) {
      return (
        <View style={styles.compactSection}>
          <View style={styles.compactProvidersList}>
            {providers.slice(0, 4).map(renderCompactProvider)}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.providerSection}>
        <View style={styles.sectionHeader}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.providersList}>
          {providers.slice(0, 4).map((p) => renderProvider(p, true))}
        </View>
      </View>
    );
  };

  if (streaming.length === 0 && rent.length === 0 && buy.length === 0) {
    if (compact) return null;
    
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Film size={24} color={COLORS.textMuted} />
          <Text style={styles.noProvidersText}>No streaming info available</Text>
        </View>
        <Text style={styles.attributionText}>Data by JustWatch</Text>
      </View>
    );
  }

  if (compact) {
    const allProviders = [...streaming, ...rent, ...buy];
    const uniqueProviders = allProviders.filter((p, i, arr) => 
      arr.findIndex(x => x.provider_id === p.provider_id) === i
    );
    
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactProvidersList}>
          {uniqueProviders.slice(0, 4).map(renderCompactProvider)}
          {uniqueProviders.length > 4 && (
            <View style={styles.moreProviders}>
              <Text style={styles.moreProvidersText}>+{uniqueProviders.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Where to Watch</Text>
        <TouchableOpacity
          style={styles.whereToWatchLink}
          onPress={handleOpenTMDBWatch}
        >
          <ExternalLink size={14} color={COLORS.primary} />
          <Text style={styles.whereToWatchLinkText}>View All Options</Text>
        </TouchableOpacity>
      </View>
      
      {renderProviderSection(
        streaming, 
        'Stream', 
        <Play size={16} color={COLORS.success} fill={COLORS.success} />
      )}
      {renderProviderSection(
        rent, 
        'Rent', 
        <Film size={16} color={COLORS.warning} />
      )}
      {renderProviderSection(
        buy, 
        'Buy', 
        <ShoppingCart size={16} color={COLORS.primary} />
      )}
      
      <Text style={styles.attributionText}>Data provided by JustWatch</Text>
    </View>
  );
}

export function QuickWatchButton({ 
  providers, 
  title, 
  year,
  link 
}: { 
  providers: WatchProvider[]; 
  title: string;
  year?: number;
  link?: string;
}) {
  if (providers.length === 0) return null;

  const primaryProvider = providers[0];
  const platform = getStreamingPlatform(primaryProvider.provider_id);
  const bgColor = platform?.color || COLORS.primary;

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await openStreamingApp(primaryProvider.provider_id, title, year, link);
  };

  return (
    <TouchableOpacity 
      style={[styles.quickWatchButton, { backgroundColor: bgColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Play size={14} color="#FFF" fill="#FFF" />
      <Text style={styles.quickWatchText}>Watch on {primaryProvider.provider_name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  justWatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  justWatchButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
  providerSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 10,
    minWidth: 140,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  watchText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500' as const,
  },
  compactSection: {
    marginBottom: 8,
  },
  compactProvidersList: {
    flexDirection: 'row',
    gap: 8,
  },
  compactProvider: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  moreProviders: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreProvidersText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noProvidersText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  attributionText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },
  quickWatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  quickWatchText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  whereToWatchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  whereToWatchLinkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
});
