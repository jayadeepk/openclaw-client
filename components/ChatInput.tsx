import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 4096;
const COUNTER_THRESHOLD = 200;

function getCounterColor(remaining: number): string {
  if (remaining <= 50) return theme.colors.error;
  if (remaining <= 100) return '#ffaa33';
  return theme.colors.textMuted;
}

/** Text input bar with a send button */
export function ChatInput({ onSend, disabled }: Props) {
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
              style={[styles.counter, { color: getCounterColor(remaining) }]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    maxHeight: 120,
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
    marginRight: theme.spacing.xs,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.surfaceLight,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
