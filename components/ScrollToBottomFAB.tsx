import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

const FAB_SIZE = 40;
const ARROW_SIZE = 18;
const ANIMATION_DURATION = 200;

interface ScrollToBottomFABProps {
  visible: boolean;
  onPress: () => void;
}

/** Floating action button that scrolls the chat list to the bottom */
export function ScrollToBottomFAB({ visible, onPress }: ScrollToBottomFABProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="auto">
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Scroll to bottom"
      >
        <Animated.Text style={styles.arrow}>{'\u2193'}</Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 80,
    zIndex: 10,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: ARROW_SIZE,
    color: theme.colors.text,
    lineHeight: ARROW_SIZE + 2,
  },
});
