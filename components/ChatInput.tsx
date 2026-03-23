import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { ChatMessage } from '../types';
import { ReplyPreview } from './ReplyPreview';
import { matchCommands, isSlashCommand, SlashCommand } from '../utils/slashCommands';

interface Props {
  onSend: (text: string) => void;
  /** Called when the user submits a recognized slash command */
  onSlashCommand?: (command: string) => void;
  disabled?: boolean;
  /** True when the WebSocket is not connected (messages will be queued) */
  offline?: boolean;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

const MAX_LENGTH = 4096;
const COUNTER_THRESHOLD = 200;

function getCounterColor(remaining: number, errorColor: string, mutedColor: string): string {
  if (remaining <= 50) return errorColor;
  if (remaining <= 100) return '#ffaa33';
  return mutedColor;
}

/** Text input bar with a send button */
export function ChatInput({ onSend, onSlashCommand, disabled, offline, replyTo, onCancelReply }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [text, setText] = useState('');
  const remaining = MAX_LENGTH - text.length;
  const showCounter = text.length > 0 && remaining <= COUNTER_THRESHOLD;

  // Input history
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const MAX_HISTORY = 50;

  const showHistoryBtn = text.length === 0 && historyRef.current.length > 0;

  const handleHistoryUp = useCallback(() => {
    const history = historyRef.current;
    if (history.length === 0) return;
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex >= history.length) return;
    historyIndexRef.current = nextIndex;
    setText(history[nextIndex]);
  }, []);

  const suggestions = useMemo(() => matchCommands(text), [text]);
  const showSuggestions = suggestions.length > 0 && text.startsWith('/');

  const handleSelectCommand = (cmd: SlashCommand) => {
    setText('');
    historyIndexRef.current = -1;
    onSlashCommand?.(cmd.name);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    // Check if it's a slash command
    const cmd = isSlashCommand(trimmed);
    if (cmd) {
      setText('');
      historyIndexRef.current = -1;
      onSlashCommand?.(cmd.name);
      return;
    }
    // Add to history (most recent first, avoid duplicates at top)
    if (historyRef.current[0] !== trimmed) {
      historyRef.current.unshift(trimmed);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.pop();
      }
    }
    historyIndexRef.current = -1;
    onSend(trimmed);
    setText('');
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e as unknown as KeyboardEvent).shiftKey) {
      (e as unknown as KeyboardEvent).preventDefault();
      handleSend();
    }
  };

  return (
      <View>
        {replyTo && onCancelReply && (
          <ReplyPreview message={replyTo} onDismiss={onCancelReply} />
        )}
        {showSuggestions && (
          <View style={styles.suggestions} accessibilityRole="menu" accessibilityLabel="Slash command suggestions">
            {suggestions.map((cmd) => (
              <TouchableOpacity
                key={cmd.name}
                style={styles.suggestionItem}
                onPress={() => { handleSelectCommand(cmd); }}
                accessibilityRole="menuitem"
                accessibilityLabel={cmd.name}
              >
                <Text style={styles.suggestionName}>{cmd.name}</Text>
                <Text style={styles.suggestionDesc}>{cmd.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={offline && !disabled ? "Message (will send when online)..." : "Message OpenClaw..."}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={MAX_LENGTH}
            editable={!disabled}
            onSubmitEditing={handleSend}
            onKeyPress={handleKeyPress}
            submitBehavior="submit"
            accessibilityLabel="Message input"
            accessibilityHint="Type a message to send to OpenClaw"
          />
          {showCounter && (
            <Text
              style={[styles.counter, { color: getCounterColor(remaining, theme.colors.error, theme.colors.textMuted) }]}
              accessibilityLabel={String(remaining) + ' characters remaining'}
            >
              {remaining}
            </Text>
          )}
        </View>
        {showHistoryBtn && (
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={handleHistoryUp}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Previous message"
          >
            <Text style={styles.historyIcon}>↑</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !text.trim() || disabled }}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
      </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      backgroundColor: t.colors.background,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    inputWrapper: {
      flex: 1,
      marginRight: t.spacing.sm,
    },
    input: {
      backgroundColor: t.colors.inputBg,
      borderRadius: t.borderRadius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm + 2,
      color: t.colors.text,
      fontSize: t.fontSize.md,
      maxHeight: 120,
    },
    counter: {
      fontSize: 11,
      textAlign: 'right',
      marginTop: 2,
      marginRight: t.spacing.xs,
    },
    historyBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.colors.surfaceLight,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing.xs,
    },
    historyIcon: {
      color: t.colors.textSecondary,
      fontSize: 16,
      fontWeight: '700',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: t.colors.surfaceLight,
    },
    sendIcon: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    suggestions: {
      backgroundColor: t.colors.surface,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
      paddingVertical: t.spacing.xs,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      gap: t.spacing.sm,
    },
    suggestionName: {
      color: t.colors.primary,
      fontSize: t.fontSize.md,
      fontWeight: '600',
    },
    suggestionDesc: {
      color: t.colors.textSecondary,
      fontSize: t.fontSize.sm,
    },
  });
}
