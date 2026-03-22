import React, { useMemo } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ChatMessage } from '../types';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface MessageActionsMenuProps {
  message: ChatMessage | null;
  visible: boolean;
  onClose: () => void;
  onRetry?: (msgId: string) => void;
  onDelete?: (msgId: string) => void;
}

interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Context menu shown on long-press of a message bubble */
export function MessageActionsMenu({ message, visible, onClose, onRetry, onDelete }: MessageActionsMenuProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!message) return null;

  const canRetry = (message.role === 'user') || (message.role === 'system' && !!message.retryText);

  const actions: ActionItem[] = [
    {
      label: 'Copy',
      onPress: () => {
        void Clipboard.setStringAsync(message.content);
        onClose();
      },
    },
  ];

  if (canRetry && onRetry) {
    actions.push({
      label: 'Retry',
      onPress: () => {
        onRetry(message.id);
        onClose();
      },
    });
  }

  actions.push({
    label: 'Share',
    onPress: () => {
      void Share.share({ message: message.content });
      onClose();
    },
  });

  if (onDelete) {
    actions.push({
      label: 'Delete',
      destructive: true,
      onPress: () => {
        onDelete(message.id);
        onClose();
      },
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.menu}>
          <Text style={styles.preview} numberOfLines={2}>
            {message.content}
          </Text>
          <View style={styles.divider} />
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionRow}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={[styles.actionText, action.destructive === true && styles.actionTextDestructive]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: t.spacing.xl,
    },
    menu: {
      width: '100%',
      maxWidth: 300,
      backgroundColor: t.colors.surface,
      borderRadius: t.borderRadius.md,
      overflow: 'hidden',
    },
    preview: {
      fontSize: t.fontSize.sm,
      color: t.colors.textMuted,
      padding: t.spacing.md,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.border,
    },
    actionRow: {
      paddingVertical: t.spacing.sm + 4,
      paddingHorizontal: t.spacing.md,
    },
    actionText: {
      fontSize: t.fontSize.md,
      color: t.colors.text,
    },
    actionTextDestructive: {
      color: t.colors.error,
    },
    cancelText: {
      fontSize: t.fontSize.md,
      color: t.colors.textSecondary,
      textAlign: 'center',
    },
  });
}
