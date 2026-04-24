import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image, type ImageLoadEventData } from "expo-image";
import { Connect, CancellationTicket } from "react-native-younify-connect-sdk";
import { configureYounify } from "@/services/younify";
import { isTmdbImageHostUrl, resolveTmdbPosterUrlForTitle } from "@/utils/younifyTmdbPoster";

type Props = {
  /** Younify / provider artwork URL (may require `fetchImage`). May be empty if using TMDB only. */
  thumbnailUrl?: string | null;
  /** When artwork is missing or fails, resolve a poster via TMDB search (per Younify guidance). */
  tmdbFallbackTitle?: string | null;
  /** Fixed square (e.g. service logo); skips intrinsic aspect sizing and TMDB title fallback */
  squareSize?: number;
};

/** Netflix-style row default until we know real pixels from Younify/Netflix. */
const DEFAULT_ASPECT = 2 / 3;
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2.25;

function readLoadDimensions(event: unknown): { w: number; h: number } | null {
  const e = event as { nativeEvent?: ImageLoadEventData } & ImageLoadEventData;
  const src = e?.nativeEvent?.source ?? e?.source;
  if (src && typeof src.width === "number" && typeof src.height === "number" && src.width > 0 && src.height > 0) {
    return { w: src.width, h: src.height };
  }
  return null;
}

function displayTitle(thumbnailUrl: string | null | undefined, tmdbFallbackTitle: string | null | undefined): string {
  return String(tmdbFallbackTitle ?? "").trim() || String(thumbnailUrl ?? "").trim();
}

/**
 * Netflix first-party app requests **mobile-sized artwork** from Netflix’s own CDN; every tile in a
 * row often shares the same **2:3** box because the **files** are 2:3.
 *
 * In One Pager, artwork comes through **Younify** (`largeThumbnailUrl` / `fetchImage`). Those URLs
 * can be **16:9 stills**, **2:3 posters**, etc. We **cannot change the file’s aspect** in app code—only
 * the **frame**. This component sets the frame’s **aspectRatio from decoded width/height** so the
 * cell matches the **actual image** (same idea as showing the asset without wrong cropping).
 *
 * **TMDB**: Public `image.tmdb.org` URLs load directly. If Younify has no URL or `fetchImage` fails,
 * we optionally resolve a poster by title (Younify recommends third-party artwork with attribution).
 */
export default function YounifyPosterImage({ thumbnailUrl, tmdbFallbackTitle, squareSize }: Props) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [cellAspect, setCellAspect] = useState(DEFAULT_ASPECT);
  const isSquare = typeof squareSize === "number" && squareSize > 0;
  const recycleKey = displayTitle(thumbnailUrl, tmdbFallbackTitle) || "poster";

  useEffect(() => {
    let cancelled = false;
    setResolvedUri(null);
    setError(false);
    setCellAspect(DEFAULT_ASPECT);

    const tryTmdb = async (): Promise<boolean> => {
      if (isSquare) return false;
      const t = String(tmdbFallbackTitle ?? "").trim();
      if (t.length < 2) return false;
      try {
        const url = await resolveTmdbPosterUrlForTitle(t);
        if (cancelled || !url) return false;
        setResolvedUri(url);
        return true;
      } catch {
        return false;
      }
    };

    const run = async () => {
      const raw = String(thumbnailUrl ?? "").trim();
      const hasPrimary = raw.length > 0;

      if (!hasPrimary) {
        const ok = await tryTmdb();
        if (!cancelled && !ok) setError(true);
        return;
      }

      if (isTmdbImageHostUrl(raw)) {
        if (!cancelled) setResolvedUri(raw);
        return;
      }

      if (!/^https?:\/\//i.test(raw)) {
        if (!cancelled) setResolvedUri(raw);
        return;
      }

      try {
        await configureYounify();
        const b64 = await Connect.shared.fetchImage(raw, CancellationTicket.none);
        if (cancelled) return;
        const s = String(b64 ?? "").trim();
        if (!s) {
          const ok = await tryTmdb();
          if (!cancelled && !ok) setError(true);
          return;
        }
        if (s.startsWith("data:")) {
          setResolvedUri(s);
        } else {
          setResolvedUri(`data:image/jpeg;base64,${s}`);
        }
      } catch {
        const ok = await tryTmdb();
        if (!cancelled && !ok) setError(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, tmdbFallbackTitle, squareSize]);

  const onImageLoad = useCallback(
    (event: unknown) => {
      if (isSquare) return;
      const dim = readLoadDimensions(event);
      if (!dim) return;
      const ratio = dim.w / dim.h;
      setCellAspect(Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, ratio)));
    },
    [isSquare],
  );

  const frameStyle = isSquare
    ? [styles.frame, { width: squareSize, height: squareSize }]
    : [styles.frame, { aspectRatio: cellAspect }];

  if (error) {
    return (
      <View style={isSquare ? frameStyle : [styles.frame, { aspectRatio: DEFAULT_ASPECT }]}>
        <View style={styles.center}>
          <View style={styles.fallbackDot} />
        </View>
      </View>
    );
  }

  if (!resolvedUri) {
    return (
      <View style={isSquare ? frameStyle : [styles.frame, { aspectRatio: DEFAULT_ASPECT }]}>
        <View style={styles.center}>
          <ActivityIndicator color="#8F98B2" />
        </View>
      </View>
    );
  }

  return (
    <View style={isSquare ? frameStyle : [styles.frame, { aspectRatio: cellAspect }]}>
      <Image
        source={{ uri: resolvedUri }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        contentPosition="center"
        allowDownscaling
        cachePolicy="memory-disk"
        recyclingKey={recycleKey}
        onLoad={isSquare ? undefined : onImageLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0B0E14",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141820",
  },
  fallbackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2C364B",
  },
});
