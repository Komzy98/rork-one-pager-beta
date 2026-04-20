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
  FlatList,
  Platform,
} from 'react-native';
import {
  X,
  Search,
  ChevronDown,
  Globe,
  Trophy,
  Check,
  Star,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import {
  COMPETITIONS_DATA,
  INTERNATIONAL_COMPETITIONS,
  Country,
  Continent,
} from '@/constants/competitions';


interface CompetitionFilterProps {
  selectedLeagues: number[];
  onLeaguesChange: (leagues: number[]) => void;
  favoriteLeagues?: number[];
  onToggleFavorite?: (leagueId: number) => void;
  onPreferencesSaved?: () => void;
  isDark: boolean;
}

const SAVED_LEAGUES_KEY = 'sports_selected_leagues';

interface QuickChip {
  id: string;
  label: string;
  emoji: string;
  leagueIds: number[];
  color: string;
}

const QUICK_CHIPS: QuickChip[] = [
  { id: 'epl', label: 'EPL', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueIds: [39], color: '#3D195B' },
  { id: 'laliga', label: 'La Liga', emoji: '🇪🇸', leagueIds: [140], color: '#EE324E' },
  { id: 'bundesliga', label: 'Bundesliga', emoji: '🇩🇪', leagueIds: [78], color: '#D20515' },
  { id: 'seriea', label: 'Serie A', emoji: '🇮🇹', leagueIds: [135], color: '#008C45' },
  { id: 'ligue1', label: 'Ligue 1', emoji: '🇫🇷', leagueIds: [61], color: '#1F4096' },
  { id: 'ucl', label: 'UCL', emoji: '🏆', leagueIds: [2], color: '#0D1541' },
  { id: 'uel', label: 'UEL', emoji: '🥈', leagueIds: [3], color: '#F77B0B' },
  { id: 'uecl', label: 'UECL', emoji: '🟢', leagueIds: [848], color: '#00A651' },
  { id: 'mls', label: 'MLS', emoji: '🇺🇸', leagueIds: [253], color: '#0C2340' },
  { id: 'ligamx', label: 'Liga MX', emoji: '🇲🇽', leagueIds: [262], color: '#00563F' },
  { id: 'eredivisie', label: 'Eredivisie', emoji: '🇳🇱', leagueIds: [88], color: '#E87722' },
  { id: 'primeira', label: 'Primeira', emoji: '🇵🇹', leagueIds: [94], color: '#006600' },
  { id: 'superlig', label: 'Süper Lig', emoji: '🇹🇷', leagueIds: [203], color: '#E30A17' },
  { id: 'spl', label: 'Saudi PL', emoji: '🇸🇦', leagueIds: [307], color: '#006C35' },
  { id: 'brseriea', label: 'Série A', emoji: '🇧🇷', leagueIds: [71], color: '#009C3B' },
  { id: 'argentina', label: 'Primera', emoji: '🇦🇷', leagueIds: [128], color: '#6CACE4' },
  { id: 'afcon', label: 'AFCON', emoji: '🌍', leagueIds: [6], color: '#009639' },
  { id: 'libertadores', label: 'Libertadores', emoji: '🏆', leagueIds: [13], color: '#1C1C1C' },
  { id: 'worldcup', label: 'World Cup', emoji: '🌍', leagueIds: [1, 15, 16, 17, 18, 19, 20], color: '#56042C' },
  { id: 'euro', label: 'Euro', emoji: '🇪🇺', leagueIds: [4, 960, 5], color: '#003399' },
];

const PRESET_FILTERS = [
  { id: 'top5', label: 'Top 5 Leagues', leagueIds: [39, 140, 78, 135, 61], emoji: '⭐' },
  { id: 'european_cups', label: 'European Cups', leagueIds: [2, 3, 848], emoji: '🏆' },
  { id: 'south_america', label: 'South America', leagueIds: [71, 128, 13, 14, 9], emoji: '🌎' },
  { id: 'africa_all', label: 'African Football', leagueIds: [6, 12, 36, 233, 200, 288, 332], emoji: '🌍' },
  { id: 'world_all', label: 'All International', leagueIds: INTERNATIONAL_COMPETITIONS.map(c => c.id), emoji: '🌐' },
];

export default function CompetitionFilter({
  selectedLeagues,
  onLeaguesChange,
  favoriteLeagues = [],
  onToggleFavorite,
  onPreferencesSaved,
  isDark,
}: CompetitionFilterProps) {
  const insets = useSafeAreaInsets();
  useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContinent, setExpandedContinent] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'presets' | 'browse' | 'international'>('presets');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isModalVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [isModalVisible, slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setIsModalVisible(false));
  }, [slideAnim, fadeAnim]);

  const isChipActive = useCallback((chip: QuickChip) => {
    return chip.leagueIds.every(id => selectedLeagues.includes(id));
  }, [selectedLeagues]);

  const isChipPartial = useCallback((chip: QuickChip) => {
    return chip.leagueIds.some(id => selectedLeagues.includes(id)) && !chip.leagueIds.every(id => selectedLeagues.includes(id));
  }, [selectedLeagues]);

  const handleChipPress = useCallback(async (chip: QuickChip) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const allSelected = chip.leagueIds.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !chip.leagueIds.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...chip.leagueIds])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const handleClearAll = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLeaguesChange([]);
  }, [onLeaguesChange]);

  const handleMorePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsModalVisible(true);
  }, []);

  const toggleLeague = useCallback((leagueId: number) => {
    if (selectedLeagues.includes(leagueId)) {
      onLeaguesChange(selectedLeagues.filter(id => id !== leagueId));
    } else {
      onLeaguesChange([...selectedLeagues, leagueId]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const handlePresetPress = useCallback(async (preset: typeof PRESET_FILTERS[0]) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const allSelected = preset.leagueIds.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !preset.leagueIds.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...preset.leagueIds])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const selectAllInCountry = useCallback((country: Country) => {
    const ids = country.competitions.map(c => c.id);
    const allSelected = ids.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !ids.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...ids])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const selectAllInContinent = useCallback((continent: Continent) => {
    const ids = continent.countries.flatMap(c => c.competitions.map(comp => comp.id));
    const allSelected = ids.every(id => selectedLeagues.includes(id));
    if (allSelected) {
      onLeaguesChange(selectedLeagues.filter(id => !ids.includes(id)));
    } else {
      onLeaguesChange([...new Set([...selectedLeagues, ...ids])]);
    }
  }, [selectedLeagues, onLeaguesChange]);

  const savePreferences = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SAVED_LEAGUES_KEY, JSON.stringify(selectedLeagues));
      onPreferencesSaved?.();
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      console.log('[CompetitionFilter] Preferences saved:', selectedLeagues.length);
    } catch (e) {
      console.log('[CompetitionFilter] Failed to save:', e);
    }
  }, [selectedLeagues, onPreferencesSaved]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return COMPETITIONS_DATA;
    const query = searchQuery.toLowerCase();
    return COMPETITIONS_DATA.map(continent => ({
      ...continent,
      countries: continent.countries.map(country => ({
        ...country,
        competitions: country.competitions.filter(
          comp => comp.name.toLowerCase().includes(query) || comp.country.toLowerCase().includes(query)
        ),
      })).filter(country => country.competitions.length > 0 || country.name.toLowerCase().includes(query)),
    })).filter(continent => continent.countries.length > 0);
  }, [searchQuery]);

  const filteredInternational = useMemo(() => {
    if (!searchQuery.trim()) return INTERNATIONAL_COMPETITIONS;
    const query = searchQuery.toLowerCase();
    return INTERNATIONAL_COMPETITIONS.filter(
      comp => comp.name.toLowerCase().includes(query) || comp.country.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedCount = selectedLeagues.length;

  const renderChip = useCallback(({ item }: { item: QuickChip }) => {
    const active = isChipActive(item);
    const partial = isChipPartial(item);

    return (
      <TouchableOpacity
        onPress={() => handleChipPress(item)}
        activeOpacity={0.7}
        style={[
          chipStyles.chip,
          { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
          { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
          active && { backgroundColor: item.color + (isDark ? '30' : '18'), borderColor: item.color + '50' },
          partial && { borderColor: item.color + '40', borderStyle: 'dashed' as const },
        ]}
      >
        <Text style={chipStyles.chipEmoji}>{item.emoji}</Text>
        <Text
          style={[
            chipStyles.chipLabel,
            { color: isDark ? '#B0B0C8' : '#4A4A60' },
            active && { color: isDark ? '#FFFFFF' : item.color, fontWeight: '700' as const },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {active && (
          <View style={[chipStyles.chipCheck, { backgroundColor: item.color }]}>
            <Check size={8} color="#FFF" strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [isDark, isChipActive, isChipPartial, handleChipPress]);

  const chipKeyExtractor = useCallback((item: QuickChip) => item.id, []);

  const renderContinentItem = (continent: Continent) => {
    const isExpanded = expandedContinent === continent.id;
    const ids = continent.countries.flatMap(c => c.competitions.map(comp => comp.id));
    const selectedInContinent = ids.filter(id => selectedLeagues.includes(id)).length;

    return (
      <View key={continent.id} style={[modalStyles.continentCard, { backgroundColor: isDark ? '#151528' : '#FFFFFF' }]}>
        <TouchableOpacity
          style={modalStyles.continentHeader}
          onPress={() => setExpandedContinent(isExpanded ? null : continent.id)}
          activeOpacity={0.7}
        >
          <View style={modalStyles.continentLeft}>
            <Text style={modalStyles.continentEmoji}>{continent.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[modalStyles.continentName, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>{continent.name}</Text>
              <Text style={[modalStyles.continentMeta, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                {continent.countries.length} countries
                {selectedInContinent > 0 ? ` · ${selectedInContinent} selected` : ''}
              </Text>
            </View>
          </View>
          <View style={modalStyles.continentRight}>
            <TouchableOpacity
              style={[modalStyles.selectAllPill, { backgroundColor: isDark ? '#1E1E38' : '#F0F0F5' }]}
              onPress={() => selectAllInContinent(continent)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[modalStyles.selectAllText, { color: selectedInContinent === ids.length ? '#EF4444' : '#007AFF' }]}>
                {selectedInContinent === ids.length ? 'Clear' : 'All'}
              </Text>
            </TouchableOpacity>
            <ChevronDown
              size={18}
              color={isDark ? '#52526E' : '#AEAEB2'}
              style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[modalStyles.countriesList, { borderTopColor: isDark ? '#1E1E38' : '#F0F0F5' }]}>
            {continent.countries.map(country => renderCountryItem(country, continent.id))}
          </View>
        )}
      </View>
    );
  };

  const renderCountryItem = (country: Country, continentId: string) => {
    const isExpanded = expandedCountry === `${continentId}-${country.id}`;
    const countryIds = country.competitions.map(c => c.id);
    const selectedInCountry = countryIds.filter(id => selectedLeagues.includes(id)).length;

    return (
      <View key={country.id}>
        <TouchableOpacity
          style={[modalStyles.countryRow, { backgroundColor: isDark ? '#12122A' : '#FAFBFC' }]}
          onPress={() => setExpandedCountry(isExpanded ? null : `${continentId}-${country.id}`)}
          activeOpacity={0.7}
        >
          <Text style={modalStyles.countryFlag}>{country.flag}</Text>
          <Text style={[modalStyles.countryName, { color: isDark ? '#C8C8DA' : '#1C1C1E' }]}>{country.name}</Text>
          {selectedInCountry > 0 && (
            <View style={modalStyles.countryBadge}>
              <Text style={modalStyles.countryBadgeText}>{selectedInCountry}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[modalStyles.countrySelectAll, { backgroundColor: isDark ? '#1E1E38' : '#EEF2FF' }]}
            onPress={() => selectAllInCountry(country)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={modalStyles.countrySelectAllText}>
              {selectedInCountry === countryIds.length ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
          <ChevronRight
            size={14}
            color={isDark ? '#3A3A5A' : '#D1D5DB'}
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {isExpanded && country.competitions.map(comp => {
          const isSelected = selectedLeagues.includes(comp.id);
          const isFav = favoriteLeagues.includes(comp.id);
          return (
            <TouchableOpacity
              key={comp.id}
              style={[
                modalStyles.compItem,
                { backgroundColor: isSelected ? (isDark ? '#1A1A3A' : '#F0F0FF') : 'transparent' },
              ]}
              onPress={() => toggleLeague(comp.id)}
              activeOpacity={0.7}
            >
              <View style={[
                modalStyles.compIcon,
                { backgroundColor: isDark ? '#1A1A32' : '#F1F5F9' },
                comp.type === 'cup' && { backgroundColor: isDark ? '#2A1F0A' : '#FEF3C7' },
              ]}>
                <Trophy size={12} color={isSelected ? '#007AFF' : (isDark ? '#52526E' : '#AEAEB2')} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  modalStyles.compName,
                  { color: isDark ? '#C8C8DA' : '#1C1C1E' },
                  isSelected && { color: '#007AFF', fontWeight: '700' as const },
                ]}>{comp.name}</Text>
                {comp.tier && (
                  <Text style={[modalStyles.compTier, { color: isDark ? '#44445E' : '#AEAEB2' }]}>Tier {comp.tier}</Text>
                )}
              </View>
              {onToggleFavorite && (
                <TouchableOpacity onPress={() => onToggleFavorite(comp.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Star size={14} color={isFav ? '#FFD700' : (isDark ? '#3A3A5A' : '#D1D5DB')} fill={isFav ? '#FFD700' : 'none'} />
                </TouchableOpacity>
              )}
              <View style={[
                modalStyles.compCheckbox,
                { borderColor: isDark ? '#2A2A44' : '#CBD5E1' },
                isSelected && { backgroundColor: '#007AFF', borderColor: '#007AFF' },
              ]}>
                {isSelected && <Check size={10} color="#FFF" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={chipStyles.container}>
      <View style={chipStyles.chipBar}>
        {selectedCount > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            activeOpacity={0.7}
            style={[chipStyles.clearChip, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }]}
          >
            <X size={12} color="#EF4444" strokeWidth={3} />
            <Text style={chipStyles.clearChipText}>{selectedCount}</Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={QUICK_CHIPS}
          renderItem={renderChip}
          keyExtractor={chipKeyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={chipStyles.chipListContent}
        />

        <TouchableOpacity
          onPress={handleMorePress}
          activeOpacity={0.7}
          style={[
            chipStyles.moreChip,
            { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
          ]}
        >
          <SlidersHorizontal size={14} color={isDark ? '#7B7B95' : '#6B7A99'} />
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} animationType="none" transparent onRequestClose={handleClose}>
        <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            modalStyles.sheet,
            {
              backgroundColor: isDark ? '#0D0D1A' : '#F8FAFC',
              paddingBottom: insets.bottom,
              transform: [{
                translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
              }],
            },
          ]}
        >
          <View style={[modalStyles.sheetHeader, { borderBottomColor: isDark ? '#1E1E38' : '#E5E7EB' }]}>
            <View style={[modalStyles.dragHandle, { backgroundColor: isDark ? '#2A2A44' : '#CBD5E1' }]} />
            <View style={modalStyles.headerRow}>
              <View>
                <Text style={[modalStyles.sheetTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Filter Leagues</Text>
                <Text style={[modalStyles.sheetSubtitle, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                  {selectedCount} selected
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
                <X size={20} color={isDark ? '#7B7B95' : '#8E8E93'} />
              </TouchableOpacity>
            </View>

            <View style={[modalStyles.searchBox, { backgroundColor: isDark ? '#151528' : '#F1F5F9' }]}>
              <Search size={16} color={isDark ? '#52526E' : '#AEAEB2'} />
              <TextInput
                style={[modalStyles.searchInput, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}
                placeholder="Search leagues, countries..."
                placeholderTextColor={isDark ? '#44445E' : '#AEAEB2'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={isDark ? '#52526E' : '#AEAEB2'} />
                </TouchableOpacity>
              )}
            </View>

            <View style={[modalStyles.tabRow, { backgroundColor: isDark ? '#111122' : '#EAEAF0' }]}>
              {([
                { id: 'presets' as const, label: 'Presets', icon: Sparkles },
                { id: 'browse' as const, label: 'Browse', icon: Globe },
                { id: 'international' as const, label: 'Intl', icon: Trophy },
              ]).map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[modalStyles.tab, modalTab === tab.id && modalStyles.tabActive]}
                  onPress={() => setModalTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <tab.icon size={14} color={modalTab === tab.id ? '#FFF' : (isDark ? '#6B6B85' : '#8E8E93')} />
                  <Text style={[
                    modalStyles.tabLabel,
                    { color: isDark ? '#6B6B85' : '#8E8E93' },
                    modalTab === tab.id && modalStyles.tabLabelActive,
                  ]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ScrollView
            style={modalStyles.scrollArea}
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {modalTab === 'presets' && (
              <View style={modalStyles.presetsSection}>
                <Text style={[modalStyles.sectionLabel, { color: isDark ? '#7B7B95' : '#6B7A99' }]}>QUICK PRESETS</Text>
                {PRESET_FILTERS.map(preset => {
                  const allActive = preset.leagueIds.every(id => selectedLeagues.includes(id));
                  const someActive = preset.leagueIds.some(id => selectedLeagues.includes(id));
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        modalStyles.presetRow,
                        { backgroundColor: isDark ? '#151528' : '#FFFFFF' },
                        allActive && { backgroundColor: isDark ? '#0D1A3A' : '#EFF6FF', borderColor: '#007AFF30' },
                      ]}
                      onPress={() => handlePresetPress(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={modalStyles.presetEmoji}>{preset.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          modalStyles.presetLabel,
                          { color: isDark ? '#E4E4ED' : '#1C1C1E' },
                          allActive && { color: '#007AFF' },
                        ]}>{preset.label}</Text>
                        <Text style={[modalStyles.presetCount, { color: isDark ? '#52526E' : '#AEAEB2' }]}>
                          {preset.leagueIds.length} league{preset.leagueIds.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={[
                        modalStyles.presetCheck,
                        { borderColor: isDark ? '#2A2A44' : '#CBD5E1' },
                        allActive && { backgroundColor: '#007AFF', borderColor: '#007AFF' },
                        someActive && !allActive && { borderColor: '#007AFF' },
                      ]}>
                        {allActive && <Check size={12} color="#FFF" strokeWidth={3} />}
                        {someActive && !allActive && <View style={modalStyles.presetPartialDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <Text style={[modalStyles.sectionLabel, { color: isDark ? '#7B7B95' : '#6B7A99', marginTop: 24 }]}>POPULAR LEAGUES</Text>
                {QUICK_CHIPS.slice(0, 10).map(chip => {
                  const active = chip.leagueIds.every(id => selectedLeagues.includes(id));
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        modalStyles.presetRow,
                        { backgroundColor: isDark ? '#151528' : '#FFFFFF' },
                        active && { backgroundColor: chip.color + (isDark ? '18' : '0A'), borderColor: chip.color + '30' },
                      ]}
                      onPress={() => handleChipPress(chip)}
                      activeOpacity={0.7}
                    >
                      <Text style={modalStyles.presetEmoji}>{chip.emoji}</Text>
                      <Text style={[
                        modalStyles.presetLabel,
                        { color: isDark ? '#E4E4ED' : '#1C1C1E', flex: 1 },
                        active && { color: chip.color },
                      ]}>{chip.label}</Text>
                      <View style={[
                        modalStyles.presetCheck,
                        { borderColor: isDark ? '#2A2A44' : '#CBD5E1' },
                        active && { backgroundColor: chip.color, borderColor: chip.color },
                      ]}>
                        {active && <Check size={12} color="#FFF" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {modalTab === 'browse' && (
              <View style={modalStyles.browseSection}>
                {filteredData.map(renderContinentItem)}
              </View>
            )}

            {modalTab === 'international' && (
              <View style={modalStyles.intlSection}>
                <Text style={[modalStyles.sectionLabel, { color: isDark ? '#7B7B95' : '#6B7A99' }]}>INTERNATIONAL COMPETITIONS</Text>
                {filteredInternational.map(comp => {
                  const isSelected = selectedLeagues.includes(comp.id);
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={[
                        modalStyles.intlRow,
                        { backgroundColor: isDark ? '#151528' : '#FFFFFF' },
                        isSelected && { backgroundColor: isDark ? '#0D1A3A' : '#EFF6FF' },
                      ]}
                      onPress={() => toggleLeague(comp.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[modalStyles.intlIcon, { backgroundColor: isDark ? '#1A1A32' : '#F1F5F9' }]}>
                        <Globe size={14} color={isSelected ? '#007AFF' : (isDark ? '#52526E' : '#AEAEB2')} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          modalStyles.intlName,
                          { color: isDark ? '#E4E4ED' : '#1C1C1E' },
                          isSelected && { color: '#007AFF', fontWeight: '700' as const },
                        ]}>{comp.name}</Text>
                        <Text style={[modalStyles.intlRegion, { color: isDark ? '#44445E' : '#AEAEB2' }]}>{comp.country}</Text>
                      </View>
                      <View style={[
                        modalStyles.compCheckbox,
                        { borderColor: isDark ? '#2A2A44' : '#CBD5E1' },
                        isSelected && { backgroundColor: '#007AFF', borderColor: '#007AFF' },
                      ]}>
                        {isSelected && <Check size={10} color="#FFF" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={[modalStyles.footer, { backgroundColor: isDark ? '#0D0D1A' : '#F8FAFC', borderTopColor: isDark ? '#1E1E38' : '#E5E7EB' }]}>
            <TouchableOpacity
              style={[modalStyles.footerSecondary, { backgroundColor: isDark ? '#151528' : '#F1F5F9' }]}
              onPress={handleClearAll}
              disabled={selectedCount === 0}
              activeOpacity={0.7}
            >
              <Text style={[
                modalStyles.footerSecondaryText,
                { color: isDark ? '#7B7B95' : '#6B7A99' },
                selectedCount === 0 && { opacity: 0.4 },
              ]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.footerSecondary, { backgroundColor: isDark ? '#151528' : '#F1F5F9' }]}
              onPress={savePreferences}
              activeOpacity={0.7}
            >
              <Text style={[modalStyles.footerSecondaryText, { color: '#007AFF' }]}>Save Default</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.footerPrimary} onPress={handleClose} activeOpacity={0.85}>
              <LinearGradient
                colors={['#007AFF', '#0055D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={modalStyles.footerPrimaryGradient}
              >
                <Text style={modalStyles.footerPrimaryText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 6,
  },
  chipListContent: {
    gap: 6,
    paddingRight: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  chipCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  clearChipText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#EF4444',
  },
  moreChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 20,
    flexShrink: 0,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 5,
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tabLabelActive: {
    color: '#FFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  presetsSection: {
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  presetCount: {
    fontSize: 12,
    marginTop: 1,
  },
  presetCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetPartialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  browseSection: {
    padding: 16,
    gap: 10,
  },
  continentCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  continentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  continentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  continentEmoji: {
    fontSize: 24,
    width: 28,
    textAlign: 'center',
  },
  continentName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  continentMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  continentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  countriesList: {
    borderTopWidth: 1,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 8,
  },
  countryFlag: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  countryName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  countryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countryBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  countrySelectAll: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countrySelectAllText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  compItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingLeft: 50,
    gap: 10,
  },
  compIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  compTier: {
    fontSize: 11,
    marginTop: 1,
  },
  compCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intlSection: {
    padding: 16,
    gap: 6,
  },
  intlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  intlIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intlName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  intlRegion: {
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
  },
  footerSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSecondaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  footerPrimary: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footerPrimaryGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerPrimaryText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
