import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Asegúrate de tener @expo/vector-icons instalado (Expo lo trae por defecto)
import { FontAwesome5 } from '@expo/vector-icons';
import { logoutOdoo } from '../api/odoo';

export default function DashboardScreen({ onNavigate }) {

  // Función para confirmar antes de cerrar sesión
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, salir', 
          style: 'destructive',
          onPress: () => {
            logoutOdoo(); // Limpia el token de Odoo
            onNavigate('Login'); // Te regresa a la pantalla de inicio
          } 
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>

      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        
        {/* 1. Agrupamos los textos en su propia caja para que queden uno sobre otro */}
        <View>
          <Text style={styles.welcome}>Panel de Control</Text>
          <Text style={styles.subtitle}>Mantenimiento Mars</Text>
        </View>

        {/* 2. El botón ahora se irá automáticamente a la derecha gracias al space-between */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={22} color="#e74c3c" />
        </TouchableOpacity>
        
      </View>

      <View style={styles.grid}>
        {/* Card de Equipos */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => onNavigate('EquiposList')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#714B67' }]}>
            <FontAwesome5 name="tools" size={24} color="white" />
          </View>
          
          {/* AQUÍ ESTÁ LA MAGIA: Envolvemos los textos en un contenedor */}
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Equipos</Text>
            <Text style={styles.cardDesc}>Gestionar inventario de activos</Text>
          </View>
          
          {/* Flecha indicadora de navegación */}
          <FontAwesome5 name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        {/* Card de Solicitudes */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => onNavigate('MantenimientoList')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#01579b' }]}>
            <FontAwesome5 name="clipboard-list" size={24} color="white" />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Solicitudes</Text>
            <Text style={styles.cardDesc}>Órdenes de trabajo y reportes</Text>
          </View>
          
          <FontAwesome5 name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f7fa' 
  },
  header: { 
    paddingHorizontal: 25, 
    paddingTop: 40,
    paddingBottom: 25, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderColor: '#e8eaed' 
  },
  welcome: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#7f8c8d', 
    marginTop: 6, 
    fontWeight: '500' 
  },
  grid: { 
    padding: 20, 
    flexDirection: 'column', 
    gap: 16, 
    marginTop: 10 
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    // Sombras más suaves y modernas
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconBox: { 
    width: 55, 
    height: 55, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  textContainer: {
    flex: 1, // Toma todo el espacio horizontal disponible, empujando la flecha a la derecha
    justifyContent: 'center',
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#2c3e50', 
    marginBottom: 4 
  },
  cardDesc: { 
    fontSize: 14, 
    color: '#95a5a6', 
    lineHeight: 20 
  },
  headerContainer: {
    flexDirection: 'row', // Coloca los elementos uno al lado del otro
    justifyContent: 'space-between', // Separa el texto del botón a los extremos
    alignItems: 'center', // Los centra verticalmente
    paddingHorizontal: 20,
    marginTop: 60, // Ajusta según el margen de tu celular
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  subTitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: '#fdecea', // Un fondo rojizo muy suave
    borderRadius: 8,
  },
});