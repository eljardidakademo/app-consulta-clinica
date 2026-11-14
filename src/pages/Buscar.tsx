// Buscador global. De momento busca medicamentos; más adelante también
// estructuras anatómicas, patologías y protocolos de imagen.
import BuscadorMedicamentos from '../components/BuscadorMedicamentos';

export default function Buscar() {
  return (
    <div className="pagina" data-modulo="buscar">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Buscador global</p>
        <h1>Buscar</h1>
      </header>
      <BuscadorMedicamentos autoFocus />
      <p className="nota">Por ahora busca medicamentos. Anatomía e Imagen se añadirán al buscador cuando tengan contenido.</p>
    </div>
  );
}
