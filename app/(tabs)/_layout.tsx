import React from 'react';
// Importe o seu componente App principal do index.tsx
import App from './index'; // Ajuste o caminho se o seu index.tsx não estiver no mesmo diretório

export default function TabLayout() {
  // Ao invés de renderizar as abas do Expo Router,
  // renderizamos diretamente o seu componente App principal.
  return <App />;
}
