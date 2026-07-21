import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { tmdbPosterSizeForContainerWidth } from "@/utils/aroundYouImages";
import { resolveTmdbPosterUrlForYounifyRow } from "@/utils/younifyTmdbPoster";

type Props = {
  younifyRow: Record<string, unknown>;
  /** Logical width (dp) of the tile — drives TMDB asset size for mobile. */
  width: number;
  style?: StyleProp<ViewStyle>;
};

/** Portrait ~2:3 frame; artwork is always TMDB `poster_path` (never provider CDN). */
export default function TmdbStreamingPosterImage({ younifyRow, width, style }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const size = useMemo(() => tmdbPosterSizeForContainerWidth(width), [width]);
  const recycleKey = useMemo(
    () =>
      `${String(younifyRow.itemID ?? younifyRow.id ?? "")}|${String(
        younifyRow.showTitle ?? younifyRow.series ?? younifyRow.title ?? younifyRow.name ?? "",
      ).trim()}|${size}`,
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
          if (u) setUri(u);
          else setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [younifyRow, size, recycleKey]);

  return (
    <View style={[styles.frame, { width, aspectRatio: 2 / 3 }, style]}>
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
  frame: {
    overflow: "hidden",
    backgroundColor: "#0B0E14",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#141820",
  },
});
