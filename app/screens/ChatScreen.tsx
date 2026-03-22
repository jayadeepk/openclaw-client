import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '../../components/MessageBubble';
import { DateSeparator } from '../../components/DateSeparator';
import { ChatInput } from '../../components/ChatInput';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ScrollToBottomFAB } from '../../components/ScrollToBottomFAB';
import { MessageActionsMenu } from '../../components/MessageActionsMenu';
import { SearchBar } from '../../components/SearchBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
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

  const { messages, status, reconnectIn, isTyping, sendMessage, retryMessage, connect, disconnect, clearMessages, deleteMessage } = useWebSocket(
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

  const isOnline = useNetworkStatus();

  // Connect when settings change (e.g. after saving new gateway URL)
  useEffect(() => {
    if (settings.authToken) {
      connect();
    }
    return () => { disconnect(); };
  }, [settings.gatewayHost, settings.gatewayPort, settings.authToken]);

  // Reconnect when network comes back online
  useEffect(() => {
    if (isOnline && settings.authToken && status === 'disconnected') {
      connect();
    }
  }, [isOnline, settings.authToken, status, connect]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);

  const handleMessageLongPress = useCallback((msg: ChatMessage) => {
    setActionTarget(msg);
  }, []);

  const closeActions = useCallback(() => {
    setActionTarget(null);
  }, []);

  const listItems = useMemo(() => insertDateSeparators(messages), [messages]);

  // ─── Search ──────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);

  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  const scrollToMatch = useCallback((idx: number) => {
    if (idx < 0 || idx >= searchMatches.length) return;
    const match = searchMatches[idx];
    const listIdx = listItems.findIndex((item) => item.id === match.id);
    if (listIdx >= 0) {
      flatListRef.current?.scrollToIndex({ index: listIdx, animated: true, viewPosition: 0.5 });
    }
  }, [searchMatches, listItems]);

  const handleSearchPrev = useCallback(() => {
    if (searchMatches.length === 0) return;
    const next = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchIndex(next);
    scrollToMatch(next);
  }, [searchIndex, searchMatches.length, scrollToMatch]);

  const handleSearchNext = useCallback(() => {
    if (searchMatches.length === 0) return;
    const next = (searchIndex + 1) % searchMatches.length;
    setSearchIndex(next);
    scrollToMatch(next);
  }, [searchIndex, searchMatches.length, scrollToMatch]);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const handleSearchQueryChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if ('type' in item) {
        return <DateSeparator label={item.label} />;
      }
      return <MessageBubble message={item} onRetry={retryMessage} onLongPress={handleMessageLongPress} searchQuery={searchOpen ? searchQuery : undefined} />;
    },
    [retryMessage, handleMessageLongPress, searchOpen, searchQuery],
  );

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setIsAtBottom(distanceFromBottom < 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    if (status === 'connected') return;
    setRefreshing(true);
    connect();
    // Clear the spinner after a short delay — connection state will show in the badge
    setTimeout(() => { setRefreshing(false); }, 1000);
  }, [status, connect]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OpenClaw</Text>
          <ConnectionBadge status={status} reconnectIn={reconnectIn} isOnline={isOnline} />
        </View>
        <View style={styles.headerActions}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchOpen(true); }} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Search messages">
              <Text style={styles.headerBtnText}>Search</Text>
            </TouchableOpacity>
          )}
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

      {searchOpen && (
        <SearchBar
          query={searchQuery}
          onChangeQuery={handleSearchQueryChange}
          matchCount={searchMatches.length}
          currentIndex={searchIndex}
          onPrev={handleSearchPrev}
          onNext={handleSearchNext}
          onClose={handleSearchClose}
        />
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textMuted} />
          }
        >
          <Text style={styles.emptyIcon}>🐾</Text>
          <Text style={styles.emptyTitle}>OpenClaw Client</Text>
          <Text style={styles.emptySubtitle}>
            {settings.authToken
              ? 'Connected. Send a message to start.'
              : 'Go to Settings to configure your gateway connection.'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textMuted} />
          }
        />
      )}

      {messages.length > 0 && (
        <ScrollToBottomFAB visible={!isAtBottom} onPress={scrollToBottom} />
      )}

      {isTyping && <TypingIndicator />}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={status !== 'connected'} />
      <View style={{ height: insets.bottom }} />

      <MessageActionsMenu
        message={actionTarget}
        visible={actionTarget !== null}
        onClose={closeActions}
        onRetry={retryMessage}
        onDelete={deleteMessage}
      />
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
