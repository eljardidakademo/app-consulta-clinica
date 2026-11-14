// Punto de entrada: monta la aplicación React en la página.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter (rutas con #) funciona en GitHub Pages sin configuración extra. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
