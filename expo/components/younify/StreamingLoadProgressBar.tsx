import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { YounifyStreamingLoadProgress } from "@/services/younify";

type Props = {
  progress: YounifyStreamingLoadProgress;
};

export default function StreamingLoadProgressBar({ progress }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(1, Math.max(0, progress.progress));
  const pct = Math.round(clamped * 100);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [clamped, widthAnim]);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.label}>
        {progress.label}
        {clamped > 0 && clamped < 1 ? ` · ${pct}%` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 4,
    gap: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#E50914",
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#8E8E9A",
    textAlign: "center",
  },
});
