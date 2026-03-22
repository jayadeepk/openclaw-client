import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConnectionStatus } from '../types';
import { AppTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  status: ConnectionStatus;
  reconnectIn?: number;
  isOnline?: boolean;
}

function getStatusConfig(t: AppTheme): Record<ConnectionStatus, { label: string; color: string }> {
  return {
    connected: { label: 'Connected', color: t.colors.accent },
    connecting: { label: 'Connecting...', color: '#ffaa00' },
    authenticating: { label: 'Authenticating...', color: '#ff8c00' },
    reconnecting: { label: 'Reconnecting', color: '#ffaa00' },
    disconnected: { label: 'Disconnected', color: t.colors.textMuted },
    error: { label: 'Connection Error', color: t.colors.error },
  };
}

/** Small pill-shaped badge showing WebSocket connection status */
export function ConnectionBadge({ status, reconnectIn, isOnline = true }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const statusConfig = useMemo(() => getStatusConfig(theme), [theme]);

  const offlineLabel = 'Offline';
  const offlineColor = theme.colors.error;
  const config = statusConfig[status];

  let label: string;
  let color: string;
  if (!isOnline) {
    label = offlineLabel;
    color = offlineColor;
  } else if (status === 'reconnecting' && reconnectIn) {
    label = `Reconnecting in ${String(reconnectIn)}s...`;
    color = config.color;
  } else {
    label = config.label;
    color = config.color;
  }

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={`Connection status: ${label}`}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: t.colors.surface,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    label: {
      fontSize: t.fontSize.sm,
      fontWeight: '500',
    },
  });
}
