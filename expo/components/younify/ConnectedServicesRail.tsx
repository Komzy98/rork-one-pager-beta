import React, { useMemo } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

type YounifyContentItem = {
  id?: string | number;
  title?: string;
  name?: string;
  posterPath?: string;
  poster_path?: string;
  image?: string;
  imageUrl?: string;
  artwork?: string;
  artworkUrl?: string;
  [key: string]: any;
};

type ConnectedServicesRailProps = {
  content: YounifyContentItem[];
  loading: boolean;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 250;
const POSTER_HEIGHT = 200;
const SKELETON_COUNT = 4;

export default function ConnectedServicesRail({
  content,
  loading,
}: ConnectedServicesRailProps) {
  const router = useRouter();
  const normalizedContent = useMemo(() => {
    if (!Array.isArray(content)) return [];
    return content;
  }, [content]);

  const renderSkeletonCard = (_: unknown, index: number) => (
    <View key={`skeleton-${index}`} style={styles.card}>
      <View style={styles.posterSkeleton} />
      <View style={styles.titleSkeleton} />
      <View style={styles.badgeSkeleton} />
    </View>
  );

  const renderItem = ({ item }: { item: YounifyContentItem }) => {
    const title = item.title || item.name || "Untitled";
    const imageUri =
      item.posterPath ||
      item.poster_path ||
      item.imageUrl ||
      item.image ||
      item.artworkUrl ||
      item.artwork ||
      null;

    return (
      <View style={styles.card}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <Text style={styles.posterFallbackText}>No Poster</Text>
          </View>
        )}

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

  if (!normalizedContent.length) {
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
    gap: 12,
    paddingRight: 4,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
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
  poster: {
    width: "100%",
    height: POSTER_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#1A2030",
    marginBottom: 10,
  },
  posterFallback: {
    width: "100%",
    height: POSTER_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#151B27",
    borderWidth: 1,
    borderColor: "#2C364B",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  posterFallbackText: {
    color: "#8F98B2",
    fontSize: 12,
    fontWeight: "600",
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
    width: "100%",
    height: POSTER_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#1A2030",
    marginBottom: 10,
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
