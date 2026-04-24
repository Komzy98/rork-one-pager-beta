import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { configureYounify, fetchYounifyServices } from "@/services/younify";
import { TMDB_POSTER_ATTRIBUTION } from "@/utils/younifyTmdbPoster";

type YounifyService = {
  id?: string | number;
  name?: string;
  title?: string;
  connected?: boolean;
  isConnected?: boolean;
  active?: boolean;
  linked?: boolean;
  enabled?: boolean;
  status?: string;
  connectionStatus?: string;
  [key: string]: any;
};

export default function StreamingServicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [services, setServices] = useState<YounifyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingServiceId, setActingServiceId] = useState<string | null>(null);

  const getServiceIdentityKey = (item: YounifyService) =>
    String(item.id ?? item.serviceId ?? item.slug ?? `${item.name ?? ""}-${item.title ?? ""}`)
      .trim()
      .toLowerCase();

  const getServiceRenderKey = (item: YounifyService, index: number) =>
    getServiceIdentityKey(item) || `service-${index}`;

  const getServiceMatchKey = (item: YounifyService) =>
    String(item.id ?? `${item.name ?? ""}-${item.title ?? ""}`).trim().toLowerCase();

  const loadServices = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);

      setError(null);

      const connect = await configureYounify();
      const fetchedServices = await fetchYounifyServices();

      const list = Array.isArray(fetchedServices)
        ? fetchedServices
        : Array.isArray((fetchedServices as any)?.services)
          ? (fetchedServices as any).services
          : [];

      let linkedServices: YounifyService[] = [];
      try {
        const linkedResult = await connect.fetchLinkedServices(null);
        linkedServices = Array.isArray(linkedResult)
          ? linkedResult
          : Array.isArray((linkedResult as any)?.services)
            ? (linkedResult as any).services
            : [];
      } catch (linkedError) {
        console.error("Failed to fetch linked Younify services, continuing with base list:", linkedError);
      }

      const linkedKeys = new Set(
        linkedServices.map((svc: YounifyService) => getServiceMatchKey(svc)),
      );
      const merged = list.map((svc: YounifyService) => ({
        ...svc,
        linked: svc.linked || linkedKeys.has(getServiceMatchKey(svc)),
      }));

      if (Array.isArray(merged)) {
        setServices(merged);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error("Failed to load Younify services:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadServices("initial");
  }, []);

  const isConnected = (item: YounifyService) => {
    const flags = [
      item.connected,
      item.isConnected,
      item.active,
      item.linked,
      item.enabled,
      Boolean(item.link),
      item.status === "connected",
      item.connectionStatus === "connected",
    ];
  
    return flags.some(Boolean);
  };

  const connectedCount = useMemo(
    () => services.filter(isConnected).length,
    [services],
  );
  const handleServiceAction = async (item: YounifyService) => {
    const serviceKey = getServiceIdentityKey(item);
    if (!serviceKey) {
      Alert.alert("Unavailable", "This service cannot be identified right now.");
      return;
    }
    const connected = isConnected(item);
    try {
      setActingServiceId(serviceKey);
      const connect = await configureYounify();
      if (connected) {
        await connect.manageLinkedService(item as any, null);
      } else {
        const success = await connect.linkService(item as any, null);
        if (!success) {
          return;
        }
      }
      await loadServices("refresh");
    } catch (e) {
      console.error("Failed to run Younify service action:", e);
      Alert.alert(
        "Something went wrong",
        "We couldn't complete that service action. Please try again.",
      );
    } finally {
      setActingServiceId(null);
    }
  };

  const handleDisconnectService = (item: YounifyService, index: number) => {
    const label = item.name || item.title || `Service ${index + 1}`;
    Alert.alert(
      "Disconnect service?",
      `You will unlink ${label} from One Pager.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const serviceKey = getServiceIdentityKey(item);
              if (!serviceKey) {
                Alert.alert("Unavailable", "This service cannot be identified right now.");
                return;
              }
              try {
                setActingServiceId(serviceKey);
                const connect = await configureYounify();
                await connect.unlinkService(item as any, null);
                await loadServices("refresh");
              } catch (e) {
                console.error("Failed to disconnect Younify service:", e);
                Alert.alert(
                  "Disconnect failed",
                  "We couldn't disconnect that service right now. Please try again.",
                );
              } finally {
                setActingServiceId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => Number(isConnected(b)) - Number(isConnected(a))),
    [services],
  );
  const firstUnconnected = useMemo(
    () => sortedServices.find((service) => !isConnected(service)),
    [sortedServices],
  );
  const isAnyServiceActing = !!actingServiceId;

  const renderItem = ({
    item,
    index,
  }: {
    item: YounifyService;
    index: number;
  }) => {
    const label = item.name || item.title || `Service ${index + 1}`;
    const connected = isConnected(item);
    const serviceKey = getServiceIdentityKey(item);
    const isActing = actingServiceId === serviceKey;

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceCardTop}>
          <View style={styles.serviceMeta}>
            <Text style={styles.serviceName}>{label}</Text>

            <Text style={styles.serviceSubtext}>
            {connected
            ? item.link?.profileName
            ? `Connected as ${item.link.profileName}`
            : "Already linked to your account"
            : "Connect to personalise your watch experience"}
            </Text>

            <View
              style={[
                styles.statusPill,
                connected
                  ? styles.statusPillConnected
                  : styles.statusPillDisconnected,
              ]}
            >
              {connected ? <Check size={12} color="#B7F7D0" /> : null}
              <Text
                style={[
                  styles.statusText,
                  connected
                    ? styles.statusTextConnected
                    : styles.statusTextDisconnected,
                ]}
              >
                {connected ? "Connected" : "Not connected"}
              </Text>
            </View>
          </View>

          <View style={styles.serviceActionsColumn}>
            <Pressable
              style={({ pressed }) => [
                styles.serviceActionButton,
                connected ? styles.secondaryButton : styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                void handleServiceAction(item);
              }}
              disabled={isActing}
            >
              <View style={styles.actionButtonContent}>
                {isActing ? (
                  <ActivityIndicator
                    size="small"
                    color={connected ? "#D9E0F7" : "#FFFFFF"}
                    style={styles.actionSpinner}
                  />
                ) : null}
                <Text
                  style={[
                    styles.serviceActionText,
                    connected
                      ? styles.secondaryButtonText
                      : styles.primaryButtonText,
                  ]}
                >
                  {isActing
                    ? (connected ? "Opening..." : "Connecting...")
                    : connected
                      ? "Manage"
                      : "Connect"}
                </Text>
              </View>
            </Pressable>

            {connected ? (
              <Pressable
                style={({ pressed }) => [
                  styles.disconnectButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleDisconnectService(item, index)}
                disabled={isActing}
              >
                <View style={styles.actionButtonContent}>
                  {isActing ? (
                    <ActivityIndicator
                      size="small"
                      color="#F1B8C4"
                      style={styles.actionSpinner}
                    />
                  ) : null}
                  <Text style={styles.disconnectButtonText}>
                    {isActing ? "Working..." : "Disconnect"}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#F4F4F5" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>One Pager</Text>
          <Text style={styles.title}>Your Services</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color="#F6F7FB" />
          </View>
          <Text style={styles.stateTitle}>Setting up your premium catalog</Text>
          <Text style={styles.stateText}>
            Syncing available services from Younify.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Connection interrupted</Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              void loadServices("initial");
            }}
          >
            <Text style={[styles.retryText, styles.primaryButtonText]}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Sparkles size={13} color="#B9C3FF" />
                <Text style={styles.heroBadgeText}>Premium Sync</Text>
              </View>

              <Text style={styles.heroCount}>
                {connectedCount}/{services.length} connected
              </Text>
            </View>

            <Text style={styles.heroTitle}>Curate your watch universe</Text>

            <Text style={styles.heroBody}>
              Connect providers to unlock smarter recommendations and better
              where-to-watch results across One Pager.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.heroButton,
                styles.primaryButton,
                isAnyServiceActing && styles.disabledButton,
                pressed && styles.buttonPressed,
              ]}
              disabled={isAnyServiceActing}
              onPress={() => {
                if (!firstUnconnected) {
                  Alert.alert("All set", "All available services are already connected.");
                  return;
                }
                void handleServiceAction(firstUnconnected);
              }}
            >
              <Text style={[styles.heroButtonText, styles.primaryButtonText]}>
                {isAnyServiceActing
                  ? "Working..."
                  : firstUnconnected
                    ? "Connect next service"
                    : "All services connected"}
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={sortedServices}
            keyExtractor={(item, index) =>
              getServiceRenderKey(item, index)
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadServices("refresh")}
                tintColor="#8B90A8"
              />
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>No services found</Text>
                <Text style={styles.stateText}>
                  We could not find any providers right now. Pull to refresh or
                  try again shortly.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.retryButton,
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => void loadServices("refresh")}
                >
                  <Text style={[styles.retryText, styles.secondaryButtonText]}>
                    Refresh list
                  </Text>
                </Pressable>
              </View>
            }
            ListFooterComponent={
              <Text style={styles.tmdbAttribution}>{TMDB_POSTER_ATTRIBUTION}</Text>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07080B",
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#11141A",
    borderWidth: 1,
    borderColor: "#1F2430",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9AA4C8",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#F5F7FA",
  },
  heroCard: {
    backgroundColor: "#0E1117",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#202635",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#171B26",
    borderWidth: 1,
    borderColor: "#2A3247",
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CFD7FF",
  },
  heroCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A8B0C7",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F7F8FB",
    marginBottom: 10,
    lineHeight: 28,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#9CA5BE",
    marginBottom: 16,
  },
  heroButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tmdbAttribution: {
    fontSize: 10,
    lineHeight: 14,
    color: "#5C6578",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingBottom: 38,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: "#10141C",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#232A3A",
  },
  serviceCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  serviceMeta: {
    flex: 1,
    gap: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F4F6FA",
  },
  serviceSubtext: {
    fontSize: 13,
    color: "#8F98B2",
    lineHeight: 18,
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillConnected: {
    backgroundColor: "rgba(30, 72, 52, 0.45)",
    borderColor: "#2E6B4D",
  },
  statusPillDisconnected: {
    backgroundColor: "rgba(92, 50, 55, 0.3)",
    borderColor: "#6D3E48",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextConnected: {
    color: "#BDF4D7",
  },
  statusTextDisconnected: {
    color: "#F0C3CB",
  },
  serviceActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    minWidth: 88,
    alignItems: "center",
  },
  serviceActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionSpinner: {
    marginRight: 6,
  },
  serviceActionsColumn: {
    gap: 8,
    alignItems: "stretch",
    minWidth: 96,
  },
  primaryButton: {
    backgroundColor: "#7C8CFF",
    borderColor: "#8E9BFF",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#151B27",
    borderColor: "#2C364B",
  },
  secondaryButtonText: {
    color: "#D9E0F7",
  },
  disconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6B3442",
    backgroundColor: "rgba(107, 52, 66, 0.2)",
    alignItems: "center",
  },
  disconnectButtonText: {
    color: "#F1B8C4",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  disabledButton: {
    opacity: 0.6,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121827",
    borderWidth: 1,
    borderColor: "#283149",
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F6F7FA",
    textAlign: "center",
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: "#96A0B8",
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8F9FC",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#9EA8C0",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 6,
  },
  retryText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
