import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Flag,
  Gauge,
  MapPin,
  Timer,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react-native';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/backend/trpc/app-router';
import { trpc } from '@/lib/trpc';
import type { F1Race } from '@/constants/f1Data';

type RaceDetail = inferRouterOutputs<AppRouter>['f1']['getRaceDetail'];
type DriverProfile = NonNullable<inferRouterOutputs<AppRouter>['f1']['getDriverProfile']['profile']>;
type TeamProfile = NonNullable<inferRouterOutputs<AppRouter>['f1']['getTeamProfile']['profile']>;

const F1_RED = '#F20D18';
const BG = '#050506';
const CARD = '#101113';
const CARD_2 = '#17181B';
const CARD_BORDER = 'rgba(255,255,255,0.10)';
const TXT = '#F6F7F9';
const TXT_2 = '#9EA3AD';
const TXT_3 = '#6B7280';

type DetailTab = 'grid' | 'fastest' | 'pits';

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function F1CircuitCard({ circuitId }: { circuitId: number }) {
  const circuitQuery = trpc.f1.getCircuit.useQuery(
    { circuitId },
    { staleTime: 24 * 60 * 60 * 1000, retry: 1 },
  );
  const circuit = circuitQuery.data?.circuit;

  if (circuitQuery.isLoading) {
    return (
      <View style={styles.circuitLoading}>
        <ActivityIndicator size="small" color={F1_RED} />
        <Text style={styles.circuitLoadingText}>Loading circuit info…</Text>
      </View>
    );
  }

  if (!circuit) return null;

  return (
    <View style={styles.circuitCard}>
      <View style={styles.circuitHeader}>
        {circuit.image ? (
          <Image source={{ uri: circuit.image }} style={styles.circuitImage} contentFit="contain" />
        ) : (
          <View style={styles.circuitImageFallback}>
            <MapPin size={22} color={F1_RED} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.circuitTitle}>{circuit.name}</Text>
          <Text style={styles.circuitSub}>
            {circuit.competition.location.city}, {circuit.competition.location.country}
          </Text>
        </View>
      </View>
      <View style={styles.circuitStatsRow}>
        <StatPill label="Length" value={circuit.length} />
        <StatPill label="Laps" value={String(circuit.laps)} />
        <StatPill label="Distance" value={circuit.raceDistance} />
      </View>
      <View style={styles.circuitStatsRow}>
        <StatPill label="First GP" value={String(circuit.firstGrandPrix)} />
        <StatPill label="Capacity" value={circuit.capacity ? `${(circuit.capacity / 1000).toFixed(0)}k` : '—'} />
        <StatPill label="Opened" value={String(circuit.opened)} />
      </View>
      <View style={styles.lapRecordBox}>
        <Zap size={14} color={F1_RED} />
        <Text style={styles.lapRecordText}>
          Lap record {circuit.lapRecord.time} · {circuit.lapRecord.driver} ({circuit.lapRecord.year})
        </Text>
      </View>
    </View>
  );
}

function RaceDetailTabs({
  raceId,
  onDriverPress,
}: {
  raceId: number;
  onDriverPress?: (driverId: number) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('grid');
  const detailQuery = trpc.f1.getRaceDetail.useQuery(
    { raceId },
    { staleTime: 2 * 60 * 60 * 1000, retry: 1 },
  );
  const detail = detailQuery.data;

  const tabs: { key: DetailTab; label: string; icon: typeof Flag }[] = [
    { key: 'grid', label: 'Grid', icon: Flag },
    { key: 'fastest', label: 'Fastest', icon: Zap },
    { key: 'pits', label: 'Pit stops', icon: Wrench },
  ];

  const rows = useMemo(() => {
    if (!detail?.configured) return [];
    if (tab === 'grid') return detail.startingGrid;
    if (tab === 'fastest') return detail.fastestLaps;
    return detail.pitStops;
  }, [detail, tab]);

  if (detailQuery.isLoading) {
    return (
      <View style={styles.detailLoading}>
        <ActivityIndicator color={F1_RED} />
        <Text style={styles.detailLoadingText}>Loading race data…</Text>
      </View>
    );
  }

  if (!detail?.configured) {
    return (
      <Text style={styles.detailUnavailable}>
        API-Sports F1 key not configured on the server.
      </Text>
    );
  }

  return (
    <View style={styles.detailSection}>
      <Text style={styles.sectionTitle}>RACE DATA</Text>
      <View style={styles.detailTabs}>
        {tabs.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.detailTab, active && styles.detailTabActive]}
              onPress={() => setTab(item.key)}
              activeOpacity={0.85}
            >
              <Icon size={13} color={active ? '#FFF' : TXT_2} />
              <Text style={[styles.detailTabText, active && styles.detailTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyDetail}>No {tab} data available for this race yet.</Text>
      ) : tab === 'pits' ? (
        (detail.pitStops as RaceDetail['pitStops']).map((row) => (
          <View key={row.driverId} style={styles.dataRow}>
            <View style={styles.dataRowLeft}>
              {row.driverImage ? (
                <Image source={{ uri: row.driverImage }} style={styles.driverThumb} contentFit="cover" />
              ) : null}
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  disabled={!onDriverPress}
                  onPress={() => onDriverPress?.(row.driverId)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dataName, onDriverPress && styles.dataNameLink]}>{row.driverName}</Text>
                </TouchableOpacity>
                <Text style={styles.dataSub}>{row.teamName} · {row.totalStops} stop{row.totalStops === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <Text style={styles.dataMeta}>{row.totalTime}s</Text>
          </View>
        ))
      ) : (
        (rows as Array<{
          position: number;
          driverId: number;
          driverName: string;
          driverImage?: string;
          teamName: string;
          time?: string;
          lap?: number;
          avgSpeed?: string;
        }>).map((row) => (
          <View key={`${row.driverId}-${row.position}`} style={styles.dataRow}>
            <Text style={styles.posCol}>{row.position}</Text>
            <View style={styles.dataRowLeft}>
              {row.driverImage ? (
                <Image source={{ uri: row.driverImage }} style={styles.driverThumb} contentFit="cover" />
              ) : null}
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  disabled={!onDriverPress}
                  onPress={() => onDriverPress?.(row.driverId)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dataName, onDriverPress && styles.dataNameLink]}>{row.driverName}</Text>
                </TouchableOpacity>
                <Text style={styles.dataSub}>{row.teamName}</Text>
              </View>
            </View>
            <View style={styles.dataRight}>
              <Text style={styles.dataMeta}>{row.time ?? '—'}</Text>
              {row.lap ? <Text style={styles.dataSubMeta}>L{row.lap}</Text> : null}
              {row.avgSpeed ? <Text style={styles.dataSubMeta}>{row.avgSpeed} km/h</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function F1DriverProfileModal({
  visible,
  driverId,
  onClose,
}: {
  visible: boolean;
  driverId: number | null;
  onClose: () => void;
}) {
  const profileQuery = trpc.f1.getDriverProfile.useQuery(
    { driverId: driverId ?? 0 },
    { enabled: visible && driverId != null, staleTime: 24 * 60 * 60 * 1000 },
  );
  const profile = profileQuery.data?.profile;

  return (
    <ProfileModalShell visible={visible} onClose={onClose} title="Driver Profile">
      {profileQuery.isLoading ? (
        <LoadingBlock />
      ) : profile ? (
        <DriverProfileBody profile={profile} />
      ) : (
        <Text style={styles.emptyDetail}>Driver profile unavailable.</Text>
      )}
    </ProfileModalShell>
  );
}

export function F1TeamProfileModal({
  visible,
  teamId,
  onClose,
}: {
  visible: boolean;
  teamId: number | null;
  onClose: () => void;
}) {
  const profileQuery = trpc.f1.getTeamProfile.useQuery(
    { teamId: teamId ?? 0 },
    { enabled: visible && teamId != null, staleTime: 24 * 60 * 60 * 1000 },
  );
  const profile = profileQuery.data?.profile;

  return (
    <ProfileModalShell visible={visible} onClose={onClose} title="Team Profile">
      {profileQuery.isLoading ? (
        <LoadingBlock />
      ) : profile ? (
        <TeamProfileBody profile={profile} />
      ) : (
        <Text style={styles.emptyDetail}>Team profile unavailable.</Text>
      )}
    </ProfileModalShell>
  );
}

export function F1RaceDetailExtras({
  race,
  onDriverPress,
}: {
  race: F1Race;
  onDriverPress?: (driverId: number) => void;
}) {
  return (
    <>
      {race.apiCircuitId ? <F1CircuitCard circuitId={race.apiCircuitId} /> : null}
      {race.apiRaceId ? (
        <RaceDetailTabs raceId={race.apiRaceId} onDriverPress={onDriverPress} />
      ) : null}
    </>
  );
}

function DriverProfileBody({ profile }: { profile: DriverProfile }) {
  const age = useMemo(() => {
    const birth = new Date(profile.birthdate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
    return years;
  }, [profile.birthdate]);

  return (
    <>
      <View style={styles.profileHero}>
        {profile.image ? (
          <Image source={{ uri: profile.image }} style={styles.profileHeroImage} contentFit="cover" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>{profile.nationality} · #{profile.number}</Text>
          <Text style={styles.profileSub}>{profile.birthplace} · {age} yrs</Text>
        </View>
      </View>
      <View style={styles.profileStatsGrid}>
        <StatPill label="Career pts" value={profile.careerPoints} />
        <StatPill label="WDC" value={String(profile.worldChampionships)} />
        <StatPill label="Podiums" value={String(profile.podiums)} />
        <StatPill label="GPs" value={String(profile.grandsPrixEntered)} />
        <StatPill label="Best finish" value={`P${profile.highestRaceFinish.position} (×${profile.highestRaceFinish.number})`} />
        <StatPill label="Best grid" value={`P${profile.highestGridPosition}`} />
      </View>
      {profile.teams.length > 0 ? (
        <View style={styles.teamHistory}>
          <Text style={styles.sectionTitle}>TEAM HISTORY</Text>
          {profile.teams.slice(0, 6).map((entry) => (
            <View key={`${entry.season}-${entry.team.id}`} style={styles.historyRow}>
              <Text style={styles.historySeason}>{entry.season}</Text>
              <View style={styles.historyTeam}>
                {entry.team.logo ? (
                  <Image source={{ uri: entry.team.logo }} style={styles.teamThumb} contentFit="contain" />
                ) : null}
                <Text style={styles.historyName}>{entry.team.name}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function TeamProfileBody({ profile }: { profile: TeamProfile }) {
  return (
    <>
      <View style={styles.profileHero}>
        {profile.logo ? (
          <Image source={{ uri: profile.logo }} style={styles.teamLogoHero} contentFit="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>{profile.base}</Text>
          <Text style={styles.profileSub}>{profile.chassis} · {profile.engine}</Text>
        </View>
      </View>
      <View style={styles.profileStatsGrid}>
        <StatPill label="WCC" value={String(profile.worldChampionships)} />
        <StatPill label="Poles" value={String(profile.polePositions)} />
        <StatPill label="Fastest laps" value={String(profile.fastestLaps)} />
        <StatPill label="Since" value={String(profile.firstTeamEntry)} />
        <StatPill label="Best finish" value={`P${profile.highestRaceFinish.position} (×${profile.highestRaceFinish.number})`} />
        <StatPill label="Tyres" value={profile.tyres} />
      </View>
      <View style={styles.teamStaff}>
        <Text style={styles.sectionTitle}>TEAM</Text>
        <InfoRow icon={Users} label="Team principal" value={profile.president || profile.director} />
        <InfoRow icon={Wrench} label="Technical" value={profile.technicalManager} />
        <InfoRow icon={Gauge} label="Chassis" value={profile.chassis} />
        <InfoRow icon={Timer} label="Power unit" value={profile.engine} />
      </View>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.infoRow}>
      <Icon size={14} color={F1_RED} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={styles.detailLoading}>
      <ActivityIndicator color={F1_RED} />
    </View>
  );
}

function ProfileModalShell({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={16} color={TXT_2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  circuitCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginTop: 16,
  },
  circuitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  circuitImage: {
    width: 72,
    height: 48,
    borderRadius: 10,
    backgroundColor: CARD_2,
  },
  circuitImageFallback: {
    width: 72,
    height: 48,
    borderRadius: 10,
    backgroundColor: CARD_2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitTitle: {
    color: TXT,
    fontSize: 16,
    fontWeight: '800',
  },
  circuitSub: {
    color: TXT_2,
    fontSize: 13,
    marginTop: 4,
  },
  circuitStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: CARD_2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  statPillLabel: {
    color: TXT_3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statPillValue: {
    color: TXT,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  lapRecordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  lapRecordText: {
    color: TXT_2,
    fontSize: 12,
    flex: 1,
  },
  circuitLoading: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
    marginTop: 16,
  },
  circuitLoadingText: {
    color: TXT_2,
    fontSize: 13,
  },
  detailSection: {
    marginTop: 16,
  },
  sectionTitle: {
    color: TXT_3,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  detailTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  detailTabActive: {
    backgroundColor: F1_RED,
    borderColor: F1_RED,
  },
  detailTabText: {
    color: TXT_2,
    fontSize: 12,
    fontWeight: '700',
  },
  detailTabTextActive: {
    color: '#FFF',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  posCol: {
    width: 22,
    color: TXT_2,
    fontWeight: '800',
    fontSize: 13,
  },
  dataRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CARD_2,
  },
  dataName: {
    color: TXT,
    fontSize: 14,
    fontWeight: '700',
  },
  dataNameLink: {
    color: '#FF6B6B',
  },
  dataSub: {
    color: TXT_2,
    fontSize: 12,
    marginTop: 2,
  },
  dataRight: {
    alignItems: 'flex-end',
  },
  dataMeta: {
    color: TXT,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dataSubMeta: {
    color: TXT_3,
    fontSize: 11,
    marginTop: 2,
  },
  detailLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  detailLoadingText: {
    color: TXT_2,
    fontSize: 13,
  },
  detailUnavailable: {
    color: TXT_2,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDetail: {
    color: TXT_2,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  modalHeaderTitle: {
    flex: 1,
    color: TXT,
    fontSize: 18,
    fontWeight: '800',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  profileHero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  profileHeroImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CARD_2,
  },
  teamLogoHero: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: CARD_2,
  },
  profileName: {
    color: TXT,
    fontSize: 22,
    fontWeight: '900',
  },
  profileSub: {
    color: TXT_2,
    fontSize: 13,
    marginTop: 4,
  },
  profileStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statPillWrap: {
    width: '31%',
  },
  teamHistory: {
    marginBottom: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    gap: 12,
  },
  historySeason: {
    width: 44,
    color: F1_RED,
    fontWeight: '800',
    fontSize: 13,
  },
  historyTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamThumb: {
    width: 24,
    height: 24,
  },
  historyName: {
    color: TXT,
    fontSize: 14,
    fontWeight: '600',
  },
  teamStaff: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  infoLabel: {
    color: TXT_2,
    fontSize: 13,
    width: 100,
  },
  infoValue: {
    flex: 1,
    color: TXT,
    fontSize: 13,
    fontWeight: '600',
  },
});
