import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from '../src/screens/DashboardScreen';
import EquipoFormScreen from '../src/screens/EquipoFormScreen';
import EquiposListScreen from '../src/screens/EquiposListScreen';
import LoginScreen from '../src/screens/LoginScreen';

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [selectedEquipo, setSelectedEquipo] = useState(null);

  const handleNavigate = (screen: string, item = null) => {
    setSelectedEquipo(item);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return <LoginScreen onLoginSuccess={() => handleNavigate('Dashboard')} />;
      case 'Dashboard':
        return <DashboardScreen onNavigate={handleNavigate} />;
      case 'EquiposList':
        return (
            <EquiposListScreen 
            onNavigate={handleNavigate} 
            onEdit={(item: any) => handleNavigate('EquipoForm', item)} 
            />
        );
      case 'EquipoForm':
        return (
            <EquipoFormScreen 
            onNavigate={handleNavigate} 
            equipoData={selectedEquipo} // Si es null, el form entra en modo "Crear"
            />
        );
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