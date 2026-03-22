import React, { useMemo, useState } from 'react';
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

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
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
export function ChatInput({ onSend, disabled, replyTo, onCancelReply }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [text, setText] = useState('');
  const remaining = MAX_LENGTH - text.length;
  const showCounter = text.length > 0 && remaining <= COUNTER_THRESHOLD;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
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
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message OpenClaw..."
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
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !text.trim() || disabled }}
        >
          <Text style={styles.sendIcon}>↑</Text>
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
      fontSize: 20,
      fontWeight: '700',
    },
  });
}
