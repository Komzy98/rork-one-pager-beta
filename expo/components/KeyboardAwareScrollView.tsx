import React, { forwardRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Fixed header height above this scroll view (default 56). */
  headerHeight?: number;
  /** Disable KeyboardAvoidingView when nested inside another keyboard-aware container. */
  keyboardAvoiding?: boolean;
};

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      headerHeight = 56,
      keyboardAvoiding = true,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = 'on-drag',
      ...scrollProps
    },
    ref,
  ) {
    const insets = useSafeAreaInsets();

    const scroll = (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    );

    if (!keyboardAvoiding) return scroll;

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + headerHeight : 0}
      >
        {scroll}
      </KeyboardAvoidingView>
    );
  },
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
