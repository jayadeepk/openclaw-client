import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChatMessage } from '../types';
import { theme } from '../constants/theme';

interface Props {
  message: ChatMessage;
}

/** Renders a single chat message bubble, styled by role */
export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View
        style={[
          styles.bubble,
          isUser && styles.bubbleUser,
          isSystem && styles.bubbleSystem,
        ]}
      >
        {!isUser && (
          <Text style={styles.roleLabel}>
            {isSystem ? 'System' : 'OpenClaw'}
          </Text>
        )}
        <Text style={[styles.text, isSystem && styles.textSystem]}>
          {message.content}
          {message.streaming ? <Text style={styles.cursor}>▌</Text> : null}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    backgroundColor: theme.colors.assistantBubble,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: theme.colors.userBubble,
  },
  bubbleSystem: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  roleLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: '600',
    marginBottom: 2,
  },
  text: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  textSystem: {
    color: theme.colors.error,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  cursor: {
    color: theme.colors.accent,
    fontWeight: '100',
  },
});
