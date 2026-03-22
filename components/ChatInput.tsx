import React, { useState } from 'react';
import {
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

/** Text input bar with a send button */
export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message OpenClaw..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={4096}
          editable={!disabled}
          onSubmitEditing={handleSend}
          submitBehavior="submit"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
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
  input: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    maxHeight: 120,
    marginRight: theme.spacing.sm,
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
