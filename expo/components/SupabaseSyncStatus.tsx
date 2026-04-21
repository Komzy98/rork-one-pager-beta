import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/hooks/useAuth';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/design';

interface SupabaseSyncStatusProps {
  compact?: boolean;
  showProvider?: boolean;
}

export default function SupabaseSyncStatus({ compact = false, showProvider = true }: SupabaseSyncStatusProps) {
  const {
    isCloudEnabled,
    syncStatus,
    lastSyncTime,
    useSupabase,
    cloudProvider,
    syncToCloud,
    error,
    isAutoSyncActive,
  } = useCloudSync();
  const { isAuthenticated, user, isAutoSyncEnabled } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const getSyncIcon = () => {
    if (!isCloudEnabled) return <CloudOff size={compact ? 16 : 20} color={COLORS.textSecondary} />;

    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw size={compact ? 16 : 20} color={COLORS.primary} />;
      case 'success':
        return isAutoSyncActive && isAutoSyncEnabled()
          ? <Zap size={compact ? 16 : 20} color={COLORS.success} />
          : <CheckCircle size={compact ? 16 : 20} color={COLORS.success} />;
      case 'error':
        return <AlertCircle size={compact ? 16 : 20} color={COLORS.error} />;
      default:
        return <Cloud size={compact ? 16 : 20} color={COLORS.textSecondary} />;
    }
  };

  const getSyncText = () => {
    if (!isCloudEnabled) return 'Sync disabled';

    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        if (isAutoSyncActive && isAutoSyncEnabled()) {
          return lastSyncTime
            ? `Auto-sync active • ${new Date(lastSyncTime).toLocaleTimeString()}`
            : 'Auto-sync active';
        }
        return lastSyncTime
          ? `Last sync: ${new Date(lastSyncTime).toLocaleTimeString()}`
          : 'Synced';
      case 'error':
        return error || 'Sync failed';
      default:
        return isAutoSyncActive && isAutoSyncEnabled() ? 'Auto-sync ready' : 'Ready to sync';
    }
  };

  const handlePress = () => {
    if (isCloudEnabled && syncStatus !== 'syncing') {
      syncToCloud();
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      case 'syncing':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={handlePress}
        disabled={!isCloudEnabled || syncStatus === 'syncing'}
        testID="supabase-sync-status-compact"
      >
        <View style={styles.compactContent}>
          {getSyncIcon()}
          <Text style={styles.compactText}>
            {isAutoSyncActive && isAutoSyncEnabled() ? 'Auto-sync' : 'Sync'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.syncButton,
          syncStatus === 'success' && styles.successButton,
          syncStatus === 'error' && styles.errorButton,
        ]}
        onPress={handlePress}
        disabled={!isCloudEnabled || syncStatus === 'syncing'}
        testID="supabase-sync-status"
      >
        <View style={styles.iconContainer}>
          {getSyncIcon()}
        </View>
        <View style={styles.textContainer}>
          {showProvider && (
            <Text style={styles.providerText}>
              {useSupabase ? 'Supabase' : cloudProvider}
              {isAutoSyncActive && isAutoSyncEnabled() && ' • Auto-sync'}
            </Text>
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getSyncText()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successButton: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  errorButton: {
    borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}10`,
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  providerText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 2,
  },
  statusText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500' as const,
  },
  compactContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500' as const,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
});
