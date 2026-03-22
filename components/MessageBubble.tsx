import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatMessage } from '../types';
import { theme } from '../constants/theme';
import { MarkdownText } from './MarkdownText';

interface Props {
  message: ChatMessage;
  onRetry?: (msgId: string) => void;
  onLongPress?: (message: ChatMessage) => void;
  searchQuery?: string;
}

/** Highlight matching substrings within text */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let matchIdx = lowerText.indexOf(lowerQuery);
  let keyIdx = 0;

  while (matchIdx !== -1) {
    if (matchIdx > lastIdx) {
      parts.push(text.slice(lastIdx, matchIdx));
    }
    parts.push(
      <Text key={keyIdx++} style={highlightStyle}>
        {text.slice(matchIdx, matchIdx + query.length)}
      </Text>,
    );
    lastIdx = matchIdx + query.length;
    matchIdx = lowerText.indexOf(lowerQuery, lastIdx);
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

const highlightStyle = {
  backgroundColor: 'rgba(108, 99, 255, 0.35)',
  borderRadius: 2,
} as const;

/** Renders a single chat message bubble, styled by role */
export function MessageBubble({ message, onRetry, onLongPress, searchQuery }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const canRetry = isSystem && !!message.retryText && !!onRetry;
  const hasMatch = !!searchQuery && message.content.toLowerCase().includes(searchQuery.toLowerCase());

  const handleLongPress = () => {
    onLongPress?.(message);
  };

  const bubble = (
    <View
      style={[
        styles.bubble,
        isUser && styles.bubbleUser,
        isSystem && styles.bubbleSystem,
        hasMatch && styles.bubbleMatch,
      ]}
    >
      {!isUser && (
        <Text style={styles.roleLabel}>
          {isSystem ? 'System' : 'OpenClaw'}
        </Text>
      )}
      {isUser || isSystem ? (
        <Text style={[styles.text, isSystem && styles.textSystem]}>
          {searchQuery ? highlightText(message.content, searchQuery) : message.content}
          {message.streaming ? <Text style={styles.cursor}>▌</Text> : null}
        </Text>
      ) : (
        <View>
          <MarkdownText baseStyle={styles.text}>{message.content}</MarkdownText>
          {message.streaming ? <Text style={styles.cursor}>▌</Text> : null}
        </View>
      )}
      {canRetry && (
        <Text style={styles.retryHint}>Tap to retry</Text>
      )}
      <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  if (canRetry) {
    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        <TouchableOpacity
          onPress={() => { onRetry(message.id); }}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retry sending message"
        >
          {bubble}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={1}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel="Message actions"
      >
        {bubble}
      </TouchableOpacity>
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
  bubbleMatch: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
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
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  retryHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cursor: {
    color: theme.colors.accent,
    fontWeight: '100',
  },
});
