import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  label: string;
}

/** Horizontal line with a day label ("Today", "Yesterday", "Mar 20") */
export function DateSeparator({ label }: Props) {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.sm,
    fontWeight: '500',
  },
});
