import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, cardStyle } from '@/constants/design';
import { combinedFootballApi, footballApi } from '@/utils/combinedFootballApi';
import { clearRateLimit, getApiStatus, debugUEFAQualifiers, debugAllAPIs, testSingleAPICall } from '@/utils/footballApi';

export default function SportsDebugScreen() {
  const { profile } = useUserProfile();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const status = await getApiStatus();
        if (!status.canMakeCall) {
          setRateLimitWarning('API rate limit reached. Data may be limited until reset.');
        } else {
          setRateLimitWarning(null);
        }
      } catch (error) {
        console.error('Error checking rate limit:', error);
      }
    };
    
    checkRateLimit();
    const interval = setInterval(checkRateLimit, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const liveFootballQuery = useQuery({
    queryKey: ['debugLiveFootball'],
    queryFn: () => combinedFootballApi.getLiveMatches(undefined, true),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const todayFootballQuery = useQuery({
    queryKey: ['debugTodayFootball'],
    queryFn: () => {
      console.log('🚀 Debug: Fetching today matches with debug info');
      console.log('Current date:', new Date().toISOString().split('T')[0]);
      console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('Current time:', new Date().toLocaleString());
      return combinedFootballApi.getTodayMatches(undefined, undefined, true);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const completedTodayQuery = useQuery({
    queryKey: ['debugCompletedToday'],
    queryFn: () => combinedFootballApi.getCompletedTodayMatches(undefined, undefined, true),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const upcomingFootballQuery = useQuery({
    queryKey: ['debugUpcomingFootball'],
    queryFn: () => {
      console.log('🚀 Debug: Fetching upcoming matches');
      return combinedFootballApi.getUpcomingMatches(7, undefined, undefined, true);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    enabled: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const fetchDebugData = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Debug: Manual data fetch triggered');
      
      await Promise.all([
        liveFootballQuery.refetch(),
        todayFootballQuery.refetch(),
        completedTodayQuery.refetch(),
        upcomingFootballQuery.refetch()
      ]);
      
      console.log('✅ Debug: All queries completed');
    } catch (e) {
      console.error('Debug: Data fetch failed', e);
    }
    setRefreshing(false);
  };

  const isLoading = liveFootballQuery.isLoading || todayFootballQuery.isLoading || completedTodayQuery.isLoading || upcomingFootballQuery.isLoading;

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Sports Debug Tools</Text>
            <Text style={styles.headerSubtitle}>API-Football diagnostics</Text>
          </View>
        </View>
        
        {rateLimitWarning && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={styles.warningText}>{rateLimitWarning}</Text>
            <TouchableOpacity 
              style={styles.warningButton}
              onPress={async () => {
                await clearRateLimit();
                setRateLimitWarning(null);
              }}
            >
              <Text style={styles.warningButtonText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.fetchButtonContainer}>
          <TouchableOpacity 
            style={[styles.fetchButton, refreshing && { opacity: 0.6 }]}
            onPress={fetchDebugData}
            disabled={refreshing}
          >
            <RefreshCw size={16} color={COLORS.card} style={[styles.fetchButtonIcon, refreshing && { opacity: 0.6 }]} />
            <Text style={[styles.fetchButtonText, refreshing && { opacity: 0.6 }]}>
              {refreshing ? 'Loading Debug Data...' : 'Load Debug Data'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔧 Environment Info</Text>
            </View>
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Platform & Environment:</Text>
              <Text style={styles.debugTextDetail}>Platform: {Platform.OS}</Text>
              <Text style={styles.debugTextDetail}>Current Date: {new Date().toISOString().split('T')[0]}</Text>
              <Text style={styles.debugTextDetail}>Current Time: {new Date().toLocaleTimeString()}</Text>
              <Text style={styles.debugTextDetail}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
              <Text style={styles.debugTextDetail}>Development Mode: {__DEV__ ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugTextDetail}>API Source: API-Football (api-football.com)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📡 API Status</Text>
            </View>
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Query Status:</Text>
              <Text style={styles.debugTextDetail}>Live Status: {liveFootballQuery.status} {liveFootballQuery.error ? `(${liveFootballQuery.error.message})` : ''}</Text>
              <Text style={styles.debugTextDetail}>Today Status: {todayFootballQuery.status} {todayFootballQuery.error ? `(${todayFootballQuery.error.message})` : ''}</Text>
              <Text style={styles.debugTextDetail}>Upcoming Status: {upcomingFootballQuery.status} {upcomingFootballQuery.error ? `(${upcomingFootballQuery.error.message})` : ''}</Text>
              <Text style={styles.debugTextDetail}>Completed Status: {completedTodayQuery.status} {completedTodayQuery.error ? `(${completedTodayQuery.error.message})` : ''}</Text>
              
              <Text style={styles.debugTitle}>Last Fetch Times:</Text>
              <Text style={styles.debugTextDetail}>Today last fetched: {todayFootballQuery.dataUpdatedAt ? new Date(todayFootballQuery.dataUpdatedAt).toLocaleString() : 'Never'}</Text>
              <Text style={styles.debugTextDetail}>Live last fetched: {liveFootballQuery.dataUpdatedAt ? new Date(liveFootballQuery.dataUpdatedAt).toLocaleString() : 'Never'}</Text>
              <Text style={styles.debugTextDetail}>Upcoming last fetched: {upcomingFootballQuery.dataUpdatedAt ? new Date(upcomingFootballQuery.dataUpdatedAt).toLocaleString() : 'Never'}</Text>
              <Text style={styles.debugTextDetail}>Completed last fetched: {completedTodayQuery.dataUpdatedAt ? new Date(completedTodayQuery.dataUpdatedAt).toLocaleString() : 'Never'}</Text>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#10B981' }]} 
                onPress={async () => {
                  const apiFootballStatus = await getApiStatus();
                  console.log('API-Football Status:', apiFootballStatus);
                  alert(`API-Football:\nLast call: ${apiFootballStatus.lastApiCall || 'Never'}\nCan make call: ${apiFootballStatus.canMakeCall}`);
                }}
              >
                <Text style={styles.debugButtonText}>Check API Status</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Raw Data Summary</Text>
            </View>
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>API Response Summary:</Text>
              <Text style={styles.debugTextDetail}>Live Raw: {liveFootballQuery.data?.length || 0} matches</Text>
              <Text style={styles.debugTextDetail}>Today Raw: {todayFootballQuery.data?.length || 0} matches</Text>
              <Text style={styles.debugTextDetail}>Upcoming Raw: {upcomingFootballQuery.data?.length || 0} matches</Text>
              <Text style={styles.debugTextDetail}>Completed Raw: {completedTodayQuery.data?.length || 0} matches</Text>
              
              <Text style={styles.debugTitle}>🚨 TODAY vs LIVE Comparison:</Text>
              <Text style={styles.debugTextDetail}>Live Query: {liveFootballQuery.status} - {liveFootballQuery.data?.length || 0} matches</Text>
              <Text style={styles.debugTextDetail}>Today Query: {todayFootballQuery.status} - {todayFootballQuery.data?.length || 0} matches</Text>
              <Text style={styles.debugTextDetail}>Live has data: {liveFootballQuery.data && liveFootballQuery.data.length > 0 ? '✅ YES' : '❌ NO'}</Text>
              <Text style={styles.debugTextDetail}>Today has data: {todayFootballQuery.data && todayFootballQuery.data.length > 0 ? '✅ YES' : '❌ NO'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👤 User Profile Debug</Text>
            </View>
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Profile Information:</Text>
              <Text style={styles.debugTextDetail}>Has Profile: {profile ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugTextDetail}>Favourite Teams: {profile?.favoriteTeams?.length || 0}</Text>
              <Text style={styles.debugTextDetail}>Favourite Team Names: {profile?.favoriteTeams?.map(t => t.name).join(', ') || 'None'}</Text>
              <Text style={styles.debugTextDetail}>Favourite Team API IDs: {profile?.favoriteTeams?.map(t => t.apiId).join(', ') || 'None'}</Text>
              <Text style={styles.debugTextDetail}>Favourite Leagues: {profile?.favoriteLeagues?.length || 0}</Text>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#8B5CF6' }]} 
                onPress={() => {
                  console.log('🔍 Detailed Profile Debug:');
                  console.log('Profile:', profile);
                  console.log('Favorite Teams:', profile?.favoriteTeams);
                  console.log('Favorite Leagues:', profile?.favoriteLeagues);
                  
                  alert('Profile debug info logged to console. Check the console for detailed information.');
                }}
              >
                <Text style={styles.debugButtonText}>Log Profile Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {upcomingFootballQuery.data && upcomingFootballQuery.data.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📋 Sample Raw Data</Text>
              </View>
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Sample Upcoming Matches (Raw):</Text>
                {upcomingFootballQuery.data.slice(0, 5).map((match, index) => (
                  <Text key={`raw-${match.id}-${index}`} style={styles.debugTextDetail}>
                    {index + 1}. {match.homeTeam} vs {match.awayTeam} - {match.date} {match.time} ({match.status}) - {match.league}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🧪 API Testing Tools</Text>
            </View>
            <View style={styles.debugContainer}>
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#10B981' }]} 
                onPress={async () => {
                  console.log('🧪 Testing API-Football directly...');
                  try {
                    const apiFootballResult = await footballApi.getUpcomingMatches(7, undefined, undefined, true);
                    console.log('✅ API-Football direct test result:', apiFootballResult.length, 'matches');
                    
                    const combinedResult = await combinedFootballApi.getUpcomingMatches(7, undefined, undefined, true);
                    console.log('✅ Combined API test result:', combinedResult.length, 'matches');
                    
                    alert(`Direct API Test Results:\n\nAPI-Football: ${apiFootballResult.length} matches\nCombined: ${combinedResult.length} matches\n\nCheck console for detailed logs.`);
                  } catch (error) {
                    console.error('❌ Direct API test failed:', error);
                    alert(`API Test Failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>Test API Directly</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#F59E0B', marginTop: 8 }]} 
                onPress={async () => {
                  console.log('🌍 Testing UEFA World Cup Qualifiers specifically...');
                  try {
                    await debugUEFAQualifiers();
                    alert('UEFA World Cup Qualifiers test completed. Check console for detailed results.');
                  } catch (error) {
                    console.error('❌ UEFA test failed:', error);
                    alert(`UEFA test failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🌍 Test UEFA World Cup Qualifiers</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#10B981', marginTop: 8 }]} 
                onPress={async () => {
                  console.log('🔍 Testing single API call to see raw data...');
                  try {
                    await testSingleAPICall();
                    alert('Single API call test completed. Check console for RAW DATA results. This uses only 1 API call to show you actual data.');
                  } catch (error) {
                    console.error('❌ Single API test failed:', error);
                    alert(`Single API test failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🚀 TEST SINGLE API CALL (SEE RAW DATA)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#DC2626', marginTop: 8 }]} 
                onPress={async () => {
                  console.log('🔍 Running comprehensive API debug...');
                  try {
                    await debugAllAPIs();
                    alert('Comprehensive API debug completed. Check console for detailed results including connectivity, API status, rate limits, and sample data.');
                  } catch (error) {
                    console.error('❌ Comprehensive debug failed:', error);
                    alert(`Comprehensive debug failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🚨 COMPREHENSIVE API DEBUG</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#3B82F6', marginTop: 8 }]} 
                onPress={async () => {
                  console.log('📅 Testing TODAY matches specifically...');
                  try {
                    const todayResult = await combinedFootballApi.getTodayMatches(undefined, undefined, true);
                    console.log('✅ Today matches result:', todayResult.length, 'matches');
                    
                    if (todayResult.length > 0) {
                      console.log('📋 Sample today matches:');
                      todayResult.slice(0, 3).forEach((match, index) => {
                        console.log(`${index + 1}. ${match.homeTeam} vs ${match.awayTeam} - ${match.date} ${match.time} (${match.status})`);
                      });
                    } else {
                      console.log('⚠️ No today matches found');
                      console.log('Current date being used:', new Date().toISOString().split('T')[0]);
                      console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
                    }
                    
                    alert(`Today Matches Test Results:\n\nFound: ${todayResult.length} matches\nDate: ${new Date().toISOString().split('T')[0]}\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n\nCheck console for detailed match list.`);
                  } catch (error) {
                    console.error('❌ Today matches test failed:', error);
                    alert(`Today matches test failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>📅 TEST TODAY MATCHES ONLY</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#EF4444', marginTop: 8 }]} 
                onPress={async () => {
                  console.log('🧹 Clearing rate limit cache...');
                  try {
                    await clearRateLimit();
                    setRateLimitWarning(null);
                    alert('Rate limit cache cleared successfully.');
                  } catch (error) {
                    console.error('❌ Clear cache failed:', error);
                    alert(`Clear cache failed: ${error}`);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🧹 CLEAR CACHE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isLoading && (!liveFootballQuery.data || liveFootballQuery.data.length === 0) && 
           (!todayFootballQuery.data || todayFootballQuery.data.length === 0) && 
           (!upcomingFootballQuery.data || upcomingFootballQuery.data.length === 0) && 
           (!completedTodayQuery.data || completedTodayQuery.data.length === 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⚠️ No Data Available</Text>
              </View>
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Troubleshooting:</Text>
                <Text style={styles.debugTextDetail}>1. Check internet connection</Text>
                <Text style={styles.debugTextDetail}>2. Verify EXPO_PUBLIC_FOOTBALL_API_KEY is configured</Text>
                <Text style={styles.debugTextDetail}>3. Check if rate limits are exceeded</Text>
                <Text style={styles.debugTextDetail}>4. Try clearing caches and refreshing</Text>
                <Text style={styles.debugTextDetail}>5. Check console logs for detailed errors</Text>
              </View>
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: {
    padding: 8,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: COLORS.text,
  },
  debugContainer: {
    ...cardStyle(1),
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  debugTextDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    fontSize: 12,
    color: COLORS.card,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.s,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.s,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500' as const,
  },
  warningButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  warningButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  fetchButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.s,
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  fetchButtonText: {
    fontSize: 16,
    color: COLORS.card,
    fontWeight: '600' as const,
  },
  fetchButtonIcon: {
    marginRight: 8,
  },
});
