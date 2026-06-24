import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Modal } from 'react-native';
import { Calendar, X, Smartphone, RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, cardShadow } from '@/constants/design';
import { useEventKit } from '@/hooks/useEventKit';

interface EventKitManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function EventKitManager({ visible, onClose }: EventKitManagerProps) {
  const {
    isEventKitAvailable,
    hasPermission,
    calendars,
    selectedCalendarIds,
    isLoading,
    error,
    requestPermissions,
    loadDeviceCalendars,
    toggleCalendarSelection,
    refreshEvents,
    clearError
  } = useEventKit();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);

  // Add timeout for loading state
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      await loadDeviceCalendars();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDeviceCalendars();
      await refreshEvents();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleCalendar = async (calendarId: string) => {
    await toggleCalendarSelection(calendarId);
    // Refresh events after changing selection
    await refreshEvents();
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType.toLowerCase()) {
      case 'caldav':
        return '☁️';
      case 'exchange':
        return '🏢';
      case 'local':
        return '📱';
      default:
        return '📅';
    }
  };

  if (!isEventKitAvailable) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Device Calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.unavailableContainer}>
            <Smartphone size={48} color={COLORS.textLight} />
            <Text style={styles.unavailableTitle}>Not Available</Text>
            <Text style={styles.unavailableText}>
              Device calendar integration is available on iOS and Android builds, not in the web preview.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Device Calendar</Text>
          <View style={styles.headerActions}>
            {hasPermission && (
              <TouchableOpacity 
                onPress={handleRefresh} 
                style={styles.refreshButton}
                disabled={isRefreshing}
              >
                <RefreshCw 
                  size={20} 
                  color={COLORS.primary} 
                  style={isRefreshing ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!hasPermission ? (
            <View style={styles.permissionSection}>
              <View style={styles.permissionCard}>
                <Calendar size={48} color={COLORS.primary} />
                <Text style={styles.permissionTitle}>Access Your Calendars</Text>
                <Text style={styles.permissionDescription}>
                  Connect your device calendars so One Pager can find free windows for habits,
                  show events on Overview, and recommend the best times to complete your routine.
                </Text>
                
                <TouchableOpacity 
                  style={styles.permissionButton}
                  onPress={handleRequestPermissions}
                  disabled={isLoading}
                >
                  <Text style={styles.permissionButtonText}>
                    {isLoading ? 'Requesting Access...' : 'Grant Calendar Access'}
                  </Text>
                </TouchableOpacity>
                
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                      <Text style={styles.errorDismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.calendarsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Calendars</Text>
                <Text style={styles.sectionSubtitle}>
                  Select which calendars to show in your activities
                </Text>
              </View>

              {isLoading && !loadingTimeout ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading calendars...</Text>
                </View>
              ) : loadingTimeout ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Loading is taking longer than expected. Please try refreshing.</Text>
                  <TouchableOpacity onPress={handleRefresh} style={styles.errorDismiss}>
                    <Text style={styles.errorDismissText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : calendars.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Calendar size={32} color={COLORS.textLight} />
                  <Text style={styles.emptyTitle}>No Calendars Found</Text>
                  <Text style={styles.emptyText}>
                    No calendars were found on your device. Make sure you have calendars set up in your Calendar app.
                  </Text>
                </View>
              ) : (
                <View style={styles.calendarsList}>
                  {calendars.map((calendar) => {
                    const isSelected = selectedCalendarIds.includes(calendar.id);
                    
                    return (
                      <TouchableOpacity
                        key={calendar.id}
                        style={[styles.calendarItem, isSelected && styles.calendarItemSelected]}
                        onPress={() => handleToggleCalendar(calendar.id)}
                      >
                        <View style={styles.calendarInfo}>
                          <View style={styles.calendarHeader}>
                            <View style={styles.calendarTitleRow}>
                              <View 
                                style={[styles.calendarColorDot, { backgroundColor: calendar.color }]} 
                              />
                              <Text style={styles.calendarTitle}>{calendar.title}</Text>
                            </View>
                            <Switch
                              value={isSelected}
                              onValueChange={() => handleToggleCalendar(calendar.id)}
                              trackColor={{ false: COLORS.border, true: COLORS.primary }}
                              thumbColor={isSelected ? 'white' : COLORS.textLight}
                            />
                          </View>
                          
                          <View style={styles.calendarMeta}>
                            <Text style={styles.calendarSource}>
                              {getSourceIcon(calendar.source.type)} {calendar.source.name}
                            </Text>
                            {!calendar.allowsModifications && (
                              <Text style={styles.readOnlyBadge}>Read Only</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {selectedCalendarIds.length > 0 && (
                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionText}>
                    {selectedCalendarIds.length} calendar{selectedCalendarIds.length !== 1 ? 's' : ''} selected
                  </Text>
                  <Text style={styles.selectionSubtext}>
                    Events from selected calendars will appear in your activities
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                    <Text style={styles.errorDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  unavailableText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionSection: {
    padding: SPACING.lg,
  },
  permissionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...cardShadow(3),
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...cardShadow(2),
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  calendarsSection: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...cardShadow(1),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  calendarsList: {
    gap: SPACING.md,
  },
  calendarItem: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...cardShadow(1),
  },
  calendarItemSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    ...cardShadow(3),
  },
  calendarInfo: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  calendarMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarSource: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  readOnlyBadge: {
    fontSize: 12,
    color: COLORS.textLight,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  selectionSummary: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...cardShadow(2),
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  selectionSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
    flex: 1,
  },
  errorDismiss: {
    marginLeft: SPACING.md,
  },
  errorDismissText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
});