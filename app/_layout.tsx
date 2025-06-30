
import { Stack } from "expo-router";
import "../global.css"; // Importação do CSS global

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
