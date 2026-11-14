// Abre la ficha de un medicamento a partir de su código nacional (CN).
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { nregistroPorCn } from '../lib/cima';

export default function PorCodigoNacional() {
  const { cn = '' } = useParams();
  const [nr, setNr] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    nregistroPorCn(cn).then(setNr).catch(() => setNr(null));
  }, [cn]);
  if (nr) return <Navigate to={`/farmacia/medicamento/${nr}`} replace />;
  return (
    <div className="pagina" data-modulo="farmacia">
      <p className="nota">{nr === null ? `Información no disponible en la fuente para el CN ${cn}.` : 'Buscando en CIMA…'}</p>
    </div>
  );
}
