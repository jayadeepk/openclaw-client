import React, { useCallback } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';

interface SearchBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  matchCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** Collapsible search bar with prev/next match navigation */
export function SearchBar({
  query,
  onChangeQuery,
  matchCount,
  currentIndex,
  onPrev,
  onNext,
  onClose,
}: SearchBarProps) {
  const handleClear = useCallback(() => {
    onChangeQuery('');
  }, [onChangeQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search messages..."
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
          returnKeyType="search"
          accessibilityLabel="Search messages"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.controls}>
        {query.length > 0 && (
          <Text style={styles.countText}>
            {matchCount > 0 ? String(currentIndex + 1) + '/' + String(matchCount) : '0 results'}
          </Text>
        )}
        <TouchableOpacity
          onPress={onPrev}
          disabled={matchCount === 0}
          style={[styles.navBtn, matchCount === 0 && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Previous match"
        >
          <Text style={[styles.navBtnText, matchCount === 0 && styles.navBtnTextDisabled]}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={matchCount === 0}
          style={[styles.navBtn, matchCount === 0 && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Next match"
        >
          <Text style={[styles.navBtnText, matchCount === 0 && styles.navBtnTextDisabled]}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close search"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    paddingVertical: theme.spacing.sm,
  },
  clearBtn: {
    padding: theme.spacing.xs,
  },
  clearBtnText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  countText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    minWidth: 44,
    textAlign: 'center',
  },
  navBtn: {
    padding: theme.spacing.xs,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
  navBtnTextDisabled: {
    color: theme.colors.textMuted,
  },
  closeBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
  },
  closeBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
});
