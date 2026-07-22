import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import {
  getYounifyRailPosterCellWidth,
  type YounifyBrowseSection,
} from "@/services/younify";
import {
  formatContinueWatchingMeta,
  openYounifyBrowseItemOnPlatform,
} from "@/utils/streamingLinks";
import TmdbStreamingPosterImage from "@/components/younify/TmdbStreamingPosterImage";
import YounifyServiceLogoMark from "@/components/younify/YounifyServiceLogoMark";

type Props = {
  section: YounifyBrowseSection;
  linkedStreamingCount: number;
  /** For non–Continue Watching rows: open in-app title details instead of provider deep link. */
  onItemOpenDetails?: (row: Record<string, unknown>) => void | Promise<void>;
  onDismissContinueWatching?: (row: Record<string, unknown>, fallbackKey: string) => void;
};

export default function YounifyBrowseSectionRow({
  section,
  linkedStreamingCount,
  onItemOpenDetails,
  onDismissContinueWatching,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth = useMemo(() => getYounifyRailPosterCellWidth(windowWidth), [windowWidth]);
  const showProviderLogo = linkedStreamingCount >= 2;

  const openShowOnStreamingPlatform = useCallback(
    async (row: Record<string, unknown>, sectionId: string) => {
      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          /* ignore */
        }
      }
      await openYounifyBrowseItemOnPlatform(row, { sectionId });
    },
    [],
  );

  const onTilePress = useCallback(
    async (row: Record<string, unknown>) => {
      if (section.id === "continue") {
        await openShowOnStreamingPlatform(row, section.id);
        return;
      }
      if (onItemOpenDetails) {
        if (Platform.OS !== "web") {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            /* ignore */
          }
        }
        await onItemOpenDetails(row);
        return;
      }
      await openShowOnStreamingPlatform(row, section.id);
    },
    [section.id, onItemOpenDetails, openShowOnStreamingPlatform],
  );

  if (!section.items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(item, index) =>
          String((item as any)?.itemID ?? (item as any)?.id ?? `${section.id}-${index}`)
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
        renderItem={({ item, index }) => {
          const row = item as Record<string, any>;
          const rawTitle = String(row.title ?? row.name ?? "").trim();
          const title = rawTitle || "Untitled";
          const svc = row.younifySourceService;
          const continueMeta =
            section.id === "continue" ? formatContinueWatchingMeta(row) : null;
          const rowKey = String(row?.itemID ?? row?.id ?? `${section.id}-${index}`);
          const showDismiss = section.id === "continue" && !!onDismissContinueWatching;

          return (
            <View style={{ width: tileWidth }}>
              <View style={[styles.posterWrap, { width: tileWidth }]}>
                <Pressable
                  style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.cardPressed]}
                  onPress={() => void onTilePress(row)}
                >
                  <TmdbStreamingPosterImage younifyRow={row} width={tileWidth} />
                </Pressable>
                {showProviderLogo && svc ? (
                  <View style={styles.logoMark} pointerEvents="none">
                    <YounifyServiceLogoMark
                      service={svc}
                      size={Math.max(22, Math.round(tileWidth * 0.22))}
                    />
                  </View>
                ) : null}
                {showDismiss ? (
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title} from Continue watching`}
                    onPress={() => onDismissContinueWatching!(row, rowKey)}
                    activeOpacity={0.85}
                  >
                    <X size={12} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Pressable
                style={({ pressed }) => [pressed && styles.cardPressed]}
                onPress={() => void onTilePress(row)}
              >
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {title}
                </Text>
                {continueMeta ? (
                  <Text style={styles.cardMeta} numberOfLines={2}>
                    {continueMeta}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: "#F5F5F7",
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  rowContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "flex-start",
  },
  cardPressed: {
    opacity: 0.92,
  },
  posterWrap: {
    position: "relative",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#0B0E14",
    marginBottom: 8,
  },
  dismissBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    position: "absolute",
    right: 5,
    bottom: 5,
  },
  cardTitle: {
    color: "#E8EAEF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  cardMeta: {
    marginTop: 4,
    color: "#8E8E9A",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
});
