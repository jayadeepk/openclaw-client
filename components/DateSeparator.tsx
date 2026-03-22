import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
}

/** Horizontal line with a day label ("Today", "Yesterday", "Mar 20") */
export function DateSeparator({ label }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.lg,
      marginVertical: t.spacing.sm,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: t.colors.border,
    },
    label: {
      fontSize: t.fontSize.sm,
      color: t.colors.textMuted,
      marginHorizontal: t.spacing.sm,
      fontWeight: '500',
    },
  });
}
