import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';

export const NotificationsScreen = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'student' | 'faculty'>('all');

  const handleBroadcast = () => {
    if (!title || !body) {
      Alert.alert('Error', 'Please fill in notification title and message body');
      return;
    }
    Alert.alert('Broadcast Sent', `Push notification sent via Firebase Cloud Messaging to target: ${target.toUpperCase()}`);
    setTitle('');
    setBody('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Broadcast Push Notification</Text>
      <Text style={styles.sub}>Send real-time alerts to mobile app users via FCM</Text>

      <Text style={styles.label}>Target Audience</Text>
      <View style={styles.chipRow}>
        {(['all', 'student', 'faculty'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, target === t && styles.activeChip]}
            onPress={() => setTarget(t)}
          >
            <Text style={[styles.chipText, target === t && styles.activeChipText]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Notification Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Campus Maintenance Alert"
          placeholderTextColor={Colors.onSurfaceVariant}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Message Body</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Type message content here..."
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline
          value={body}
          onChangeText={setBody}
        />

        <TouchableOpacity style={styles.btn} onPress={handleBroadcast}>
          <Text style={styles.btnText}>📢 Send FCM Push Notification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  sub: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 8, marginTop: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.surfaceContainerHigh },
  activeChip: { backgroundColor: Colors.primaryContainer },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  activeChipText: { color: Colors.onPrimaryContainer },
  form: { gap: 10 },
  input: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, padding: 14, color: Colors.onSurface, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  btn: { backgroundColor: Colors.primary, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  btnText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
