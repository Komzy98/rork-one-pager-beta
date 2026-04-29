import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { tmdbPosterSizeForContainerWidth } from "@/utils/aroundYouImages";
import { resolveTmdbPosterUrlForYounifyRow } from "@/utils/younifyTmdbPoster";
import { getYounifyStreamingContentPosterUrl } from "@/services/younify";

type Props = {
  younifyRow: Record<string, unknown>;
  /** Approximate hero content width in dp (e.g. screen − padding) for sharp TMDB picks. */
  widthDp: number;
  style?: StyleProp<ViewStyle>;
};

/** Full-bleed hero fill using TMDB portrait poster (cover). */
export default function StreamingHeroTmdbPoster({ younifyRow, widthDp, style }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const size = useMemo(() => tmdbPosterSizeForContainerWidth(Math.min(widthDp, 900)), [widthDp]);
  const recycleKey = useMemo(
    () =>
      `hero|${String(younifyRow.itemID ?? younifyRow.id ?? "")}|${String(younifyRow.title ?? younifyRow.name ?? "").trim()}|${size}`,
    [younifyRow, size],
  );

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    setFailed(false);
    void (async () => {
      try {
        const u = await resolveTmdbPosterUrlForYounifyRow(younifyRow, size);
        if (!cancelled) {
          if (u) {
            setUri(u);
          } else {
            const fallback = getYounifyStreamingContentPosterUrl(younifyRow);
            if (fallback) setUri(fallback);
            else setFailed(true);
          }
        }
      } catch {
        if (!cancelled) {
          const fallback = getYounifyStreamingContentPosterUrl(younifyRow);
          if (fallback) setUri(fallback);
          else setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [younifyRow, size, recycleKey]);

  return (
    <View style={[styles.fill, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          recyclingKey={recycleKey}
        />
      ) : failed ? (
        <View style={styles.fallback} />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#8F98B2" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: "#18181F",
    overflow: "hidden",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#18181F",
  },
});
