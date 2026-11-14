// Cabecera superior: nombre de la app, botón de tema y acceso a "Fuentes y aviso legal".
import { Link } from 'react-router-dom';
import { useTema } from '../lib/tema';
import { IconoInfo, IconoTema } from './Iconos';

const ETIQUETA = { auto: 'Tema: automático', oscuro: 'Tema: oscuro', claro: 'Tema: claro' } as const;

export default function TopBar() {
  const { tema, siguiente } = useTema();
  return (
    <header className="cabecera">
      <Link to="/farmacia" className="marca">
        <span className="marca-punto" aria-hidden="true" />
        Consulta clínica
      </Link>
      <div className="cabecera-acciones">
        <button type="button" className="boton-icono" onClick={siguiente} aria-label={ETIQUETA[tema]} title={ETIQUETA[tema]}>
          <IconoTema />
          <span className="tema-letra" aria-hidden="true">{tema === 'auto' ? 'A' : ''}</span>
        </button>
        <Link to="/acerca" className="boton-icono" aria-label="Fuentes y aviso legal" title="Fuentes y aviso legal">
          <IconoInfo />
        </Link>
      </div>
    </header>
  );
}
