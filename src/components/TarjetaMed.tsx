// Tarjeta de un medicamento en una lista (resultados de búsqueda, grupo ATC…).
import { Link } from 'react-router-dom';
import type { MedicamentoCima } from '../lib/cima';

export function ListaMedicamentos({ meds }: { meds: MedicamentoCima[] }) {
  return (
    <ul className="lista-resultados">
      {meds.map((m) => (
        <li key={m.nregistro}>
          <Link className="tarjeta-med" to={`/farmacia/medicamento/${encodeURIComponent(m.nregistro)}`}>
            <span className="med-nombre">{m.nombre}</span>
            <span className="med-lab">{m.labtitular}</span>
            <span className="med-etiquetas">
              <span className="chip chip-humano">Uso humano</span>
              {m.cpresc && <span className="chip">{m.cpresc}</span>}
              {m.comerc === false && <span className="chip chip-apagado">No comercializado</span>}
              {m.psum && <span className="chip chip-alerta">Problema de suministro</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
