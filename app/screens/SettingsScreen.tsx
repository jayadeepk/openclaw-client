import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSettings } from '../../types';
import { AppTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onGoBack: () => void;
}

export function SettingsScreen({ settings, onSave, onGoBack }: SettingsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const insets = useSafeAreaInsets();
  const [host, setHost] = useState(settings.gatewayHost);
  const [port, setPort] = useState(settings.gatewayPort);
  const [token, setToken] = useState(settings.authToken);

  const handleSave = () => {
    if (!host.trim()) {
      Alert.alert('Validation', 'Gateway host is required.');
      return;
    }
    if (!port.trim() || isNaN(Number(port))) {
      Alert.alert('Validation', 'Port must be a valid number.');
      return;
    }
    onSave({ gatewayHost: host.trim(), gatewayPort: port.trim(), authToken: token.trim() });
    onGoBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Gateway Host */}
        <Text style={styles.label}>Gateway Host</Text>
        <TextInput
          style={styles.input}
          value={host}
          onChangeText={setHost}
          placeholder="e.g. 192.168.1.100"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Gateway host"
        />

        {/* Gateway Port */}
        <Text style={styles.label}>Gateway Port</Text>
        <TextInput
          style={styles.input}
          value={port}
          onChangeText={setPort}
          placeholder="18789"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
          accessibilityLabel="Gateway port"
        />

        {/* Auth Token */}
        <Text style={styles.label}>Auth Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Enter your auth token"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          accessibilityLabel="Auth token"
        />

        <Text style={styles.hint}>
          The WebSocket will connect to ws://{host || '...'}:{port || '...'}
        </Text>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Save and connect">
          <Text style={styles.saveBtnText}>Save & Connect</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ height: insets.bottom }} />
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
    backBtn: {
      paddingVertical: 6,
      paddingRight: 8,
    },
    backText: {
      color: t.colors.primary,
      fontSize: t.fontSize.md,
      fontWeight: '500',
    },
    title: {
      fontSize: t.fontSize.lg,
      fontWeight: '700',
      color: t.colors.text,
    },
    content: {
      padding: t.spacing.lg,
    },
    label: {
      fontSize: t.fontSize.sm,
      fontWeight: '600',
      color: t.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: t.spacing.xs,
      marginTop: t.spacing.md,
    },
    input: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borderRadius.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm + 4,
      color: t.colors.text,
      fontSize: t.fontSize.md,
    },
    hint: {
      fontSize: t.fontSize.sm,
      color: t.colors.textMuted,
      marginTop: t.spacing.sm,
      fontStyle: 'italic',
    },
    saveBtn: {
      backgroundColor: t.colors.primary,
      borderRadius: t.borderRadius.md,
      paddingVertical: t.spacing.md,
      alignItems: 'center',
      marginTop: t.spacing.xl,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: t.fontSize.md,
      fontWeight: '700',
    },
  });
}
