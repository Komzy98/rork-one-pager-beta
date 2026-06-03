import React, { useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X,
  Calendar,
  Clock,
  Trophy,
  Swords,
  Flame,
  Target,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { UFC_BRAND } from '@/utils/sportsPalette';

/** UFC fight sheet — always Fight Center black/red (matches Results tab). */
function ufcModalChrome() {
  return {
    sheetGrad: ['#0C0C10', '#070708'] as const,
    heroGrad: ['#1A0808', '#140614', '#0A0A12'] as const,
    card: UFC_BRAND.surface,
    cardBorder: UFC_BRAND.border,
    text: UFC_BRAND.text,
    textMuted: UFC_BRAND.muted,
    label: '#7B7B90',
    chipBg: '#1A1B22',
    iconMuted: '#8B8BA7',
    closeBg: '#1C1C28',
    handle: '#3A3A48',
    accent: UFC_BRAND.red,
    accentSoft: UFC_BRAND.redSoft,
    accentBorder: UFC_BRAND.redBorder,
    heroText: UFC_BRAND.text,
    divider: 'rgba(255,255,255,0.08)',
    avatarBg: '#1A1B1E',
    avatarBorder: UFC_BRAND.redBorder,
    countdownBoxBg: UFC_BRAND.redSoft,
    countdownBoxBorder: UFC_BRAND.redBorder,
    countdownUnit: UFC_BRAND.muted,
    countdownSep: '#6B6B80',
  };
}

interface UFCFight {
  id: number;
  date: string;
  time: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  statusShort: string;
  event: string;
  category: string;
  fighter1: {
    id: number;
    name: string;
    photo?: string;
    winner?: boolean;
  };
  fighter2: {
    id: number;
    name: string;
    photo?: string;
    winner?: boolean;
  };
  result?: {
    method?: string;
    round?: number;
    time?: string;
  };
}

interface UFCFightDetailModalProps {
  visible: boolean;
  onClose: () => void;
  fight: UFCFight;
}

const LivePulse = ({ color = '#FF3B30', size = 8 }: { color?: string; size?: number }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        }}
      />
      <View style={{ backgroundColor: color, width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375 }} />
    </View>
  );
};

