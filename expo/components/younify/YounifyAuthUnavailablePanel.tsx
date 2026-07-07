import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/colors";
import {
  YOUNIFY_AUTH_DEV_START_COMMAND,
  expectsLocalYounifyAuthServer,
} from "@/utils/younifyAuthUrl";
import { isYounifyAuthUnreachableError } from "@/utils/onboardingProfileSave";
import { useYounifyAuthHealth } from "@/hooks/useYounifyAuthHealth";

type Props = {
  error?: string | null;
  onRetry?: () => void | Promise<void>;
  onContinue?: () => void;
  continueLabel?: string;
  compact?: boolean;
};

async function copyDevStartCommand(): Promise<void> {
  const command = YOUNIFY_AUTH_DEV_START_COMMAND;
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(command);
    return;
  }
  try {
    await Share.share({
      message: command,
      title: "Start Younify auth",
    });
  } catch {
    Alert.alert("Run in terminal", command);
  }
}

export function younifyAuthUnavailableCopy(error?: string | null): string {
  if (error && isYounifyAuthUnreachableError(error) && expectsLocalYounifyAuthServer()) {
    return `Streaming auth isn\u2019t running on your Mac. Run \`${YOUNIFY_AUTH_DEV_START_COMMAND}\` in the expo folder (starts auth + simulator), or tap Start auth server below.`;
  }
  if (error && isYounifyAuthUnreachableError(error)) {
    return "Streaming links aren\u2019t available in this build yet. Connect Netflix, Disney+, and others later from Profile \u2192 Streaming.";
  }
  return "Streaming links aren\u2019t available right now. You can connect later from Profile \u2192 Streaming.";
}

export default function YounifyAuthUnavailablePanel({
  error,
  onRetry,
  onContinue,
  continueLabel = "Continue without linking",
  compact = false,
}: Props) {
  const isLocalDev = expectsLocalYounifyAuthServer();
  const authDown = !error || isYounifyAuthUnreachableError(error);

  const handleCopyCommand = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await copyDevStartCommand();
    Alert.alert(
      "Start auth server",
      `Paste in Terminal from the expo folder:\n\n${YOUNIFY_AUTH_DEV_START_COMMAND}\n\nThen tap Retry here.`,
    );
  }, []);

  const handleRetry = useCallback(() => {
    void Haptics.selectionAsync();
    void onRetry?.();
  }, [onRetry]);

  if (!authDown && error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could not load services</Text>
        <Text style={styles.errorBody}>{error}</Text>
        {onRetry ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
        {onContinue ? (
          <TouchableOpacity onPress={onContinue} style={styles.softBtn} activeOpacity={0.8}>
            <Text style={styles.softBtnText}>Skip for now</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.center, compact && styles.centerCompact]}>
      <Text style={styles.errorTitle}>
        {isLocalDev ? "Start streaming auth" : "Connect streaming later"}
      </Text>
      <Text style={styles.errorBody}>{younifyAuthUnavailableCopy(error)}</Text>
      {isLocalDev ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleCopyCommand()} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Start auth server</Text>
        </TouchableOpacity>
      ) : null}
      {onRetry ? (
        <TouchableOpacity
          style={[styles.primaryBtn, isLocalDev && styles.secondaryPrimaryBtn]}
          onPress={handleRetry}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, isLocalDev && styles.secondaryPrimaryBtnText]}>Retry</Text>
        </TouchableOpacity>
      ) : null}
      {onContinue ? (
        <TouchableOpacity onPress={onContinue} style={styles.softBtn} activeOpacity={0.8}>
          <Text style={styles.softBtnText}>{continueLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function YounifyAuthDevBanner() {
  const { healthy, expectsLocal, recheck } = useYounifyAuthHealth();

  if (!__DEV__ || !expectsLocal || healthy === true) {
    return null;
  }

  const handleStart = () => {
    void copyDevStartCommand();
    Alert.alert(
      "Younify auth",
      `Run in Terminal:\n\n${YOUNIFY_AUTH_DEV_START_COMMAND}\n\nThis starts auth on :3000 and opens the simulator.`,
    );
  };

  return (
    <View style={bannerStyles.wrap}>
      <View style={bannerStyles.row}>
        {healthy === null ? (
          <ActivityIndicator size="small" color="#FFF" style={bannerStyles.spinner} />
        ) : null}
        <Text style={bannerStyles.text} numberOfLines={2}>
          {healthy === null
            ? "Checking Younify auth…"
            : "Streaming auth off — run npm run dev or start the server"}
        </Text>
      </View>
      <View style={bannerStyles.actions}>
        <TouchableOpacity onPress={handleStart} style={bannerStyles.btn} activeOpacity={0.85}>
          <Text style={bannerStyles.btnText}>Start auth</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void recheck()} style={bannerStyles.btnGhost} activeOpacity={0.85}>
          <Text style={bannerStyles.btnGhostText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  centerCompact: {
    flex: 0,
    paddingVertical: 24,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryPrimaryBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryPrimaryBtnText: {
    color: COLORS.primary,
  },
  softBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  softBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

const bannerStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  btnGhostText: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 13,
  },
});
