// Navegación por la clasificación ATC (OMS), con los nombres que publica CIMA.
// Nivel 1 (grupo anatómico) → … → nivel 5 (principio activo) → medicamentos.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { medicamentosPorAtc, nivelAtc, obtenerAtc, formatearFecha, type GrupoAtc, type ResultadoBusqueda } from '../lib/cima';
import { ListaMedicamentos } from '../components/TarjetaMed';

const NIVELES = ['', 'Grupo anatómico', 'Grupo terapéutico', 'Subgrupo farmacológico', 'Subgrupo químico', 'Principio activo'];

/** Código del nivel inmediatamente superior ("N02BE01" → "N02BE"). */
function padre(codigo: string): string {
  const largos = [1, 3, 4, 5, 7];
  const i = largos.indexOf(codigo.length);
  return i > 0 ? codigo.slice(0, largos[i - 1]) : '';
}

export default function ExplorarAtc() {
  const { codigo = '' } = useParams();
  const [atc, setAtc] = useState<GrupoAtc[] | null>(null);
  const [error, setError] = useState(false);
  const [verMeds, setVerMeds] = useState(false);

  useEffect(() => {
    obtenerAtc().then(setAtc).catch(() => setError(true));
  }, []);
  useEffect(() => setVerMeds(nivelAtc(codigo) === 5), [codigo]);

  const porCodigo = useMemo(() => new Map((atc ?? []).map((g) => [g.codigo, g])), [atc]);
  const hijos = useMemo(() => {
    if (!atc) return [];
    const largo = { 0: 1, 1: 3, 2: 4, 3: 5, 4: 7 }[nivelAtc(codigo)] ?? 0;
    return atc.filter((g) => g.codigo.length === largo && g.codigo.startsWith(codigo));
  }, [atc, codigo]);

  // Ruta de migas: N › N02 › N02B …
  const migas: GrupoAtc[] = [];
  for (let c = codigo; c; c = padre(c)) migas.unshift(porCodigo.get(c) ?? { codigo: c, nombre: '' });

  const actual = porCodigo.get(codigo);
  const nivel = nivelAtc(codigo);

  return (
    <div className="pagina" data-modulo="farmacia">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Farmacia · Clasificación ATC</p>
        <h1>{actual ? actual.nombre : 'Explorar por grupo'}</h1>
      </header>

      <nav className="migas" aria-label="Ruta ATC">
        <Link to="/farmacia/atc">ATC</Link>
        {migas.map((g) => (
          <span key={g.codigo}>
            <span aria-hidden="true"> › </span>
            <Link to={`/farmacia/atc/${g.codigo}`} aria-current={g.codigo === codigo ? 'page' : undefined}>{g.codigo}</Link>
          </span>
        ))}
      </nav>

      {error && <p className="aviso aviso-error">No se ha podido cargar la clasificación ATC de CIMA.</p>}
      {!atc && !error && <p className="nota">Cargando clasificación ATC…</p>}

      {atc && hijos.length > 0 && (
        <>
          <p className="nota">{NIVELES[nivel + 1]} · {hijos.length} grupos</p>
          <ul className="lista-atc">
            {hijos.map((g) => (
              <li key={g.codigo}>
                <Link to={`/farmacia/atc/${g.codigo}`} className="fila-atc">
                  <span className="fila-atc-codigo">{g.codigo}</span>
                  <span className="fila-atc-nombre">{g.nombre}</span>
                  <span aria-hidden="true" className="fila-atc-flecha">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {atc && nivel >= 3 && !verMeds && (
        <button type="button" className="boton-ancho" onClick={() => setVerMeds(true)}>
          Ver medicamentos del grupo {codigo}
        </button>
      )}
      {verMeds && <MedicamentosDelGrupo codigo={codigo} />}

      <p className="fuente">Fuente: clasificación ATC publicada en CIMA (AEMPS).</p>
    </div>
  );
}

function MedicamentosDelGrupo({ codigo }: { codigo: string }) {
  const [paginas, setPaginas] = useState<ResultadoBusqueda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = (pagina: number) => {
    setCargando(true);
    medicamentosPorAtc(codigo, pagina)
      .then((r) => setPaginas((p) => (pagina === 1 ? [r] : [...p, r])))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  };
  useEffect(() => {
    setPaginas([]);
    setError(false);
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  const meds = paginas.flatMap((p) => p.resultados);
  const total = paginas[0]?.totalFilas ?? 0;

  return (
    <section className="seccion-ficha">
      <h2 className="seccion-ficha-titulo">Medicamentos {paginas.length > 0 && <span className="contador contador-modulo">{total}</span>}</h2>
      {error && <p className="aviso aviso-error">No se ha podido consultar CIMA.</p>}
      {paginas.length > 0 && meds.length === 0 && <p className="nota">Información no disponible en la fuente: CIMA no devuelve medicamentos para este grupo.</p>}
      <ListaMedicamentos meds={meds} />
      {cargando && <p className="nota">Consultando CIMA…</p>}
      {!cargando && meds.length < total && (
        <button type="button" className="boton-ancho" onClick={() => cargar(paginas.length + 1)}>
          Cargar más ({meds.length} de {total})
        </button>
      )}
      {paginas[0] && <p className="nota">Consultado el {formatearFecha(paginas[0].consultadoEl)}.</p>}
    </section>
  );
}
