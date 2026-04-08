import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import { X, Sun, Droplets, Wind, Umbrella, Shield, ThermometerSun, Eye, MapPin, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getExtendedWeather, getWeatherIcon, getUVColor, ExtendedWeatherData, ForecastDay } from '@/utils/weatherApi';
import { COLORS } from '@/constants/colors';



interface WeatherDetailModalProps {
  visible: boolean;
  onClose: () => void;
  currentWeather?: {
    temp: number;
    description: string;
    city: string;
  };
}

export default function WeatherDetailModal({ visible, onClose, currentWeather }: WeatherDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [extendedWeather, setExtendedWeather] = useState<ExtendedWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      
      fetchExtendedWeather();
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
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
      const data = await getExtendedWeather();
      setExtendedWeather(data);
      console.log('📊 [WeatherModal] Extended weather loaded:', data.forecast.length, 'days');
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
                outputRange: [0, 10 + index * 5]
              })
            }]
          }
        ]}
      >
        <View style={styles.forecastLeft}>
          <Text style={[styles.forecastDayName, isToday && styles.forecastDayNameToday]}>
            {isToday ? 'Today' : day.dayName.slice(0, 3)}
          </Text>
        </View>
        
        <View style={styles.forecastCenter}>
          <Text style={styles.forecastIcon}>{getWeatherIcon(day.condition, true)}</Text>
          {day.pop > 0 && (
            <Text style={styles.popText}>{day.pop}%</Text>
          )}
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

  const currentTime = new Date().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      transparent={false}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerPill} />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
              testID="weather-modal-close"
              activeOpacity={0.7}
            >
              <X size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          {extendedWeather && (
            <Animated.View style={[styles.currentWeather, { opacity: fadeAnim }]} pointerEvents="box-none">
              <View style={styles.locationRow}>
                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cityName}>
                  {currentWeather?.city || extendedWeather.current.city || 'Your Location'}
                </Text>
              </View>
              
              <View style={styles.mainTempRow}>
                <Text style={styles.currentTemp}>
                  {currentWeather?.temp || extendedWeather.current.temp}°
                </Text>
                <Text style={styles.weatherEmoji}>
                  {getWeatherIcon(extendedWeather.current.description, true)}
                </Text>
              </View>
              
              <Text style={styles.currentDescription}>
                {currentWeather?.description || extendedWeather.current.description}
              </Text>
              
              <View style={styles.tempRangeRow}>
                <Text style={styles.tempRangeText}>
                  H:{extendedWeather.forecast[0]?.temp.max}°  L:{extendedWeather.forecast[0]?.temp.min}°
                </Text>
              </View>
              
              <View style={styles.timeRow}>
                <Clock size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.timeText}>Updated {currentTime}</Text>
              </View>
            </Animated.View>
          )}
        </LinearGradient>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          bounces={true}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Animated.View style={[styles.loadingDot, { opacity: fadeAnim }]} />
              <Text style={styles.loadingText}>Loading weather data...</Text>
            </View>
          ) : extendedWeather ? (
            <>
              <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]} pointerEvents="box-none">
                <View style={styles.statCard}>
                  <Wind size={20} color="#60A5FA" />
                  <Text style={styles.statValue}>{extendedWeather.current.windSpeed}</Text>
                  <Text style={styles.statLabel}>m/s wind</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Droplets size={20} color="#34D399" />
                  <Text style={styles.statValue}>{extendedWeather.current.humidity}%</Text>
                  <Text style={styles.statLabel}>humidity</Text>
                </View>
                
                <View style={styles.statCard}>
                  <ThermometerSun size={20} color="#FB923C" />
                  <Text style={styles.statValue}>{extendedWeather.current.feelsLike}°</Text>
                  <Text style={styles.statLabel}>feels like</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Eye size={20} color="#A78BFA" />
                  <Text style={styles.statValue}>10km</Text>
                  <Text style={styles.statLabel}>visibility</Text>
                </View>
              </Animated.View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>UV Index</Text>
                <View style={styles.uvCard}>
                  <View style={styles.uvMainRow}>
                    <View style={[styles.uvBadge, { backgroundColor: `${getUVColor(extendedWeather.uvIndex.level)}15` }]}>
                      <Text style={[styles.uvValue, { color: getUVColor(extendedWeather.uvIndex.level) }]}>
                        {extendedWeather.uvIndex.value}
                      </Text>
                    </View>
                    <View style={styles.uvInfo}>
                      <Text style={[styles.uvLevel, { color: getUVColor(extendedWeather.uvIndex.level) }]}>
                        {getUVLevelLabel(extendedWeather.uvIndex.level)}
                      </Text>
                      <Text style={styles.uvDescription} numberOfLines={2}>{extendedWeather.uvIndex.protection}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.uvScaleContainer}>
                    <LinearGradient
                      colors={['#4ADE80', '#FACC15', '#F97316', '#EF4444', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.uvScaleBar}
                    />
                    <View style={[
                      styles.uvIndicator,
                      { left: `${Math.min(90, Math.max(5, (extendedWeather.uvIndex.value / 11) * 100))}%` }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skin Protection</Text>
                <View style={styles.protectionCard}>
                  <View style={styles.protectionMetrics}>
                    <View style={styles.protectionMetricCard}>
                      <Shield size={22} color="#D97706" />
                      <Text style={styles.protectionMetricValue}>{extendedWeather.skinProtection.spfRecommendation}</Text>
                      <Text style={styles.protectionMetricLabel}>SPF Needed</Text>
                    </View>
                    
                    <View style={styles.protectionMetricDivider} />
                    
                    <View style={styles.protectionMetricCard}>
                      <Sun size={22} color="#2563EB" />
                      <Text style={styles.protectionMetricValue}>{extendedWeather.skinProtection.sunExposureTime}</Text>
                      <Text style={styles.protectionMetricLabel}>Safe Exposure</Text>
                    </View>
                  </View>
                  
                  <View style={styles.precautionsList}>
                    {extendedWeather.skinProtection.precautions.slice(0, 3).map((precaution, index) => (
                      <View key={index} style={styles.precautionItem}>
                        <View style={styles.precautionDot} />
                        <Text style={styles.precautionText}>{precaution}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Precipitation</Text>
                <View style={styles.rainCard}>
                  <View style={styles.rainHeader}>
                    <Umbrella size={20} color="#3B82F6" />
                    <Text style={styles.rainAmount}>{extendedWeather.current.rain || 0} mm</Text>
                    <Text style={styles.rainStatus}>{getRainDescription(extendedWeather.current.rain || 0)}</Text>
                  </View>
                  
                  <View style={styles.rainForecast}>
                    {extendedWeather.forecast.slice(0, 5).map((day, index) => {
                      const maxRain = Math.max(...extendedWeather.forecast.slice(0, 5).map(d => d.rain || 0), 1);
                      const barHeight = Math.max(4, (day.rain / maxRain) * 40);
                      return (
                        <View key={day.date} style={styles.rainForecastItem}>
                          <View style={styles.rainBarContainer}>
                            <LinearGradient
                              colors={day.rain > 2 ? ['#3B82F6', '#60A5FA'] : ['#CBD5E1', '#E2E8F0']}
                              style={[styles.rainBar, { height: barHeight }]}
                            />
                          </View>
                          <Text style={styles.rainForecastDay}>
                            {index === 0 ? 'Now' : day.dayName.slice(0, 2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>5-Day Forecast</Text>
                <View style={styles.forecastCard}>
                  {extendedWeather.forecast.map((day, index) => renderForecastDay(day, index))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load weather data</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchExtendedWeather}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
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
  headerGradient: {
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerPill: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    top: 6,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentWeather: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  mainTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentTemp: {
    fontSize: 72,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: -4,
  },
  weatherEmoji: {
    fontSize: 48,
  },
  currentDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  tempRangeRow: {
    marginTop: 8,
  },
  tempRangeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 60,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textTertiary,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uvCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  uvMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  uvBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uvInfo: {
    flex: 1,
  },
  uvValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  uvLevel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  uvDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  uvScaleContainer: {
    position: 'relative',
    marginTop: 8,
    paddingBottom: 4,
  },
  uvScaleBar: {
    height: 6,
    borderRadius: 3,
  },
  uvIndicator: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.text,
    marginLeft: -6,
  },
  protectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  protectionMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  protectionMetricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  protectionMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  protectionMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  protectionMetricLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '600',
  },
  precautionsList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
    gap: 8,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  precautionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.textTertiary,
    marginTop: 6,
  },
  precautionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  rainCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  rainAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  rainStatus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  rainForecast: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 70,
  },
  rainForecastItem: {
    alignItems: 'center',
    gap: 8,
  },
  rainBarContainer: {
    justifyContent: 'flex-end',
    height: 44,
  },
  rainBar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  rainForecastDay: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
  },
  forecastCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  forecastRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  forecastRowToday: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  forecastLeft: {
    width: 44,
  },
  forecastDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  forecastDayNameToday: {
    color: COLORS.text,
    fontWeight: '700',
  },
  forecastCenter: {
    alignItems: 'center',
    width: 48,
  },
  forecastIcon: {
    fontSize: 22,
  },
  popText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#60A5FA',
    marginTop: 2,
  },
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
  tempBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  forecastTempHigh: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 32,
    textAlign: 'right',
  },
  forecastTempLow: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
    width: 32,
  },
});
