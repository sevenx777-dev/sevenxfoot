import React from 'react';
import FootballManager from '../football_manager';
import { useWindowDimensions, View, Text } from 'react-native';

export default function Index() {
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;

  if (isPortrait) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#1f2937' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>Rode seu dispositivo</Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>Este jogo funciona melhor no modo paisagem.</Text>
      </View>
    );
  }

  return <FootballManager />;
}
