import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Wraps a full screen when search/inputs sit in a fixed header above a scroll area. */
export function KeyboardAvoidingScreen({
  children,
  keyboardVerticalOffset = 0,
}: {
  children: React.ReactNode;
  /** Fixed chrome height below the status bar (headers, search bars). */
  keyboardVerticalOffset?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + keyboardVerticalOffset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
