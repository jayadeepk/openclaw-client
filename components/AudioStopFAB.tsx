import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const FAB_SIZE = 40;
const ICON_SIZE = 16;
const ANIMATION_DURATION = 200;

interface AudioStopFABProps {
  visible: boolean;
  onPress: () => void;
}

/** Floating action button to stop audio playback. Positioned above the scroll-to-bottom FAB. */
export function AudioStopFAB({ visible, onPress }: AudioStopFABProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        accessibilityLabel="Stop audio"
      >
        <Animated.View style={styles.stopIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      right: t.spacing.md,
      bottom: 130,
      zIndex: 10,
    },
    button: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: t.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopIcon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: 2,
      backgroundColor: '#ffffff',
    },
  });
}
