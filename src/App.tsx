// Estructura general: cabecera arriba, contenido en el centro y navegación abajo.
import { Navigate, Route, Routes } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Farmacia from './pages/Farmacia';
import Anatomia from './pages/Anatomia';
import Imagen from './pages/Imagen';
import Buscar from './pages/Buscar';
import Acerca from './pages/Acerca';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/farmacia" replace />} />
          <Route path="/farmacia" element={<Farmacia />} />
          <Route path="/anatomia" element={<Anatomia />} />
          <Route path="/imagen" element={<Imagen />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/acerca" element={<Acerca />} />
          <Route path="*" element={<Navigate to="/farmacia" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
