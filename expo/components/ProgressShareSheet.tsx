import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Share2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ShareableProgressCard } from '@/components/ShareableProgressCard';
import { shareProgressCard, type SharePayload } from '@/utils/shareProgress';

interface ProgressShareSheetProps {
  visible: boolean;
  payload: SharePayload | null;
  onClose: () => void;
}

export const ProgressShareSheet: React.FC<ProgressShareSheetProps> = ({
  visible,
  payload,
  onClose,
}) => {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!payload || sharing) return;
    setSharing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      await shareProgressCard(cardRef, payload);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible && !!payload}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.heading}>Share your progress</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardWrap} collapsable={false} ref={cardRef}>
            {payload && <ShareableProgressCard data={payload.card} />}
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            onPress={handleShare}
            activeOpacity={0.85}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Share2 size={20} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  cardWrap: {
    borderRadius: 28,
    marginBottom: 24,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default ProgressShareSheet;
