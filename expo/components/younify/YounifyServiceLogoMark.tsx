import React from "react";
import { StyleSheet, View } from "react-native";
import type { YounifySourceServiceSnapshot } from "@/services/younify";
import { getYounifyStreamingServiceLogoUrl } from "@/services/younify";
import YounifyPosterImage from "@/components/younify/YounifyPosterImage";

type Props = {
  service: YounifySourceServiceSnapshot;
  size?: number;
};

/**
 * Small provider mark on a title card (service artwork from Younify, loaded via `fetchImage`).
 */
export default function YounifyServiceLogoMark({ service, size = 26 }: Props) {
  const url = getYounifyStreamingServiceLogoUrl(service);
  if (!url) return null;

  const r = Math.max(4, Math.round(size * 0.22));

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: r,
        },
      ]}
      accessibilityLabel={service.name ? `${service.name} logo` : "Streaming service logo"}
    >
      <YounifyPosterImage thumbnailUrl={url} squareSize={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "rgba(12,14,20,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
});
