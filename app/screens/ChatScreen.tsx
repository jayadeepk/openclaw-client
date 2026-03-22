import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '../../components/MessageBubble';
import { DateSeparator } from '../../components/DateSeparator';
import { ChatInput } from '../../components/ChatInput';
import { ConnectionBadge } from '../../components/ConnectionBadge';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ScrollToBottomFAB } from '../../components/ScrollToBottomFAB';
import { AudioStopFAB } from '../../components/AudioStopFAB';
import { MessageActionsMenu } from '../../components/MessageActionsMenu';
import { SearchBar } from '../../components/SearchBar';
import { ConversationDrawer } from '../../components/ConversationDrawer';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useConversations } from '../../hooks/useConversations';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../contexts/ThemeContext';
import { AppSettings, ChatMessage } from '../../types';
import { ChatListItem, insertDateSeparators, formatConversationExport } from '../../utils/chatHelpers';
import { AppTheme } from '../../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { loadConversationMessages } from '../../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatScreenProps {
  navigation: Props['navigation'];
  settings: AppSettings;
}

export function ChatScreen({ navigation, settings }: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const flatListRef = useRef<FlatList<ChatListItem>>(null);
  const { playAudio, stopAudio, resumeAudio, isPlaying } = useAudioPlayer();
  const { isBackground, sendNotification } = useNotifications();
  const isBackgroundRef = useRef(false);
  isBackgroundRef.current = isBackground;

  const handleFinalMessage = useCallback((content: string) => {
    if (isBackgroundRef.current) {
      const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;
      sendNotification('OpenClaw', preview);
    }
  }, [sendNotification]);

  const {
    conversations,
    activeConversation,
    loaded,
    newConversation,
    switchConversation,
    deleteConversation,
    saveActiveMessages,
    touchActiveConversation,
    autoTitle,
  } = useConversations();

  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | undefined>(undefined);
  const [convLoaded, setConvLoaded] = useState(false);

  // Load messages for active conversation when it changes
  const activeConversationId = activeConversation?.id ?? null;
  useEffect(() => {
    if (!loaded || !activeConversationId) return;
    void loadConversationMessages(activeConversationId).then((msgs) => {
      setInitialMessages(msgs);
      setConvLoaded(true);
    });
  }, [loaded, activeConversationId]);

  const { messages, status, reconnectIn, isTyping, sendMessage: wsSendMessage, retryMessage, connect, disconnect, deleteMessage, replaceMessages } = useWebSocket(
    settings,
    {
      initialMessages,
      sessionKey: activeConversation?.id ?? 'main',
      onAudioReceived: (base64Audio, format) => { void playAudio(base64Audio, format); },
      onFinalMessage: handleFinalMessage,
    },
  );

  // Persist messages when they change
  useEffect(() => {
    if (convLoaded && messages.length > 0) {
      saveActiveMessages(messages);
    }
  }, [convLoaded, messages, saveActiveMessages]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNewConversation = useCallback(() => {
    if (activeConversation) {
      saveActiveMessages(messages);
    }
    newConversation();
    replaceMessages([]);
    setDrawerOpen(false);
  }, [activeConversation, messages, saveActiveMessages, newConversation, replaceMessages]);

  const handleSwitchConversation = useCallback((id: string) => {
    if (id === activeConversation?.id) {
      setDrawerOpen(false);
      return;
    }
    if (activeConversation) {
      saveActiveMessages(messages);
    }
    void switchConversation(id).then((msgs) => {
      replaceMessages(msgs);
      setDrawerOpen(false);
    });
  }, [activeConversation, messages, saveActiveMessages, switchConversation, replaceMessages]);

  const handleDeleteConversation = useCallback((id: string) => {
    const isActive = id === activeConversation?.id;
    deleteConversation(id);
    if (isActive) {
      replaceMessages([]);
    }
  }, [activeConversation?.id, deleteConversation, replaceMessages]);

  const sendMessage = useCallback((text: string) => {
    resumeAudio();
    wsSendMessage(text);
    touchActiveConversation();
    autoTitle(text);
  }, [resumeAudio, wsSendMessage, touchActiveConversation, autoTitle]);

  const handleExport = useCallback(() => {
    if (messages.length === 0) return;
    const text = formatConversationExport(messages, activeConversation?.title);
    void Share.share({ message: text });
  }, [messages, activeConversation?.title]);

  // Reply / quote state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const handleSwipeReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleSendWithReply = useCallback((text: string) => {
    if (replyTo) {
      const label = replyTo.role === 'user' ? 'You' : 'OpenClaw';
      const quotedSnippet = replyTo.content.length > 80
        ? replyTo.content.slice(0, 80) + '...'
        : replyTo.content;
      const fullText = `> ${label}: ${quotedSnippet}\n\n${text}`;
      sendMessage(fullText);
      setReplyTo(null);
    } else {
      sendMessage(text);
    }
  }, [replyTo, sendMessage]);

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
      return <MessageBubble message={item} onRetry={retryMessage} onLongPress={handleMessageLongPress} onSwipeReply={handleSwipeReply} searchQuery={searchOpen ? searchQuery : undefined} />;
    },
    [retryMessage, handleMessageLongPress, handleSwipeReply, searchOpen, searchQuery],
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

  const [menuOpen, setMenuOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    if (status === 'connected') return;
    setRefreshing(true);
    connect();
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
          <TouchableOpacity
            onPress={() => { setMenuOpen(true); }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Text style={styles.headerBtnText}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Dropdown menu */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => { setMenuOpen(false); }}
        >
          <TouchableWithoutFeedback onPress={() => { setMenuOpen(false); }}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.menuDropdown}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); setDrawerOpen(true); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemText}>💬  Chats</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); handleNewConversation(); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemText}>✏️  New conversation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, messages.length === 0 && styles.menuItemDisabled]}
                    onPress={() => { if (messages.length > 0) { setMenuOpen(false); setSearchOpen(true); } }}
                    accessibilityRole="button"
                    disabled={messages.length === 0}
                  >
                    <Text style={[styles.menuItemText, messages.length === 0 && styles.menuItemTextDisabled]}>🔍  Search messages</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, messages.length === 0 && styles.menuItemDisabled]}
                    onPress={() => { if (messages.length > 0) { setMenuOpen(false); handleExport(); } }}
                    accessibilityRole="button"
                    disabled={messages.length === 0}
                  >
                    <Text style={[styles.menuItemText, messages.length === 0 && styles.menuItemTextDisabled]}>📤  Export conversation</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); toggleTheme(); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemText}>{theme.mode === 'dark' ? '☀️  Light mode' : '🌙  Dark mode'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); navigation.navigate('Settings'); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemText}>⚙️  Settings</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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

      <AudioStopFAB visible={isPlaying} onPress={stopAudio} />

      {isTyping && <TypingIndicator />}

      {/* Input */}
      <ChatInput onSend={handleSendWithReply} disabled={status !== 'connected'} replyTo={replyTo} onCancelReply={handleCancelReply} />
      <View style={{ height: insets.bottom }} />

      <MessageActionsMenu
        message={actionTarget}
        visible={actionTarget !== null}
        onClose={closeActions}
        onRetry={retryMessage}
        onDelete={deleteMessage}
      />

      <ConversationDrawer
        visible={drawerOpen}
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={handleSwitchConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onClose={() => { setDrawerOpen(false); }}
      />
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    title: {
      fontSize: t.fontSize.xl,
      fontWeight: '700',
      color: t.colors.text,
      marginBottom: 4,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: t.borderRadius.sm,
      backgroundColor: t.colors.surfaceLight,
    },
    headerBtnText: {
      color: t.colors.textSecondary,
      fontSize: t.fontSize.lg,
      fontWeight: '700',
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    menuDropdown: {
      position: 'absolute',
      top: 60,
      right: t.spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: t.borderRadius.md,
      paddingVertical: 4,
      minWidth: 220,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    menuItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItemDisabled: {
      opacity: 0.35,
    },
    menuItemText: {
      fontSize: t.fontSize.md,
      color: t.colors.text,
    },
    menuItemTextDisabled: {
      color: t.colors.textMuted,
    },
    menuDivider: {
      height: 1,
      backgroundColor: t.colors.border,
      marginVertical: 4,
    },
    messageList: {
      paddingVertical: t.spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.spacing.xl,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: t.spacing.md,
    },
    emptyTitle: {
      fontSize: t.fontSize.xl,
      fontWeight: '700',
      color: t.colors.text,
      marginBottom: t.spacing.sm,
    },
    emptySubtitle: {
      fontSize: t.fontSize.md,
      color: t.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
