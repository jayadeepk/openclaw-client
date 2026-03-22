import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      backgroundColor: t.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      gap: t.spacing.sm,
    },
    inputRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.inputBg,
      borderRadius: t.borderRadius.sm,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: t.spacing.sm,
    },
    input: {
      flex: 1,
      color: t.colors.text,
      fontSize: t.fontSize.md,
      paddingVertical: t.spacing.sm,
    },
    clearBtn: {
      padding: t.spacing.xs,
    },
    clearBtnText: {
      color: t.colors.textMuted,
      fontSize: t.fontSize.sm,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    countText: {
      color: t.colors.textSecondary,
      fontSize: t.fontSize.sm,
      minWidth: 44,
      textAlign: 'center',
    },
    navBtn: {
      padding: t.spacing.xs,
    },
    navBtnDisabled: {
      opacity: 0.3,
    },
    navBtnText: {
      color: t.colors.text,
      fontSize: t.fontSize.sm,
    },
    navBtnTextDisabled: {
      color: t.colors.textMuted,
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
  });
}
