import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { X, Sun, Droplets, Wind, Umbrella, Shield, ThermometerSun, Eye, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getExtendedWeather,
  getWeatherIcon,
  getUVColor,
  getHeroGradientColors,
  getSkinProtection,
  type ExtendedWeatherData,
  type ForecastDay,
} from '@/utils/weatherApi';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

interface WeatherDetailModalProps {
  visible: boolean;
  onClose: () => void;
  currentWeather?: {
    temp: number;
    description: string;
    city: string;
    condition?: string;
    isDayTime?: boolean;
    cloudiness?: number;
  };
}

export default function WeatherDetailModal({ visible, onClose, currentWeather }: WeatherDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [extendedWeather, setExtendedWeather] = useState<ExtendedWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  const heroGradient = useMemo(() => {
    const w = extendedWeather?.current;
    return getHeroGradientColors(
      w?.condition || currentWeather?.condition || 'clear',
      w?.isDayTime ?? currentWeather?.isDayTime ?? true,
      w?.cloudiness ?? currentWeather?.cloudiness ?? 20,
      { description: w?.description || currentWeather?.description }
    );
  }, [extendedWeather, currentWeather]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      void fetchExtendedWeather();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setExtendedWeather(null);
      setIsLoading(true);
    }
  }, [visible, fadeAnim, slideAnim]);

  const fetchExtendedWeather = async () => {
    setIsLoading(true);
    try {
      const data = await getExtendedWeather(undefined, undefined, { forceRefresh: true });
      setExtendedWeather(data);
    } catch (error) {
      console.error('❌ [WeatherModal] Failed to fetch extended weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const getUVLevelLabel = (level: string): string => {
    switch (level) {
      case 'low': return 'Low';
      case 'moderate': return 'Moderate';
      case 'high': return 'High';
      case 'very_high': return 'Very High';
      case 'extreme': return 'Extreme';
      default: return level;
    }
  };

  const getRainDescription = (rain: number): string => {
    if (rain === 0) return 'No rain expected';
    if (rain < 2.5) return 'Light rain';
    if (rain < 7.5) return 'Moderate rain';
    if (rain < 15) return 'Heavy rain';
    return 'Very heavy rain';
  };

  const updatedLabel = useMemo(() => {
    if (!extendedWeather?.fetchedAt) return '';
    return new Date(extendedWeather.fetchedAt).toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [extendedWeather?.fetchedAt]);

  const skinProtection = useMemo(() => {
    if (!extendedWeather) return null;
    return getSkinProtection(
      extendedWeather.uvIndex.value,
      extendedWeather.uvIndex.peakToday
    );
  }, [extendedWeather?.uvIndex.value, extendedWeather?.uvIndex.peakToday]);

  const renderForecastDay = (day: ForecastDay, index: number) => {
    const isToday = index === 0;
    const tempRange = day.temp.max - day.temp.min;
    const barWidth = Math.min(100, Math.max(30, tempRange * 4));

    return (
      <Animated.View
        key={day.date}
        style={[
          styles.forecastRow,
          isToday && styles.forecastRowToday,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 10 + index * 5],
              }),
            }],
          },
        ]}
      >
        <View style={styles.forecastLeft}>
          <Text style={[styles.forecastDayName, isToday && styles.forecastDayNameToday]}>
            {isToday ? 'Today' : day.dayName.slice(0, 3)}
          </Text>
          {day.uvi > 0 ? (
            <Text style={styles.forecastUvi}>UV {day.uvi}</Text>
          ) : null}
        </View>
        <View style={styles.forecastCenter}>
          <Text style={styles.forecastIcon}>{getWeatherIcon(day.condition, true)}</Text>
          {day.pop > 0 ? <Text style={styles.popText}>{day.pop}%</Text> : null}
        </View>
        <View style={styles.forecastRight}>
          <Text style={styles.forecastTempLow}>{day.temp.min}°</Text>
          <View style={styles.tempBarWrapper}>
            <LinearGradient
              colors={['#93C5FD', '#FCD34D', '#FB923C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.tempBarFill, { width: `${barWidth}%` }]}
            />
          </View>
          <Text style={styles.forecastTempHigh}>{day.temp.max}°</Text>
        </View>
      </Animated.View>
    );
  };

  if (!visible) return null;

  const w = extendedWeather?.current;
  const displayTemp = currentWeather?.temp ?? w?.temp ?? '--';
  const displayDesc = currentWeather?.description ?? w?.description ?? '';
  const displayCity = currentWeather?.city ?? w?.city ?? 'Your Location';
  const heroLight = (w?.isDayTime ?? true) && !w?.condition?.includes('rain');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F1F5F9' }]}>
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.header}>
            <View style={styles.headerSide} />
            <View style={styles.headerPill} />
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} testID="weather-modal-close">
              <X size={18} color={heroLight ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.95)'} />
            </TouchableOpacity>
          </View>

          {extendedWeather && !isLoading ? (
            <Animated.View style={[styles.currentWeather, { opacity: fadeAnim }]} pointerEvents="box-none">
              <View style={styles.locationRow}>
                <MapPin size={12} color={heroLight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.75)'} />
                <Text style={[styles.cityName, heroLight && styles.cityNameLight]}>{displayCity}</Text>
              </View>

              <View style={styles.mainTempRow}>
                <Text style={[styles.currentTemp, heroLight && styles.currentTempLight]}>{displayTemp}°</Text>
                <Text style={styles.weatherEmoji}>{getWeatherIcon(w?.condition || displayDesc, w?.isDayTime ?? true)}</Text>
              </View>

              <Text style={[styles.currentDescription, heroLight && styles.currentDescriptionLight]}>
                {displayDesc}
              </Text>

              <Text style={[styles.heroMeta, heroLight && styles.heroMetaLight]}>
                H {extendedWeather.forecast[0]?.temp.max}° · L {extendedWeather.forecast[0]?.temp.min}°
                {updatedLabel ? ` · Live ${updatedLabel}` : ''}
              </Text>
            </Animated.View>
          ) : null}
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading live weather…</Text>
            </View>
          ) : extendedWeather ? (
            <>
              <Animated.View
                style={[
                  styles.statsGrid,
                  { opacity: fadeAnim, backgroundColor: isDark ? colors.card : '#FFFFFF' },
                ]}
              >
                <View style={styles.statCard}>
                  <Wind size={20} color="#60A5FA" />
                  <Text style={[styles.statValue, { color: colors.text }]}>{extendedWeather.current.windSpeed}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>m/s wind</Text>
                </View>
                <View style={styles.statCard}>
                  <Droplets size={20} color="#34D399" />
                  <Text style={[styles.statValue, { color: colors.text }]}>{extendedWeather.current.humidity}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>humidity</Text>
                </View>
                <View style={styles.statCard}>
                  <ThermometerSun size={20} color="#FB923C" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {extendedWeather.current.feelsLike ?? extendedWeather.current.temp}°
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>feels like</Text>
                </View>
                <View style={styles.statCard}>
                  <Eye size={20} color="#A78BFA" />
                  <Text style={[styles.statValue, { color: colors.text }]}>{extendedWeather.visibilityKm}km</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>visibility</Text>
                </View>
              </Animated.View>

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>UV index</Text>
                  <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
                    Peak today {extendedWeather.uvIndex.peakToday}
                  </Text>
                </View>
                <View style={[styles.uvCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                  <View style={styles.uvMainRow}>
                    <View
                      style={[
                        styles.uvBadge,
                        { backgroundColor: `${getUVColor(extendedWeather.uvIndex.level)}18` },
                      ]}
                    >
                      <Text style={[styles.uvValue, { color: getUVColor(extendedWeather.uvIndex.level) }]}>
                        {extendedWeather.uvIndex.value}
                      </Text>
                    </View>
                    <View style={styles.uvInfo}>
                      <Text style={[styles.uvLevel, { color: getUVColor(extendedWeather.uvIndex.level) }]}>
                        {getUVLevelLabel(extendedWeather.uvIndex.level)}
                      </Text>
                      <Text style={[styles.uvDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                        {extendedWeather.uvIndex.protection}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.uvHourlyRow}>
                    {extendedWeather.uvIndex.hourly.map((point, idx) => {
                      const maxU = Math.max(
                        extendedWeather.uvIndex.peakToday,
                        ...extendedWeather.uvIndex.hourly.map((p) => p.uvi),
                        1
                      );
                      const h = Math.max(6, (point.uvi / maxU) * 44);
                      return (
                        <View key={`${point.hour}-${idx}`} style={styles.uvHourCol}>
                          <View style={styles.uvHourBarTrack}>
                            <View
                              style={[
                                styles.uvHourBarFill,
                                {
                                  height: h,
                                  backgroundColor: getUVColor(getUVLevel(point.uvi)),
                                },
                                point.isNow && styles.uvHourBarNow,
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.uvHourLabel,
                              { color: point.isNow ? colors.text : colors.textTertiary },
                              point.isNow && styles.uvHourLabelNow,
                            ]}
                          >
                            {point.isNow ? 'Now' : point.hour.replace(':00', '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.uvScaleContainer}>
                    <LinearGradient
                      colors={['#4ADE80', '#FACC15', '#F97316', '#EF4444', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.uvScaleBar}
                    />
                    <View
                      style={[
                        styles.uvIndicator,
                        { left: `${Math.min(92, Math.max(4, (extendedWeather.uvIndex.value / 11) * 100))}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {skinProtection ? (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Skin protection</Text>
                  <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
                    UV {extendedWeather.uvIndex.value} now
                  </Text>
                </View>
                <View style={[styles.protectionCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                  <View style={styles.protectionMetrics}>
                    <View style={styles.protectionMetricCard}>
                      <Shield size={22} color="#D97706" />
                      <Text style={[styles.protectionMetricValue, { color: colors.text }]}>
                        {skinProtection.spfRecommendation}
                      </Text>
                      <Text style={[styles.protectionMetricLabel, { color: colors.textTertiary }]}>SPF needed</Text>
                    </View>
                    <View style={[styles.protectionMetricDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.protectionMetricCard}>
                      <Sun size={22} color="#2563EB" />
                      <Text style={[styles.protectionMetricValue, { color: colors.text }]}>
                        {skinProtection.sunExposureTime}
                      </Text>
                      <Text style={[styles.protectionMetricLabel, { color: colors.textTertiary }]}>Safe exposure</Text>
                    </View>
                  </View>
                  <View style={[styles.precautionsList, { borderTopColor: colors.border }]}>
                    {skinProtection.precautions.map((precaution, index) => (
                      <View key={`${precaution}-${index}`} style={styles.precautionItem}>
                        <View style={styles.precautionDot} />
                        <Text style={[styles.precautionText, { color: colors.textSecondary }]}>{precaution}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              ) : null}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Precipitation</Text>
                <View style={[styles.rainCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                  <View style={[styles.rainHeader, { borderBottomColor: colors.border }]}>
                    <Umbrella size={20} color="#3B82F6" />
                    <Text style={[styles.rainAmount, { color: colors.text }]}>{extendedWeather.current.rain || 0} mm</Text>
                    <Text style={[styles.rainStatus, { color: colors.textSecondary }]}>
                      {getRainDescription(extendedWeather.current.rain || 0)}
                    </Text>
                  </View>
                  <View style={styles.rainForecast}>
                    {extendedWeather.forecast.slice(0, 5).map((day, index) => {
                      const maxRain = Math.max(
                        ...extendedWeather.forecast.slice(0, 5).map((d) => d.rain || 0),
                        1
                      );
                      const barHeight = Math.max(4, ((day.rain || 0) / maxRain) * 40);
                      return (
                        <View key={day.date} style={styles.rainForecastItem}>
                          <View style={styles.rainBarContainer}>
                            <LinearGradient
                              colors={day.rain > 2 ? ['#3B82F6', '#60A5FA'] : ['#CBD5E1', '#E2E8F0']}
                              style={[styles.rainBar, { height: barHeight }]}
                            />
                          </View>
                          <Text style={[styles.rainForecastDay, { color: colors.textTertiary }]}>
                            {index === 0 ? 'Now' : day.dayName.slice(0, 2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>5-day forecast</Text>
                <View style={[styles.forecastCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                  {extendedWeather.forecast.map((day, index) => renderForecastDay(day, index))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>Unable to load weather data</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => void fetchExtendedWeather()}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getUVLevel(uvi: number): 'low' | 'moderate' | 'high' | 'very_high' | 'extreme' {
  if (uvi <= 2) return 'low';
  if (uvi <= 5) return 'moderate';
  if (uvi <= 7) return 'high';
  if (uvi <= 10) return 'very_high';
  return 'extreme';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -24,
    right: 24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerSide: {
    width: 34,
    height: 34,
  },
  headerPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  currentWeather: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cityName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  cityNameLight: { color: 'rgba(15,23,42,0.65)' },
  mainTempRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentTemp: {
    fontSize: 56,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  currentTempLight: { color: '#0F172A' },
  weatherEmoji: { fontSize: 36 },
  currentDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  currentDescriptionLight: { color: 'rgba(15,23,42,0.85)' },
  heroMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  heroMetaLight: { color: 'rgba(15,23,42,0.5)' },
  content: { flex: 1 },
  contentContainer: { paddingTop: 14, paddingHorizontal: 16 },
  loadingContainer: { padding: 60, alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorContainer: { padding: 60, alignItems: 'center' },
  errorText: { fontSize: 15, marginBottom: 20 },
  retryButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  statsGrid: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { marginBottom: 22 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionMeta: { fontSize: 11, fontWeight: '600' },
  uvCard: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  uvMainRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  uvBadge: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  uvInfo: { flex: 1 },
  uvValue: { fontSize: 26, fontWeight: '800' },
  uvLevel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  uvDescription: { fontSize: 13, lineHeight: 18 },
  uvHourlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  uvHourCol: { flex: 1, alignItems: 'center', maxWidth: 44 },
  uvHourBarTrack: {
    height: 48,
    width: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  uvHourBarFill: { width: 14, borderRadius: 7, minHeight: 6 },
  uvHourBarNow: { width: 18, borderWidth: 2, borderColor: '#0F172A' },
  uvHourLabel: { fontSize: 9, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  uvHourLabelNow: { fontWeight: '800' },
  uvScaleContainer: { position: 'relative', paddingBottom: 4 },
  uvScaleBar: { height: 6, borderRadius: 3 },
  uvIndicator: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#0F172A',
    marginLeft: -6,
  },
  protectionCard: { borderRadius: 18, padding: 16, elevation: 2 },
  protectionMetrics: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  protectionMetricCard: { flex: 1, alignItems: 'center', gap: 6 },
  protectionMetricDivider: { width: 1, height: 40 },
  protectionMetricValue: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  protectionMetricLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600' },
  precautionsList: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  precautionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  precautionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginTop: 6,
  },
  precautionText: { flex: 1, fontSize: 13, lineHeight: 18 },
  rainCard: { borderRadius: 18, padding: 16, elevation: 2 },
  rainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  rainAmount: { fontSize: 20, fontWeight: '700' },
  rainStatus: { fontSize: 13, flex: 1, textAlign: 'right' },
  rainForecast: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 70,
  },
  rainForecastItem: { alignItems: 'center', gap: 8 },
  rainBarContainer: { justifyContent: 'flex-end', height: 44 },
  rainBar: { width: 24, borderRadius: 4, minHeight: 4 },
  rainForecastDay: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  forecastCard: { borderRadius: 18, padding: 4, elevation: 2 },
  forecastRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  forecastRowToday: { backgroundColor: 'rgba(15,23,42,0.04)' },
  forecastLeft: { width: 52 },
  forecastDayName: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  forecastDayNameToday: { color: COLORS.text, fontWeight: '700' },
  forecastUvi: { fontSize: 10, color: '#F59E0B', fontWeight: '700', marginTop: 2 },
  forecastCenter: { alignItems: 'center', width: 48 },
  forecastIcon: { fontSize: 22 },
  popText: { fontSize: 9, fontWeight: '600', color: '#60A5FA', marginTop: 2 },
  forecastRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tempBarWrapper: {
    flex: 1,
    maxWidth: 80,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tempBarFill: { height: '100%', borderRadius: 3 },
  forecastTempHigh: { fontSize: 14, fontWeight: '600', color: COLORS.text, width: 32, textAlign: 'right' },
  forecastTempLow: { fontSize: 14, fontWeight: '600', color: COLORS.textTertiary, width: 32 },
});
