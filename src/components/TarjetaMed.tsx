// Tarjeta de un medicamento en una lista (resultados de búsqueda, grupo ATC…).
// "vet" indica que el medicamento viene de CIMAVet (uso veterinario).
import { Link } from 'react-router-dom';
import type { MedicamentoCima } from '../lib/cima';
import { rutaFicha } from '../lib/guardado';

export function ListaMedicamentos({ meds, vet = false }: { meds: MedicamentoCima[]; vet?: boolean }) {
  return (
    <ul className="lista-resultados">
      {meds.map((m) => (
        <li key={m.nregistro}>
          <Link className={`tarjeta-med ${vet ? 'tarjeta-med-vet' : ''}`} to={rutaFicha({ nregistro: m.nregistro, vet })}>
            <span className="med-nombre">{m.nombre}</span>
            <span className="med-lab">{m.labtitular}</span>
            <span className="med-etiquetas">
              {vet ? <span className="chip chip-vet">Uso veterinario</span> : <span className="chip chip-humano">Uso humano</span>}
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
