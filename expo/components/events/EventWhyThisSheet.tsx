import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import type { LocalEvent } from '@/types/events';
import type { EventRecommendationReason } from '@/utils/eventPersonalization';
import type { EventsPalette } from '@/utils/eventsPalette';

interface EventWhyThisSheetProps {
  visible: boolean;
  event: LocalEvent | null;
  reasons: EventRecommendationReason[];
  explanation: string | null;
  palette: EventsPalette;
  onClose: () => void;
}

export const EventWhyThisSheet = React.memo(function EventWhyThisSheet({
  visible,
  event,
  reasons,
  explanation,
  palette,
  onClose,
}: EventWhyThisSheetProps) {
  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={16} color={palette.primary} />
              <Text style={[styles.title, { color: palette.text }]}>Why this?</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={2}>
            {event.title}
          </Text>

          {explanation ? (
            <Text style={[styles.explanation, { color: palette.textSecondary }]}>{explanation}</Text>
          ) : null}

          <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
            {reasons.length > 0 ? (
              reasons.map((reason) => (
                <View
                  key={`${reason.kind}-${reason.label}`}
                  style={[styles.reasonRow, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}
                >
                  <View style={[styles.reasonDot, { backgroundColor: palette.primary }]} />
                  <Text style={[styles.reasonText, { color: palette.text }]}>{reason.label}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.empty, { color: palette.textSecondary }]}>
                We thought this matched your interests and schedule — save it to your One Pager to plan around it.
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  reasonList: {
    maxHeight: 280,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  empty: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
