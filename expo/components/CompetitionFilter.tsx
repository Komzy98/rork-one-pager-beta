import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import {
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Globe,
  Trophy,
  Check,
  Filter,
  Star,
  MapPin,
  Sparkles,
  Save,
  RotateCcw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import {
  COMPETITIONS_DATA,
  INTERNATIONAL_COMPETITIONS,
  QUICK_FILTERS,
  Competition,
  Country,
  Continent,
} from '@/constants/competitions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CompetitionFilterProps {
  selectedLeagues: number[];
  onLeaguesChange: (leagues: number[]) => void;
  favoriteLeagues?: number[];
  onToggleFavorite?: (leagueId: number) => void;
  onPreferencesSaved?: () => void;
}

type TabType = 'quick' | 'continents' | 'international';

const SAVED_LEAGUES_KEY = 'sports_selected_leagues';

const TOP_5_LEAGUES = [
  { id: 39, name: 'Premier League', flag: '\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f', color: '#3D195B' },
  { id: 140, name: 'La Liga', flag: '\ud83c\uddea\ud83c\uddf8', color: '#EE324E' },
  { id: 78, name: 'Bundesliga', flag: '\ud83c\udde9\ud83c\uddea', color: '#D20515' },
  { id: 135, name: 'Serie A', flag: '\ud83c\uddee\ud83c\uddf9', color: '#008C45' },
  { id: 61, name: 'Ligue 1', flag: '\ud83c\uddeb\ud83c\uddf7', color: '#1F4096' },
];

