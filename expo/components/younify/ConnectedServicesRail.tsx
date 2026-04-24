import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import type { YounifySourceServiceSnapshot } from "@/services/younify";
import {
  getYounifyRailPosterCellWidth,
  getYounifyStreamingContentPosterUrl,
} from "@/services/younify";
import YounifyPosterImage from "@/components/younify/YounifyPosterImage";
import YounifyServiceLogoMark from "@/components/younify/YounifyServiceLogoMark";

type YounifyContentItem = {
  id?: string | number;
  title?: string;
  name?: string;
  largeThumbnailUrl?: string;
  smallThumbnailUrl?: string;
  posterPath?: string;
  poster_path?: string;
  image?: string;
  imageUrl?: string;
  artwork?: string;
  artworkUrl?: string;
  younifySourceService?: YounifySourceServiceSnapshot;
  [key: string]: any;
};

type ConnectedServicesRailProps = {
  content: YounifyContentItem[];
  loading: boolean;
  /** From `fetchLinkedServices` — drives connect banner vs personalised rail */
  hasLinkedServices: boolean;
  /** When ≥ 2, show provider logo on each card (needs `younifySourceService` on items). */
  linkedStreamingCount: number;
};

/** Portrait tile (~2:3); width scales with phone width so art is not oversized */
const SKELETON_COUNT = 4;

export default function ConnectedServicesRail({
  content,
  loading,
  hasLinkedServices,
  linkedStreamingCount,
}: ConnectedServicesRailProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => getYounifyRailPosterCellWidth(windowWidth), [windowWidth]);

  const normalizedContent = useMemo(() => {
    if (!Array.isArray(content)) return [];
    return content;
  }, [content]);

  const renderSkeletonCard = (_: unknown, index: number) => (
    <View key={`skeleton-${index}`} style={[styles.card, { width: cardWidth }]}>
      <View style={[styles.posterWrap, { aspectRatio: 2 / 3 }]}>
        <View style={styles.posterSkeleton} />
      </View>
      <View style={styles.titleSkeleton} />
      <View style={styles.badgeSkeleton} />
    </View>
  );

  const showProviderLogo = linkedStreamingCount >= 2;

  const renderItem = ({ item }: { item: YounifyContentItem }) => {
    const rawTitle = String(item.title ?? item.name ?? "").trim();
    const title = rawTitle || "Untitled";
    const thumbUrl = getYounifyStreamingContentPosterUrl(item);
    const svc = item.younifySourceService;

    return (
      <View style={[styles.card, { width: cardWidth }]}>
        <View style={styles.posterWrap}>
          <YounifyPosterImage
            thumbnailUrl={thumbUrl ?? ""}
            tmdbFallbackTitle={rawTitle.length >= 2 ? rawTitle : null}
          />
          {showProviderLogo && svc ? (
            <View style={styles.logoMark} pointerEvents="none">
              <YounifyServiceLogoMark service={svc} size={Math.max(22, Math.round(cardWidth * 0.22))} />
            </View>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>On your services</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View>
        <Text style={styles.heading}>From your services</Text>
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          horizontal
          keyExtractor={(_, index) => `loading-${index}`}
          renderItem={({ item, index }) => renderSkeletonCard(item, index)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  if (!hasLinkedServices) {
    return (
      <View>
        <Text style={styles.heading}>From your services</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Connect streaming services to unlock personalised recommendations
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
            onPress={() => router.push("/(root)/streaming-services")}
          >
            <Text style={styles.emptyButtonText}>Connect services</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!normalizedContent.length) {
    return (
      <View>
        <Text style={styles.heading}>From your services</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            You’re connected. Recommendations will appear here when available.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
            onPress={() => router.push("/(root)/streaming-services")}
          >
            <Text style={styles.emptyButtonText}>Manage services</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.heading}>From your services</Text>
      <FlatList
        data={normalizedContent}
        horizontal
        keyExtractor={(item, index) => String(item.id ?? `${item.title ?? item.name ?? "item"}-${index}`)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: "#F5F5F7",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  listContent: {
    gap: 8,
    paddingRight: 6,
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "#10141C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  /** Height comes from YounifyPosterImage (intrinsic aspect); fallback uses 2:3 */
  posterWrap: {
    position: "relative",
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#0B0E14",
  },
  logoMark: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },
  title: {
    color: "#F4F6FA",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#171B26",
    borderWidth: 1,
    borderColor: "#2A3247",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#CFD7FF",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#10141C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  emptyText: {
    color: "#96A0B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: "#7C8CFF",
    borderColor: "#8E9BFF",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyButtonPressed: {
    opacity: 0.88,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  posterSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A2030",
  },
  titleSkeleton: {
    width: "80%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#1A2030",
    marginBottom: 8,
  },
  badgeSkeleton: {
    width: 92,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#1A2030",
  },
});
