// Botón "Añadir al cruce" de la ficha, con acceso a la página del cruce.
import { Link } from 'react-router-dom';
import { alternarCruce, MAX_CRUCE, useGuardados } from '../lib/guardado';

export default function BotonCruce({ nregistro, nombre, pactivos, vet }: { nregistro: string; nombre: string; pactivos?: string; vet?: boolean }) {
  const cruce = useGuardados('cruce');
  const dentro = cruce.some((c) => c.nregistro === nregistro);
  const lleno = !dentro && cruce.length >= MAX_CRUCE;
  return (
    <div className="fila-cruce">
      <button
        type="button"
        className={`boton-cruce ${dentro ? 'activo' : ''}`}
        onClick={() => alternarCruce({ nregistro, nombre, pactivos, vet })}
        aria-pressed={dentro}
        disabled={lleno}
        title={lleno ? `El cruce admite ${MAX_CRUCE} medicamentos como máximo` : undefined}
      >
        {dentro ? '✓ En el cruce' : '+ Añadir al cruce'}
      </button>
      {cruce.length > 0 && (
        <Link to="/farmacia/cruce" className="boton-cruce">
          Ver cruce ({cruce.length})
        </Link>
      )}
    </div>
  );
}
