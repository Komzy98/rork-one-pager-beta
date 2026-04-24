import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import {
  type YounifyBrowseSection,
  getYounifyRailPosterCellWidth,
  getYounifyStreamingContentPosterUrl,
} from "@/services/younify";
import YounifyPosterImage from "@/components/younify/YounifyPosterImage";
import YounifyServiceLogoMark from "@/components/younify/YounifyServiceLogoMark";

type Props = {
  sections: YounifyBrowseSection[];
  loading: boolean;
  hasLinkedServices: boolean;
  linkedStreamingCount: number;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export default function StreamingServicesBrowseTab({
  sections,
  loading,
  hasLinkedServices,
  linkedStreamingCount,
  refreshing = false,
  onRefresh,
}: Props) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth = useMemo(() => getYounifyRailPosterCellWidth(windowWidth), [windowWidth]);
  const showProviderLogo = linkedStreamingCount >= 2;

  if (!hasLinkedServices) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Link a streaming service</Text>
        <Text style={styles.emptySubtitle}>
          Connect Netflix or other providers to see continue watching, trending rows, and more.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={() => router.push("/(root)/streaming-services")}
        >
          <Text style={styles.primaryBtnText}>Manage streaming services</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Loading your libraries…</Text>
      </View>
    );
  }

  const visibleSections = sections.filter((s) => s.items.length > 0);

  if (!visibleSections.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No rows yet</Text>
        <Text style={styles.emptySubtitle}>
          Open the provider app and watch something, then pull to refresh — or try again later.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          onPress={() => router.push("/(root)/streaming-services")}
        >
          <Text style={styles.secondaryBtnText}>Service settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#E50914"
          />
        ) : undefined
      }
    >
      {visibleSections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <FlatList
            horizontal
            data={section.items}
            keyExtractor={(item, index) =>
              String((item as any)?.itemID ?? (item as any)?.id ?? `${section.id}-${index}`)
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
            renderItem={({ item }) => {
              const row = item as Record<string, any>;
              const rawTitle = String(row.title ?? row.name ?? "").trim();
              const title = rawTitle || "Untitled";
              const thumb = getYounifyStreamingContentPosterUrl(row);
              const watchUrl =
                typeof row.watchNowUrl === "string" && row.watchNowUrl.trim()
                  ? row.watchNowUrl.trim()
                  : null;
              const svc = row.younifySourceService;

              return (
                <Pressable
                  style={({ pressed }) => [{ width: tileWidth }, pressed && styles.cardPressed]}
                  onPress={() => {
                    if (watchUrl) void Linking.openURL(watchUrl);
                  }}
                >
                  <View style={[styles.posterWrap, { width: tileWidth }]}>
                    <YounifyPosterImage
                      thumbnailUrl={thumb ?? ""}
                      tmdbFallbackTitle={rawTitle.length >= 2 ? rawTitle : null}
                    />
                    {showProviderLogo && svc ? (
                      <View style={styles.logoMark} pointerEvents="none">
                        <YounifyServiceLogoMark
                          service={svc}
                          size={Math.max(22, Math.round(tileWidth * 0.22))}
                        />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {title}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#08080C",
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
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
  centered: {
    flex: 1,
    backgroundColor: "#08080C",
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#F5F5F7",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    color: "#8E8E9A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
  primaryBtn: {
    backgroundColor: "#7C8CFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#3D4558",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnPressed: {
    opacity: 0.88,
  },
  secondaryBtnText: {
    color: "#CFD7FF",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#08080C",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 14,
    color: "#8E8E9A",
    fontSize: 14,
    fontWeight: "600",
  },
});
