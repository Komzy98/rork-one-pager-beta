import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { YounifyStreamingLoadProgress } from "@/services/younify";

/**
 * The Younify SDK exposes stages, not byte-level progress. Avoid showing fake
 * percentages (previously stuck at 35% during the entire catalogue request).
 */
export default function StreamingLoadProgressBar({
  progress,
}: {
  progress: YounifyStreamingLoadProgress;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <ActivityIndicator size="small" color="#E50914" />
      <Text style={styles.label}>{progress.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#8E8E9A",
    textAlign: "center",
    flexShrink: 1,
  },
});
