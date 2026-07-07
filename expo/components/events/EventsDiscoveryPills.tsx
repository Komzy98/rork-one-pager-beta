import React, { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { EventsPalette } from '@/utils/eventsPalette';

export type DiscoveryTabKey = 'now' | 'near' | 'forYou' | 'thisWeek' | 'friendsPicks';

export interface DiscoveryPillTab {
  key: DiscoveryTabKey;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface EventsDiscoveryPillsProps {
  tabs: DiscoveryPillTab[];
  activeTab: DiscoveryTabKey;
  onTabChange: (tab: DiscoveryTabKey) => void;
  palette: EventsPalette;
}

export const EventsDiscoveryPills = React.memo(function EventsDiscoveryPills({
  tabs,
  activeTab,
  onTabChange,
  palette,
}: EventsDiscoveryPillsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Partial<Record<DiscoveryTabKey, { x: number; width: number }>>>({});

  const scrollActiveIntoView = useCallback((key: DiscoveryTabKey) => {
    const layout = tabLayouts.current[key];
    if (!layout || !scrollRef.current) return;
    const targetX = Math.max(0, layout.x - 12);
    scrollRef.current.scrollTo({ x: targetX, animated: true });
  }, []);

  useEffect(() => {
    scrollActiveIntoView(activeTab);
  }, [activeTab, scrollActiveIntoView]);

  const handleTabLayout = useCallback((key: DiscoveryTabKey, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[key] = { x, width };
  }, []);

  const handlePress = useCallback(
    async (key: DiscoveryTabKey) => {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      onTabChange(key);
    },
    [onTabChange],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onLayout={(event) => handleTabLayout(tab.key, event)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? palette.primaryLight : palette.card,
                borderColor: isActive ? palette.primary : palette.border,
              },
            ]}
            onPress={() => void handlePress(tab.key)}
            activeOpacity={0.75}
          >
            <Icon
              size={14}
              color={isActive ? tab.color : palette.textMuted}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text
              style={[
                styles.label,
                { color: isActive ? palette.text : palette.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 44,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
