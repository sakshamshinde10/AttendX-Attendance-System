import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';

export const ManageSubjectsScreen = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSubjects();
      setSubjects(res.subjects || []);
    } catch (e) {
      setSubjects([
        { _id: '1', name: 'Wireless Communication', subjectCode: 'WAMC-401' },
        { _id: '2', name: 'Mobile Computing', subjectCode: 'CS-308' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subjects Catalog</Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>{item.subjectCode}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, marginBottom: 16 },
  list: { gap: 10 },
  card: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  code: { fontSize: 12, fontWeight: '700', color: Colors.primaryContainer, backgroundColor: Colors.onPrimaryContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
});
