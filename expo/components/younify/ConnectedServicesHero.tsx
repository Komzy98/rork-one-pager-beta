import React, { useCallback, useMemo, useRef } from "react";
import {
  Animated as RNAnimated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Info, Sparkles, Star, Tv } from "lucide-react-native";
import type { YounifySourceServiceSnapshot } from "@/services/younify";
import StreamingHeroTmdbPoster from "@/components/younify/StreamingHeroTmdbPoster";
import YounifyServiceLogoMark from "@/components/younify/YounifyServiceLogoMark";
import { openYounifyBrowseItemOnPlatform } from "@/utils/streamingLinks";
import { formatRating } from "@/utils/tmdbApi";

const DEFAULT_HERO_CARD_WIDTH = 360;
const DEFAULT_HERO_HEIGHT = 480;

type YounifyContentItem = {
  id?: string | number;
  title?: string;
  name?: string;
  vote_average?: number;
  rating?: number;
  genre?: string;
  genres?: string[];
  younifySourceService?: YounifySourceServiceSnapshot;
  [key: string]: unknown;
};

type Props = {
  content: YounifyContentItem[];
  loading: boolean;
  hasLinkedServices: boolean;
  linkedStreamingCount: number;
  /** When set, hero tap / More Info opens in-app details instead of a provider deep link. */
  onOpenDetails?: (item: YounifyContentItem) => void | Promise<void>;
};

function pickRating(item: YounifyContentItem): number | null {
  const v = item.vote_average ?? item.rating;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export default function ConnectedServicesHero({
  content,
  loading,
  hasLinkedServices,
  linkedStreamingCount,
  onOpenDetails,
}: Props) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const HERO_CARD_WIDTH = Math.max(screenW - 32, 280);
  const HERO_HEIGHT = DEFAULT_HERO_HEIGHT;
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const showProviderLogo = linkedStreamingCount >= 2;

  const slides = useMemo(() => {
    if (!Array.isArray(content)) return [];
    return content.slice(0, 6);
  }, [content]);

  const onOpenItem = useCallback(
    async (item: YounifyContentItem) => {
      if (onOpenDetails) {
        await onOpenDetails(item);
        return;
      }
      if (Platform.OS !== "web") {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          /* ignore */
        }
      }
      await openYounifyBrowseItemOnPlatform(item as Record<string, unknown>);
    },
    [onOpenDetails],
  );

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={[styles.slideFrame, { width: HERO_CARD_WIDTH, height: HERO_HEIGHT, alignSelf: "center" }]}>
          <View style={styles.skeletonInner} />
        </View>
      </View>
    );
  }

  if (!hasLinkedServices) {
    return (
      <View style={styles.section}>
        <View style={[styles.slideFrame, { width: screenW - 32, height: HERO_HEIGHT * 0.55, alignSelf: "center" }]}>
          <View style={styles.emptyInner}>
            <Tv size={28} color="#8E8E9A" />
            <Text style={styles.emptyTitle}>Connect streaming services</Text>
            <Text style={styles.emptySub}>
              Link Netflix, Prime, and more to see a personalised hero here — same layout as For You.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(root)/streaming-services")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Connect services</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!slides.length) {
    return (
      <View style={styles.section}>
        <View style={[styles.slideFrame, { width: screenW - 32, height: HERO_HEIGHT * 0.5, alignSelf: "center" }]}>
          <View style={styles.emptyInner}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>You’re connected. Titles will appear when your providers return picks.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(root)/streaming-services")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Manage services</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <RNAnimated.FlatList
        data={slides}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => String(item.id ?? `${item.title ?? item.name}-${index}`)}
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: Platform.OS !== "web",
        })}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: screenW,
          offset: screenW * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const rawTitle = String(item.title ?? item.name ?? "").trim();
          const title = rawTitle || "Untitled";
          const heroW = HERO_CARD_WIDTH;
          const svc = item.younifySourceService;
          const rating = pickRating(item);
          const genreLine =
            Array.isArray(item.genres) && item.genres.length
              ? item.genres.slice(0, 2).join(" • ")
              : typeof item.genre === "string" && item.genre.trim()
                ? item.genre
                : "From your linked apps";

          const inputRange = [(index - 1) * screenW, index * screenW, (index + 1) * screenW];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: "clamp",
          });

          return (
            <RNAnimated.View style={[styles.heroSlide, { width: screenW, height: HERO_HEIGHT, transform: [{ scale }] }]}>
              <Pressable style={[styles.heroSlideInner, { width: heroW, height: HERO_HEIGHT }]} onPress={() => void onOpenItem(item)}>
                <StreamingHeroTmdbPoster
                  younifyRow={item as Record<string, unknown>}
                  widthDp={heroW}
                  style={styles.heroImage}
                />
                <LinearGradient
                  colors={["transparent", "rgba(10,10,15,0.6)", "rgba(10,10,15,0.95)"]}
                  style={styles.heroGradient}
                />
                {showProviderLogo && svc ? (
                  <View style={styles.heroLogoMark} pointerEvents="none">
                    <YounifyServiceLogoMark service={svc} size={40} />
                  </View>
                ) : null}
                <View style={styles.heroContent}>
                  <View style={styles.heroTopBadge}>
                    <Sparkles size={12} color="#FF4655" />
                    <Text style={styles.heroTopBadgeText}>FROM YOUR SERVICES</Text>
                  </View>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  <View style={styles.heroMeta}>
                    {rating != null ? (
                      <View style={styles.heroRating}>
                        <Star size={14} color="#FF4655" fill="#FF4655" />
                        <Text style={styles.heroRatingText}>{formatRating(rating)}</Text>
                      </View>
                    ) : null}
                    <Text
                      style={[styles.heroGenres, rating == null && { marginLeft: 0 }]}
                      numberOfLines={2}
                    >
                      {genreLine}
                    </Text>
                  </View>
                  <View style={styles.heroActions}>
                    <TouchableOpacity
                      style={styles.heroPlayButton}
                      onPress={() => void onOpenItem(item)}
                      activeOpacity={0.88}
                    >
                      <Info size={18} color="#FFF" />
                      <Text style={styles.heroPlayText}>More Info</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            </RNAnimated.View>
          );
        }}
      />
      <View style={styles.heroIndicators}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * screenW, index * screenW, (index + 1) * screenW];
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });
          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [1, 1.5, 1],
            extrapolate: "clamp",
          });
          return (
            <RNAnimated.View
              key={index}
              style={[styles.heroIndicator, { opacity, transform: [{ scale: dotScale }] }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  heroSlide: {
    height: DEFAULT_HERO_HEIGHT,
    paddingHorizontal: 16,
  },
  heroSlideInner: {
    width: DEFAULT_HERO_CARD_WIDTH,
    height: DEFAULT_HERO_HEIGHT,
    alignSelf: "center",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "74%",
  },
  heroLogoMark: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  heroContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  heroTopBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.3)",
  },
  heroTopBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FF4655",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  heroRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroRatingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF4655",
  },
  heroGenres: {
    fontSize: 13,
    color: "#8E8E9A",
    flex: 1,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroPlayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E50914",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#E50914",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  heroPlayText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  heroIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    gap: 8,
  },
  heroIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E50914",
  },
  slideFrame: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  skeletonInner: {
    flex: 1,
    backgroundColor: "#1A1A22",
  },
  emptyInner: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121218",
    gap: 10,
  },
  emptyTitle: {
    color: "#F5F5F7",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    color: "#8E8E9A",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#E50914",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
