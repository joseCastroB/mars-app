import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchSolicitudes } from '../api/odoo';

export default function SolicitudesListScreen({ onNavigate, onEdit }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await fetchSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSolicitudes(); }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '3': return '#e74c3c'; // Alta
      case '2': return '#f39c12'; // Media
      default: return '#34495e';  // Baja
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#01579b" />
        </TouchableOpacity>
        <Text style={styles.title}>Solicitudes de Mantenimiento</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#01579b" style={styles.loader} />
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onEdit(item)}>
              <View style={styles.cardRow}>
                <Text style={styles.reqName}>{item.name}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                  <Text style={styles.priorityText}>P{item.priority || '0'}</Text>
                </View>
              </View>
              
              <Text style={styles.reqSub}>
                Equipo: {item.equipment_id ? item.equipment_id[1] : 'No asignado'}
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.reqDate}>📅 {item.request_date || 'Sin fecha'}</Text>
                <Text style={styles.stageText}>📍 {item.stage_id ? item.stage_id[1] : 'Borrador'}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          onRefresh={loadSolicitudes}
          refreshing={loading}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => onEdit(null)}>
        <FontAwesome5 name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fa' },
  header: { padding: 25, paddingTop: 50, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 15 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reqName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 10 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  reqSub: { fontSize: 14, color: '#7f8c8d', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f9f9f9', paddingTop: 8 },
  reqDate: { fontSize: 12, color: '#95a5a6' },
  stageText: { fontSize: 13, color: '#01579b', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#01579b', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});