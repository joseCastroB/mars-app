import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchEquipos } from '../api/odoo';

export default function EquiposListScreen({ onNavigate, onEdit }) {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEquipos = async () => {
    try {
      setLoading(true);
      const data = await fetchEquipos();
      setEquipos(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEquipos(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#01579b" />
        </TouchableOpacity>
        <Text style={styles.title}>Inventario de Equipos</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#01579b" style={styles.loader} />
      ) : (
        <FlatList
          data={equipos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onEdit(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.equipName}>{item.name}</Text>
                <FontAwesome5 name="chevron-right" size={14} color="#bdc3c7" />
              </View>
              <Text style={styles.equipSub}>S/N: {item.serial_no || 'Sin Serie'} • {item.mars_marca || 'Sin Marca'}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          onRefresh={loadEquipos}
          refreshing={loading}
        />
      )}

      {/* BOTÓN PARA INGRESAR A CREAR EQUIPO */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => onEdit(null)} // null indica que es una creación nueva
        activeOpacity={0.8}
      >
        <FontAwesome5 name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { paddingRight: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  equipName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
  equipSerial: { fontSize: 14, color: '#7f8c8d' },
  equipMarca: { fontSize: 14, color: '#714B67', fontWeight: '500' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#01579b', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});