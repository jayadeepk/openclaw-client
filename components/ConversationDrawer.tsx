import React, { useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Conversation } from '../types';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ConversationDrawer({
  visible,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    const isActive = item.id === activeId;
    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => { onSelect(item.id); }}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${item.title}`}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemDate}>
            {new Date(item.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { onDelete(item.id); }}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.title}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTap} onPress={onClose} activeOpacity={1} />
        <View style={[styles.drawer, { paddingTop: insets.top + theme.spacing.md }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversations</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close drawer"
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onNew}
            style={styles.newBtn}
            accessibilityRole="button"
            accessibilityLabel="New conversation"
          >
            <Text style={styles.newBtnText}>+ New Chat</Text>
          </TouchableOpacity>

          <FlatList
            data={sorted}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: 'row',
    },
    overlayTap: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawer: {
      width: '80%',
      maxWidth: 320,
      backgroundColor: t.colors.surface,
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: t.spacing.md,
    },
    headerTitle: {
      fontSize: t.fontSize.xl,
      fontWeight: '700',
      color: t.colors.text,
    },
    closeBtn: {
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.xs,
      borderRadius: t.borderRadius.sm,
      backgroundColor: t.colors.surfaceLight,
    },
    closeBtnText: {
      color: t.colors.textSecondary,
      fontSize: t.fontSize.sm,
      fontWeight: '500',
    },
    newBtn: {
      backgroundColor: t.colors.primary,
      borderRadius: t.borderRadius.sm,
      paddingVertical: t.spacing.sm + 2,
      alignItems: 'center',
      marginBottom: t.spacing.md,
    },
    newBtnText: {
      color: '#ffffff',
      fontSize: t.fontSize.md,
      fontWeight: '600',
    },
    list: {
      paddingBottom: t.spacing.xl,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.spacing.sm + 2,
      paddingHorizontal: t.spacing.sm,
      borderRadius: t.borderRadius.sm,
      marginBottom: t.spacing.xs,
    },
    itemActive: {
      backgroundColor: t.colors.surfaceLight,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: t.fontSize.md,
      color: t.colors.text,
      marginBottom: 2,
    },
    itemTitleActive: {
      fontWeight: '600',
      color: t.colors.primary,
    },
    itemDate: {
      fontSize: t.fontSize.sm,
      color: t.colors.textMuted,
    },
    deleteBtn: {
      padding: t.spacing.xs,
      marginLeft: t.spacing.sm,
    },
    deleteBtnText: {
      color: t.colors.textMuted,
      fontSize: t.fontSize.sm,
    },
  });
}