export default function CompetitionFilter({
  selectedLeagues,
  onLeaguesChange,
  favoriteLeagues = [],
  onToggleFavorite,
  onPreferencesSaved,
}: CompetitionFilterProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContinent, setExpandedContinent] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [isVisible, slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setIsVisible(false));
  }, [slideAnim, fadeAnim]);

  const toggleLeague = useCallback((leagueId: number) => {
    if (selectedLeagues.includes(leagueId)) {
      onLeaguesChange(selectedLeagues.filter(id => id !== leagueId));
    } else {
      onLeaguesChange([...selectedLeagues, leagueId]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const selectQuickFilter = useCallback((leagueIds: number[]) => {
    const allSelected = leagueIds.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !leagueIds.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...leagueIds])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const selectAllInCountry = useCallback((country: Country) => {
    const countryLeagueIds = country.competitions.map(c => c.id);
    const allSelected = countryLeagueIds.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !countryLeagueIds.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...countryLeagueIds])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const selectAllInContinent = useCallback((continent: Continent) => {
    const continentLeagueIds = continent.countries.flatMap(c => c.competitions.map(comp => comp.id));
    const allSelected = continentLeagueIds.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !continentLeagueIds.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...continentLeagueIds])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const clearAll = useCallback(() => {
    onLeaguesChange([]);
  }, [onLeaguesChange]);

  const savePreferences = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SAVED_LEAGUES_KEY, JSON.stringify(selectedLeagues));
      setSaveStatus('saved');
      onPreferencesSaved?.();
      setTimeout(() => setSaveStatus('idle'), 2000);
      console.log('League preferences saved:', selectedLeagues.length, 'leagues');
    } catch (e) {
      console.log('Failed to save league preferences:', e);
    }
  }, [selectedLeagues, onPreferencesSaved]);

  const loadSavedPreferences = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_LEAGUES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          onLeaguesChange(parsed);
          console.log('League preferences loaded:', parsed.length, 'leagues');
        }
      }
    } catch (e) {
      console.log('Failed to load league preferences:', e);
    }
  }, [onLeaguesChange]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return COMPETITIONS_DATA;
    
    const query = searchQuery.toLowerCase();
    return COMPETITIONS_DATA.map(continent => ({
      ...continent,
      countries: continent.countries.map(country => ({
        ...country,
        competitions: country.competitions.filter(
          comp =>
            comp.name.toLowerCase().includes(query) ||
            comp.country.toLowerCase().includes(query)
        ),
      })).filter(country => 
        country.competitions.length > 0 ||
        country.name.toLowerCase().includes(query)
      ),
    })).filter(continent => continent.countries.length > 0);
  }, [searchQuery]);

  const filteredInternational = useMemo(() => {
    if (!searchQuery.trim()) return INTERNATIONAL_COMPETITIONS;
    const query = searchQuery.toLowerCase();
    return INTERNATIONAL_COMPETITIONS.filter(
      comp =>
        comp.name.toLowerCase().includes(query) ||
        comp.country.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedCount = selectedLeagues.length;

  const renderQuickFilters = () => (
    <View style={styles.quickFiltersContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Select</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Tap to toggle popular competitions</Text>
      
      <View style={styles.quickFiltersGrid}>
        {QUICK_FILTERS.map(filter => {
          const isActive = filter.leagueIds.every(id => selectedLeagues.includes(id));
          const isPartial = filter.leagueIds.some(id => selectedLeagues.includes(id)) && !isActive;
          
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.quickFilterCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: '#5352ED' },
                isPartial && { borderColor: '#A5B4FC', backgroundColor: isDark ? '#1E1B4B' : '#F8FAFF' },
              ]}
              onPress={() => selectQuickFilter(filter.leagueIds)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickFilterIcon}>{filter.icon}</Text>
              <Text style={[
                styles.quickFilterName,
                { color: colors.text },
                isActive && styles.quickFilterNameActive,
              ]}>{filter.name}</Text>
              {isActive && (
                <View style={styles.quickFilterCheck}>
                  <Check size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Top 5 European Leagues</Text>
      <View style={styles.top5Container}>
        {TOP_5_LEAGUES.map(league => {
          const isSelected = selectedLeagues.includes(league.id);
          return (
            <TouchableOpacity
              key={league.id}
              style={[
                styles.top5Card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: league.color, borderWidth: 2 },
              ]}
              onPress={() => toggleLeague(league.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.top5Flag, { backgroundColor: `${league.color}15` }]}>
                <Text style={styles.top5FlagText}>{league.flag}</Text>
              </View>
              <Text style={[styles.top5Name, { color: colors.text }]} numberOfLines={1}>{league.name}</Text>
              {isSelected && (
                <View style={[styles.top5Check, { backgroundColor: league.color }]}>
                  <Check size={10} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderContinentItem = (continent: Continent) => {
    const isExpanded = expandedContinent === continent.id;
    const continentLeagueIds = continent.countries.flatMap(c => c.competitions.map(comp => comp.id));
    const selectedInContinent = continentLeagueIds.filter(id => selectedLeagues.includes(id)).length;
    
    return (
      <View key={continent.id} style={[styles.continentContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.continentHeader}
          onPress={() => setExpandedContinent(isExpanded ? null : continent.id)}
          activeOpacity={0.7}
        >
          <View style={styles.continentInfo}>
            <Text style={styles.continentEmoji}>{continent.emoji}</Text>
            <View>
              <Text style={[styles.continentName, { color: colors.text }]}>{continent.name}</Text>
              <Text style={[styles.continentMeta, { color: colors.textSecondary }]}>
                {continent.countries.length} countries {'\u2022'} {selectedInContinent > 0 ? `${selectedInContinent} selected` : 'None selected'}
              </Text>
            </View>
          </View>
          <View style={styles.continentActions}>
            <TouchableOpacity
              style={[styles.selectAllBtn, { backgroundColor: isDark ? '#1E1B4B' : '#F1F5F9' }]}
              onPress={() => selectAllInContinent(continent)}
            >
              <Text style={styles.selectAllText}>
                {selectedInContinent === continentLeagueIds.length ? 'Clear' : 'All'}
              </Text>
            </TouchableOpacity>
            <ChevronDown
              size={20}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.countriesContainer, { borderTopColor: colors.divider }]}>
            {continent.countries.map(country => renderCountryItem(country, continent.id))}
          </View>
        )}
      </View>
    );
  };

  const renderCountryItem = (country: Country, continentId: string) => {
    const isExpanded = expandedCountry === `${continentId}-${country.id}`;
    const countryLeagueIds = country.competitions.map(c => c.id);
    const selectedInCountry = countryLeagueIds.filter(id => selectedLeagues.includes(id)).length;
    
    return (
      <View key={country.id} style={[styles.countryContainer, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.countryHeader, { backgroundColor: isDark ? colors.backgroundSecondary : '#FAFBFC' }]}
          onPress={() => setExpandedCountry(isExpanded ? null : `${continentId}-${country.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.countryInfo}>
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <Text style={[styles.countryName, { color: colors.text }]}>{country.name}</Text>
            {selectedInCountry > 0 && (
              <View style={styles.countryBadge}>
                <Text style={styles.countryBadgeText}>{selectedInCountry}</Text>
              </View>
            )}
          </View>
          <View style={styles.countryActions}>
            <TouchableOpacity
              style={[styles.countrySelectAll, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}
              onPress={() => selectAllInCountry(country)}
            >
              <Text style={styles.countrySelectAllText}>
                {selectedInCountry === countryLeagueIds.length ? '\u2713' : '+'}
              </Text>
            </TouchableOpacity>
            <ChevronRight
              size={16}
              color={colors.textTertiary}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.competitionsContainer, { backgroundColor: colors.surface }]}>
            {country.competitions.map(comp => renderCompetitionItem(comp))}
          </View>
        )}
      </View>
    );
  };

  const renderCompetitionItem = (comp: Competition) => {
    const isSelected = selectedLeagues.includes(comp.id);
    const isFavorite = favoriteLeagues.includes(comp.id);
    
    return (
      <TouchableOpacity
        key={comp.id}
        style={[
          styles.competitionItem,
          { borderBottomColor: isDark ? colors.divider : '#F8FAFC' },
          isSelected && { backgroundColor: isDark ? '#1E1B4B' : '#F0F0FF' },
        ]}
        onPress={() => toggleLeague(comp.id)}
        activeOpacity={0.7}
      >
        <View style={styles.competitionInfo}>
          <View style={[
            styles.competitionIcon,
            { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' },
            comp.type === 'cup' && { backgroundColor: isDark ? '#422006' : '#FEF3C7' },
            comp.type === 'international' && { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' },
          ]}>
            <Trophy size={14} color={isSelected ? '#FFF' : colors.textSecondary} />
          </View>
          <View style={styles.competitionText}>
            <Text style={[
              styles.competitionName,
              { color: colors.text },
              isSelected && styles.competitionNameSelected,
            ]}>
              {comp.name}
            </Text>
            {comp.tier && (
              <Text style={[styles.competitionTier, { color: colors.textTertiary }]}>Tier {comp.tier}</Text>
            )}
          </View>
        </View>
        <View style={styles.competitionActions}>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(comp.id)}
              style={styles.favoriteBtn}
            >
              <Star
                size={16}
                color={isFavorite ? '#FFD700' : colors.textTertiary}
                fill={isFavorite ? '#FFD700' : 'none'}
              />
            </TouchableOpacity>
          )}
          <View style={[
            styles.checkbox,
            { borderColor: isDark ? colors.border : '#CBD5E1' },
            isSelected && styles.checkboxSelected,
          ]}>
            {isSelected && <Check size={12} color="#FFF" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInternationalCompetitions = () => (
    <View style={styles.internationalContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>International Competitions</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Club & National Team tournaments</Text>
      
      <View style={styles.internationalGrid}>
        {filteredInternational.map(comp => {
          const isSelected = selectedLeagues.includes(comp.id);
          return (
            <TouchableOpacity
              key={comp.id}
              style={[
                styles.internationalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && styles.internationalCardSelected,
              ]}
              onPress={() => toggleLeague(comp.id)}
              activeOpacity={0.7}
            >
              <Globe size={18} color={isSelected ? '#FFF' : colors.textSecondary} />
              <Text style={[
                styles.internationalName,
                { color: colors.text },
                isSelected && styles.internationalNameSelected,
              ]} numberOfLines={2}>
                {comp.name}
              </Text>
              <Text style={[
                styles.internationalCountry,
                { color: colors.textSecondary },
                isSelected && styles.internationalCountrySelected,
              ]}>
                {comp.country}
              </Text>
              {isSelected && (
                <View style={styles.internationalCheck}>
                  <Check size={10} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }]}>
      {[
        { id: 'quick' as TabType, label: 'Quick', icon: Sparkles },
        { id: 'continents' as TabType, label: 'By Region', icon: MapPin },
        { id: 'international' as TabType, label: 'International', icon: Globe },
      ].map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => setActiveTab(tab.id)}
          activeOpacity={0.7}
        >
          <tab.icon size={16} color={activeTab === tab.id ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedCount > 0 && styles.filterButtonActive,
        ]}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
      >
        <Filter size={16} color={selectedCount > 0 ? '#3B82F6' : '#64748B'} strokeWidth={2.5} />
        <Text style={[
          styles.filterButtonText,
          selectedCount > 0 && styles.filterButtonTextActive,
        ]}>
          {selectedCount > 0 ? 'Leagues' : 'All Leagues'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="none"
        transparent
        onRequestClose={handleClose}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? colors.background : '#F8FAFC',
              paddingBottom: insets.bottom,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <View style={[styles.dragIndicator, { backgroundColor: isDark ? colors.border : '#CBD5E1' }]} />
            
            <View style={styles.headerContent}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Competitions</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedCount} {selectedCount === 1 ? 'league' : 'leagues'} selected
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search leagues, countries..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {renderTabs()}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'quick' && renderQuickFilters()}
            {activeTab === 'continents' && (
              <View style={styles.continentsSection}>
                {filteredData.map(renderContinentItem)}
              </View>
            )}
            {activeTab === 'international' && renderInternationalCompetitions()}
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
            <View style={styles.footerTopRow}>
              <TouchableOpacity
                style={[styles.savePrefsBtn, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#312E81' : '#C7D2FE' }]}
                onPress={savePreferences}
                activeOpacity={0.7}
              >
                <Save size={14} color={saveStatus === 'saved' ? '#10B981' : '#5352ED'} />
                <Text style={[
                  styles.savePrefsBtnText,
                  saveStatus === 'saved' && styles.savePrefsBtnTextSaved,
                ]}>
                  {saveStatus === 'saved' ? 'Saved!' : 'Save as Default'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loadPrefsBtn, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9', borderColor: colors.border }]}
                onPress={loadSavedPreferences}
                activeOpacity={0.7}
              >
                <RotateCcw size={14} color={colors.textSecondary} />
                <Text style={[styles.loadPrefsBtnText, { color: colors.textSecondary }]}>Load Saved</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.footerBottomRow}>
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }]}
                onPress={clearAll}
                disabled={selectedCount === 0}
              >
                <Text style={[styles.clearBtnText, { color: colors.textSecondary }, selectedCount === 0 && { color: colors.disabled }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.applyBtn} onPress={handleClose}>
                <LinearGradient
                  colors={['#5352ED', '#3742FA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGradient}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#3B82F6',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    borderRadius: 8,
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: '#5352ED',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tabTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quickFiltersContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  quickFiltersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickFilterCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    position: 'relative',
  },
  quickFilterIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickFilterName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quickFilterNameActive: {
    color: '#5352ED',
  },
  quickFilterCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5352ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  top5Container: {
    gap: 10,
  },
  top5Card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    minHeight: 56,
  },
  top5Flag: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top5FlagText: {
    fontSize: 18,
  },
  top5Name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  top5Check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continentsSection: {
    padding: 16,
    gap: 12,
  },
  continentContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  continentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  continentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  continentEmoji: {
    fontSize: 26,
    width: 32,
    textAlign: 'center',
  },
  continentName: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  continentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  continentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#5352ED',
  },
  countriesContainer: {
    borderTopWidth: 1,
  },
  countryContainer: {
    borderBottomWidth: 1,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  countryFlag: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  countryBadge: {
    backgroundColor: '#5352ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  countryBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  countryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countrySelectAll: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countrySelectAllText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#5352ED',
  },
  competitionsContainer: {},
  competitionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 48,
    borderBottomWidth: 1,
  },
  competitionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  competitionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  competitionText: {
    flex: 1,
  },
  competitionName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  competitionNameSelected: {
    color: '#5352ED',
    fontWeight: '600' as const,
  },
  competitionTier: {
    fontSize: 11,
    marginTop: 2,
  },
  competitionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5352ED',
    borderColor: '#5352ED',
  },
  internationalContainer: {
    padding: 16,
  },
  internationalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  internationalCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    position: 'relative',
    minHeight: 100,
  },
  internationalCardSelected: {
    backgroundColor: '#5352ED',
    borderColor: '#5352ED',
  },
  internationalName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 10,
    marginBottom: 4,
  },
  internationalNameSelected: {
    color: '#FFF',
  },
  internationalCountry: {
    fontSize: 12,
  },
  internationalCountrySelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  internationalCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  footerTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerBottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  savePrefsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  savePrefsBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#5352ED',
  },
  savePrefsBtnTextSaved: {
    color: '#10B981',
  },
  loadPrefsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadPrefsBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  clearBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
