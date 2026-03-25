import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const DOT_COUNT = 3;
const DOT_SIZE = 6;
const ANIMATION_DURATION = 400;

/** Animated "..." typing indicator shown while waiting for assistant response */
export function TypingIndicator() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const anims = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * ANIMATION_DURATION),
          Animated.timing(anim, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ),
    );
    animations.forEach((a) => { a.start(); });
    return () => { animations.forEach((a) => { a.stop(); }); };
  }, [anims]);

  return (
    <View style={styles.container} accessibilityLabel="Assistant is typing">
      <View style={styles.bubble}>
        {anims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: t.spacing.md,
      marginVertical: t.spacing.xs,
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.assistantBubble,
      borderRadius: t.borderRadius.lg,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm + 4,
      gap: 4,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: t.colors.textSecondary,
    },
  });
}