export default function UFCFightDetailModal({ visible, onClose, fight }: UFCFightDetailModalProps) {
  const ui = useMemo(() => ufcModalChrome(), []);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fighter1Anim = useRef(new Animated.Value(-50)).current;
  const fighter2Anim = useRef(new Animated.Value(50)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      fighter1Anim.setValue(-50);
      fighter2Anim.setValue(50);
      contentFade.setValue(0);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        Animated.stagger(100, [
          Animated.spring(fighter1Anim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
          Animated.spring(fighter2Anim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [visible, slideAnim, fadeAnim, fighter1Anim, fighter2Anim, contentFade]);

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const isCompleted = fight.status === 'Completed';
  const isLive = fight.status === 'Live';
  const isUpcoming = fight.status === 'Upcoming';
  const fighter1Won = isCompleted && !!fight.fighter1.winner;
  const fighter2Won = isCompleted && !!fight.fighter2.winner;

  const getFighterInitial = (name: string) => {
    if (!name || name === 'TBA') return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    return name.charAt(0);
  };

  const getMethodIcon = (method?: string) => {
    if (!method) return null;
    const m = method.toLowerCase();
    if (m.includes('ko') || m.includes('tko')) return '\u{1F4A5}';
    if (m.includes('submission') || m.includes('sub')) return '\u{1F512}';
    if (m.includes('decision') || m.includes('dec')) return '\u{1F4CB}';
    return '\u2694\uFE0F';
  };

  const getMethodColor = (method?: string) => {
    if (!method) return '#8B8BA7';
    const m = method.toLowerCase();
    if (m.includes('ko') || m.includes('tko')) return '#FF6B6B';
    if (m.includes('submission') || m.includes('sub')) return '#7C3AED';
    if (m.includes('decision') || m.includes('dec')) return '#3B82F6';
    return UFC_BRAND.red;
  };

  const getMethodLabel = (method?: string) => {
    if (!method) return '';
    const m = method.toLowerCase();
    if (m.includes('ko') || m.includes('tko')) return 'Knockout';
    if (m.includes('submission') || m.includes('sub')) return 'Submission';
    if (m.includes('decision') || m.includes('dec')) return 'Decision';
    return 'Other';
  };

  const countdown = useMemo(() => {
    if (!isUpcoming) return null;
    const now = new Date().getTime();
    const target = new Date(fight.date).getTime();
    const diff = Math.max(0, target - now);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    };
  }, [fight.date, isUpcoming]);

  const fightDate = new Date(fight.date);
  const formattedDate = fightDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[...ui.sheetGrad]} style={s.sheetGradient}>
            <View style={s.handleRow}>
              <View style={[s.handle, { backgroundColor: ui.handle }]} />
            </View>

            <View style={s.headerRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[s.closeBtn, { backgroundColor: ui.closeBg }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={18} color={ui.iconMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
              <LinearGradient
                colors={[...ui.heroGrad]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroGradient}
              >
                <View style={s.heroAccentBar} />

                {isLive && (
                  <View style={s.liveBadgeRow}>
                    <View style={s.liveBadge}>
                      <LivePulse color="#FF3B30" size={8} />
                      <Text style={s.liveBadgeText}>LIVE NOW</Text>
                    </View>
                  </View>
                )}

                {isCompleted && (
                  <View style={s.liveBadgeRow}>
                    <View style={[s.liveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                      <Trophy size={12} color="#10B981" />
                      <Text style={[s.liveBadgeText, { color: '#10B981' }]}>FINAL RESULT</Text>
                    </View>
                  </View>
                )}

                {isUpcoming && (
                  <View style={s.liveBadgeRow}>
                    <View style={[s.liveBadge, { backgroundColor: ui.accentSoft, borderColor: ui.accentBorder }]}>
                      <Calendar size={12} color={ui.accent} />
                      <Text style={[s.liveBadgeText, { color: ui.accent }]}>UPCOMING</Text>
                    </View>
                  </View>
                )}

                <Text style={[s.heroEvent, { color: ui.heroText }]} numberOfLines={2}>{fight.event}</Text>

                {fight.category !== 'TBD' && (
                  <View style={[s.categoryBadge, { backgroundColor: ui.accentSoft, borderColor: ui.accentBorder }]}>
                    <Text style={[s.categoryText, { color: ui.accent }]}>{fight.category}</Text>
                  </View>
                )}

                <View style={s.fightersSection}>
                  <Animated.View style={[s.fighterCol, { transform: [{ translateX: fighter1Anim }] }]}>
                    <View style={[
                      s.fighterAvatarOuter,
                      { borderColor: ui.avatarBorder },
                      fighter1Won && { borderColor: '#10B981', borderWidth: 3 },
                      fighter2Won && !fighter1Won && { opacity: 0.5 },
                    ]}>
                      <View style={[s.fighterAvatar, { backgroundColor: ui.avatarBg }]}>
                        {fight.fighter1.photo ? (
                          <Image
                            source={{ uri: fight.fighter1.photo }}
                            style={[s.fighterPhoto, { opacity: 1 }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <LinearGradient colors={['#1E1E3A', '#2A2A50']} style={s.fighterAvatarFallback}>
                            <Text style={s.fighterInitials}>{getFighterInitial(fight.fighter1.name)}</Text>
                          </LinearGradient>
                        )}
                      </View>
                    </View>
                    <Text style={[
                      s.fighterName,
                      { color: ui.heroText },
                      fighter1Won && { color: '#10B981' },
                    ]} numberOfLines={2}>
                      {fight.fighter1.name === 'TBA' ? 'To Be Announced' : fight.fighter1.name}
                    </Text>
                    {fighter1Won && (
                      <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                        <Trophy size={10} color="#FFF" />
                        <Text style={s.winBadgeText}>WINNER</Text>
                      </LinearGradient>
                    )}
                    {fighter2Won && !fighter1Won && (
                      <View style={s.lossBadge}>
                        <Text style={s.lossBadgeText}>LOSS</Text>
                      </View>
                    )}
                  </Animated.View>

                  <View style={s.vsCenter}>
                    <View style={[s.vsLineV, { backgroundColor: ui.accentBorder }]} />
                    <LinearGradient
                      colors={isLive ? ['#FF3B30', '#CC2D26'] : [UFC_BRAND.redBright, UFC_BRAND.redDark]}
                      style={s.vsCircle}
                    >
                      <Text style={s.vsText}>VS</Text>
                    </LinearGradient>
                    <View style={[s.vsLineV, { backgroundColor: ui.accentBorder }]} />
                  </View>

                  <Animated.View style={[s.fighterCol, { transform: [{ translateX: fighter2Anim }] }]}>
                    <View style={[
                      s.fighterAvatarOuter,
                      { borderColor: ui.avatarBorder },
                      fighter2Won && { borderColor: '#10B981', borderWidth: 3 },
                      fighter1Won && !fighter2Won && { opacity: 0.5 },
                    ]}>
                      <View style={[s.fighterAvatar, { backgroundColor: ui.avatarBg }]}>
                        {fight.fighter2.photo ? (
                          <Image
                            source={{ uri: fight.fighter2.photo }}
                            style={[s.fighterPhoto, { opacity: 1 }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <LinearGradient colors={['#1E1E3A', '#2A2A50']} style={s.fighterAvatarFallback}>
                            <Text style={s.fighterInitials}>{getFighterInitial(fight.fighter2.name)}</Text>
                          </LinearGradient>
                        )}
                      </View>
                    </View>
                    <Text style={[
                      s.fighterName,
                      { color: ui.heroText },
                      fighter2Won && { color: '#10B981' },
                    ]} numberOfLines={2}>
                      {fight.fighter2.name === 'TBA' ? 'To Be Announced' : fight.fighter2.name}
                    </Text>
                    {fighter2Won && (
                      <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                        <Trophy size={10} color="#FFF" />
                        <Text style={s.winBadgeText}>WINNER</Text>
                      </LinearGradient>
                    )}
                    {fighter1Won && !fighter2Won && (
                      <View style={s.lossBadge}>
                        <Text style={s.lossBadgeText}>LOSS</Text>
                      </View>
                    )}
                  </Animated.View>
                </View>
              </LinearGradient>

              <Animated.View style={[s.detailsSection, { opacity: contentFade }]}>
                {isCompleted && fight.result?.method && (
                  <View
                    style={[
                      s.resultCard,
                      { backgroundColor: ui.card, borderColor: ui.cardBorder },
                    ]}
                  >
                    <View style={s.resultCardHeader}>
                      <Swords size={16} color={ui.accent} />
                      <Text style={[s.resultCardTitle, { color: ui.text }]}>Fight Result</Text>
                    </View>
                    <View style={s.resultCardBody}>
                      <View style={[s.resultMethodBox, { backgroundColor: getMethodColor(fight.result.method) + '15' }]}>
                        <Text style={s.resultEmoji}>{getMethodIcon(fight.result.method)}</Text>
                        <View>
                          <Text style={[s.resultMethodMain, { color: getMethodColor(fight.result.method) }]}>
                            {fight.result.method}
                          </Text>
                          <Text style={[s.resultMethodSub, { color: ui.textMuted }]}>
                            {getMethodLabel(fight.result.method)}
                          </Text>
                        </View>
                      </View>
                      <View style={s.resultDetailsRow}>
                        {fight.result.round !== undefined && (
                          <View style={[s.resultChip, { backgroundColor: ui.chipBg }]}>
                            <Target size={12} color={ui.iconMuted} />
                            <Text style={[s.resultChipText, { color: ui.text }]}>
                              Round {fight.result.round}
                            </Text>
                          </View>
                        )}
                        {fight.result.time && (
                          <View style={[s.resultChip, { backgroundColor: ui.chipBg }]}>
                            <Clock size={12} color={ui.iconMuted} />
                            <Text style={[s.resultChipText, { color: ui.text }]}>
                              {fight.result.time}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {isUpcoming && countdown && (
                  <View
                    style={[
                      s.countdownCard,
                      { backgroundColor: ui.card, borderColor: ui.cardBorder },
                    ]}
                  >
                    <View style={s.resultCardHeader}>
                      <Flame size={16} color={ui.accent} />
                      <Text style={[s.resultCardTitle, { color: ui.text }]}>Countdown</Text>
                    </View>
                    <View style={s.countdownRow}>
                      <View style={[s.countdownBox, { backgroundColor: ui.countdownBoxBg, borderColor: ui.countdownBoxBorder }]}>
                        <Text style={[s.countdownValue, { color: ui.accent }]}>{countdown.days}</Text>
                        <Text style={[s.countdownUnit, { color: ui.countdownUnit }]}>DAYS</Text>
                      </View>
                      <Text style={[s.countdownSep, { color: ui.countdownSep }]}>:</Text>
                      <View style={[s.countdownBox, { backgroundColor: ui.countdownBoxBg, borderColor: ui.countdownBoxBorder }]}>
                        <Text style={[s.countdownValue, { color: ui.accent }]}>{countdown.hours}</Text>
                        <Text style={[s.countdownUnit, { color: ui.countdownUnit }]}>HRS</Text>
                      </View>
                      <Text style={[s.countdownSep, { color: ui.countdownSep }]}>:</Text>
                      <View style={[s.countdownBox, { backgroundColor: ui.countdownBoxBg, borderColor: ui.countdownBoxBorder }]}>
                        <Text style={[s.countdownValue, { color: ui.accent }]}>{countdown.mins}</Text>
                        <Text style={[s.countdownUnit, { color: ui.countdownUnit }]}>MIN</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View
                  style={[
                    s.infoCard,
                    { backgroundColor: ui.card, borderColor: ui.cardBorder },
                  ]}
                >
                  <View style={s.resultCardHeader}>
                    <Calendar size={16} color={ui.accent} />
                    <Text style={[s.resultCardTitle, { color: ui.text }]}>Event Details</Text>
                  </View>
                  <View style={s.infoRows}>
                    <View style={s.infoRow}>
                      <Text style={[s.infoLabel, { color: ui.label }]}>Event</Text>
                      <Text style={[s.infoValue, { color: ui.text }]} numberOfLines={2}>
                        {fight.event}
                      </Text>
                    </View>
                    <View style={[s.infoDivider, { backgroundColor: ui.divider }]} />
                    <View style={s.infoRow}>
                      <Text style={[s.infoLabel, { color: ui.label }]}>Date</Text>
                      <Text style={[s.infoValue, { color: ui.text }]}>{formattedDate}</Text>
                    </View>
                    {fight.time && (
                      <>
                        <View style={[s.infoDivider, { backgroundColor: ui.divider }]} />
                        <View style={s.infoRow}>
                          <Text style={[s.infoLabel, { color: ui.label }]}>Time</Text>
                          <Text style={[s.infoValue, { color: ui.text }]}>{fight.time}</Text>
                        </View>
                      </>
                    )}
                    {fight.category !== 'TBD' && (
                      <>
                        <View style={[s.infoDivider, { backgroundColor: ui.divider }]} />
                        <View style={s.infoRow}>
                          <Text style={[s.infoLabel, { color: ui.label }]}>Weight Class</Text>
                          <Text style={[s.infoValue, { color: ui.accent }]}>{fight.category}</Text>
                        </View>
                      </>
                    )}
                    <View style={[s.infoDivider, { backgroundColor: ui.divider }]} />
                    <View style={s.infoRow}>
                      <Text style={[s.infoLabel, { color: ui.label }]}>Status</Text>
                      <View style={[
                        s.statusPill,
                        isLive && { backgroundColor: 'rgba(255, 59, 48, 0.12)' },
                        isCompleted && { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                        isUpcoming && { backgroundColor: ui.accentSoft },
                      ]}>
                        <Text style={[
                          s.statusPillText,
                          isLive && { color: '#FF3B30' },
                          isCompleted && { color: '#10B981' },
                          isUpcoming && { color: ui.accent },
                        ]}>
                          {fight.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetGradient: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroGradient: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: UFC_BRAND.red,
  },
  liveBadgeRow: {
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF3B30',
    letterSpacing: 1,
  },
  heroEvent: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: UFC_BRAND.redSoft,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: UFC_BRAND.red,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fightersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  fighterCol: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  fighterAvatarOuter: {
    borderRadius: 44,
    borderWidth: 2,
    borderColor: UFC_BRAND.redBorder,
    padding: 3,
  },
  fighterAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#1A1A35',
  },
  fighterPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
  },
  fighterAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fighterInitials: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#6B6B90',
    letterSpacing: 0.5,
  },
  fighterName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#F0F0FA',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 110,
  },
  winBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  winBadgeText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  lossBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lossBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#5A5A7A',
    letterSpacing: 0.8,
  },
  vsCenter: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  vsLineV: {
    width: 1,
    height: 16,
    backgroundColor: UFC_BRAND.redSoft,
  },
  vsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  detailsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  resultCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  resultCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  resultCardBody: {
    gap: 12,
  },
  resultMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  resultEmoji: {
    fontSize: 22,
  },
  resultMethodMain: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  resultMethodSub: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  resultDetailsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
  },
  resultChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  countdownCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  countdownBox: {
    backgroundColor: UFC_BRAND.redSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    minWidth: 65,
  },
  countdownValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: UFC_BRAND.red,
    letterSpacing: -0.5,
  },
  countdownUnit: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#9EA3AD',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  countdownSep: {
    fontSize: 22,
    fontWeight: '300' as const,
    color: '#6B6B80',
  },
  infoCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  infoRows: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'right',
    flex: 2,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
