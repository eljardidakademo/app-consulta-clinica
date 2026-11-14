// Módulo 1: Farmacia (uso humano). En esta fase: buscador conectado a CIMA.
import BuscadorMedicamentos from '../components/BuscadorMedicamentos';

export default function Farmacia() {
  return (
    <div className="pagina" data-modulo="farmacia">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Módulo 1 · Medicamentos de uso humano</p>
        <h1>Farmacia</h1>
      </header>

      <BuscadorMedicamentos />

      <h2 className="seccion-titulo">En preparación</h2>
      <ul className="proximamente">
        <li><strong>Ficha por secciones</strong> 4.1 a 5.2 de la ficha técnica, con el texto oficial.</li>
        <li><strong>Árbol ATC</strong> para navegar por familias.</li>
        <li><strong>Alertas</strong> de seguridad y problemas de suministro de la AEMPS.</li>
        <li><strong>Favoritos e historial</strong>, guardados solo en este dispositivo.</li>
      </ul>
    </div>
  );
}
