import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, ChatMessage } from '../types';
import { nextId } from '../utils/chatHelpers';
import {
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  loadConversationMessages,
  saveConversationMessages,
  deleteConversationMessages,
} from '../utils/storage';

export interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loaded: boolean;
  /** Create a new conversation and switch to it */
  newConversation: () => Conversation;
  /** Switch to an existing conversation; returns its messages */
  switchConversation: (id: string) => Promise<ChatMessage[]>;
  /** Delete a conversation */
  deleteConversation: (id: string) => void;
  /** Rename a conversation */
  renameConversation: (id: string, title: string) => void;
  /** Save messages for the active conversation */
  saveActiveMessages: (messages: ChatMessage[]) => void;
  /** Update the active conversation's updatedAt timestamp */
  touchActiveConversation: () => void;
  /** Auto-title the active conversation from the first user message */
  autoTitle: (firstMessage: string) => void;
}

function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: nextId(),
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
  };
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // Load on mount
  useEffect(() => {
    void (async () => {
      const [convs, savedActiveId] = await Promise.all([
        loadConversations(),
        loadActiveConversationId(),
      ]);

      if (convs.length === 0) {
        // First launch — create a default conversation
        const first = createConversation();
        setConversations([first]);
        setActiveId(first.id);
        void saveConversations([first]);
        void saveActiveConversationId(first.id);
      } else {
        setConversations(convs);
        // Restore active, or fall back to most recent
        const target = savedActiveId && convs.some((c) => c.id === savedActiveId)
          ? savedActiveId
          : convs[0].id;
        setActiveId(target);
      }
      setLoaded(true);
    })();
  }, []);

  // Persist conversation list whenever it changes
  useEffect(() => {
    if (loaded) {
      void saveConversations(conversations);
    }
  }, [loaded, conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const newConversation = useCallback((): Conversation => {
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    void saveActiveConversationId(conv.id);
    return conv;
  }, []);

  const switchConversation = useCallback(async (id: string): Promise<ChatMessage[]> => {
    setActiveId(id);
    void saveActiveConversationId(id);
    return loadConversationMessages(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      // If we deleted the active one, switch to the first remaining (or create new)
      if (id === activeId) {
        if (filtered.length > 0) {
          setActiveId(filtered[0].id);
          void saveActiveConversationId(filtered[0].id);
        } else {
          const fresh = createConversation();
          filtered.push(fresh);
          setActiveId(fresh.id);
          void saveActiveConversationId(fresh.id);
        }
      }
      return filtered;
    });
    void deleteConversationMessages(id);
  }, [activeId]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
    );
  }, []);

  const saveActiveMessages = useCallback((messages: ChatMessage[]) => {
    if (activeId) {
      void saveConversationMessages(activeId, messages);
    }
  }, [activeId]);

  const touchActiveConversation = useCallback(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, updatedAt: Date.now() } : c)),
    );
  }, [activeId]);

  const autoTitle = useCallback((firstMessage: string) => {
    if (!activeId) return;
    // Use first 40 chars of the message as title
    const title = firstMessage.length > 40
      ? firstMessage.slice(0, 40) + '...'
      : firstMessage;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId && c.title === 'New Chat'
          ? { ...c, title, updatedAt: Date.now() }
          : c,
      ),
    );
  }, [activeId]);

  return {
    conversations,
    activeConversation,
    loaded,
    newConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    saveActiveMessages,
    touchActiveConversation,
    autoTitle,
  };
}
