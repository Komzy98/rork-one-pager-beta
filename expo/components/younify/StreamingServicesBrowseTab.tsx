import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Animated as RNAnimated } from "react-native";
import { useRouter } from "expo-router";
import { type YounifyBrowseSection, type YounifyStreamingLoadProgress } from "@/services/younify";
import YounifyBrowseSectionRow from "@/components/younify/YounifyBrowseSectionRow";
import StreamingLoadProgressBar from "@/components/younify/StreamingLoadProgressBar";

type Props = {
  sections: YounifyBrowseSection[];
  loading: boolean;
  hasLinkedServices: boolean;
  linkedStreamingCount: number;
  loadProgress?: YounifyStreamingLoadProgress | null;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  header?: React.ReactNode;
  onBrowseItemOpenDetails?: (row: Record<string, unknown>) => void | Promise<void>;
};

export default function StreamingServicesBrowseTab({
  sections,
  loading,
  hasLinkedServices,
  linkedStreamingCount,
  loadProgress,
  refreshing = false,
  onRefresh,
  header,
  onBrowseItemOpenDetails,
}: Props) {
  const router = useRouter();
  const streamingScrollY = React.useRef(new RNAnimated.Value(0)).current;
  const headerTranslateY = streamingScrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -18],
    extrapolate: "clamp",
  });
  const headerScale = streamingScrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });
  const headerOpacity = streamingScrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  });

  const renderAnimatedHeader = header ? (
    <RNAnimated.View
      style={{
        transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
        opacity: headerOpacity,
      }}
    >
      {header}
    </RNAnimated.View>
  ) : null;

  if (!hasLinkedServices) {
    // Single CTA lives in the header (ConnectedServicesHero: "Connect services") — no duplicate block below
    return (
      <RNAnimated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, styles.emptyScrollContent]}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: streamingScrollY } } }],
          { useNativeDriver: Platform.OS !== "web" },
        )}
        scrollEventThrottle={16}
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
        {renderAnimatedHeader}
      </RNAnimated.ScrollView>
    );
  }

  if (loading) {
    // When a hero/header is provided, keep loading feedback inside that hero (skeleton),
    // instead of rendering a second spinner section below it.
    if (header) {
      return (
        <RNAnimated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={RNAnimated.event(
            [{ nativeEvent: { contentOffset: { y: streamingScrollY } } }],
            { useNativeDriver: Platform.OS !== "web" },
          )}
          scrollEventThrottle={16}
        >
          {renderAnimatedHeader}
          {loadProgress && loadProgress.progress < 1 ? (
            <View style={styles.loadingWrap}>
              <StreamingLoadProgressBar progress={loadProgress} />
            </View>
          ) : null}
        </RNAnimated.ScrollView>
      );
    }

    return (
      <RNAnimated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: streamingScrollY } } }],
          { useNativeDriver: Platform.OS !== "web" },
        )}
        scrollEventThrottle={16}
      >
        {renderAnimatedHeader}
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading your libraries…</Text>
        </View>
      </RNAnimated.ScrollView>
    );
  }

  const visibleSections = sections.filter((s) => s.items.length > 0);

  if (!visibleSections.length) {
    return (
      <RNAnimated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: streamingScrollY } } }],
          { useNativeDriver: Platform.OS !== "web" },
        )}
        scrollEventThrottle={16}
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
        {renderAnimatedHeader}
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
      </RNAnimated.ScrollView>
    );
  }

  return (
    <RNAnimated.ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={RNAnimated.event(
        [{ nativeEvent: { contentOffset: { y: streamingScrollY } } }],
        { useNativeDriver: Platform.OS !== "web" },
      )}
      scrollEventThrottle={16}
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
      {renderAnimatedHeader}
      {visibleSections.map((section) => (
        <YounifyBrowseSectionRow
          key={section.id}
          section={section}
          linkedStreamingCount={linkedStreamingCount}
          onItemOpenDetails={onBrowseItemOpenDetails}
        />
      ))}
      <View style={{ height: 100 }} />
    </RNAnimated.ScrollView>
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
  /** When unlinked, only the hero header fills the tab — allow pull-to-refresh and comfortable bottom space */
  emptyScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  centered: {
    backgroundColor: "#08080C",
    paddingHorizontal: 28,
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: 320,
    paddingTop: 28,
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
    backgroundColor: "#08080C",
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: 260,
    paddingTop: 26,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 14,
    color: "#8E8E9A",
    fontSize: 14,
    fontWeight: "600",
  },
});
