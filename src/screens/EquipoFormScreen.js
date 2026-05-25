import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createEquipo, fetchEquipoImagen, updateEquipo } from '../api/odoo';

export default function EquipoFormScreen({ onNavigate, equipoData }) {
  const isEditing = !!equipoData;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    serial_no: '',
    mars_marca: '',
    mars_capacidad: '',
    mars_ramales: '',
    mars_voltaje_fuerza: '',
    mars_tipo_alimentacion: '',
    mars_tipo_control: '',
    mars_placa_imagen: false // Odoo espera false si está vacío
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({ ...equipoData });
      cargarImagenReal(equipoData.id);
    }
  }, [equipoData]);

  const cargarImagenReal = async (id) => {
    try {
      const imgBase64 = await fetchEquipoImagen(id);
      if (imgBase64) {
        setFormData(prev => ({ ...prev, mars_placa_imagen: imgBase64 }));
      }
    } catch (e) {
      console.log("Error cargando imagen:", e);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería para subir la placa.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // 1. APAGAMOS EL RECORTE FORZADO: Así subirá la foto original rectangular
      allowsEditing: true, 
      // 2. AUMENTAMOS LA CALIDAD: (De 0.5 a 0.8) Para que Odoo pueda mostrar los textos técnicos sin que se vean borrosos, dejando que el max_width de tu backend haga el resto del trabajo.
      quality: 0.8, 
      base64: true, 
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, mars_placa_imagen: result.assets[0].base64 });
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'El nombre del equipo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      // Limpiamos los datos para enviar solo lo modificable
      const payload = {
        name: formData.name,
        serial_no: formData.serial_no,
        mars_marca: formData.mars_marca,
        mars_capacidad: formData.mars_capacidad,
        mars_ramales: formData.mars_ramales,
        mars_voltaje_fuerza: formData.mars_voltaje_fuerza,
        mars_tipo_alimentacion: formData.mars_tipo_alimentacion,
        mars_tipo_control: formData.mars_tipo_control,
        ...(formData.mars_placa_imagen && { mars_placa_imagen: formData.mars_placa_imagen })
      };

      if (isEditing) {
        await updateEquipo(equipoData.id, payload);
        Alert.alert('Éxito', 'Equipo actualizado correctamente');
      } else {
        await createEquipo(payload);
        Alert.alert('Éxito', 'Equipo creado correctamente');
      }
      onNavigate('EquiposList');
    } catch (error) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('EquiposList')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#01579b" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Editar Equipo' : 'Nuevo Equipo'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#01579b" /> : <Text style={styles.saveBtn}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Foto de la Placa */}
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {formData.mars_placa_imagen ? (
            <Image 
              source={{ uri: `data:image/jpeg;base64,${formData.mars_placa_imagen}` }} 
              style={styles.image} 
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <FontAwesome5 name="camera" size={30} color="#95a5a6" />
              <Text style={styles.imageText}>Subir Foto de Placa</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Campos de Texto */}
        <Text style={styles.label}>Nombre del Equipo *</Text>
        <TextInput style={styles.input} value={formData.name} onChangeText={(v) => handleInputChange('name', v)} placeholder="Ej. Motor principal" />

        <Text style={styles.label}>Número de Serie</Text>
        <TextInput style={styles.input} value={formData.serial_no} onChangeText={(v) => handleInputChange('serial_no', v)} />

        <Text style={styles.label}>Marca</Text>
        <TextInput style={styles.input} value={formData.mars_marca} onChangeText={(v) => handleInputChange('mars_marca', v)} />

        <Text style={styles.label}>Capacidad</Text>
        <TextInput style={styles.input} value={formData.mars_capacidad} onChangeText={(v) => handleInputChange('mars_capacidad', v)} />

        <Text style={styles.label}>Ramales</Text>
        <TextInput style={styles.input} value={formData.mars_ramales} onChangeText={(v) => handleInputChange('mars_ramales', v)} />

        <Text style={styles.label}>Voltaje de Fuerza</Text>
        <TextInput style={styles.input} value={formData.mars_voltaje_fuerza} onChangeText={(v) => handleInputChange('mars_voltaje_fuerza', v)} />

        <Text style={styles.label}>Tipo de Alimentación</Text>
        <TextInput style={styles.input} value={formData.mars_tipo_alimentacion} onChangeText={(v) => handleInputChange('mars_tipo_alimentacion', v)} />

        <Text style={styles.label}>Tipo de Control</Text>
        <TextInput style={styles.input} value={formData.mars_tipo_control} onChangeText={(v) => handleInputChange('mars_tipo_control', v)} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { paddingRight: 15 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  saveBtn: { color: '#01579b', fontWeight: 'bold', fontSize: 16 },
  container: { flex: 1, backgroundColor: '#f4f7fa' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  imageContainer: { width: '100%', height: 200, backgroundColor: '#e8eaed', borderRadius: 10, marginBottom: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#dcdde1', borderStyle: 'dashed' },
  imagePlaceholder: { alignItems: 'center' },
  imageText: { marginTop: 10, color: '#7f8c8d', fontWeight: '500' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 16 },
});