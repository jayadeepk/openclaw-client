import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatMessage } from '../types';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  message: ChatMessage;
  onDismiss: () => void;
}

const MAX_PREVIEW_LENGTH = 120;

/** Shows a quoted message preview above the chat input */
export function ReplyPreview({ message, onDismiss }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const label = message.role === 'user' ? 'You' : 'OpenClaw';
  const preview = message.content.length > MAX_PREVIEW_LENGTH
    ? message.content.slice(0, MAX_PREVIEW_LENGTH) + '...'
    : message.content;

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismissBtn}
        accessibilityRole="button"
        accessibilityLabel="Cancel reply"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      backgroundColor: t.colors.background,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    accent: {
      width: 3,
      alignSelf: 'stretch',
      backgroundColor: t.colors.primary,
      borderRadius: 2,
      marginRight: t.spacing.sm,
    },
    content: {
      flex: 1,
    },
    label: {
      fontSize: t.fontSize.sm,
      fontWeight: '600',
      color: t.colors.primary,
      marginBottom: 2,
    },
    preview: {
      fontSize: t.fontSize.sm,
      color: t.colors.textSecondary,
      lineHeight: 18,
    },
    dismissBtn: {
      padding: t.spacing.xs,
      marginLeft: t.spacing.sm,
    },
    dismissText: {
      color: t.colors.textMuted,
      fontSize: t.fontSize.md,
    },
  });
}
