import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw } from 'lucide-react-native';

type Props = {
  message: string;
  detail?: string;
  onRetry: () => void;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
};

export default function FeedRetryBanner({
  message,
  detail,
  onRetry,
  accentColor = '#E50914',
  textColor = '#F5F5F7',
  mutedColor = '#8E8E9A',
  backgroundColor = 'rgba(255,255,255,0.06)',
  borderColor = 'rgba(255,255,255,0.08)',
}: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor, borderColor }]}>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      {detail ? <Text style={[styles.detail, { color: mutedColor }]}>{detail}</Text> : null}
      <TouchableOpacity style={[styles.btn, { borderColor: accentColor }]} onPress={onRetry} activeOpacity={0.85}>
        <RefreshCw size={14} color={accentColor} />
        <Text style={[styles.btnText, { color: accentColor }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
  btn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
