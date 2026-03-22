import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '../../components/MessageBubble';
import { DateSeparator } from '../../components/DateSeparator';
import { ChatInput } from '../../components/ChatInput';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import { TypingIndicator } from '../../components/TypingIndicator';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { AppSettings, ChatMessage } from '../../types';
import { ChatListItem, insertDateSeparators } from '../../utils/chatHelpers';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { loadMessages, saveMessages, clearPersistedMessages } from '../../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatScreenProps {
  navigation: Props['navigation'];
  settings: AppSettings;
}

export function ChatScreen({ navigation, settings }: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<ChatListItem>>(null);
  const { playAudio } = useAudioPlayer();
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // Load persisted messages on mount
  useEffect(() => {
    void loadMessages().then((msgs) => {
      setInitialMessages(msgs);
      setLoaded(true);
    });
  }, []);

  const { messages, status, reconnectIn, isTyping, sendMessage, connect, disconnect, clearMessages } = useWebSocket(
    settings,
    {
      initialMessages,
      onAudioReceived: (base64Audio, format) => { void playAudio(base64Audio, format); },
    },
  );

  // Persist messages when they change
  useEffect(() => {
    if (loaded && messages.length > 0) {
      void saveMessages(messages);
    }
  }, [loaded, messages]);

  // Connect when settings change (e.g. after saving new gateway URL)
  useEffect(() => {
    if (settings.authToken) {
      connect();
    }
    return () => { disconnect(); };
  }, [settings.gatewayHost, settings.gatewayPort, settings.authToken]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const listItems = useMemo(() => insertDateSeparators(messages), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if ('type' in item) {
        return <DateSeparator label={item.label} />;
      }
      return <MessageBubble message={item} />;
    },
    [],
  );

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OpenClaw</Text>
          <ConnectionBadge status={status} reconnectIn={reconnectIn} />
        </View>
        <View style={styles.headerActions}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={() => { clearMessages(); void clearPersistedMessages(); }} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Clear messages">
              <Text style={styles.headerBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { navigation.navigate('Settings'); }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.headerBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🐾</Text>
          <Text style={styles.emptyTitle}>OpenClaw Client</Text>
          <Text style={styles.emptySubtitle}>
            {settings.authToken
              ? 'Connected. Send a message to start.'
              : 'Go to Settings to configure your gateway connection.'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {isTyping && <TypingIndicator />}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={status !== 'connected'} />
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
  },
  headerBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  messageList: {
    paddingVertical: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
