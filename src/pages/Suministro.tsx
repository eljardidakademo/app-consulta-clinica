// Lista completa de problemas de suministro activos publicados por la AEMPS, con filtro.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fechaCorta, formatearFecha, problemasSuministro, type ProblemaSuministro } from '../lib/cima';
import { IconoBuscar } from '../components/Iconos';

export default function Suministro() {
  const [lista, setLista] = useState<ProblemaSuministro[] | null>(null);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [consultado, setConsultado] = useState<Date | null>(null);

  useEffect(() => {
    problemasSuministro()
      .then((l) => {
        setLista(l);
        setConsultado(new Date());
      })
      .catch(() => setError(true));
  }, []);

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    const l = lista ?? [];
    return (f ? l.filter((p) => p.nombre.toLowerCase().includes(f) || p.cn.includes(f)) : l).slice(0, 100);
  }, [lista, filtro]);

  return (
    <div className="pagina" data-modulo="farmacia">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Farmacia · Alertas de la AEMPS</p>
        <h1>Problemas de suministro</h1>
      </header>

      <label className="campo">
        <IconoBuscar className="campo-icono" />
        <input type="search" placeholder="Filtrar por nombre o código nacional" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>

      {error && <p className="aviso aviso-error">No se ha podido consultar CIMA.</p>}
      {!lista && !error && <p className="nota">Consultando CIMA…</p>}
      {lista && (
        <p className="nota">
          {lista.length} presentaciones con problemas de suministro activos.
          {visibles.length < (filtro ? lista.length : lista.length) && ` Se muestran ${visibles.length}; usa el filtro para encontrar otras.`}
        </p>
      )}

      <ul className="lista-resultados">
        {visibles.map((p) => (
          <li key={p.cn}>
            <Link to={`/farmacia/cn/${p.cn}`} className="tarjeta-med tarjeta-suministro">
              <span className="med-nombre">{p.nombre}</span>
              <span className="med-lab">
                CN {p.cn} · desde {fechaCorta(p.fini)}
                {p.ffin ? ` · previsto hasta ${fechaCorta(p.ffin)}` : ''}
              </span>
              {p.observ && <span className="nota">{p.observ}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <p className="fuente">
        Fuente: CIMA, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).
        {consultado && ` Consultado el ${formatearFecha(consultado)}.`}
      </p>
    </div>
  );
}
