import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from '../src/screens/DashboardScreen';
import EquipoFormScreen from '../src/screens/EquipoFormScreen';
import EquiposListScreen from '../src/screens/EquiposListScreen';
import LoginScreen from '../src/screens/LoginScreen';
import SolicitudesListScreen from '../src/screens/SolicitudesListScreen';
import SolicitudFormScreen from '../src/screens/SolicitudFormScreen';

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  // Usamos UN SOLO estado genérico para guardar el equipo o la solicitud seleccionada
  const [selectedItem, setSelectedItem] = useState(null);

  const handleNavigate = (screen: string, item: any = null) => {
    setSelectedItem(item);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return <LoginScreen onLoginSuccess={() => handleNavigate('Dashboard')} />;
      
      case 'Dashboard':
        return <DashboardScreen onNavigate={handleNavigate} />;
      
      case 'EquiposList':
        return <EquiposListScreen onNavigate={handleNavigate} onEdit={(item: any) => handleNavigate('EquipoForm', item)} />;
      
      case 'EquipoForm':
        // Aquí pasamos selectedItem en lugar de selectedEquipo
        return <EquipoFormScreen onNavigate={handleNavigate} equipoData={selectedItem} />;
      
      case 'MantenimientoList':
        return <SolicitudesListScreen onNavigate={handleNavigate} onEdit={(item: any) => handleNavigate('SolicitudForm', item)} />;
      
      case 'SolicitudForm':
        return <SolicitudFormScreen onNavigate={handleNavigate} solicitudData={selectedItem} />;
      
      default:
        return <LoginScreen onLoginSuccess={() => handleNavigate('Dashboard')} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}