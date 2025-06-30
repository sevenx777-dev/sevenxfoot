<<<<<<< HEAD

import { Stack } from "expo-router";
import "../global.css"; // Importação do CSS global
=======
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";
import { useColorScheme } from '@/hooks/useColorScheme';
>>>>>>> b243ab258fe18fe9ef17948f9a3cd56a3ca6e4bf

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
